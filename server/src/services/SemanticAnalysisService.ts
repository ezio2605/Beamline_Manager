import { VertexAI } from '@google-cloud/vertexai';
import { FirestoreService } from './FirestoreService.js';
import { VectorSearchService } from './VectorSearchService.js';
import { StandardStructure, StandardSection } from './StandardStructureService.js';

// Initialize Vertex AI
const vertexAI = new VertexAI({
    project: process.env.GCP_PROJECT_ID || '',
    location: process.env.GCP_LOCATION || 'us-central1',
});

export interface AnalysisReport {
    documentId: string;
    coveragePercentage: number;
    foundSections: any[];
    missingSections: any[];
    categoryBreakdown: any[];
    aiInsights: string;
    recommendations: string[];
}

export class SemanticAnalysisService {
    /**
     * Analyze a document structure using Category-based RAG
     */
    static async analyzeDocument(
        documentId: string,
        beamlineId: string,
        standardStructure: StandardStructure,
        vendor: string
    ): Promise<AnalysisReport> {
        console.log(`🔍 Starting Semantic Analysis for ${documentId} (Category-based RAG)...`);

        // 1. Fetch all vector chunks for this document
        const vectorDocs = await FirestoreService.getVectorDocumentsByFileId(documentId);
        if (vectorDocs.length === 0) {
            throw new Error('No vector documents found for this file. Please ensure it is indexed.');
        }
        console.log(`📚 Loaded ${vectorDocs.length} chunks for document.`);

        // 2. Group sections by category
        const categories = this.groupSectionsByCategory(standardStructure.sections);
        const categoryNames = Object.keys(categories);
        console.log(`📋 Found ${categoryNames.length} categories to analyze: ${categoryNames.join(', ')}`);

        // 3. Iterate categories and analyze
        const allFoundSections: any[] = [];
        const allMissingSections: any[] = [];
        const categoryInsights: string[] = [];

        // Process categories sequentially to avoid rate limits
        for (const category of categoryNames) {
            console.log(`▶️ Analyzing category: ${category}...`);
            try {
                const sections = categories[category];
                const analysisParams = {
                    category,
                    sections,
                    vectorDocs,
                    vendor,
                    standardStructureName: standardStructure.name
                };

                const result = await this.analyzeCategory(analysisParams);

                allFoundSections.push(...result.found);
                allMissingSections.push(...result.missing);
                if (result.insights) categoryInsights.push(`**${category}**: ${result.insights}`);

                // Small delay between categories
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`❌ Error analyzing category ${category}:`, error);
                // Continue to next category instead of failing everything
                categoryInsights.push(`**${category}**: Failed to analyze due to error.`);
            }
        }

        // 4. Aggregate results
        const totalSections = standardStructure.sections.flatMap(s =>
            s.subsections ? [s, ...s.subsections] : [s]
        ).length; // Rough count, might need refinement based on how 'found' is structured

        // Re-calculate statistics
        const foundCount = allFoundSections.length;
        // Verify missing sections (ensure no duplicates or conflicts)
        // Ideally 'missing' is just (All Sections - Found Sections)

        // Let's refine the missing sections based on the Standard Structure vs Found
        const refinedMissing = this.calculateMissingSections(standardStructure, allFoundSections);

        const coveragePercentage = Math.round((foundCount / (foundCount + refinedMissing.length)) * 100);

        const categoryBreakdown = categoryNames.map(cat => {
            const catSections = categories[cat];
            const foundInCat = allFoundSections.filter(s => s.category === cat).length;
            const totalInCat = catSections.length; // Approximate, assuming flat list in categories map
            return {
                category: cat,
                total: totalInCat,
                found: foundInCat,
                percentage: totalInCat > 0 ? Math.round((foundInCat / totalInCat) * 100) : 0
            };
        });

        const overallInsights = categoryInsights.join('\n\n');

