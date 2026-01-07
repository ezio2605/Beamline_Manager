// Document Processor - Handles file reading and text extraction
export interface ProcessedDocument {
    content: string;
    filename: string;
    fileType: string;
    metadata: {
        size: number;
        extractedAt: string;
        encoding?: string;
    };
}

export class DocumentProcessor {
    /**
     * Process a file and extract text content
     * For now, handles text-based files. Can be extended for PDF, DOCX, etc.
     */
    static async processFile(file: File): Promise<ProcessedDocument> {
        const content = await this.extractText(file);

        return {
            content,
            filename: file.name,
            fileType: file.type || this.getFileTypeFromName(file.name),
            metadata: {
                size: file.size,
                extractedAt: new Date().toISOString(),
                encoding: 'utf-8',
            },
        };
    }

    /**
     * Extract text from a file
     */
    private static async extractText(file: File): Promise<string> {
        const fileType = file.type || this.getFileTypeFromName(file.name);

        // Handle different file types
        if (fileType.includes('text') || fileType.includes('plain')) {
            return await this.readTextFile(file);
        } else if (fileType.includes('markdown') || file.name.endsWith('.md')) {
            return await this.readTextFile(file);
        } else if (fileType.includes('json')) {
            return await this.readTextFile(file);
        } else {
            // Default: try to read as text
            return await this.readTextFile(file);
        }
    }

    /**
     * Read a text file
     */
    private static async readTextFile(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const text = e.target?.result as string;
                resolve(text || '');
            };

            reader.onerror = () => {
                reject(new Error(`Failed to read file: ${file.name}`));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Get file type from filename extension
     */
    private static getFileTypeFromName(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();

        const typeMap: Record<string, string> = {
            'txt': 'text/plain',
            'md': 'text/markdown',
            'json': 'application/json',
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };

        return typeMap[ext || ''] || 'application/octet-stream';
    }

    /**
     * Validate if a file can be processed
     */
    static canProcess(file: File): boolean {
        const supportedTypes = [
            'text/plain',
            'text/markdown',
            'application/json',
        ];

        const fileType = file.type || this.getFileTypeFromName(file.name);

        return supportedTypes.some(type => fileType.includes(type)) ||
            file.name.endsWith('.txt') ||
            file.name.endsWith('.md');
    }

    /**
     * Get supported file extensions
     */
    static getSupportedExtensions(): string[] {
        return ['.txt', '.md', '.json'];
    }

    /**
     * Process multiple files
     */
    static async processFiles(
        files: File[],
        onProgress?: (current: number, total: number) => void
    ): Promise<ProcessedDocument[]> {
        const results: ProcessedDocument[] = [];

        for (let i = 0; i < files.length; i++) {
            try {
                const processed = await this.processFile(files[i]);
                results.push(processed);

                if (onProgress) {
                    onProgress(i + 1, files.length);
                }
            } catch (error) {
                console.error(`Error processing file ${files[i].name}:`, error);
                // Continue with other files
            }
        }

        return results;
    }

    /**
     * Extract metadata from content
     */
    static extractMetadata(content: string): Record<string, any> {
        return {
            wordCount: content.split(/\s+/).length,
            charCount: content.length,
            lineCount: content.split('\n').length,
            hasJapanese: /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(content),
        };
    }
}
