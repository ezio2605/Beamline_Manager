import { VertexAI } from '@google-cloud/vertexai';
import { v4 as uuidv4 } from 'uuid';
import { SectionClassification } from './SectionClassificationService.js';
import { SemanticChunk } from './SemanticChunkingService.js';
import { StandardSection } from './StandardStructureService.js';

// Initialize Vertex AI
const vertexAI = new VertexAI({
    project: process.env.GCP_PROJECT_ID || '',
    location: process.env.GCP_LOCATION || 'us-central1',
});

export interface VendorProfile {
    id: string;
    name: string;
    patterns: string[];
    examples: Record<string, string[]>; // sectionId -> example texts
    lastUpdated: string;
}

export interface SemanticDelta {
    sectionId: string;
    sectionName: string;
    vendor1Content: string;
    vendor2Content: string;
    differences: string[];
    semanticSimilarity: number;
    addedInVendor2: string[];
    removedFromVendor1: string[];
    aiSummary: string;
}

export interface VendorComparison {
    id: string;
    document1Id: string;
    document2Id: string;
    vendor1: string;
    vendor2: string;
    beamlineId: string;
    deltas: SemanticDelta[];
    overallSimilarity: number;
    generatedAt: string;
}

export class VendorComparisonService {
    /**
     * Compare two documents from different vendors
     */
    static async compareDocuments(
        document1Id: string,
        document2Id: string,
        vendor1: string,
        vendor2: string,
        beamlineId: string,
        classifications1: SectionClassification[],
        classifications2: SectionClassification[],
        chunks1: SemanticChunk[],
        chunks2: SemanticChunk[]
    ): Promise<VendorComparison> {
        console.log(`🔄 Comparing documents from ${vendor1} and ${vendor2}...`);

        // Group chunks by section for both documents
        const sectionChunks1 = this.groupChunksBySection(classifications1, chunks1);
        const sectionChunks2 = this.groupChunksBySection(classifications2, chunks2);

        // Get all unique sections
        const allSectionIds = new Set([...sectionChunks1.keys(), ...sectionChunks2.keys()]);

        // Calculate semantic deltas for each section
        const deltas: SemanticDelta[] = [];

        for (const sectionId of allSectionIds) {
            const content1 = sectionChunks1.get(sectionId) || [];
            const content2 = sectionChunks2.get(sectionId) || [];

            if (content1.length > 0 || content2.length > 0) {
                const delta = await this.calculateSemanticDelta(
                    sectionId,
                    content1,
                    content2,
                    vendor1,
                    vendor2
                );
                deltas.push(delta);
            }
        }

        // Calculate overall similarity
        const overallSimilarity = this.calculateOverallSimilarity(deltas);

        const comparison: VendorComparison = {
            id: uuidv4(),
            document1Id,
            document2Id,
            vendor1,
            vendor2,
            beamlineId,
            deltas,
            overallSimilarity,
            generatedAt: new Date().toISOString(),
        };

        console.log(`✅ Comparison complete: ${deltas.length} sections analyzed, ${overallSimilarity}% overall similarity`);

        return comparison;
    }

    /**
     * Group chunks by section based on classifications
     */
    private static groupChunksBySection(
        classifications: SectionClassification[],
        chunks: SemanticChunk[]
    ): Map<string, Array<{ chunk: SemanticChunk; sectionName: string }>> {
        const sectionChunks = new Map<string, Array<{ chunk: SemanticChunk; sectionName: string }>>();

        classifications.forEach(classification => {
            const chunk = chunks.find(c => c.id === classification.chunkId);
            if (!chunk) return;

            // Add chunk to all matched sections (with confidence > 50)
            classification.matches
                .filter(match => match.confidence >= 50)
                .forEach(match => {
                    if (!sectionChunks.has(match.sectionId)) {
                        sectionChunks.set(match.sectionId, []);
                    }
                    sectionChunks.get(match.sectionId)!.push({
                        chunk,
                        sectionName: match.sectionName,
                    });
                });
        });

        return sectionChunks;
    }

