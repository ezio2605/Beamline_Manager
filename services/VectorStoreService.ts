// Vector Store Service for RAG - Manages document storage and similarity search
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from '@langchain/core/documents';
import { EmbeddingService, DocumentChunk } from './EmbeddingService';

export interface SimilarityResult {
    document: DocumentChunk;
    score: number;
    rank: number;
}

export class VectorStoreService {
    private vectorStore: MemoryVectorStore | null = null;
    private embeddingService: EmbeddingService;
    private isInitialized: boolean = false;

    constructor(embeddingService: EmbeddingService) {
        this.embeddingService = embeddingService;
    }

    /**
     * Initialize the vector store
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.log('Vector store already initialized');
            return;
        }

        // Create an empty vector store
        this.vectorStore = new MemoryVectorStore(
            this.embeddingService.getEmbeddings()
        );

        this.isInitialized = true;
        console.log('Vector store initialized');
    }

    /**
     * Add documents to the vector store
     */
    async addDocuments(chunks: DocumentChunk[]): Promise<void> {
        if (!this.vectorStore) {
            throw new Error('Vector store not initialized. Call initialize() first.');
        }

        const documents = this.embeddingService.chunksToDocuments(chunks);
        await this.vectorStore.addDocuments(documents);

        console.log(`Added ${chunks.length} document chunks to vector store`);
    }

    /**
     * Index a complete document (chunk and add to vector store)
     */
    async indexDocument(
        content: string,
        filename: string,
        beamlineId: string,
        source: 'jasri' | 'nichi'
    ): Promise<number> {
        if (!this.vectorStore) {
            throw new Error('Vector store not initialized. Call initialize() first.');
        }

        const { chunks } = await this.embeddingService.processDocument(
            content,
            filename,
            beamlineId,
            source
        );

        await this.addDocuments(chunks);

        return chunks.length;
    }

    /**
     * Search for similar documents using a query
     */
    async searchSimilar(
        query: string,
        k: number = 5,
        filterOptions?: { beamlineId?: string; source?: 'jasri' | 'nichi' }
    ): Promise<SimilarityResult[]> {
        if (!this.vectorStore) {
            throw new Error('Vector store not initialized. Call initialize() first.');
        }

        // Create filter function if filter options provided
        const filter = filterOptions
            ? (doc: Document) => {
                const metadata = doc.metadata as DocumentChunk['metadata'];
                if (filterOptions.beamlineId && metadata.beamlineId !== filterOptions.beamlineId) {
                    return false;
                }
                if (filterOptions.source && metadata.source !== filterOptions.source) {
                    return false;
                }
                return true;
            }
            : undefined;

        // Perform similarity search with scores
        const results = await this.vectorStore.similaritySearchWithScore(query, k, filter);

        // Convert to SimilarityResult format
        return results.map((result, index) => ({
            document: {
                content: result[0].pageContent,
                metadata: result[0].metadata as DocumentChunk['metadata'],
            },
            score: result[1],
            rank: index + 1,
        }));
    }

    /**
     * Find the most similar JASRI document for a Nichi file
     */
    async findMostSimilarJasriDocument(
        nichiContent: string,
        beamlineId: string,
        topK: number = 3
    ): Promise<SimilarityResult[]> {
        return await this.searchSimilar(
            nichiContent,
            topK,
            { beamlineId, source: 'jasri' }
        );
    }

    /**
     * Get all indexed documents count
     */
    getDocumentCount(): number {
        if (!this.vectorStore) {
            return 0;
        }
        // MemoryVectorStore doesn't expose document count directly
        // This is a limitation, but we can track it separately if needed
        return -1; // Indicates count not available
    }

    /**
     * Clear the vector store
     */
    async clear(): Promise<void> {
        if (this.vectorStore) {
            // Reinitialize with empty store
            this.vectorStore = new MemoryVectorStore(
                this.embeddingService.getEmbeddings()
            );
            console.log('Vector store cleared');
        }
    }

    /**
     * Check if vector store is initialized
     */
    isReady(): boolean {
        return this.isInitialized && this.vectorStore !== null;
    }

    /**
     * Batch index multiple documents
     */
    async batchIndexDocuments(
        documents: Array<{
            content: string;
            filename: string;
            beamlineId: string;
            source: 'jasri' | 'nichi';
        }>,
        onProgress?: (current: number, total: number) => void
    ): Promise<number> {
        if (!this.vectorStore) {
            throw new Error('Vector store not initialized. Call initialize() first.');
        }

        let totalChunks = 0;

        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            const chunksAdded = await this.indexDocument(
                doc.content,
                doc.filename,
                doc.beamlineId,
                doc.source
            );

            totalChunks += chunksAdded;

            if (onProgress) {
                onProgress(i + 1, documents.length);
            }
        }

        console.log(`Batch indexed ${documents.length} documents (${totalChunks} chunks total)`);
        return totalChunks;
    }
}
