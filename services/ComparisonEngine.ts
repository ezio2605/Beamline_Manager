// RAG-Enhanced Comparison Engine Service for JASRI vs Nichi File Comparison
import { GoogleGenAI } from '@google/genai';
import type {
    FileMetadata,
    UploadedFile,
    ComparisonResult,
    ComparisonLog,
    RAGSimilarityResult
} from '../types';
import { FileStorageService } from './FileStorageService';
import { STORAGE_PATHS } from '../config/storage.config';
import { VectorStoreService } from './VectorStoreService';
import { EmbeddingService } from './EmbeddingService';

// Singleton instances for RAG services
let embeddingService: EmbeddingService | null = null;
let vectorStoreService: VectorStoreService | null = null;

export class ComparisonEngine {
    /**
     * Initialize RAG services
     */
    static async initializeRAG(apiKey: string): Promise<void> {
        if (!embeddingService) {
            embeddingService = new EmbeddingService(apiKey);
        }
        if (!vectorStoreService) {
            vectorStoreService = new VectorStoreService(embeddingService);
            await vectorStoreService.initialize();
        }
    }

    /**
     * Get vector store service instance
     */
    static getVectorStore(): VectorStoreService | null {
        return vectorStoreService;
    }

    /**
     * Compare a Nichi file with JASRI files using RAG
     */
    static async compareFiles(
        nichiFile: UploadedFile,
        jasriFile: FileMetadata | null,
        nichiContent: string,
        jasriContent: string
    ): Promise<ComparisonResult> {
        const startTime = Date.now();

        try {
            // Initialize RAG if not already done
            const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
            await this.initializeRAG(apiKey);

            // Use RAG to find similar JASRI documents
            let retrievedDocs: RAGSimilarityResult[] = [];
            let ragContext = '';

            if (vectorStoreService && vectorStoreService.isReady()) {
                const similarDocs = await vectorStoreService.findMostSimilarJasriDocument(
                    nichiContent,
                    nichiFile.beamlineId,
                    3 // Get top 3 similar documents
                );

                retrievedDocs = similarDocs.map(doc => ({
                    filename: doc.document.metadata.filename,
                    content: doc.document.content,
                    score: doc.score,
                    rank: doc.rank,
                    metadata: {
                        beamlineId: doc.document.metadata.beamlineId,
                        source: doc.document.metadata.source,
                        chunkIndex: doc.document.metadata.chunkIndex,
                    },
                }));

                // Build RAG context from retrieved documents
                ragContext = this.buildRAGContext(retrievedDocs);
            }

            // Create AI instance
            const ai = new GoogleGenAI({ apiKey });

            const prompt = this.buildRAGComparisonPrompt(
                nichiContent,
                jasriContent,
                nichiFile.filename,
                jasriFile?.filename || 'No matching JASRI file',
                ragContext,
                retrievedDocs
            );

            const result = await ai.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: prompt
            });
            const response = result.text?.trim() || '';

            // Parse AI response to determine case
            const comparisonCase = this.determineCase(response, jasriFile, retrievedDocs);
            const insights = this.extractInsights(response);
            const differences = this.extractDifferences(response);
            const actionTaken = this.getActionDescription(comparisonCase);

            // Determine result path based on case
            const resultPath = this.getResultPath(comparisonCase, nichiFile.beamlineId);

            const comparisonResult: ComparisonResult = {
                id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                jasriFile,
                nichiFile,
                beamlineId: nichiFile.beamlineId,
                case: comparisonCase,
                timestamp: new Date().toISOString(),
                jasriContent,
                nichiContent,
                differences,
                aiInsights: insights + this.formatRAGInsights(retrievedDocs),
                actionTaken,
                resultPath
            };

            // Save comparison result
            await FileStorageService.saveComparisonResult(comparisonResult);

            // Update file metadata based on case
            await this.handleComparisonCase(comparisonResult);