        return {
            documentId,
            coveragePercentage,
            foundSections: allFoundSections,
            missingSections: refinedMissing,
            categoryBreakdown,
            aiInsights: overallInsights,
            recommendations: this.generateRecommendations(refinedMissing)
        };
    }

    /**
     * Analyze a single category using RAG
     */
    private static async analyzeCategory(params: {
        category: string,
        sections: StandardSection[],
        vectorDocs: any[],
        vendor: string,
        standardStructureName: string
    }): Promise<{ found: any[], missing: any[], insights: string }> {
        // 1. Retrieve relevant chunks for this category
        // Construct a query based on section names and keywords
        const keywords = params.sections.flatMap(s => s.keywords || []).slice(0, 20).join(' ');
        const query = `${params.category} sections: ${params.sections.map(s => s.name).join(', ')}. ${keywords}`;

        // Search WITHIN the document vectors
        const relevantChunks = await VectorSearchService.searchInVectors(query, params.vectorDocs, 15);
        if (relevantChunks.length === 0) {
            console.warn(`⚠️ No relevant chunks found for category ${params.category}`);
            return { found: [], missing: params.sections.map(s => ({ sectionName: s.name, category: params.category })), insights: 'No relevant content found.' };
        }

        // Format context
        const contextText = relevantChunks.map(c => c.document.content).join('\n\n---\n\n');

        // 2. Build Prompt
        const prompt = `
You are analyzing a beamline operation manual${params.vendor && params.vendor !== 'None' && params.vendor !== 'Not Specified' ? ` (Vendor: ${params.vendor})` : ''}.
Target Structure: ${params.standardStructureName}
Category to Analyze: **${params.category}**

**Target Sections to Find**:
${params.sections.map(s => `- ${s.name} (Required: ${s.required}) - ${s.description}`).join('\n')}

**Document Excerpts (Context)**:
${contextText}

**Instructions**:
1. Determine which of the target sections are present in the provided excerpts.
2. A section is "Found" if there is explicit content addressing its description.
3. A section is "Missing" if no content addresses it.

**Response Format (JSON ONLY)**:
{
  "found": [
    { "sectionName": "Name", "confidence": 0-100, "evidence": "quote..." }
  ],
  "insights": "Brief summary of findings for this category"
}
`;

        // 3. Call Gemini
        const model = vertexAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: { responseMimeType: "application/json" }
        });
        const result = await model.generateContent(prompt);
        const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        try {
            const parsed = JSON.parse(responseText);
            const foundNames = new Set((parsed.found || []).map((f: any) => f.sectionName));

            // Map back to full section objects
            const found = (parsed.found || []).map((f: any) => {
                const originalSection = params.sections.find(s => s.name === f.sectionName);
                return {
                    sectionId: originalSection?.id || f.sectionName,
                    sectionName: f.sectionName,
                    category: params.category,
                    required: originalSection?.required || false,
                    evidence: f.evidence
                };
            });

            const missing = params.sections
                .filter(s => !foundNames.has(s.name))
                .map(s => ({
                    sectionId: s.id,
                    sectionName: s.name,
                    category: params.category,
                    required: s.required
                }));

            return { found, missing, insights: parsed.insights || '' };

        } catch (e) {
            console.error('Failed to parse JSON response for category ' + params.category, responseText);
            return { found: [], missing: [], insights: 'Error analyzing category.' };
        }
    }


    /**
     * Group flat list of sections by category
     */
    private static groupSectionsByCategory(rootSections: StandardSection[]): Record<string, StandardSection[]> {
        const groups: Record<string, StandardSection[]> = {};

        // Flatten first (or handle recursion)
        const flatten = (sections: StandardSection[]) => {
            for (const section of sections) {
                if (!groups[section.category]) {
                    groups[section.category] = [];
                }
                groups[section.category].push(section);

                if (section.subsections && section.subsections.length > 0) {
                    flatten(section.subsections);
                }
            }
        };

        flatten(rootSections);
        return groups;
    }

    /**
     * Calculate missing sections by comparing Standard Structure vs Found
     */
    private static calculateMissingSections(structure: StandardStructure, found: any[]): any[] {
        const foundNames = new Set(found.map(f => f.sectionName.toLowerCase()));

        const missing: any[] = [];
        const traverse = (sections: StandardSection[]) => {
            for (const section of sections) {
                if (!foundNames.has(section.name.toLowerCase())) {
                    missing.push({
                        sectionId: section.id,
                        sectionName: section.name,
                        category: section.category,
                        required: section.required
                    });
                }
                if (section.subsections) traverse(section.subsections);
            }
        };

        traverse(structure.sections);
        return missing;
    }

    private static generateRecommendations(missingSections: any[]): string[] {
        return missingSections
            .filter(s => s.required)
            .map(s => `Add missing required section: ${s.sectionName} (${s.category})`);
    }
}