    /**
     * Calculate semantic delta for a specific section
     */
    private static async calculateSemanticDelta(
        sectionId: string,
        content1: Array<{ chunk: SemanticChunk; sectionName: string }>,
        content2: Array<{ chunk: SemanticChunk; sectionName: string }>,
        vendor1: string,
        vendor2: string
    ): Promise<SemanticDelta> {
        const sectionName = content1[0]?.sectionName || content2[0]?.sectionName || 'Unknown Section';

        // Combine chunks into full text for each vendor
        const vendor1Text = content1.map(c => c.chunk.content).join('\n\n');
        const vendor2Text = content2.map(c => c.chunk.content).join('\n\n');

        // Handle cases where one vendor is missing the section
        if (!vendor1Text && vendor2Text) {
            return {
                sectionId,
                sectionName,
                vendor1Content: '',
                vendor2Content: vendor2Text,
                differences: [`Section only exists in ${vendor2} version`],
                semanticSimilarity: 0,
                addedInVendor2: [vendor2Text],
                removedFromVendor1: [],
                aiSummary: `This section is only present in the ${vendor2} manual. ${vendor1} does not include this information.`,
            };
        }

        if (vendor1Text && !vendor2Text) {
            return {
                sectionId,
                sectionName,
                vendor1Content: vendor1Text,
                vendor2Content: '',
                differences: [`Section only exists in ${vendor1} version`],
                semanticSimilarity: 0,
                addedInVendor2: [],
                removedFromVendor1: [vendor1Text],
                aiSummary: `This section is only present in the ${vendor1} manual. ${vendor2} does not include this information.`,
            };
        }

        // Both vendors have content - perform AI-based comparison
        const prompt = this.buildComparisonPrompt(sectionName, vendor1Text, vendor2Text, vendor1, vendor2);

        try {
            const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            const result = await model.generateContent(prompt);
            const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Parse the AI response
            const parsed = this.parseComparisonResponse(response);

            return {
                sectionId,
                sectionName,
                vendor1Content: vendor1Text,
                vendor2Content: vendor2Text,
                differences: parsed.differences,
                semanticSimilarity: parsed.similarity,
                addedInVendor2: parsed.addedInVendor2,
                removedFromVendor1: parsed.removedFromVendor1,
                aiSummary: parsed.summary,
            };
        } catch (error) {
            console.error(`Error calculating semantic delta for section ${sectionId}:`, error);

            // Fallback to simple comparison
            return {
                sectionId,
                sectionName,
                vendor1Content: vendor1Text,
                vendor2Content: vendor2Text,
                differences: ['Unable to perform detailed comparison'],
                semanticSimilarity: 50, // Neutral
                addedInVendor2: [],
                removedFromVendor1: [],
                aiSummary: 'Comparison failed. Manual review recommended.',
            };
        }
    }

    /**
     * Build comparison prompt for Gemini
     */
    private static buildComparisonPrompt(
        sectionName: string,
        vendor1Text: string,
        vendor2Text: string,
        vendor1: string,
        vendor2: string
    ): string {
        return `You are an expert technical document analyzer. Compare two versions of the same section from different vendors' beamline operation manuals.

**SECTION:** ${sectionName}

**${vendor1.toUpperCase()} VERSION:**
${vendor1Text}

**${vendor2.toUpperCase()} VERSION:**
${vendor2Text}

**YOUR TASK:**
1. Calculate semantic similarity (0-100%) between the two versions
2. Identify key differences in content, procedures, or specifications
3. List information added in ${vendor2} version
4. List information removed from ${vendor1} version
5. Provide a concise summary of the comparison

**RESPONSE FORMAT (JSON):**
{
  "similarity": 85,
  "differences": [
    "Difference 1",
    "Difference 2"
  ],
  "addedInVendor2": [
    "New information in ${vendor2} version"
  ],
  "removedFromVendor1": [
    "Information present in ${vendor1} but not in ${vendor2}"
  ],
  "summary": "Brief summary of the comparison"
}

**IMPORTANT:**
- Focus on SEMANTIC differences, not just wording
- Ignore minor formatting or stylistic differences
- Highlight technical specification changes
- Return ONLY valid JSON, no additional text
`;
    }

