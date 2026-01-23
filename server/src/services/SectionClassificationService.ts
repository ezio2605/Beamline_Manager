import { VertexAI } from '@google-cloud/vertexai';
import { v4 as uuidv4 } from 'uuid';
import { StandardSection, StandardStructure } from './StandardStructureService.js';
import { SemanticChunk } from './SemanticChunkingService.js';

// Initialize Vertex AI
const vertexAI = new VertexAI({
    project: process.env.GCP_PROJECT_ID || '',
    location: process.env.GCP_LOCATION || 'us-central1',
});

export interface SectionMatch {
    sectionId: string;
    sectionName: string;
    confidence: number;
    reasoning: string;
}

export interface SectionClassification {
    id: string;
    chunkId: string;
    documentId: string;
    beamlineId: string;
    standardStructureId: string;
    matches: SectionMatch[];
    status: 'pending' | 'approved' | 'rejected' | 'needs_review';
    reviewedBy?: string;
    reviewedAt?: string;
    createdAt: string;
}

export interface VendorProfile {
    id: string;
    name: string;
    patterns: string[];
    examples: Record<string, string[]>; // sectionId -> example texts
    lastUpdated: string;
}

export class SectionClassificationService {
    private static readonly CONFIDENCE_THRESHOLD_NEEDS_REVIEW = 70;
    private static readonly MAX_RETRIES = 3;

