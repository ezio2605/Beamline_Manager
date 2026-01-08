import express from 'express';
import multer from 'multer';
import { CloudStorageService } from '../services/CloudStorageService.js';
import { FirestoreService, type FileMetadata } from '../services/FirestoreService.js';
import { FileProcessorService } from '../services/FileProcessorService.js';
import { VectorSearchService } from '../services/VectorSearchService.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
    },
    fileFilter: (req, file, cb) => {
        if (FileProcessorService.isSupportedFileType(file.originalname)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type. Supported: ${FileProcessorService.getSupportedExtensions().join(', ')}`));
        }
    },
});

/**
 * Upload JASRI file(s)
 * POST /api/files/upload/jasri
 */
router.post('/upload/jasri', upload.array('files', 10), async (req, res) => {
    try {
        const { beamlineId } = req.body;
        const files = req.files as Express.Multer.File[];

        if (!beamlineId) {
            return res.status(400).json({ error: 'beamlineId is required' });
        }

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedFiles: FileMetadata[] = [];

        for (const file of files) {
            // Upload to Cloud Storage
            const storagePath = await CloudStorageService.uploadJasriFile(beamlineId, file);

            // Create file metadata
            const fileMetadata: FileMetadata = {
                id: uuidv4(),
                filename: file.originalname,
                beamlineId,
                fileType: 'jasri',
                storagePath,
                fileSize: file.size,
                mimeType: file.mimetype,
                uploadedAt: new Date().toISOString(),
                status: 'uploaded',
            };

            // Save metadata to Firestore
            await FirestoreService.saveFileMetadata(fileMetadata);
            uploadedFiles.push(fileMetadata);
        }

        res.json({
            success: true,
            message: `Uploaded ${uploadedFiles.length} JASRI file(s)`,
            files: uploadedFiles,
        });
    } catch (error: any) {
        console.error('Error uploading JASRI files:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Upload Nichi file(s)
 * POST /api/files/upload/nichi
 */
router.post('/upload/nichi', upload.array('files', 10), async (req, res) => {
    try {
        const { beamlineId } = req.body;
        const files = req.files as Express.Multer.File[];

        if (!beamlineId) {
            return res.status(400).json({ error: 'beamlineId is required' });
        }

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedFiles: FileMetadata[] = [];

        for (const file of files) {
            // Upload to Cloud Storage
            const storagePath = await CloudStorageService.uploadNichiFile(beamlineId, file);

            // Create file metadata
            const fileMetadata: FileMetadata = {
                id: uuidv4(),
                filename: file.originalname,
                beamlineId,
                fileType: 'nichi',
                storagePath,
                fileSize: file.size,
                mimeType: file.mimetype,
                uploadedAt: new Date().toISOString(),
                status: 'uploaded',
            };

            // Save metadata to Firestore
            await FirestoreService.saveFileMetadata(fileMetadata);
            uploadedFiles.push(fileMetadata);
        }

        res.json({
            success: true,
            message: `Uploaded ${uploadedFiles.length} Nichi file(s)`,
            files: uploadedFiles,
        });
    } catch (error: any) {
        console.error('Error uploading Nichi files:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get JASRI files for a beamline
 * GET /api/files/jasri/:beamlineId
 */
router.get('/jasri/:beamlineId', async (req, res) => {
    try {
        const { beamlineId } = req.params;
        const files = await FirestoreService.getJasriFiles(beamlineId);

        res.json({
            success: true,
            beamlineId,
            count: files.length,
            files,
        });
    } catch (error: any) {
        console.error('Error getting JASRI files:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get Nichi files for a beamline
 * GET /api/files/nichi/:beamlineId
 */
router.get('/nichi/:beamlineId', async (req, res) => {
    try {
        const { beamlineId } = req.params;
        const files = await FirestoreService.getNichiFiles(beamlineId);

        res.json({
            success: true,
            beamlineId,
            count: files.length,
            files,
        });
    } catch (error: any) {
        console.error('Error getting Nichi files:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Index JASRI files into vector store
 * POST /api/files/index
 */
router.post('/index', async (req, res) => {
    try {
        const { beamlineId } = req.body;

        if (!beamlineId) {
            return res.status(400).json({ error: 'beamlineId is required' });
        }

        // Get all JASRI files for the beamline
        const jasriFiles = await FirestoreService.getJasriFiles(beamlineId);

        if (jasriFiles.length === 0) {
            return res.status(404).json({ error: 'No JASRI files found for this beamline' });
        }

        const indexedFiles: string[] = [];
        const errors: string[] = [];

        // Index each file
        for (const file of jasriFiles) {
            try {
                console.log(`📄 Indexing file: ${file.filename}`);
                console.log(`   Storage path: ${file.storagePath}`);

                // Extract bucket and path from storage path (gs://bucket/path)
                const pathParts = file.storagePath.replace('gs://', '').split('/');
                const bucketName = pathParts[0];
                const filePath = pathParts.slice(1).join('/');

                console.log(`   Bucket: ${bucketName}`);
                console.log(`   File path: ${filePath}`);

                // Download file from Cloud Storage
                const buffer = await CloudStorageService.downloadFile(bucketName, filePath);

                // Process file to extract text
                const processedDoc = await FileProcessorService.processFile(
                    buffer,
                    file.filename,
                    file.mimeType
                );

                console.log(`   Extracted ${processedDoc.content.length} characters`);

                // Index into vector store
                await VectorSearchService.indexDocument(
                    file.id,
                    beamlineId,
                    processedDoc.content,
                    {
                        filename: file.filename,
                        fileType: file.fileType,
                        source: 'jasri',
                    }
                );

                // Update file status
                await FirestoreService.updateFileStatus(file.id, 'indexed');
                indexedFiles.push(file.filename);
                console.log(`   ✅ Successfully indexed`);
            } catch (error: any) {
                console.error(`❌ Error indexing ${file.filename}:`, error);
                console.error(`   Storage path was: ${file.storagePath}`);
                errors.push(`${file.filename}: ${error.message}`);

                // Update file status to error
                try {
                    await FirestoreService.updateFileStatus(file.id, 'error');
                } catch (updateError) {
                    console.error(`   Failed to update status to error:`, updateError);
                }
            }
        }

        // Get indexing stats
        const stats = await VectorSearchService.getIndexStats(beamlineId);

        res.json({
            success: true,
            message: `Indexed ${indexedFiles.length} file(s)`,
            indexedFiles,
            errors: errors.length > 0 ? errors : undefined,
            stats,
        });
    } catch (error: any) {
        console.error('Error indexing files:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get indexing statistics
 * GET /api/files/stats/:beamlineId
 */
router.get('/stats/:beamlineId', async (req, res) => {
    try {
        const { beamlineId } = req.params;
        const stats = await VectorSearchService.getIndexStats(beamlineId);

        res.json({
            success: true,
            beamlineId,
            stats,
        });
    } catch (error: any) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Debug: List actual files in Cloud Storage bucket
 * GET /api/files/debug/storage/:beamlineId
 */
router.get('/debug/storage/:beamlineId', async (req, res) => {
    try {
        const { beamlineId } = req.params;
        const prefix = `${beamlineId}/`;

        const jasriBucket = process.env.JASRI_BUCKET_NAME || 'jasri-knowledge-base';
        const files = await CloudStorageService.listFiles(jasriBucket, prefix);

        res.json({
            success: true,
            beamlineId,
            bucket: jasriBucket,
            prefix,
            filesFound: files.length,
            files: files.map(f => ({
                path: f,
                fullPath: `gs://${jasriBucket}/${f}`,
            })),
        });
    } catch (error: any) {
        console.error('Error listing storage files:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Debug: Verify file paths and fix mismatches
 * POST /api/files/debug/verify/:beamlineId
 */
router.post('/debug/verify/:beamlineId', async (req, res) => {
    try {
        const { beamlineId } = req.params;

        // Get files from Firestore
        const jasriFiles = await FirestoreService.getJasriFiles(beamlineId);

        // Get actual files from Cloud Storage
        const jasriBucket = process.env.JASRI_BUCKET_NAME || 'jasri-knowledge-base';
        const actualFiles = await CloudStorageService.listFiles(jasriBucket, `${beamlineId}/`);

        const results = {
            firestoreFiles: jasriFiles.length,
            storageFiles: actualFiles.length,
            matches: [] as any[],
            mismatches: [] as any[],
            fixed: [] as any[],
        };

        for (const file of jasriFiles) {
            const pathParts = file.storagePath.replace('gs://', '').split('/');
            const filePath = pathParts.slice(1).join('/');

            // Check if file exists at expected path
            const exists = actualFiles.includes(filePath);

            if (exists) {
                results.matches.push({
                    filename: file.filename,
                    storagePath: file.storagePath,
                    status: 'OK',
                });
            } else {
                // Try to find the file by matching filename
                const matchingFile = actualFiles.find(f => {
                    const actualFilename = f.split('/').pop();
                    return actualFilename === file.filename ||
                        decodeURIComponent(actualFilename || '') === file.filename;
                });

                if (matchingFile) {
                    // Found a match - update Firestore
                    const newStoragePath = `gs://${jasriBucket}/${matchingFile}`;

                    // Update the file metadata in Firestore
                    await FirestoreService.saveFileMetadata({
                        ...file,
                        storagePath: newStoragePath,
                    });

                    results.fixed.push({
                        filename: file.filename,
                        oldPath: file.storagePath,
                        newPath: newStoragePath,
                        status: 'FIXED',
                    });
                } else {
                    results.mismatches.push({
                        filename: file.filename,
                        expectedPath: file.storagePath,
                        status: 'NOT_FOUND',
                        suggestion: 'File may need to be re-uploaded',
                    });
                }
            }
        }

        res.json({
            success: true,
            beamlineId,
            results,
        });
    } catch (error: any) {
        console.error('Error verifying files:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
