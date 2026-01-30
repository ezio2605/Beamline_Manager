// Embedding Service for RAG - Handles document embeddings using Gemini
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { TokenTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';

export interface DocumentChunk {
    content: string;
    metadata: {
        filename: string;
        beamlineId: string;
        chunkIndex: number;
        totalChunks: number;
        source: 'jasri' | 'nichi';
    };
}

export class EmbeddingService {
    private embeddings: GoogleGenerativeAIEmbeddings;
    private textSplitter: TokenTextSplitter;

    constructor(apiKey: string) {
        // Initialize Gemini embeddings
        this.embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: apiKey,
            modelName: 'embedding-001', // Gemini embedding model
        });

        // Initialize token splitter for chunking documents
        // Defaults to gpt2 tokenizer if no encoding is provided, which is close enough for general use
        this.textSplitter = new TokenTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
            encodingName: 'cl100k_base', // Modern encoding used by OpenAI models, good proxy for general tokenization
        });
    }

    /**
     * Split a document into chunks
     */
    async chunkDocument(
        content: string,
        filename: string,
        beamlineId: string,
        source: 'jasri' | 'nichi'
    ): Promise<DocumentChunk[]> {
        const chunks = await this.textSplitter.createDocuments([content]);

        return chunks.map((chunk, index) => ({
            content: chunk.pageContent,
            metadata: {
                filename,
                beamlineId,
                chunkIndex: index,
                totalChunks: chunks.length,
                source,
            },
        }));
    }

    /**
     * Generate embeddings for document chunks
     */
    async embedDocuments(chunks: DocumentChunk[]): Promise<number[][]> {
        const texts = chunks.map(chunk => chunk.content);
        return await this.embeddings.embedDocuments(texts);
    }

    /**
     * Generate embedding for a single query
     */
    async embedQuery(query: string): Promise<number[]> {
        return await this.embeddings.embedQuery(query);
    }

    /**
     * Process a document: chunk and embed
     */
    async processDocument(
        content: string,
        filename: string,
        beamlineId: string,
        source: 'jasri' | 'nichi'
    ): Promise<{ chunks: DocumentChunk[]; embeddings: number[][] }> {
        const chunks = await this.chunkDocument(content, filename, beamlineId, source);
        const embeddings = await this.embedDocuments(chunks);

        return { chunks, embeddings };
    }

    /**
     * Convert DocumentChunks to LangChain Documents
     */
    chunksToDocuments(chunks: DocumentChunk[]): Document[] {
        return chunks.map(chunk => new Document({
            pageContent: chunk.content,
            metadata: chunk.metadata,
        }));
    }

    /**
     * Get the embeddings instance for use with vector stores
     */
    getEmbeddings(): GoogleGenerativeAIEmbeddings {
        return this.embeddings;
    }
}
