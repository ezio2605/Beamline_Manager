import express, { Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { VertexAIHelper } from '../utils/VertexAIHelper.js';
import { StandardStructureService } from '../services/StandardStructureService.js';
import { VectorSearchService } from '../services/VectorSearchService.js';
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
        const displayVendor = (vendor === 'None' || !vendor) ? 'Not Specified' : vendor;

        if (!beamlineId) {
            return res.status(400).json({
                success: false,
                error: 'Missing beamlineId',
            });
        }

        const documentId = uuidv4();
        const filename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

        // Upload file to Cloud Storage - use vendor-specific buckets
        let bucketName: string;
        if (displayVendor === 'JASRI') {
            bucketName = process.env.JASRI_BUCKET_NAME || 'jasri-uploads';
        } else if (displayVendor === 'Nichigi') {
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
                vendor: displayVendor,
                uploadedAt: new Date().toISOString(),
            }
        );

        const totalChunks = processedDoc.chunks.length;
        console.log(`✅ Indexed ${totalChunks} chunks for document ${documentId}`);

        // Don't auto-start analysis - let user trigger it manually
        // This allows uploading multiple files before analyzing

        res.status(200).json({
            success: true,
            data: {
                documentId,
                filename,
                beamlineId,
                totalChunks,
                status: 'uploaded',
            },
            message: 'Document uploaded successfully. Ready for analysis.',
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
 * POST /api/semantic-comparison/:documentId/analyze
 * Manually trigger analysis for an uploaded document
 */
router.post('/:documentId/analyze', async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;

        // Get vector documents to retrieve metadata
        const vectorDocs = await FirestoreService.getVectorDocumentsByFileId(documentId);

        if (vectorDocs.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not indexed',
            });
        }

        const beamlineId = vectorDocs[0].beamlineId;
        const vendor = vectorDocs[0].metadata?.vendor || 'Not Specified';

        // Get active standard structure
        const standardStructure = await StandardStructureService.getActiveStructure();
        if (!standardStructure) {
            return res.status(400).json({
                success: false,
                error: 'No active standard structure found',
            });
        }

        // Start Category-based RAG analysis (async)
        setImmediate(async () => {
            try {
                // Import dynamically to avoid circular deps if any (though unlikely here)
                const { SemanticAnalysisService } = await import('../services/SemanticAnalysisService.js');

                const report = await SemanticAnalysisService.analyzeDocument(
                    documentId,
                    beamlineId,
                    standardStructure,
                    vendor
                );

                await FirestoreService.saveMissingElementsReport(report);

                console.log(`✅ Analysis complete for document ${documentId}`);
            } catch (error) {
                console.error(`Error during analysis for document ${documentId}:`, error);
            }
        });

        res.status(202).json({
            success: true,
            message: 'Analysis started (Category-based RAG)',
        });
    } catch (error) {
        console.error('Error starting analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start analysis',
        });
    }
});

/**
 * POST /api/semantic-comparison/analyze-batch
 * Analyze multiple documents together and generate a combined report
 */