    /**
     * Parse comparison response from Gemini
     */
    private static parseComparisonResponse(response: string): {
        similarity: number;
        differences: string[];
        addedInVendor2: string[];
        removedFromVendor1: string[];
        summary: string;
    } {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                similarity: Math.min(100, Math.max(0, parsed.similarity || 50)),
                differences: Array.isArray(parsed.differences) ? parsed.differences : [],
                addedInVendor2: Array.isArray(parsed.addedInVendor2) ? parsed.addedInVendor2 : [],
                removedFromVendor1: Array.isArray(parsed.removedFromVendor1) ? parsed.removedFromVendor1 : [],
                summary: parsed.summary || 'No summary available',
            };
        } catch (error) {
            console.error('Error parsing comparison response:', error);
            return {
                similarity: 50,
                differences: [],
                addedInVendor2: [],
                removedFromVendor1: [],
                summary: 'Failed to parse comparison results',
            };
        }
    }

    /**
     * Calculate overall similarity across all sections
     */
    private static calculateOverallSimilarity(deltas: SemanticDelta[]): number {
        if (deltas.length === 0) return 0;

        const totalSimilarity = deltas.reduce((sum, delta) => sum + delta.semanticSimilarity, 0);
        return Math.round(totalSimilarity / deltas.length);
    }

    /**
     * Generate unified view (best content from each vendor)
     */
    static generateUnifiedView(comparison: VendorComparison): {
        sectionId: string;
        sectionName: string;
        unifiedContent: string;
        sources: string[];
    }[] {
        return comparison.deltas.map(delta => {
            let unifiedContent = '';
            const sources: string[] = [];

            // If one vendor has content and the other doesn't, use the available one
            if (delta.vendor1Content && !delta.vendor2Content) {
                unifiedContent = delta.vendor1Content;
                sources.push(comparison.vendor1);
            } else if (!delta.vendor1Content && delta.vendor2Content) {
                unifiedContent = delta.vendor2Content;
                sources.push(comparison.vendor2);
            } else if (delta.semanticSimilarity >= 90) {
                // Very similar - use vendor2 (usually more recent)
                unifiedContent = delta.vendor2Content;
                sources.push(comparison.vendor2);
            } else {
                // Different content - combine both
                unifiedContent = `**From ${comparison.vendor1}:**\n${delta.vendor1Content}\n\n**From ${comparison.vendor2}:**\n${delta.vendor2Content}`;
                sources.push(comparison.vendor1, comparison.vendor2);
            }

            return {
                sectionId: delta.sectionId,
                sectionName: delta.sectionName,
                unifiedContent,
                sources,
            };
        });
    }

    /**
     * Get sections with significant differences
     */
    static getSignificantDifferences(
        comparison: VendorComparison,
        threshold: number = 70
    ): SemanticDelta[] {
        return comparison.deltas.filter(delta => delta.semanticSimilarity < threshold);
    }

    /**
     * Generate comparison summary
     */
    static generateSummary(comparison: VendorComparison): string {
        const totalSections = comparison.deltas.length;
        const significantDiffs = this.getSignificantDifferences(comparison, 70).length;
        const vendor1Only = comparison.deltas.filter(d => d.vendor1Content && !d.vendor2Content).length;
        const vendor2Only = comparison.deltas.filter(d => !d.vendor1Content && d.vendor2Content).length;

        let summary = `🔄 **Vendor Comparison: ${comparison.vendor1} vs ${comparison.vendor2}**\n\n`;
        summary += `Overall Similarity: ${comparison.overallSimilarity}%\n`;
        summary += `Sections Analyzed: ${totalSections}\n`;
        summary += `Significant Differences: ${significantDiffs}\n`;
        summary += `${comparison.vendor1} Only: ${vendor1Only} sections\n`;
        summary += `${comparison.vendor2} Only: ${vendor2Only} sections\n\n`;

        if (significantDiffs > 0) {
            summary += `**Sections with Significant Differences:**\n`;
            this.getSignificantDifferences(comparison, 70).forEach(delta => {
                summary += `- ${delta.sectionName} (${delta.semanticSimilarity}% similar)\n`;
            });
        }

        return summary;
    }

    /**
     * Create or update vendor profile based on document analysis
     */
    static async updateVendorProfile(
        vendorName: string,
        classifications: SectionClassification[],
        chunks: SemanticChunk[]
    ): Promise<VendorProfile> {
        // Extract patterns and examples from classifications
        const patterns = new Set<string>();
        const examples: Record<string, string[]> = {};

        classifications.forEach(classification => {
            const chunk = chunks.find(c => c.id === classification.chunkId);
            if (!chunk) return;

            classification.matches
                .filter(match => match.confidence >= 80) // High confidence only
                .forEach(match => {
                    // Add chunk content as example for this section
                    if (!examples[match.sectionId]) {
                        examples[match.sectionId] = [];
                    }

                    // Add first 200 chars as example
                    if (examples[match.sectionId].length < 3) {
                        examples[match.sectionId].push(chunk.content.substring(0, 200));
                    }

                    // Extract patterns (common phrases)
                    const commonPhrases = this.extractCommonPhrases(chunk.content);
                    commonPhrases.forEach(phrase => patterns.add(phrase));
                });
        });

        const profile: VendorProfile = {
            id: uuidv4(),
            name: vendorName,
            patterns: Array.from(patterns).slice(0, 50), // Limit to top 50 patterns
            examples,
            lastUpdated: new Date().toISOString(),
        };

        return profile;
    }

    /**
     * Extract common phrases from text
     */
    private static extractCommonPhrases(text: string): string[] {
        const phrases: string[] = [];

        // Extract technical terms (capitalized words, acronyms)
        const technicalTerms = text.match(/\b[A-Z][A-Z]+\b/g) || [];
        phrases.push(...technicalTerms);

        // Extract common action verbs in technical context
        const actionPatterns = [
            /\b(must|should|shall)\s+\w+/gi,
            /\b(ensure|verify|check|maintain|adjust)\s+\w+/gi,
        ];

        actionPatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            phrases.push(...matches.map(m => m.toLowerCase()));
        });

        return Array.from(new Set(phrases)).slice(0, 20);
    }
}