    /**
     * Classify a chunk into standard structure sections
     */
    static async classifyChunk(
        chunk: SemanticChunk,
        standardStructure: StandardStructure,
        vendorProfile?: VendorProfile
    ): Promise<SectionClassification> {
        console.log(`🔍 Classifying chunk ${chunk.chunkIndex} for document ${chunk.documentId}...`);

        // Build the classification prompt
        const prompt = this.buildClassificationPrompt(chunk, standardStructure, vendorProfile);

        // Call Gemini API with retry logic
        let response: string = '';
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
            try {
                const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
                const result = await model.generateContent(prompt);
                response = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

                if (response) {
                    break; // Success
                }
            } catch (error) {
                lastError = error as Error;
                console.error(`⚠️  Classification attempt ${attempt + 1} failed:`, error);

                if (attempt < this.MAX_RETRIES - 1) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        if (!response) {
            throw lastError || new Error('Failed to classify chunk after all retries');
        }

        // Parse the response
        const matches = this.parseClassificationResponse(response, standardStructure);

        // Determine status based on confidence
        const maxConfidence = matches.length > 0 ? Math.max(...matches.map(m => m.confidence)) : 0;
        const status = maxConfidence < this.CONFIDENCE_THRESHOLD_NEEDS_REVIEW ? 'needs_review' : 'pending';

        const classification: SectionClassification = {
            id: uuidv4(),
            chunkId: chunk.id,
            documentId: chunk.documentId,
            beamlineId: chunk.beamlineId,
            standardStructureId: standardStructure.id,
            matches,
            status,
            createdAt: new Date().toISOString(),
        };

        console.log(
            `✅ Classified chunk ${chunk.chunkIndex}: ${matches.length} matches (max confidence: ${maxConfidence}%)`
        );

        return classification;
    }

    /**
     * Build the classification prompt for Gemini
     */
    private static buildClassificationPrompt(
        chunk: SemanticChunk,
        standardStructure: StandardStructure,
        vendorProfile?: VendorProfile
    ): string {
        // Flatten sections for easier reference
        const allSections = this.flattenSections(standardStructure.sections);

        // Build sections list with descriptions and keywords
        const sectionsDescription = allSections
            .map(
                (section, index) =>
                    `${index + 1}. **${section.name}** (ID: ${section.id})
   - Category: ${section.category}
   - Description: ${section.description}
   - Keywords: ${section.keywords?.join(', ') || 'N/A'}
   ${section.examples && section.examples.length > 0 ? `- Examples:\n     ${section.examples.map(ex => `"${ex}"`).join('\n     ')}` : ''}`
            )
            .join('\n\n');

        // Build vendor-specific context if available
        let vendorContext = '';
        if (vendorProfile) {
            vendorContext = `\n\n**VENDOR CONTEXT (${vendorProfile.name}):**\n`;
            vendorContext += `Common patterns: ${vendorProfile.patterns.join(', ')}\n`;

            // Add vendor-specific examples for relevant sections
            const vendorExamples = Object.entries(vendorProfile.examples)
                .map(([sectionId, examples]) => {
                    const section = allSections.find(s => s.id === sectionId);
                    if (section && examples.length > 0) {
                        return `- ${section.name}: ${examples.slice(0, 2).map(ex => `"${ex}"`).join(', ')}`;
                    }
                    return null;
                })
                .filter(Boolean)
                .join('\n');

            if (vendorExamples) {
                vendorContext += `Vendor-specific examples:\n${vendorExamples}\n`;
            }
        }

        // Build context from surrounding chunks
        let contextInfo = '';
        if (chunk.metadata.heading) {
            contextInfo += `\n**Document Heading:** ${chunk.metadata.heading}`;
        }
        if (chunk.metadata.previousContext) {
            contextInfo += `\n**Previous Context:** "${chunk.metadata.previousContext.substring(0, 100)}..."`;
        }

        const prompt = `You are an expert technical document analyzer specializing in beamline operation manuals. Your task is to classify a text chunk into one or more sections from a standardized manual structure.

**STANDARD MANUAL STRUCTURE:**
${sectionsDescription}
${vendorContext}

**TEXT TO CLASSIFY:**
${chunk.content}
${contextInfo}

**INSTRUCTIONS:**
1. Analyze the text content carefully
2. Determine which section(s) from the standard structure this text belongs to
3. A chunk can match MULTIPLE sections if it covers multiple topics
4. Provide a confidence score (0-100) for each match
5. Explain your reasoning for each match
6. Consider the keywords, examples, and vendor patterns provided
7. Use the document heading and context to inform your decision

**CONFIDENCE SCORING GUIDELINES:**
- 90-100: Very clear match, text explicitly discusses this topic
- 70-89: Strong match, text clearly relates to this section
- 50-69: Moderate match, text partially relates to this section
- 30-49: Weak match, text tangentially relates to this section
- 0-29: Very weak match, minimal relation to this section

**RESPONSE FORMAT (JSON):**
Respond ONLY with valid JSON in this exact format:
{
  "matches": [
    {
      "sectionId": "section-id-here",
      "sectionName": "Section Name Here",
      "confidence": 85,
      "reasoning": "Brief explanation of why this section matches"
    }
  ]
}

**IMPORTANT:**
- Return ONLY the JSON object, no additional text
- Include only matches with confidence >= 30
- Order matches by confidence (highest first)
- If no good matches found, return empty matches array: {"matches": []}
`;

        return prompt;
    }

    /**
     * Parse the classification response from Gemini
     */
    private static parseClassificationResponse(
        response: string,
        standardStructure: StandardStructure
    ): SectionMatch[] {
        try {
            // Extract JSON from response (handle cases where LLM adds extra text)
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn('No JSON found in classification response');
                return [];
            }

            const parsed = JSON.parse(jsonMatch[0]);

            if (!parsed.matches || !Array.isArray(parsed.matches)) {
                console.warn('Invalid classification response format');
                return [];
            }

            // Validate and normalize matches
            const validMatches: SectionMatch[] = parsed.matches
                .filter((match: any) => {
                    return (
                        match.sectionId &&
                        match.sectionName &&
                        typeof match.confidence === 'number' &&
                        match.confidence >= 0 &&
                        match.confidence <= 100 &&
                        match.reasoning
                    );
                })
                .map((match: any) => ({
                    sectionId: match.sectionId,
                    sectionName: match.sectionName,
                    confidence: Math.round(match.confidence),
                    reasoning: match.reasoning,
                }))
                .sort((a: SectionMatch, b: SectionMatch) => b.confidence - a.confidence); // Sort by confidence

            return validMatches;
        } catch (error) {
            console.error('Error parsing classification response:', error);
            console.error('Response was:', response);
            return [];
        }
    }