router.post('/analyze-batch', async (req: Request, res: Response) => {
    try {
        const { documentIds } = req.body;

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'documentIds array is required',
            });
        }

        // Get vector documents for all selected files
        const allVectorDocs = await FirestoreService.getVectorDocumentsByMultipleFileIds(documentIds);

        if (allVectorDocs.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No documents found',
            });
        }

        // Get metadata from first document
        const beamlineId = allVectorDocs[0].beamlineId;

        // Collect document metadata
        const documentMetadata = documentIds.map(docId => {
            const docVectors = allVectorDocs.filter(v => v.fileId === docId);
            return {
                documentId: docId,
                filename: docVectors[0]?.metadata?.filename || 'Unknown',
                beamlineId: docVectors[0]?.beamlineId || beamlineId,
                vendor: docVectors[0]?.metadata?.vendor || 'Not Specified',
            };
        });

        // Get active standard structure
        const standardStructure = await StandardStructureService.getActiveStructure();
        if (!standardStructure) {
            return res.status(400).json({
                success: false,
                error: 'No active standard structure found',
            });
        }

        // Start combined Long Context analysis (async)
        setImmediate(async () => {
            try {
                console.log(`🤖 Starting combined Long Context analysis for ${documentIds.length} documents...`);

                // Construct full content from all documents
                const fullContent = documentMetadata.map(meta => {
                    const docVectors = allVectorDocs.filter(v => v.fileId === meta.documentId);
                    const content = docVectors.map(v => v.content).join('\n');
                    return `DOCUMENT START: ${meta.filename} (Vendor: ${meta.vendor})\n${content}\nDOCUMENT END`;
                }).join('\n\n');

                const vendorList = [...new Set(documentMetadata.map(m => m.vendor))].join(', ');

                const analysisPrompt = buildCombinedFullAnalysisPrompt(
                    fullContent,
                    standardStructure,
                    vendorList,
                    documentMetadata
                );

                const aiResponse = await VertexAIHelper.generateContentWithRetry(analysisPrompt, 'gemini-2.0-flash-exp', {
                    temperature: 0.2,
                    maxOutputTokens: 8192,
                });

                // Get similar documents from vector store for context (general context)
                const similarDocs = await VectorSearchService.searchSimilar(
                    allVectorDocs[0].content.substring(0, 1000),
                    beamlineId,
                    5
                );

                // Parse AI response and generate combined report
                const sortedIds = [...documentIds].sort();
                const combinedId = `combined_${sortedIds.join('_')}`;

                const report = parseFullDocumentAIAnalysis(
                    aiResponse,
                    combinedId,
                    beamlineId,
                    standardStructure,
                    similarDocs
                );

                // Add combined report metadata
                report.documentIds = documentIds;
                report.documentMetadata = documentMetadata;
                report.isCombined = true;

                await FirestoreService.saveCombinedReport(report);

                console.log(`✅ Combined Long Context analysis complete for ${documentIds.length} documents`);
            } catch (error) {
                console.error(`Error during combined Long Context analysis:`, error);
            }
        });

        res.status(202).json({
            success: true,
            message: 'Combined analysis started',
            data: {
                documentIds,
                documentCount: documentIds.length,
            },
        });
    } catch (error) {
        console.error('Error starting combined analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start combined analysis',
        });
    }
});

/**
 * Helper: Build AI analysis prompt for the FULL DOCUMENT
 */
function buildFullDocumentAnalysisPrompt(
    content: string,
    standardStructure: any,
    vendor: string
): string {
    const allSections = standardStructure.sections.map((s: any) =>
        `- ${s.name} (${s.required ? 'REQUIRED' : 'Optional'}, Category: ${s.category}): ${s.description || 'No description'}`
    ).join('\n');

    return `You are analyzing a beamline operation manual.
    
**Vendor**: ${vendor || 'Not Specified'}
**Standard Structure**: ${standardStructure.name} v${standardStructure.version}

**All Required Sections**:
${allSections}

**Document Content**:
${content}

**Your Task**:
Analyze the entire manual and determine which of the target sections are present or missing.

**Response Format**:
Respond ONLY with this format:

COVERAGE_PERCENTAGE: [0-100]

FOUND_SECTIONS:
[List ALL section names found, one per line]

MISSING_SECTIONS:
[List ALL section names missing, one per line]

CATEGORY_BREAKDOWN:
[For each category: CategoryName: X/Y found (Z%)]

KEY_INSIGHTS:
[Overall manual quality summary]

RECOMMENDATIONS:
[Top prioritized recommendations]`;
}

/**
 * Helper: Build AI analysis prompt for COMBINED analysis of MULTIPLE documents
 */
