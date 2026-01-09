import { VertexAI } from '@google-cloud/vertexai';
import { FirestoreService, type FileMetadata, type ComparisonResult } from './FirestoreService.js';
import { VectorSearchService, type SimilarDocument } from './VectorSearchService.js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Vertex AI with Google Cloud project
const vertexAI = new VertexAI({
    project: process.env.GCP_PROJECT_ID || '',
    location: process.env.GCP_LOCATION || 'us-central1',
});

export class ComparisonService {
    /**
     * Compare a Nichi file with JASRI files using RAG
     */
    static async compareFiles(
        nichiFile: FileMetadata,
        nichiContent: string
    ): Promise<ComparisonResult> {
        try {
            // Find matching JASRI file by name
            const jasriFiles = await FirestoreService.getJasriFiles(nichiFile.beamlineId);
            let jasriFile = jasriFiles.find(
                f => f.filename.toLowerCase() === nichiFile.filename.toLowerCase()
            );

            // Use RAG to find similar JASRI documents
            const similarDocs = await VectorSearchService.findMostSimilarJasriDocument(
                nichiContent,
                nichiFile.beamlineId,
                3
            );

            // If no exact filename match but RAG found similar documents, use the most similar one
            if (!jasriFile && similarDocs.length > 0) {
                const mostSimilarDocId = similarDocs[0].document.fileId;
                jasriFile = jasriFiles.find(f => f.id === mostSimilarDocId);
                console.log('No exact filename match, using most similar RAG document:', {
                    similarity: similarDocs[0].score,
                    fileId: mostSimilarDocId,
                    filename: jasriFile?.filename,
                    found: !!jasriFile
                });
            }

            // Build RAG context
            const ragContext = this.buildRAGContext(similarDocs);

            // Get JASRI content if exact match exists
            let jasriContent = '';
            if (jasriFile) {
                try {
                    // Download JASRI file from Cloud Storage
                    const pathParts = jasriFile.storagePath.replace('gs://', '').split('/');
                    const bucketName = pathParts[0];
                    const filePath = pathParts.slice(1).join('/');

                    const { CloudStorageService } = await import('./CloudStorageService.js');
                    const buffer = await CloudStorageService.downloadFile(bucketName, filePath);

                    // Process file to extract text
                    const { FileProcessorService } = await import('./FileProcessorService.js');
                    const processedDoc = await FileProcessorService.processFile(
                        buffer,
                        jasriFile.filename,
                        jasriFile.mimeType
                    );

                    jasriContent = processedDoc.content;
                } catch (error) {
                    console.error('Error loading JASRI file content:', error);
                    jasriContent = `[Error loading JASRI file: ${jasriFile.filename}]`;
                }
            }

            // Build AI prompt
            const prompt = this.buildComparisonPrompt(
                nichiContent,
                jasriContent,
                nichiFile.filename,
                jasriFile?.filename || 'No matching JASRI file',
                ragContext,
                similarDocs
            );

            // Call Gemini API via Vertex AI
            const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            const result = await model.generateContent(prompt);
            const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Parse AI response
            const comparisonCase = this.determineCase(response, jasriFile, similarDocs);
            const insights = this.extractInsights(response);
            const differences = this.extractDifferences(response);
            const actionTaken = this.getActionDescription(comparisonCase);

            // Create comparison result
            const comparisonResult: ComparisonResult = {
                id: uuidv4(),
                ...(jasriFile?.id && { jasriFileId: jasriFile.id }), // Only include if exists
                nichiFileId: nichiFile.id,
                beamlineId: nichiFile.beamlineId,
                case: comparisonCase,
                timestamp: new Date().toISOString(),
                differences,
                aiInsights: insights + this.formatRAGInsights(similarDocs),
                actionTaken,
                retrievedDocs: similarDocs.map(doc => ({
                    filename: doc.document.metadata.filename || 'Unknown',
                    score: doc.score,
                    rank: doc.rank,
                })),
            };

            // Save comparison result
            await FirestoreService.saveComparisonResult(comparisonResult);

            // Update file metadata based on case
            await this.handleComparisonCase(comparisonResult, nichiFile, jasriFile);

            return comparisonResult;
        } catch (error) {
            console.error('Error comparing files:', error);
            throw error;
        }
    }