            return comparisonResult;

        } catch (error) {
            console.error('Error comparing files:', error);
            throw error;
        }
    }

    /**
     * Build RAG context from retrieved documents
     */
    private static buildRAGContext(retrievedDocs: RAGSimilarityResult[]): string {
        if (retrievedDocs.length === 0) {
            return 'No similar JASRI documents found in the knowledge base.';
        }

        let context = '\n\n**Retrieved Similar JASRI Documents:**\n\n';
        retrievedDocs.forEach((doc, index) => {
            context += `**Document ${index + 1}** (Similarity: ${(doc.score * 100).toFixed(1)}%):\n`;
            context += `File: ${doc.filename}\n`;
            context += `Content: ${doc.content.substring(0, 500)}...\n\n`;
        });

        return context;
    }

    /**
     * Format RAG insights for display
     */
    private static formatRAGInsights(retrievedDocs: RAGSimilarityResult[]): string {
        if (retrievedDocs.length === 0) {
            return '\n\n**RAG Analysis:** No similar documents found in vector store.';
        }

        let insights = '\n\n**RAG-Enhanced Analysis:**\n';
        insights += `- Found ${retrievedDocs.length} similar JASRI document(s)\n`;
        insights += `- Top match: ${retrievedDocs[0].filename} (${(retrievedDocs[0].score * 100).toFixed(1)}% similarity)\n`;

        if (retrievedDocs[0].score > 0.8) {
            insights += '- High similarity detected - likely related content\n';
        } else if (retrievedDocs[0].score > 0.5) {
            insights += '- Moderate similarity - possibly related content\n';
        } else {
            insights += '- Low similarity - likely new or distinct content\n';
        }

        return insights;
    }

    /**
     * Build the RAG-enhanced AI prompt for file comparison
     */
    private static buildRAGComparisonPrompt(
        nichiContent: string,
        jasriContent: string,
        nichiFilename: string,
        jasriFilename: string,
        ragContext: string,
        retrievedDocs: RAGSimilarityResult[]
    ): string {
        const hasRAGContext = retrievedDocs.length > 0;

        return `You are comparing two technical operation manual files for a beamline facility.
You have access to a RAG (Retrieval-Augmented Generation) system that has retrieved similar documents from the JASRI knowledge base.

**JASRI File**: ${jasriFilename}
**Nichi File**: ${nichiFilename}

**JASRI Content**:
${jasriContent || 'No JASRI file exists for comparison'}

**Nichi Content**:
${nichiContent}

${hasRAGContext ? ragContext : ''}

**Your Task**:
Analyze these files ${hasRAGContext ? 'along with the retrieved similar documents' : ''} and classify the comparison into ONE of these three cases:

**Case 1 (Update)**: The Nichi file contains MORE DETAILED or ADDITIONAL information compared to the JASRI file. This means Nichi has extra technical details, procedures, specifications, or explanations that enhance the JASRI content.

**Case 2 (Match)**: Both files contain essentially the SAME information. The content is equivalent, even if wording differs slightly.

**Case 3 (New)**: The Nichi file covers a NEW topic or item that is NOT present in the JASRI file at all. This is entirely new content, not just an enhancement.

${hasRAGContext ? `**RAG Context**: The system found ${retrievedDocs.length} similar document(s) with a top similarity score of ${(retrievedDocs[0].score * 100).toFixed(1)}%. Consider this semantic similarity in your analysis.` : ''}

**Response Format**:
Provide your analysis in this exact format:

CASE: [1, 2, or 3]

REASONING:
[Explain why you chose this case${hasRAGContext ? ', considering the RAG-retrieved similar documents' : ''}]

DIFFERENCES:
[List specific differences or state "None" for Case 2]

KEY_INSIGHTS:
[Provide actionable insights about the comparison${hasRAGContext ? ', including how the retrieved documents informed your decision' : ''}]

RECOMMENDATION:
[What action should be taken with these files]

Be precise and technical in your analysis.`;
    }

    /**
     * Determine the comparison case from AI response
     */
    private static determineCase(
        aiResponse: string,
        jasriFile: FileMetadata | null,
        retrievedDocs: RAGSimilarityResult[]
    ): 'case1' | 'case2' | 'case3' {
        // If no JASRI file exists and no similar docs found, it's Case 3 (New)
        if (!jasriFile && retrievedDocs.length === 0) {
            return 'case3';
        }

        // If high similarity found in RAG but no exact match, consider it Case 1 or 2
        if (retrievedDocs.length > 0 && retrievedDocs[0].score > 0.9 && !jasriFile) {
            // Very high similarity suggests it might be a match or update
            // Let AI decide, but default to case1
        }

        // Extract case from AI response
        const caseMatch = aiResponse.match(/CASE:\s*(\d)/i);
        if (caseMatch) {
            const caseNumber = parseInt(caseMatch[1]);
            if (caseNumber === 1) return 'case1';
            if (caseNumber === 2) return 'case2';
            if (caseNumber === 3) return 'case3';
        }

        // Fallback: analyze keywords in response
        const lowerResponse = aiResponse.toLowerCase();
        if (lowerResponse.includes('more detailed') || lowerResponse.includes('additional information')) {
            return 'case1';
        }
        if (lowerResponse.includes('same information') || lowerResponse.includes('equivalent')) {
            return 'case2';
        }
        if (lowerResponse.includes('new') || lowerResponse.includes('not present')) {
            return 'case3';
        }

        // Default to case1 if unclear
        return 'case1';
    }

    /**
     * Extract insights from AI response
     */
    private static extractInsights(aiResponse: string): string {
        const insightsMatch = aiResponse.match(/KEY_INSIGHTS:([\s\S]*?)(?:RECOMMENDATION:|$)/i);
        return insightsMatch ? insightsMatch[1].trim() : aiResponse;
    }

    /**
     * Extract differences from AI response
     */
    private static extractDifferences(aiResponse: string): string {
        const diffMatch = aiResponse.match(/DIFFERENCES:([\s\S]*?)(?:KEY_INSIGHTS:|$)/i);
        return diffMatch ? diffMatch[1].trim() : 'See AI insights for details';
    }

    /**
     * Get action description based on case
     */
    private static getActionDescription(comparisonCase: 'case1' | 'case2' | 'case3'): string {
        switch (comparisonCase) {
            case 'case1':
                return 'JASRI file updated with Nichi content (more detailed information found)';
            case 'case2':
                return 'Original JASRI file retained (content matches)';
            case 'case3':
                return 'Nichi file retained as new item (not present in JASRI)';
        }
    }

    /**
     * Get result path based on case
     */
    private static getResultPath(comparisonCase: 'case1' | 'case2' | 'case3', beamlineId: string): string {
        switch (comparisonCase) {
            case 'case1':
                return `${STORAGE_PATHS.getCase1Path()}\\${beamlineId}`;
            case 'case2':
                return `${STORAGE_PATHS.getCase2Path()}\\${beamlineId}`;
            case 'case3':
                return `${STORAGE_PATHS.getCase3Path()}\\${beamlineId}`;
        }
    }

    /**
     * Handle the comparison case and update storage accordingly
     */
    private static async handleComparisonCase(result: ComparisonResult): Promise<void> {
        const { beamlineId, nichiFile, jasriFile, case: comparisonCase } = result;

        switch (comparisonCase) {
            case 'case1':
                // Update JASRI file with Nichi content
                if (jasriFile) {
                    await FileStorageService.updateFileMetadata(beamlineId, jasriFile.filename, {
                        currentVersion: `${STORAGE_PATHS.getUpdatedPath(beamlineId)}\\${nichiFile.filename}`,
                        lastCompared: new Date().toISOString(),
                        comparisonCase: 'case1',
                        nichiSource: nichiFile.filepath
                    });
                }
                break;

            case 'case2':
                // Keep original JASRI file, just update comparison date
                if (jasriFile) {
                    await FileStorageService.updateFileMetadata(beamlineId, jasriFile.filename, {
                        lastCompared: new Date().toISOString(),
                        comparisonCase: 'case2',
                        nichiSource: nichiFile.filepath
                    });
                }
                break;

            case 'case3':
                // Add Nichi file as new item to JASRI knowledge base
                const newFileMetadata: FileMetadata = {
                    filename: nichiFile.filename,
                    originalPath: nichiFile.filepath,
                    currentVersion: `${STORAGE_PATHS.getUpdatedPath(beamlineId)}\\${nichiFile.filename}`,
                    lastCompared: new Date().toISOString(),
                    comparisonCase: 'case3',
                    nichiSource: nichiFile.filepath,
                    fileSize: nichiFile.fileSize,
                    fileType: nichiFile.fileType,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                await FileStorageService.addFileToMetadata(beamlineId, newFileMetadata);
                break;
        }
    }

    /**
     * Batch compare multiple Nichi files
     */
    static async batchCompare(
        nichiFiles: UploadedFile[],
        beamlineId: string,
        onProgress?: (current: number, total: number) => void
    ): Promise<ComparisonLog> {
        const startTime = Date.now();
        const results: ComparisonResult[] = [];
        const errors: string[] = [];

        let case1Count = 0;
        let case2Count = 0;
        let case3Count = 0;

        for (let i = 0; i < nichiFiles.length; i++) {
            try {
                const nichiFile = nichiFiles[i];

                // Find matching JASRI file
                const jasriFiles = await FileStorageService.getJasriFiles(beamlineId);
                const jasriFile = jasriFiles.find(f =>
                    f.filename.toLowerCase() === nichiFile.filename.toLowerCase()
                ) || null;

                // For demo purposes, using placeholder content
                // In real implementation, this would read actual file content
                const nichiContent = `Content of ${nichiFile.filename}`;
                const jasriContent = jasriFile ? `Content of ${jasriFile.filename}` : '';

                const result = await this.compareFiles(nichiFile, jasriFile, nichiContent, jasriContent);
                results.push(result);

                // Update counts
                if (result.case === 'case1') case1Count++;
                if (result.case === 'case2') case2Count++;
                if (result.case === 'case3') case3Count++;

                // Report progress
                if (onProgress) {
                    onProgress(i + 1, nichiFiles.length);
                }

            } catch (error) {
                errors.push(`Error comparing ${nichiFiles[i].filename}: ${error}`);
            }
        }

        const duration = Date.now() - startTime;

        const log: ComparisonLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            beamlineId,
            filesCompared: nichiFiles.length,
            case1Count,
            case2Count,
            case3Count,
            results,
            duration,
            status: errors.length === 0 ? 'success' : errors.length < nichiFiles.length ? 'partial' : 'failed',
            errors: errors.length > 0 ? errors : undefined
        };

        await FileStorageService.saveComparisonLog(log);

        return log;
    }
}
