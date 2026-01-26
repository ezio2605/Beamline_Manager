import express, { Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { VertexAI } from '@google-cloud/vertexai';
import { StandardStructureService } from '../services/StandardStructureService.js';
import { VectorSearchService } from '../services/VectorSearchService.js';
import { MissingElementsAnalyzer } from '../services/MissingElementsAnalyzer.js';
import { VendorComparisonService } from '../services/VendorComparisonService.js';
import { FileProcessorService } from '../services/FileProcessorService.js';
import { FirestoreService } from '../services/FirestoreService.js';
import { CloudStorageService } from '../services/CloudStorageService.js';

// Initialize Vertex AI for conversational analysis
const vertexAI = new VertexAI({
    project: process.env.GCP_PROJECT_ID || '',
    location: process.env.GCP_LOCATION || 'us-central1',
});

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

        // Index document in vector store for RAG
        console.log(`🔍 Indexing document ${documentId} in vector store...`);
        await VectorSearchService.indexDocument(
            documentId,
            beamlineId,
            processedDoc.content,
            {
                filename: filename,
                vendor: vendor,
                uploadedAt: new Date().toISOString(),
            }
        );

        const totalChunks = processedDoc.chunks.length;
        console.log(`✅ Indexed ${totalChunks} chunks for document ${documentId}`);

        // Start RAG-based analysis process (async)
        // We'll return immediately and let the client poll for status
        setImmediate(async () => {
            try {
                console.log(`🤖 Starting RAG-based analysis for document ${documentId}...`);

                // Use RAG to analyze document against standard structure
                const analysisPrompt = buildAnalysisPrompt(
                    processedDoc.content,
                    standardStructure,
                    vendor
                );

                // Get similar documents from vector store for context
                const similarDocs = await VectorSearchService.searchSimilar(
                    processedDoc.content.substring(0, 2000), // Use first 2000 chars as query
                    beamlineId,
                    3
                );

                // Call Gemini AI for analysis
                const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
                const result = await model.generateContent(analysisPrompt);
                const aiResponse = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

                // Parse AI response and generate report
                const report = parseAIAnalysis(
                    aiResponse,
                    documentId,
                    beamlineId,
                    standardStructure,
                    similarDocs
                );

                await FirestoreService.saveMissingElementsReport(report);

                console.log(`✅ RAG-based analysis complete for document ${documentId}`);
            } catch (error) {
                console.error(`Error during RAG analysis for document ${documentId}:`, error);
            }
        });

        res.status(202).json({
            success: true,
            data: {
                documentId,
                filename,
                beamlineId,
                totalChunks,
                status: 'processing',
            },
            message: 'Document uploaded and RAG-based analysis started',
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
 * Helper: Build AI analysis prompt for document against standard structure
 */
function buildAnalysisPrompt(
    content: string,
    standardStructure: any,
    vendor: string
): string {
    const sections = standardStructure.sections.map((s: any) =>
        `- ${s.name} (${s.required ? 'REQUIRED' : 'Optional'}): ${s.description || 'No description'}`
    ).join('\n');

    return `You are analyzing a beamline operation manual against a standard structure.

**Vendor**: ${vendor}
**Standard Structure**: ${standardStructure.name} v${standardStructure.version}

**Required Sections**:
${sections}

**Document Content** (first 5000 characters):
${content.substring(0, 5000)}

**Your Task**:
Analyze this manual and determine:
1. Which required sections are present
2. Which required sections are missing
3. Coverage quality for each section
4. Overall compliance percentage
5. Specific recommendations for improvement

**Response Format**:
Provide your analysis in this exact format:

COVERAGE_PERCENTAGE: [0-100]

FOUND_SECTIONS:
[List section names that are present, one per line]

MISSING_SECTIONS:
[List section names that are missing, one per line]

CATEGORY_BREAKDOWN:
[For each category, provide: CategoryName: X/Y found (Z%)]

KEY_INSIGHTS:
[Provide detailed insights about the manual quality, completeness, and specific issues]

RECOMMENDATIONS:
[Provide specific, actionable recommendations for improving the manual]

Be precise and technical in your analysis.`;
}

/**
 * Helper: Parse AI analysis response into a missing elements report
 */
function parseAIAnalysis(
    aiResponse: string,
    documentId: string,
    beamlineId: string,
    standardStructure: any,
    similarDocs: any[]
): any {
    // Extract coverage percentage
    const coverageMatch = aiResponse.match(/COVERAGE_PERCENTAGE:\s*(\d+)/i);
    const coveragePercentage = coverageMatch ? parseInt(coverageMatch[1]) : 0;

    // Extract found sections
    const foundMatch = aiResponse.match(/FOUND_SECTIONS:([\s\S]*?)(?:MISSING_SECTIONS:|KEY_INSIGHTS:|$)/i);
    const foundSectionNames = foundMatch
        ? foundMatch[1].trim().split('\n')
            .filter(s => s.trim())
            .map(s => s.trim().replace(/^[-*•]\s*/, '')) // Remove bullet points
            .filter(s => s.length > 0)
        : [];

    // Extract missing sections
    const missingMatch = aiResponse.match(/MISSING_SECTIONS:([\s\S]*?)(?:CATEGORY_BREAKDOWN:|KEY_INSIGHTS:|$)/i);
    const missingSectionNames = missingMatch
        ? missingMatch[1].trim().split('\n')
            .filter(s => s.trim())
            .map(s => s.trim().replace(/^[-*•]\s*/, '')) // Remove bullet points
            .filter(s => s.length > 0)
        : [];

    // Extract insights
    const insightsMatch = aiResponse.match(/KEY_INSIGHTS:([\s\S]*?)(?:RECOMMENDATIONS:|$)/i);
    const insights = insightsMatch ? insightsMatch[1].trim() : '';

    // Extract recommendations
    const recsMatch = aiResponse.match(/RECOMMENDATIONS:([\s\S]*?)$/i);
    const recommendations = recsMatch
        ? recsMatch[1].trim().split('\n')
            .filter(s => s.trim())
            .map(s => s.trim().replace(/^[-*•]\s*/, '')) // Remove bullet points
            .filter(s => s.length > 0)
        : [];

    // Build found sections array
    const foundSections = foundSectionNames.map(name => {
        const section = standardStructure.sections.find((s: any) =>
            s.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(s.name.toLowerCase())
        );
        return {
            sectionId: section?.id || name,
            sectionName: section?.name || name,
            category: section?.category || 'Unknown',
            required: section?.required || false,
        };
    });

    // Build missing sections array
    const missingSections = missingSectionNames.map(name => {
        const section = standardStructure.sections.find((s: any) =>
            s.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(s.name.toLowerCase())
        );
        return {
            sectionId: section?.id || name,
            sectionName: section?.name || name,
            category: section?.category || 'Unknown',
            required: section?.required || false,
            recommendation: `Add section: ${section?.name || name}`,
        };
    });

    // Build category breakdown
    const categories = new Set(standardStructure.sections.map((s: any) => s.category));
    const categoryBreakdown = Array.from(categories).map(category => {
        const totalInCategory = standardStructure.sections.filter((s: any) => s.category === category).length;
        const foundInCategory = foundSections.filter(s => s.category === category).length;
        return {
            category,
            total: totalInCategory,
            found: foundInCategory,
            percentage: totalInCategory > 0 ? Math.round((foundInCategory / totalInCategory) * 100) : 0,
        };
    });

    // Add RAG context to insights
    let enhancedInsights = insights;
    if (similarDocs.length > 0) {
        enhancedInsights += `\n\n**RAG Analysis**: Found ${similarDocs.length} similar document(s) with top similarity of ${(similarDocs[0].score * 100).toFixed(1)}%.`;
    }

    return {
        id: `${documentId}_report`,
        documentId,
        beamlineId,
        standardStructureId: standardStructure.id,
        coveragePercentage,
        foundSections,
        missingSections,
        categoryBreakdown,
        aiInsights: enhancedInsights,
        recommendations,
        generatedAt: new Date().toISOString(),
    };
}

/**
 * GET /api/semantic-comparison/:documentId/status
 * Get processing status for a document
 */
router.get('/:documentId/status', async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;

        // Get vector documents by fileId (documentId is the fileId)
        const vectorDocs = await FirestoreService.getVectorDocumentsByFileId(documentId);
        const report = await FirestoreService.getMissingElementsReport(documentId);

        const totalChunks = vectorDocs.length;
        const isComplete = report !== null;

        // For RAG-based approach, we consider it complete when report exists
        const processedChunks = isComplete ? totalChunks : 0;

        res.json({
            success: true,
            data: {
                documentId,
                totalChunks,
                processedChunks,
                isComplete,
                status: isComplete ? 'completed' : 'processing',
                progress: isComplete ? 100 : 50, // Simple progress: 50% during processing, 100% when done
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
 * POST /api/semantic-comparison/:documentId/ask
 * Ask questions about a document (NotebookLM-style Q&A)
 */
router.post('/:documentId/ask', async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({
                success: false,
                error: 'Question is required',
            });
        }

        // Get document from vector store by fileId
        const vectorDocs = await FirestoreService.getVectorDocumentsByFileId(documentId);

        if (vectorDocs.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not yet indexed',
            });
        }

        // Use RAG to find relevant chunks
        const beamlineId = vectorDocs[0].beamlineId;
        const relevantDocs = await VectorSearchService.searchSimilar(question, beamlineId, 5);

        // Build context from relevant chunks
        const context = relevantDocs
            .map((doc, idx) => `[Chunk ${idx + 1}]: ${doc.document.content}`)
            .join('\n\n');

        // Build Q&A prompt
        const qaPrompt = `You are a helpful assistant analyzing a beamline operation manual.

**User Question**: ${question}

**Relevant Document Sections**:
${context}

**Instructions**:
- Answer the question based ONLY on the provided document sections
- Be specific and cite relevant details from the document
- If the information is not in the provided sections, say so
- Keep your answer concise but comprehensive

**Answer**:`;

        // Call Gemini AI
        const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        const result = await model.generateContent(qaPrompt);
        const answer = result.response.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate answer';

        res.json({
            success: true,
            data: {
                question,
                answer,
                sources: relevantDocs.map(doc => ({
                    content: doc.document.content.substring(0, 200) + '...',
                    score: doc.score,
                })),
            },
        });
    } catch (error) {
        console.error('Error answering question:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to answer question',
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