    /**
     * Build RAG context from retrieved documents
     */
    private static buildRAGContext(similarDocs: SimilarDocument[]): string {
        if (similarDocs.length === 0) {
            return 'No similar JASRI documents found in the knowledge base.';
        }

        let context = '\n\n**Retrieved Similar JASRI Documents:**\n\n';
        similarDocs.forEach((doc, index) => {
            context += `**Document ${index + 1}** (Similarity: ${(doc.score * 100).toFixed(1)}%):\n`;
            context += `Content: ${doc.document.content.substring(0, 500)}...\n\n`;
        });

        return context;
    }

    /**
     * Format RAG insights for display
     */
    private static formatRAGInsights(similarDocs: SimilarDocument[]): string {
        if (similarDocs.length === 0) {
            return '\n\nDetailed Analysis: No similar documents found in vector store.';
        }

        let insights = '\n\nDetailed Analysis:\n';
        insights += `- Found ${similarDocs.length} similar JASRI document(s)\n`;
        insights += `- Top match: ${(similarDocs[0].score * 100).toFixed(1)}% similarity\n`;

        if (similarDocs[0].score > 0.8) {
            insights += '- High similarity detected - likely related content\n';
        } else if (similarDocs[0].score > 0.5) {
            insights += '- Moderate similarity - possibly related content\n';
        } else {
            insights += '- Low similarity - likely new or distinct content\n';
        }

        return insights;
    }

    /**
     * Build the RAG-enhanced AI prompt for file comparison
     */
    private static buildComparisonPrompt(
        nichiContent: string,
        jasriContent: string,
        nichiFilename: string,
        jasriFilename: string,
        ragContext: string,
        similarDocs: SimilarDocument[]
    ): string {
        const hasRAGContext = similarDocs.length > 0;

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

${hasRAGContext ? `**RAG Context**: The system found ${similarDocs.length} similar document(s) with a top similarity score of ${(similarDocs[0].score * 100).toFixed(1)}%. Consider this semantic similarity in your analysis.` : ''}

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
        jasriFile: FileMetadata | undefined,
        similarDocs: SimilarDocument[]
    ): 'case1' | 'case2' | 'case3' {
        // If no JASRI file exists and no similar docs found, it's Case 3 (New)
        if (!jasriFile && similarDocs.length === 0) {
            return 'case3';
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
                return '日技 file has more details (more detailed information found)';
            case 'case2':
                return 'JASRI file matches 日技 file (content matches)';
            case 'case3':
                return '日技 file is a new item (not present in JASRI)';
        }
    }

    /**
     * Handle the comparison case and update storage accordingly
     */
    private static async handleComparisonCase(
        result: ComparisonResult,
        nichiFile: FileMetadata,
        jasriFile?: FileMetadata
    ): Promise<void> {
        const { case: comparisonCase } = result;

        switch (comparisonCase) {
            case 'case1':
                // Update JASRI file metadata
                if (jasriFile) {
                    await FirestoreService.updateFileStatus(jasriFile.id, 'processed');
                }
                await FirestoreService.updateFileStatus(nichiFile.id, 'processed');
                break;

            case 'case2':
                // Keep original JASRI file
                if (jasriFile) {
                    await FirestoreService.updateFileStatus(jasriFile.id, 'processed');
                }
                await FirestoreService.updateFileStatus(nichiFile.id, 'processed');
                break;

            case 'case3':
                // Add Nichi file as new JASRI item
                await FirestoreService.updateFileStatus(nichiFile.id, 'processed');
                break;
        }
    }

    /**
     * Batch compare multiple Nichi files
     */
    static async batchCompare(
        nichiFiles: FileMetadata[],
        nichiContents: string[],
        onProgress?: (current: number, total: number) => void
    ): Promise<ComparisonResult[]> {
        const results: ComparisonResult[] = [];

        for (let i = 0; i < nichiFiles.length; i++) {
            try {
                const result = await this.compareFiles(nichiFiles[i], nichiContents[i]);
                results.push(result);

                if (onProgress) {
                    onProgress(i + 1, nichiFiles.length);
                }
            } catch (error) {
                console.error(`Error comparing ${nichiFiles[i].filename}:`, error);
            }
        }

        return results;
    }
}