function buildCombinedFullAnalysisPrompt(
    content: string,
    standardStructure: any,
    vendorList: string,
    documentMetadata: any[]
): string {
    const allSections = standardStructure.sections.map((s: any) =>
        `- ${s.name} (${s.required ? 'REQUIRED' : 'Optional'}, Category: ${s.category}): ${s.description || 'No description'}`
    ).join('\n');

    const docList = documentMetadata.map((doc, idx) =>
        `${idx + 1}. ${doc.filename} (Vendor: ${doc.vendor})`
    ).join('\n');

    return `You are analyzing multiple beamline operation manuals COLLECTIVELY.

**Documents Being Analyzed**:
${docList}

**Vendors Involved**: ${vendorList || 'Not Specified'}
**Standard Structure**: ${standardStructure.name} v${standardStructure.version}

**All Required Sections**:
${allSections}

**Combined Document Content**:
${content}

**Your Task**:
Analyze these manuals and determine which of the target sections are present in at least one of them.

**Response Format**:
Respond ONLY with this format:

COVERAGE_PERCENTAGE: [0-100]

FOUND_SECTIONS:
[List ALL section names found, one per line]

MISSING_SECTIONS:
[List ALL section names missing, one per line]

CATEGORY_BREAKDOWN:
[For each category: CategoryName: X/Y found (Z%)]

KEY_INSIGHTS:
[Overall manual quality summary across all documents]

RECOMMENDATIONS:
[Top prioritized recommendations]`;
}

/**
 * Helper: Parse Full Document AI analysis response into a missing elements report
 * (Reuses much of the logic from the old parseAIAnalysis, but adapted if needed)
 */
function parseFullDocumentAIAnalysis(
    aiResponse: string,
    documentId: string,
    beamlineId: string,
    standardStructure: any,
    similarDocs: any[]
): any {
    // Re-use the parsing logic as the output format is designed to be compatible
    return parseAIAnalysis(aiResponse, documentId, beamlineId, standardStructure, similarDocs);
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
            .map(s => s.trim()
                .replace(/^\d+\.\s*/, '')      // Remove numbered lists (1. 2. 3.)
                .replace(/^[-*•]\s*/, '')      // Remove bullet points
                .replace(/\*\*/g, '')          // Remove bold markdown **
                .replace(/\*/g, '')            // Remove asterisks
            )
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
            // recommendation: `Add section: ${section?.name || name}`,
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


    const report = {
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

    console.log(`📊 Parsed ${recommendations.length} recommendations:`, recommendations);

    return report;
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
 * POST /api/semantic-comparison/batch-status
 * Get processing status for multiple documents (combined analysis)
 */
router.post('/batch-status', async (req: Request, res: Response) => {
    try {
        const { documentIds } = req.body;

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'documentIds array is required',
            });
        }

        // Get combined report
        const report = await FirestoreService.getCombinedReport(documentIds);
        const isComplete = report !== null;

        res.json({
            success: true,
            data: {
                documentIds,
                documentCount: documentIds.length,
                isComplete,
                status: isComplete ? 'completed' : 'processing',
                progress: isComplete ? 100 : 50,
            },
        });
    } catch (error) {
        console.error('Error getting batch status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get batch status',
        });
    }
});


/**
 * POST /api/semantic-comparison/:documentId/ask
 * Ask questions about a document or multiple documents (NotebookLM-style Q&A)
 */
