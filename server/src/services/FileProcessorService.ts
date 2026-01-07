import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ProcessedDocument {
    filename: string;
    content: string;
    chunks: string[];
    fileType: string;
    metadata: {
        pageCount?: number;
        size: number;
    };
}

export class FileProcessorService {
    /**
     * Process a PDF file
     */
    static async processPDF(buffer: Buffer, filename: string): Promise<ProcessedDocument> {
        const data = await pdfParse(buffer);

        const chunks = this.chunkText(data.text);

        return {
            filename,
            content: data.text,
            chunks,
            fileType: 'pdf',
            metadata: {
                pageCount: data.numpages,
                size: buffer.length,
            },
        };
    }

    /**
     * Process a DOCX file
     */
    static async processDOCX(buffer: Buffer, filename: string): Promise<ProcessedDocument> {
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value;

        const chunks = this.chunkText(text);

        return {
            filename,
            content: text,
            chunks,
            fileType: 'docx',
            metadata: {
                size: buffer.length,
            },
        };
    }

    /**
     * Process a text file
     */
    static async processTXT(buffer: Buffer, filename: string): Promise<ProcessedDocument> {
        const text = buffer.toString('utf-8');
        const chunks = this.chunkText(text);

        return {
            filename,
            content: text,
            chunks,
            fileType: 'txt',
            metadata: {
                size: buffer.length,
            },
        };
    }

    /**
     * Process any supported file type
     */
    static async processFile(
        buffer: Buffer,
        filename: string,
        mimeType: string
    ): Promise<ProcessedDocument> {
        const extension = filename.split('.').pop()?.toLowerCase();

        switch (extension) {
            case 'pdf':
                return this.processPDF(buffer, filename);
            case 'docx':
            case 'doc':
                return this.processDOCX(buffer, filename);
            case 'txt':
            case 'md':
                return this.processTXT(buffer, filename);
            default:
                throw new Error(`Unsupported file type: ${extension}`);
        }
    }

    /**
     * Chunk text into smaller pieces for embedding
     * Uses a simple sliding window approach
     */
    static chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
        // Clean the text
        const cleanedText = text
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .trim();

        if (cleanedText.length <= chunkSize) {
            return [cleanedText];
        }

        const chunks: string[] = [];
        let start = 0;

        while (start < cleanedText.length) {
            const end = Math.min(start + chunkSize, cleanedText.length);
            let chunk = cleanedText.slice(start, end);

            // Try to break at sentence boundary
            if (end < cleanedText.length) {
                const lastPeriod = chunk.lastIndexOf('.');
                const lastNewline = chunk.lastIndexOf('\n');
                const breakPoint = Math.max(lastPeriod, lastNewline);

                if (breakPoint > chunkSize / 2) {
                    chunk = chunk.slice(0, breakPoint + 1);
                }
            }

            chunks.push(chunk.trim());
            start += chunkSize - overlap;
        }

        return chunks.filter(chunk => chunk.length > 0);
    }

    /**
     * Check if file type is supported
     */
    static isSupportedFileType(filename: string): boolean {
        const extension = filename.split('.').pop()?.toLowerCase();
        return ['pdf', 'docx', 'doc', 'txt', 'md'].includes(extension || '');
    }

    /**
     * Get supported file extensions
     */
    static getSupportedExtensions(): string[] {
        return ['.pdf', '.docx', '.doc', '.txt', '.md'];
    }
}
