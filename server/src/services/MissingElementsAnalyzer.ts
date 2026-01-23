import { v4 as uuidv4 } from 'uuid';
import { StandardSection, StandardStructure, StandardStructureService } from './StandardStructureService.js';
import { SectionClassification } from './SectionClassificationService.js';

export interface MissingSection {
    sectionId: string;
    sectionName: string;
    category: string;
    required: boolean;
    recommendation: string;
}

export interface CategoryCoverage {
    category: string;
    total: number;
    found: number;
    percentage: number;
}

export interface MissingElementsReport {
    id: string;
    documentId: string;
    beamlineId: string;
    standardStructureId: string;
    foundSections: string[];
    missingSections: MissingSection[];
    coveragePercentage: number;
    categoryBreakdown: CategoryCoverage[];
    generatedAt: string;
}

export class MissingElementsAnalyzer {
    private static readonly CONFIDENCE_THRESHOLD = 50; // Minimum confidence to consider a section "found"

    /**
     * Analyze a document for missing elements
     */
    static async analyzeDocument(
        documentId: string,
        beamlineId: string,
        classifications: SectionClassification[],
        standardStructure: StandardStructure
    ): Promise<MissingElementsReport> {
        console.log(`📊 Analyzing document ${documentId} for missing elements...`);

        // Build section inventory (which sections were found)
        const foundSectionIds = this.buildSectionInventory(classifications);

        // Get all sections from standard structure
        const allSections = StandardStructureService.flattenSections(standardStructure.sections);

        // Identify missing sections
        const missingSections = this.identifyMissingSections(allSections, foundSectionIds);

        // Calculate coverage by category
        const categoryBreakdown = this.calculateCategoryBreakdown(allSections, foundSectionIds);

        // Calculate overall coverage
        const totalSections = allSections.length;
        const foundCount = foundSectionIds.length;
        const coveragePercentage = totalSections > 0 ? Math.round((foundCount / totalSections) * 100) : 0;

        const report: MissingElementsReport = {
            id: uuidv4(),
            documentId,
            beamlineId,
            standardStructureId: standardStructure.id,
            foundSections: foundSectionIds,
            missingSections,
            coveragePercentage,
            categoryBreakdown,
            generatedAt: new Date().toISOString(),
        };

        console.log(
            `✅ Analysis complete: ${foundCount}/${totalSections} sections found (${coveragePercentage}% coverage)`
        );
        console.log(`   Missing required sections: ${missingSections.filter(s => s.required).length}`);

        return report;
    }

    /**
     * Build inventory of found sections from classifications
     */
    private static buildSectionInventory(classifications: SectionClassification[]): string[] {
        const foundSections = new Set<string>();

        classifications.forEach(classification => {
            // Only count matches above confidence threshold
            classification.matches
                .filter(match => match.confidence >= this.CONFIDENCE_THRESHOLD)
                .forEach(match => {
                    foundSections.add(match.sectionId);
                });
        });

        return Array.from(foundSections);
    }

    /**
     * Identify missing sections
     */
    private static identifyMissingSections(
        allSections: StandardSection[],
        foundSectionIds: string[]
    ): MissingSection[] {
        const missingSections: MissingSection[] = [];

        allSections.forEach(section => {
            if (!foundSectionIds.includes(section.id)) {
                missingSections.push({
                    sectionId: section.id,
                    sectionName: section.name,
                    category: section.category,
                    required: section.required,
                    recommendation: this.generateRecommendation(section),
                });
            }
        });

        // Sort: required sections first, then by category
        missingSections.sort((a, b) => {
            if (a.required !== b.required) {
                return a.required ? -1 : 1;
            }
            return a.category.localeCompare(b.category);
        });

        return missingSections;
    }

    /**
     * Generate recommendation for missing section
     */
    private static generateRecommendation(section: StandardSection): string {
        if (section.required) {
            return `CRITICAL: This is a required section. The manual must include information about ${section.name.toLowerCase()}. Please add this section or verify that the content exists under a different heading.`;
        } else {
            return `OPTIONAL: Consider adding information about ${section.name.toLowerCase()} to improve manual completeness. This section is not strictly required but is recommended for comprehensive documentation.`;
        }
    }

    /**
     * Calculate coverage breakdown by category
     */
    private static calculateCategoryBreakdown(
        allSections: StandardSection[],
        foundSectionIds: string[]
    ): CategoryCoverage[] {
        // Group sections by category
        const categoryMap = new Map<string, { total: number; found: number }>();

        allSections.forEach(section => {
            const category = section.category;
            if (!categoryMap.has(category)) {
                categoryMap.set(category, { total: 0, found: 0 });
            }

            const stats = categoryMap.get(category)!;
            stats.total++;

            if (foundSectionIds.includes(section.id)) {
                stats.found++;
            }
        });

        // Convert to array
        const breakdown: CategoryCoverage[] = Array.from(categoryMap.entries()).map(([category, stats]) => ({
            category,
            total: stats.total,
            found: stats.found,
            percentage: Math.round((stats.found / stats.total) * 100),
        }));

        // Sort by percentage (lowest first to highlight gaps)
        breakdown.sort((a, b) => a.percentage - b.percentage);

        return breakdown;
    }

