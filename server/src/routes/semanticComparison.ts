import express, { Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { StandardStructureService } from '../services/StandardStructureService.js';
import { SemanticChunkingService } from '../services/SemanticChunkingService.js';
import { SectionClassificationService } from '../services/SectionClassificationService.js';
import { MissingElementsAnalyzer } from '../services/MissingElementsAnalyzer.js';
import { VendorComparisonService } from '../services/VendorComparisonService.js';
import { FileProcessorService } from '../services/FileProcessorService.js';
import { FirestoreService } from '../services/FirestoreService.js';
import { CloudStorageService } from '../services/CloudStorageService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/semantic-comparison/upload
 * Upload a manual for semantic analysis
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
            });
        }

        const { beamlineId, vendor } = req.body;

        if (!beamlineId) {
            return res.status(400).json({
                success: false,
                error: 'Missing beamlineId',
            });
        }

        const documentId = uuidv4();
        const filename = req.file.originalname;

        // Upload file to Cloud Storage - use vendor-specific buckets
        let bucketName: string;
        if (vendor === 'JASRI') {
            bucketName = process.env.JASRI_BUCKET_NAME || 'jasri-uploads';
        } else if (vendor === 'Nichigi') {
            bucketName = process.env.NICHI_BUCKET_NAME || 'nichi-uploads';
        } else {
            bucketName = process.env.OTHERS_BUCKET_NAME || 'others-uploads';
        }
        const storagePath = `semantic-comparison/${beamlineId}/${documentId}/${filename}`;

        await CloudStorageService.uploadFile(bucketName, req.file, storagePath);

        // Process file to extract text
        const processedDoc = await FileProcessorService.processFile(
            req.file.buffer,
            filename,
            req.file.mimetype
        );

        // Get active standard structure
        const standardStructure = await StandardStructureService.getActiveStructure();
        if (!standardStructure) {
            return res.status(400).json({
                success: false,
                error: 'No active standard structure found. Please create and activate a standard structure first.',
            });
        }

        // Create semantic chunks
        const chunks = await SemanticChunkingService.chunkDocument(
            documentId,
            beamlineId,
            processedDoc.content,
            {
                chunkSize: 1000,
                overlap: 200,
                preserveStructure: true,
                generateEmbeddings: false, // Skip embeddings for now to save time
            }
        );

        // Save chunks to Firestore
        for (const chunk of chunks) {
            await FirestoreService.saveSemanticChunk(chunk);
        }

        // Start classification process (async)
        // We'll return immediately and let the client poll for status
        setImmediate(async () => {
            try {
                // Get vendor profile if available
                const vendorProfile = vendor ? await FirestoreService.getVendorProfile(vendor) : null;

                // Classify chunks
                const classifications = await SectionClassificationService.batchClassify(
                    chunks,
                    standardStructure,
                    vendorProfile || undefined
                );

                // Save classifications
                for (const classification of classifications) {
                    await FirestoreService.saveSectionClassification(classification);
                }

                // Generate missing elements report
                const report = await MissingElementsAnalyzer.analyzeDocument(
                    documentId,
                    beamlineId,
                    classifications,
                    standardStructure
                );

                await FirestoreService.saveMissingElementsReport(report);

                console.log(`✅ Semantic analysis complete for document ${documentId}`);
            } catch (error) {
                console.error(`Error during semantic analysis for document ${documentId}:`, error);
            }
        });

        res.status(202).json({
            success: true,
            data: {
                documentId,
                filename,
                beamlineId,
                totalChunks: chunks.length,
                status: 'processing',
            },
            message: 'Document uploaded and processing started',
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload document',
        });
    }
});

/**
 * GET /api/semantic-comparison/:documentId/status
 * Get processing status for a document
 */
router.get('/:documentId/status', async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;

        const chunks = await FirestoreService.getSemanticChunksByDocument(documentId);
        const classifications = await FirestoreService.getSectionClassificationsByDocument(documentId);
        const report = await FirestoreService.getMissingElementsReport(documentId);

        const totalChunks = chunks.length;
        const processedChunks = classifications.length;
        const isComplete = report !== null;

        res.json({
            success: true,
            data: {
                documentId,
                totalChunks,
                processedChunks,
                isComplete,
                status: isComplete ? 'completed' : 'processing',
                progress: totalChunks > 0 ? Math.round((processedChunks / totalChunks) * 100) : 0,
            },
        });
    } catch (error) {
        console.error('Error getting status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get status',
        });
    }
});

/**
 * GET /api/semantic-comparison/:documentId/classifications
 * Get all classifications for a document
 */
router.get('/:documentId/classifications', async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;

        const classifications = await FirestoreService.getSectionClassificationsByDocument(documentId);

        // Get statistics
        const stats = SectionClassificationService.getClassificationStatistics(classifications);

        res.json({
            success: true,
            data: {
                classifications,
                statistics: stats,
            },
        });
    } catch (error) {
        console.error('Error getting classifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get classifications',
        });
    }
});

/**
 * GET /api/semantic-comparison/:documentId/missing-elements
 * Get missing elements report for a document
 */
router.get('/:documentId/missing-elements', async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;

        const report = await FirestoreService.getMissingElementsReport(documentId);

        if (!report) {
            return res.status(404).json({
                success: false,
                error: 'Report not found. Document may still be processing.',
            });
        }

        // Generate summary and recommendations
        const summary = MissingElementsAnalyzer.generateSummary(report);
        const recommendations = MissingElementsAnalyzer.generateRecommendations(report);
        const status = MissingElementsAnalyzer.getCoverageStatus(report);

        res.json({
            success: true,
            data: {
                report,
                summary,
                recommendations,
                status,
            },
        });
    } catch (error) {
        console.error('Error getting missing elements report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get missing elements report',
        });
    }
});