router.post('/:documentId/ask', async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;
        const { question, documentIds } = req.body;

        if (!question) {
            return res.status(400).json({
                success: false,
                error: 'Question is required',
            });
        }

        // Support both single document (from params) and multiple documents (from body)
        const targetDocIds = documentIds && Array.isArray(documentIds) && documentIds.length > 0
            ? documentIds
            : [documentId];

        // Get documents from vector store
        const vectorDocs = await FirestoreService.getVectorDocumentsByMultipleFileIds(targetDocIds);

        if (vectorDocs.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Document(s) not found or not yet indexed',
            });
        }

        // Get active standard structure for context
        const standardStructure = await StandardStructureService.getActiveStructure();

        // Improved multi-document vector search:
        // Search for each document individually to ensure comprehensive coverage
        const beamlineId = vectorDocs[0].beamlineId;
        const allRelevantDocs: any[] = [];

        // Perform vector search for each target document
        for (const docId of targetDocIds) {
            const docChunks = vectorDocs.filter(v => v.fileId === docId);
            if (docChunks.length > 0) {
                // Search within this document's context using in-memory vectors
                // This ensures we find the best matches WITHIN this document, regardless of global rank
                const docRelevant = await VectorSearchService.searchInVectors(question, docChunks, 10);

                // Add to results
                allRelevantDocs.push(...docRelevant);
            }
        }

        // Remove duplicates and sort by score
        const uniqueDocs = Array.from(
            new Map(allRelevantDocs.map(doc => [doc.document.id, doc])).values()
        ).sort((a, b) => b.score - a.score);

        // Build context from relevant chunks
        const context = uniqueDocs
            .map((doc, idx) => {
                const filename = doc.document.metadata?.filename || 'Unknown';
                return `[Source: ${filename}, Chunk ${idx + 1}]: ${doc.document.content}`;
            })
            .join('\n\n');

        // Get document names for context
        const docNames = targetDocIds.map(id => {
            const doc = vectorDocs.find(v => v.fileId === id);
            return doc?.metadata?.filename || 'Unknown';
        }).join(', ');

        // Build standard structure context
        let standardStructureContext = '';
        if (standardStructure) {
            const sections = standardStructure.sections.map((s: any) =>
                `  - ${s.name} (${s.required ? 'REQUIRED' : 'Optional'}, Category: ${s.category}): ${s.description || 'No description'}`
            ).join('\n');

            standardStructureContext = `

**Active Manual Standard Structure**: ${standardStructure.name} v${standardStructure.version}
**Standard Sections**:
${sections}
`;
        }

        // Try to get the report for additional context about found/missing sections
        let reportContext = '';
        try {
            let report = null;
            if (targetDocIds.length === 1) {
                report = await FirestoreService.getMissingElementsReport(targetDocIds[0]);
            } else {
                report = await FirestoreService.getCombinedReport(targetDocIds);
            }

            if (report) {
                const foundSectionNames = report.foundSections?.map((s: any) => s.sectionName).join(', ') || 'None';
                const missingSectionNames = report.missingSections?.map((s: any) => s.sectionName).join(', ') || 'None';
                reportContext = `

**Report Analysis**:
- Coverage: ${report.coveragePercentage}%
- Found Sections: ${foundSectionNames}
- Missing Sections: ${missingSectionNames}
`;
            }
        } catch (err) {
            // Report not available, continue without it
        }

        // Build Q&A prompt with standard structure context
        const qaPrompt = `You are a helpful assistant analyzing beamline operation manual(s).

**Documents Being Queried**: ${docNames}
${standardStructureContext}${reportContext}

**User Question**: ${question}

**Relevant Document Sections**:
${context}

**Instructions**:
- Answer the question based on the provided document sections and standard structure information
- Be specific and cite relevant details from the documents
- If information comes from a specific document, mention which one
- When relevant, reference the standard structure requirements and categories
- If asked about missing sections or compliance, use the report analysis and standard structure
- If the information is not in the provided sections, say so clearly
- Keep your answer concise but comprehensive

**Answer**:`;

        // Call Gemini AI
        const answer = await VertexAIHelper.generateContentWithRetry(qaPrompt);

        res.json({
            success: true,
            data: {
                question,
                answer,
                documentCount: targetDocIds.length,
                sources: uniqueDocs.map(doc => ({
                    filename: doc.document.metadata?.filename || 'Unknown',
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
 * POST /api/semantic-comparison/combined-report
 * Get combined missing elements report for multiple documents
 */
router.post('/combined-report', async (req: Request, res: Response) => {
    try {
        const { documentIds } = req.body;

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'documentIds array is required',
            });
        }

        const report = await FirestoreService.getCombinedReport(documentIds);

        if (!report) {
            return res.status(404).json({
                success: false,
                error: 'Combined report not found. Documents may still be processing.',
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
        console.error('Error getting combined report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get combined report',
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
