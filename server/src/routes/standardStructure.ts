import express, { Request, Response } from 'express';
import { StandardStructureService } from '../services/StandardStructureService.js';

const router = express.Router();

/**
 * GET /api/standard-structure
 * Get the active standard structure
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const structure = await StandardStructureService.getActiveStructure();

        if (!structure) {
            return res.status(404).json({
                success: false,
                error: 'No active standard structure found',
            });
        }

        res.json({
            success: true,
            data: structure,
        });
    } catch (error) {
        console.error('Error getting active structure:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get active structure',
        });
    }
});

/**
 * GET /api/standard-structure/all
 * Get all standard structures
 */
router.get('/all', async (req: Request, res: Response) => {
    try {
        const structures = await StandardStructureService.getAllStructures();

        res.json({
            success: true,
            data: structures,
        });
    } catch (error) {
        console.error('Error getting all structures:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get structures',
        });
    }
});

/**
 * GET /api/standard-structure/:id
 * Get a specific standard structure by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const structure = await StandardStructureService.getStructureById(id);

        if (!structure) {
            return res.status(404).json({
                success: false,
                error: 'Standard structure not found',
            });
        }

        res.json({
            success: true,
            data: structure,
        });
    } catch (error) {
        console.error('Error getting structure:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get structure',
        });
    }
});

/**
 * POST /api/standard-structure
 * Create a new standard structure
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, description, sections, version } = req.body;

        // Validate input
        if (!name || !sections || !Array.isArray(sections)) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name and sections',
            });
        }

        // Validate structure
        const validation = StandardStructureService.validateStructure({ name, sections, version });
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid structure',
                details: validation.errors,
            });
        }

        const structure = await StandardStructureService.createStructure(
            name,
            description || '',
            sections,
            version
        );

        res.status(201).json({
            success: true,
            data: structure,
        });
    } catch (error) {
        console.error('Error creating structure:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create structure',
        });
    }
});

/**
 * PUT /api/standard-structure/:id
 * Update a standard structure
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const structure = await StandardStructureService.updateStructure(id, updates);

        res.json({
            success: true,
            data: structure,
        });
    } catch (error) {
        console.error('Error updating structure:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update structure',
        });
    }
});

/**
 * DELETE /api/standard-structure/:id
 * Delete a standard structure
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await StandardStructureService.deleteStructure(id);

        res.json({
            success: true,
            message: 'Structure deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting structure:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete structure',
        });
    }
});

/**
 * POST /api/standard-structure/:id/activate
 * Activate a standard structure
 */
router.post('/:id/activate', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const structure = await StandardStructureService.activateStructure(id);

        res.json({
            success: true,
            data: structure,
            message: 'Structure activated successfully',
        });
    } catch (error) {
        console.error('Error activating structure:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to activate structure',
        });
    }
});

/**
 * POST /api/standard-structure/import
 * Import a standard structure from JSON
 */
router.post('/import', async (req: Request, res: Response) => {
    try {
        const { jsonData } = req.body;

        if (!jsonData) {
            return res.status(400).json({
                success: false,
                error: 'Missing jsonData field',
            });
        }

        const structure = await StandardStructureService.importStructure(jsonData);

        res.status(201).json({
            success: true,
            data: structure,
            message: 'Structure imported successfully',
        });
    } catch (error) {
        console.error('Error importing structure:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to import structure',
        });
    }
});

/**
 * GET /api/standard-structure/:id/export
 * Export a standard structure as JSON
 */
router.get('/:id/export', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const jsonData = await StandardStructureService.exportStructure(id);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="standard-structure-${id}.json"`);
        res.send(jsonData);
    } catch (error) {
        console.error('Error exporting structure:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to export structure',
        });
    }
});

/**
 * POST /api/standard-structure/default
 * Create a default standard structure template
 */
router.post('/default', async (req: Request, res: Response) => {
    try {
        const structure = await StandardStructureService.createDefaultStructure();

        res.status(201).json({
            success: true,
            data: structure,
            message: 'Default structure created successfully',
        });
    } catch (error) {
        console.error('Error creating default structure:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create default structure',
        });
    }
});

export default router;
