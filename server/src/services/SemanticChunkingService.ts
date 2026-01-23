import { v4 as uuidv4 } from 'uuid';
import { EmbeddingService } from './EmbeddingService.js';

export interface SemanticChunk {
    id: string;
    documentId: string;
    beamlineId: string;
    content: string;
    chunkIndex: number;
    metadata: {
        heading?: string;
        pageNumber?: number;
        previousContext?: string;
        nextContext?: string;
    };
    embedding?: number[];
    createdAt: string;
}

export interface ChunkingOptions {
    chunkSize?: number; // Target chunk size in characters
    overlap?: number; // Overlap between chunks
    preserveStructure?: boolean; // Try to preserve document structure
    generateEmbeddings?: boolean; // Generate embeddings for chunks
}

export class SemanticChunkingService {
    private static readonly DEFAULT_CHUNK_SIZE = 1000;
    private static readonly DEFAULT_OVERLAP = 200;

    /**
     * Create semantic chunks from document text
     */
    static async chunkDocument(
        documentId: string,
        beamlineId: string,
        content: string,
        options: ChunkingOptions = {}
    ): Promise<SemanticChunk[]> {
        const {
            chunkSize = this.DEFAULT_CHUNK_SIZE,
            overlap = this.DEFAULT_OVERLAP,
            preserveStructure = true,
            generateEmbeddings = false,
        } = options;

        console.log(`📄 Chunking document ${documentId}...`);

        // Extract document structure
        const structuredContent = preserveStructure
            ? this.extractStructure(content)
            : { text: content, headings: [] };

        // Create semantic chunks
        const textChunks = this.createSemanticChunks(
            structuredContent.text,
            chunkSize,
            overlap,
            structuredContent.headings
        );

        console.log(`✂️  Created ${textChunks.length} semantic chunks`);

        // Build SemanticChunk objects
        const chunks: SemanticChunk[] = [];
        const now = new Date().toISOString();

        for (let i = 0; i < textChunks.length; i++) {
            const previousContext = i > 0 ? textChunks[i - 1].content.substring(0, 100) : undefined;
            const nextContext = i < textChunks.length - 1 ? textChunks[i + 1].content.substring(0, 100) : undefined;

            // Build metadata object, excluding undefined values
            const metadata: SemanticChunk['metadata'] = {};
            if (textChunks[i].heading !== undefined) {
                metadata.heading = textChunks[i].heading;
            }
            if (textChunks[i].pageNumber !== undefined) {
                metadata.pageNumber = textChunks[i].pageNumber;
            }
            if (previousContext !== undefined) {
                metadata.previousContext = previousContext;
            }
            if (nextContext !== undefined) {
                metadata.nextContext = nextContext;
            }

            const chunk: SemanticChunk = {
                id: uuidv4(),
                documentId,
                beamlineId,
                content: textChunks[i].content,
                chunkIndex: i,
                metadata,
                createdAt: now,
            };

            chunks.push(chunk);
        }

        // Generate embeddings if requested
        if (generateEmbeddings) {
            console.log(`🔢 Generating embeddings for ${chunks.length} chunks...`);
            const embeddings = await EmbeddingService.generateEmbeddings(
                chunks.map(c => c.content)
            );

            chunks.forEach((chunk, index) => {
                if (embeddings[index] && embeddings[index].length > 0) {
                    chunk.embedding = embeddings[index];
                }
            });

            console.log(`✅ Generated embeddings for ${chunks.filter(c => c.embedding).length} chunks`);
        }

        return chunks;
    }

