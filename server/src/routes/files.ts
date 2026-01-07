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
                // Extract bucket and path from storage path (gs://bucket/path)
                const pathParts = file.storagePath.replace('gs://', '').split('/');
                const bucketName = pathParts[0];
                const filePath = pathParts.slice(1).join('/');

                // Download file from Cloud Storage
                const buffer = await CloudStorageService.downloadFile(bucketName, filePath);

                // Process file to extract text
                const processedDoc = await FileProcessorService.processFile(
                    buffer,
                    file.filename,
                    file.mimeType
                );

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
            } catch (error: any) {
                console.error(`Error indexing ${file.filename}:`, error);
                errors.push(`${file.filename}: ${error.message}`);
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

export default router;