    /**
     * Get critical missing sections (required only)
     */
    static getCriticalMissingSections(report: MissingElementsReport): MissingSection[] {
        return report.missingSections.filter(section => section.required);
    }

    /**
     * Get coverage status (complete, partial, incomplete)
     */
    static getCoverageStatus(report: MissingElementsReport): 'complete' | 'partial' | 'incomplete' {
        const criticalMissing = this.getCriticalMissingSections(report);

        if (criticalMissing.length > 0) {
            return 'incomplete';
        }

        if (report.coveragePercentage >= 90) {
            return 'complete';
        }

        return 'partial';
    }

    /**
     * Generate human-readable summary
     */
    static generateSummary(report: MissingElementsReport): string {
        const status = this.getCoverageStatus(report);
        const criticalMissing = this.getCriticalMissingSections(report);

        let summary = `📊 **Coverage Report**\n\n`;
        summary += `Overall Coverage: ${report.coveragePercentage}% (${report.foundSections.length}/${report.foundSections.length + report.missingSections.length} sections)\n`;
        summary += `Status: ${status.toUpperCase()}\n\n`;

        if (criticalMissing.length > 0) {
            summary += `⚠️  **CRITICAL: ${criticalMissing.length} Required Section(s) Missing**\n`;
            criticalMissing.forEach(section => {
                summary += `   - ${section.sectionName} (${section.category})\n`;
            });
            summary += `\n`;
        }

        if (report.missingSections.length > criticalMissing.length) {
            const optionalMissing = report.missingSections.length - criticalMissing.length;
            summary += `ℹ️  ${optionalMissing} Optional Section(s) Missing\n\n`;
        }

        summary += `**Coverage by Category:**\n`;
        report.categoryBreakdown.forEach(category => {
            const icon = category.percentage >= 90 ? '✅' : category.percentage >= 50 ? '⚠️' : '❌';
            summary += `${icon} ${category.category}: ${category.percentage}% (${category.found}/${category.total})\n`;
        });

        return summary;
    }

    /**
     * Compare coverage between two documents
     */
    static compareCoverage(report1: MissingElementsReport, report2: MissingElementsReport): {
        improved: string[];
        declined: string[];
        unchanged: string[];
        coverageDelta: number;
    } {
        const sections1 = new Set(report1.foundSections);
        const sections2 = new Set(report2.foundSections);

        const improved: string[] = [];
        const declined: string[] = [];
        const unchanged: string[] = [];

        // Check sections in report2
        sections2.forEach(sectionId => {
            if (!sections1.has(sectionId)) {
                improved.push(sectionId);
            } else {
                unchanged.push(sectionId);
            }
        });

        // Check sections in report1 that are missing in report2
        sections1.forEach(sectionId => {
            if (!sections2.has(sectionId)) {
                declined.push(sectionId);
            }
        });

        const coverageDelta = report2.coveragePercentage - report1.coveragePercentage;

        return {
            improved,
            declined,
            unchanged,
            coverageDelta,
        };
    }

    /**
     * Get sections with low confidence (found but uncertain)
     */
    static getLowConfidenceSections(
        classifications: SectionClassification[],
        minConfidence: number = 50,
        maxConfidence: number = 70
    ): Array<{ sectionId: string; sectionName: string; confidence: number; chunkId: string }> {
        const lowConfidenceSections: Array<{
            sectionId: string;
            sectionName: string;
            confidence: number;
            chunkId: string;
        }> = [];

        classifications.forEach(classification => {
            classification.matches
                .filter(match => match.confidence >= minConfidence && match.confidence <= maxConfidence)
                .forEach(match => {
                    lowConfidenceSections.push({
                        sectionId: match.sectionId,
                        sectionName: match.sectionName,
                        confidence: match.confidence,
                        chunkId: classification.chunkId,
                    });
                });
        });

        // Sort by confidence (lowest first)
        lowConfidenceSections.sort((a, b) => a.confidence - b.confidence);

        return lowConfidenceSections;
    }

    /**
     * Export report to JSON
     */
    static exportReport(report: MissingElementsReport): string {
        return JSON.stringify(report, null, 2);
    }

    /**
     * Generate actionable recommendations
     */
    static generateRecommendations(report: MissingElementsReport): string[] {
        const recommendations: string[] = [];

        const criticalMissing = this.getCriticalMissingSections(report);

        if (criticalMissing.length > 0) {
            recommendations.push(
                `🚨 PRIORITY: Add ${criticalMissing.length} required section(s): ${criticalMissing.map(s => s.sectionName).join(', ')}`
            );
        }

        // Check for categories with low coverage
        const lowCoverageCategories = report.categoryBreakdown.filter(cat => cat.percentage < 50);
        if (lowCoverageCategories.length > 0) {
            recommendations.push(
                `⚠️  Improve coverage in: ${lowCoverageCategories.map(cat => `${cat.category} (${cat.percentage}%)`).join(', ')}`
            );
        }

        // Check overall coverage
        if (report.coveragePercentage < 70) {
            recommendations.push(
                `📝 Overall coverage is ${report.coveragePercentage}%. Aim for at least 90% coverage for a complete manual.`
            );
        } else if (report.coveragePercentage >= 90 && criticalMissing.length === 0) {
            recommendations.push(`✅ Excellent coverage! Manual meets all required sections.`);
        }

        return recommendations;
    }
}