    /**
     * Extract document structure (headings, sections)
     */
    private static extractStructure(content: string): {
        text: string;
        headings: Array<{ text: string; position: number; level: number }>;
    } {
        const headings: Array<{ text: string; position: number; level: number }> = [];

        // Detect markdown-style headings
        const markdownHeadingRegex = /^(#{1,6})\s+(.+)$/gm;
        let match;

        while ((match = markdownHeadingRegex.exec(content)) !== null) {
            headings.push({
                text: match[2].trim(),
                position: match.index,
                level: match[1].length,
            });
        }

        // Detect numbered sections (e.g., "1. Introduction", "2.1 Safety")
        const numberedSectionRegex = /^(\d+\.(?:\d+\.)*)\s+(.+)$/gm;

        while ((match = numberedSectionRegex.exec(content)) !== null) {
            const level = match[1].split('.').filter(n => n).length;
            headings.push({
                text: match[2].trim(),
                position: match.index,
                level,
            });
        }

        // Detect ALL CAPS headings (common in technical documents)
        const allCapsRegex = /^([A-Z][A-Z\s]{3,})$/gm;

        while ((match = allCapsRegex.exec(content)) !== null) {
            // Avoid false positives (acronyms, short words)
            if (match[1].split(/\s+/).length >= 2) {
                headings.push({
                    text: match[1].trim(),
                    position: match.index,
                    level: 1,
                });
            }
        }

        // Sort headings by position
        headings.sort((a, b) => a.position - b.position);

        return { text: content, headings };
    }

    /**
     * Create semantic chunks with intelligent boundary detection
     */
    private static createSemanticChunks(
        text: string,
        chunkSize: number,
        overlap: number,
        headings: Array<{ text: string; position: number; level: number }>
    ): Array<{ content: string; heading?: string; pageNumber?: number }> {
        const chunks: Array<{ content: string; heading?: string; pageNumber?: number }> = [];

        // Clean the text
        const cleanedText = text
            .replace(/\r\n/g, '\n')
            .replace(/\s+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (cleanedText.length <= chunkSize) {
            return [{ content: cleanedText }];
        }

        let start = 0;
        let currentHeading: string | undefined;

        while (start < cleanedText.length) {
            const end = Math.min(start + chunkSize, cleanedText.length);

            // Find the current heading for this position
            currentHeading = this.findCurrentHeading(start, headings);

            // Extract chunk
            let chunk = cleanedText.slice(start, end);

            // Try to break at semantic boundaries
            if (end < cleanedText.length) {
                const breakPoint = this.findSemanticBoundary(chunk, chunkSize);
                if (breakPoint > 0) {
                    chunk = chunk.slice(0, breakPoint);
                }
            }

            // Add chunk
            chunks.push({
                content: chunk.trim(),
                heading: currentHeading,
            });

            // Move to next chunk with overlap
            start += chunk.length - overlap;

            // Ensure we make progress
            if (start <= chunks[chunks.length - 1].content.length - overlap) {
                start = chunks[chunks.length - 1].content.length + 1;
            }
        }

        return chunks.filter(chunk => chunk.content.length > 50); // Filter out very small chunks
    }

    /**
     * Find the current heading for a given position
     */
    private static findCurrentHeading(
        position: number,
        headings: Array<{ text: string; position: number; level: number }>
    ): string | undefined {
        let currentHeading: string | undefined;

        for (const heading of headings) {
            if (heading.position <= position) {
                currentHeading = heading.text;
            } else {
                break;
            }
        }

        return currentHeading;
    }

    /**
     * Find a good semantic boundary to break the chunk
     */
    private static findSemanticBoundary(chunk: string, targetSize: number): number {
        // Priority order for breaking:
        // 1. Paragraph break (double newline)
        // 2. Sentence end (period, exclamation, question mark)
        // 3. Comma or semicolon
        // 4. Space

        const minSize = targetSize / 2;

        // Look for paragraph break
        const paragraphBreak = chunk.lastIndexOf('\n\n');
        if (paragraphBreak > minSize) {
            return paragraphBreak + 2;
        }

        // Look for sentence end
        const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
        let bestBreak = -1;

        for (const ender of sentenceEnders) {
            const pos = chunk.lastIndexOf(ender);
            if (pos > minSize && pos > bestBreak) {
                bestBreak = pos + ender.length;
            }
        }

        if (bestBreak > 0) {
            return bestBreak;
        }

        // Look for comma or semicolon
        const punctuationBreaks = [', ', '; ', ',\n', ';\n'];
        for (const punct of punctuationBreaks) {
            const pos = chunk.lastIndexOf(punct);
            if (pos > minSize && pos > bestBreak) {
                bestBreak = pos + punct.length;
            }
        }

        if (bestBreak > 0) {
            return bestBreak;
        }

        // Fall back to last space
        const lastSpace = chunk.lastIndexOf(' ', targetSize);
        if (lastSpace > minSize) {
            return lastSpace + 1;
        }

        // No good break found, use target size
        return targetSize;
    }

    /**
     * Merge small chunks that are below a threshold
     */
    static mergeSmallChunks(chunks: SemanticChunk[], minSize: number = 200): SemanticChunk[] {
        const merged: SemanticChunk[] = [];
        let buffer: SemanticChunk | null = null;

        for (const chunk of chunks) {
            if (chunk.content.length < minSize && buffer) {
                // Merge with buffer
                buffer.content += '\n\n' + chunk.content;
                buffer.metadata.nextContext = chunk.metadata.nextContext;
            } else {
                if (buffer) {
                    merged.push(buffer);
                }
                buffer = { ...chunk };
            }
        }

        if (buffer) {
            merged.push(buffer);
        }

        // Update chunk indices
        merged.forEach((chunk, index) => {
            chunk.chunkIndex = index;
        });

        return merged;
    }

    /**
     * Add context windows to chunks
     */
    static addContextWindows(chunks: SemanticChunk[], windowSize: number = 100): SemanticChunk[] {
        return chunks.map((chunk, index) => {
            const previousContext =
                index > 0 ? chunks[index - 1].content.slice(-windowSize) : undefined;
            const nextContext =
                index < chunks.length - 1 ? chunks[index + 1].content.slice(0, windowSize) : undefined;

            // Build new metadata, excluding undefined values
            const newMetadata: SemanticChunk['metadata'] = { ...chunk.metadata };
            if (previousContext !== undefined) {
                newMetadata.previousContext = previousContext;
            }
            if (nextContext !== undefined) {
                newMetadata.nextContext = nextContext;
            }

            return {
                ...chunk,
                metadata: newMetadata,
            };
        });
    }

    /**
     * Get chunk statistics
     */
    static getChunkStatistics(chunks: SemanticChunk[]): {
        totalChunks: number;
        averageLength: number;
        minLength: number;
        maxLength: number;
        chunksWithEmbeddings: number;
    } {
        if (chunks.length === 0) {
            return {
                totalChunks: 0,
                averageLength: 0,
                minLength: 0,
                maxLength: 0,
                chunksWithEmbeddings: 0,
            };
        }

        const lengths = chunks.map(c => c.content.length);
        const totalLength = lengths.reduce((sum, len) => sum + len, 0);

        return {
            totalChunks: chunks.length,
            averageLength: Math.round(totalLength / chunks.length),
            minLength: Math.min(...lengths),
            maxLength: Math.max(...lengths),
            chunksWithEmbeddings: chunks.filter(c => c.embedding && c.embedding.length > 0).length,
        };
    }
}