/**
 * POST /api/semantic-comparison/:documentId/review
 * Submit manual review/override for a classification
 */
router.post('/:documentId/review', async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;
        const { classificationId, action, newMatches, reviewedBy } = req.body;

        if (!classificationId || !action || !reviewedBy) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: classificationId, action, reviewedBy',
            });
        }

        if (action === 'approve') {
            await FirestoreService.updateClassificationStatus(classificationId, 'approved', reviewedBy);
        } else if (action === 'reject') {
            await FirestoreService.updateClassificationStatus(classificationId, 'rejected', reviewedBy);
        } else if (action === 'override' && newMatches) {
            // Override with new matches
            const classifications = await FirestoreService.getSectionClassificationsByDocument(documentId);
            const classification = classifications.find(c => c.id === classificationId);

            if (!classification) {
                return res.status(404).json({
                    success: false,
                    error: 'Classification not found',
                });
            }

            const overridden = SectionClassificationService.overrideClassification(
                classification,
                newMatches,
                reviewedBy
            );

            await FirestoreService.saveSectionClassification(overridden);
        } else {
            return res.status(400).json({
                success: false,
                error: 'Invalid action. Must be: approve, reject, or override',
            });
        }

        res.json({
            success: true,
            message: 'Review submitted successfully',
        });
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit review',
        });
    }
});

/**
 * GET /api/semantic-comparison/:documentId/coverage
 * Get section coverage data for visualization
 */
router.get('/:documentId/coverage', async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;

        const report = await FirestoreService.getMissingElementsReport(documentId);

        if (!report) {
            return res.status(404).json({
                success: false,
                error: 'Report not found',
            });
        }

        res.json({
            success: true,
            data: {
                coveragePercentage: report.coveragePercentage,
                categoryBreakdown: report.categoryBreakdown,
                foundSections: report.foundSections,
                missingSections: report.missingSections,
            },
        });
    } catch (error) {
        console.error('Error getting coverage data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get coverage data',
        });
    }
});

/**
 * POST /api/semantic-comparison/compare-vendors
 * Compare documents from different vendors
 */
router.post('/compare-vendors', async (req: Request, res: Response) => {
    try {
        const { document1Id, document2Id, vendor1, vendor2, beamlineId } = req.body;

        if (!document1Id || !document2Id || !vendor1 || !vendor2 || !beamlineId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            });
        }

        // Get chunks and classifications for both documents
        const chunks1 = await FirestoreService.getSemanticChunksByDocument(document1Id);
        const chunks2 = await FirestoreService.getSemanticChunksByDocument(document2Id);
        const classifications1 = await FirestoreService.getSectionClassificationsByDocument(document1Id);
        const classifications2 = await FirestoreService.getSectionClassificationsByDocument(document2Id);

        // Perform comparison
        const comparison = await VendorComparisonService.compareDocuments(
            document1Id,
            document2Id,
            vendor1,
            vendor2,
            beamlineId,
            classifications1,
            classifications2,
            chunks1,
            chunks2
        );

        // Save comparison
        await FirestoreService.saveVendorComparison(comparison);

        // Generate summary
        const summary = VendorComparisonService.generateSummary(comparison);
        const significantDiffs = VendorComparisonService.getSignificantDifferences(comparison);

        res.json({
            success: true,
            data: {
                comparison,
                summary,
                significantDifferences: significantDiffs,
            },
        });
    } catch (error) {
        console.error('Error comparing vendors:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to compare vendors',
        });
    }
});

/**
 * GET /api/semantic-comparison/:documentId/semantic-delta/:compareDocId
 * Get semantic delta between two documents
 */
router.get('/:documentId/semantic-delta/:compareDocId', async (req: Request, res: Response) => {
    try {
        const { documentId, compareDocId } = req.params;

        // Find existing comparison
        const comparisons = await FirestoreService.getVendorComparisonsByBeamline(req.query.beamlineId as string);
        const comparison = comparisons.find(
            c =>
                (c.document1Id === documentId && c.document2Id === compareDocId) ||
                (c.document1Id === compareDocId && c.document2Id === documentId)
        );

        if (!comparison) {
            return res.status(404).json({
                success: false,
                error: 'Comparison not found. Please run a vendor comparison first.',
            });
        }

        res.json({
            success: true,
            data: {
                deltas: comparison.deltas,
                overallSimilarity: comparison.overallSimilarity,
            },
        });
    } catch (error) {
        console.error('Error getting semantic delta:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get semantic delta',
        });
    }
});

/**
 * GET /api/semantic-comparison/beamline/:beamlineId/reports
 * Get all reports for a beamline
 */
router.get('/beamline/:beamlineId/reports', async (req: Request, res: Response) => {
    try {
        const { beamlineId } = req.params;

        const reports = await FirestoreService.getMissingElementsReportsByBeamline(beamlineId);

        res.json({
            success: true,
            data: reports,
        });
    } catch (error) {
        console.error('Error getting reports:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get reports',
        });
    }
});

/**
 * DELETE /api/semantic-comparison/:documentId
 * Delete all semantic data for a document
 */
router.delete('/:documentId', async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;

        await FirestoreService.deleteSemanticDataForDocument(documentId);

        res.json({
            success: true,
            message: 'Document data deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting document data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete document data',
        });
    }
});

export default router;
