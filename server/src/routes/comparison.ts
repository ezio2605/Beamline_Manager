import express from 'express';
import { FirestoreService } from '../services/FirestoreService.js';
import { CloudStorageService } from '../services/CloudStorageService.js';
import { FileProcessorService } from '../services/FileProcessorService.js';
import { ComparisonService } from '../services/ComparisonService.js';

const router = express.Router();

/**
 * Compare Nichi files with JASRI files
 * POST /api/comparison/compare
 */
router.post('/compare', async (req, res) => {
    try {
        const { beamlineId, nichiFileIds } = req.body;

        if (!beamlineId) {
            return res.status(400).json({ error: 'beamlineId is required' });
        }

        if (!nichiFileIds || !Array.isArray(nichiFileIds) || nichiFileIds.length === 0) {
            return res.status(400).json({ error: 'nichiFileIds array is required' });
        }

        const results = [];
        const errors = [];

        for (const nichiFileId of nichiFileIds) {
            try {
                // Get Nichi file metadata
                const nichiFile = await FirestoreService.getFileMetadata(nichiFileId);

                if (!nichiFile) {
                    errors.push(`File not found: ${nichiFileId}`);
                    continue;
                }

                // Download Nichi file from Cloud Storage
                const pathParts = nichiFile.storagePath.replace('gs://', '').split('/');
                const bucketName = pathParts[0];
                const filePath = pathParts.slice(1).join('/');

                const buffer = await CloudStorageService.downloadFile(bucketName, filePath);

                // Process file to extract text
                const processedDoc = await FileProcessorService.processFile(
                    buffer,
                    nichiFile.filename,
                    nichiFile.mimeType
                );

                // Compare with JASRI files
                const comparisonResult = await ComparisonService.compareFiles(
                    nichiFile,
                    processedDoc.content
                );

                results.push(comparisonResult);
            } catch (error: any) {
                console.error(`Error comparing file ${nichiFileId}:`, error);
                errors.push(`${nichiFileId}: ${error.message}`);
            }
        }

        res.json({
            success: true,
            message: `Compared ${results.length} file(s)`,
            results,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error: any) {
        console.error('Error in comparison:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get comparison results for a beamline
 * GET /api/comparison/results/:beamlineId
 */
router.get('/results/:beamlineId', async (req, res) => {
    try {
        const { beamlineId } = req.params;
        const results = await FirestoreService.getComparisonResults(beamlineId);

        res.json({
            success: true,
            beamlineId,
            count: results.length,
            results,
        });
    } catch (error: any) {
        console.error('Error getting comparison results:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get a specific comparison result
 * GET /api/comparison/result/:resultId
 */
router.get('/result/:resultId', async (req, res) => {
    try {
        const { resultId } = req.params;

        // Get from Firestore
        const result = await FirestoreService.getComparisonResult(resultId);

        if (!result) {
            return res.status(404).json({ error: 'Comparison result not found' });
        }

        res.json({
            success: true,
            result,
        });
    } catch (error: any) {
        console.error('Error getting comparison result:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get comparison statistics for a beamline
 * GET /api/comparison/stats/:beamlineId
 */
router.get('/stats/:beamlineId', async (req, res) => {
    try {
        const { beamlineId } = req.params;
        const results = await FirestoreService.getComparisonResults(beamlineId);

        const stats = {
            total: results.length,
            case1: results.filter(r => r.case === 'case1').length,
            case2: results.filter(r => r.case === 'case2').length,
            case3: results.filter(r => r.case === 'case3').length,
        };

        res.json({
            success: true,
            beamlineId,
            stats,
        });
    } catch (error: any) {
        console.error('Error getting comparison stats:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