    /**
     * Batch classify multiple chunks
     */
    static async batchClassify(
        chunks: SemanticChunk[],
        standardStructure: StandardStructure,
        vendorProfile?: VendorProfile,
        onProgress?: (current: number, total: number) => void
    ): Promise<SectionClassification[]> {
        const classifications: SectionClassification[] = [];

        console.log(`📚 Batch classifying ${chunks.length} chunks...`);

        for (let i = 0; i < chunks.length; i++) {
            try {
                const classification = await this.classifyChunk(chunks[i], standardStructure, vendorProfile);
                classifications.push(classification);

                if (onProgress) {
                    onProgress(i + 1, chunks.length);
                }

                // Small delay to respect rate limits
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                console.error(`Error classifying chunk ${i}:`, error);
                // Continue with next chunk
            }
        }

        console.log(`✅ Batch classification complete: ${classifications.length}/${chunks.length} chunks classified`);

        return classifications;
    }

    /**
     * Get classifications that need review (low confidence)
     */
    static getClassificationsNeedingReview(
        classifications: SectionClassification[]
    ): SectionClassification[] {
        return classifications.filter(c => c.status === 'needs_review');
    }

    /**
     * Approve a classification
     */
    static approveClassification(
        classification: SectionClassification,
        reviewedBy: string
    ): SectionClassification {
        return {
            ...classification,
            status: 'approved',
            reviewedBy,
            reviewedAt: new Date().toISOString(),
        };
    }

    /**
     * Override a classification with manual matches
     */
    static overrideClassification(
        classification: SectionClassification,
        newMatches: SectionMatch[],
        reviewedBy: string
    ): SectionClassification {
        return {
            ...classification,
            matches: newMatches,
            status: 'approved',
            reviewedBy,
            reviewedAt: new Date().toISOString(),
        };
    }

    /**
     * Flatten sections from hierarchical structure
     */
    private static flattenSections(sections: StandardSection[]): StandardSection[] {
        const flattened: StandardSection[] = [];

        const flatten = (sections: StandardSection[]) => {
            sections.forEach(section => {
                flattened.push(section);
                if (section.subsections && section.subsections.length > 0) {
                    flatten(section.subsections);
                }
            });
        };

        flatten(sections);
        return flattened;
    }

    /**
     * Get classification statistics
     */
    static getClassificationStatistics(classifications: SectionClassification[]): {
        total: number;
        pending: number;
        approved: number;
        needsReview: number;
        rejected: number;
        averageConfidence: number;
        averageMatchesPerChunk: number;
    } {
        if (classifications.length === 0) {
            return {
                total: 0,
                pending: 0,
                approved: 0,
                needsReview: 0,
                rejected: 0,
                averageConfidence: 0,
                averageMatchesPerChunk: 0,
            };
        }

        const statusCounts = {
            pending: classifications.filter(c => c.status === 'pending').length,
            approved: classifications.filter(c => c.status === 'approved').length,
            needsReview: classifications.filter(c => c.status === 'needs_review').length,
            rejected: classifications.filter(c => c.status === 'rejected').length,
        };

        const allConfidences = classifications.flatMap(c => c.matches.map(m => m.confidence));
        const averageConfidence =
            allConfidences.length > 0
                ? allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length
                : 0;

        const totalMatches = classifications.reduce((sum, c) => sum + c.matches.length, 0);
        const averageMatchesPerChunk = totalMatches / classifications.length;

        return {
            total: classifications.length,
            ...statusCounts,
            averageConfidence: Math.round(averageConfidence),
            averageMatchesPerChunk: Math.round(averageMatchesPerChunk * 10) / 10,
        };
    }
}
