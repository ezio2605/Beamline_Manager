import { FirestoreService, type VectorDocument } from './FirestoreService.js';
import { EmbeddingService } from './EmbeddingService.js';
import { FileProcessorService } from './FileProcessorService.js';
import { v4 as uuidv4 } from 'uuid';

export interface SimilarDocument {
    document: VectorDocument;
    score: number;
    rank: number;
}

export class VectorSearchService {
    /**
     * Index a document into the vector store
     */
    static async indexDocument(
        fileId: string,
        beamlineId: string,
        content: string,
        metadata: Record<string, any> = {}
    ): Promise<void> {
        // Chunk the document
        const chunks = FileProcessorService.chunkText(content);

        // Generate embeddings for each chunk
        const embeddings = await EmbeddingService.generateEmbeddings(chunks);

        // Save each chunk as a vector document
        const vectorDocs: VectorDocument[] = chunks.map((chunk, index) => ({
            id: `${fileId}_chunk_${index}`,
            fileId,
            beamlineId,
            content: chunk,
            embedding: embeddings[index],
            chunkIndex: index,
            metadata: {
                ...metadata,
                totalChunks: chunks.length,
            },
            createdAt: new Date().toISOString(),
        }));

        // Save all vector documents
        for (const vectorDoc of vectorDocs) {
            await FirestoreService.saveVectorDocument(vectorDoc);
        }

        console.log(`✅ Indexed ${chunks.length} chunks for file ${fileId}`);
    }

    /**
     * Search for similar documents using semantic search
     */
    static async searchSimilar(
        query: string,
        beamlineId: string,
        topK: number = 5
    ): Promise<SimilarDocument[]> {
        // Generate embedding for query
        const queryEmbedding = await EmbeddingService.generateEmbedding(query);

        // Find similar vectors
        const results = await FirestoreService.findSimilarVectors(
            queryEmbedding,
            beamlineId,
            topK
        );

        // Add rank to results
        return results.map((result, index) => ({
            ...result,
            rank: index + 1,
        }));
    }

    /**
     * Find the most similar JASRI document for a Nichi file
     */
    static async findMostSimilarJasriDocument(
        nichiContent: string,
        beamlineId: string,
        topK: number = 3
    ): Promise<SimilarDocument[]> {
        return this.searchSimilar(nichiContent, beamlineId, topK);
    }

    /**
     * Delete all vectors for a file
     */
    static async deleteFileVectors(fileId: string): Promise<void> {
        await FirestoreService.deleteVectorDocuments(fileId);
        console.log(`✅ Deleted vectors for file ${fileId}`);
    }

    /**
     * Re-index a file (delete old vectors and create new ones)
     */
    static async reindexDocument(
        fileId: string,
        beamlineId: string,
        content: string,
        metadata: Record<string, any> = {}
    ): Promise<void> {
        await this.deleteFileVectors(fileId);
        await this.indexDocument(fileId, beamlineId, content, metadata);
    }

    /**
     * Get indexing statistics for a beamline
     */
    static async getIndexStats(beamlineId: string): Promise<{
        totalDocuments: number;
        totalChunks: number;
    }> {
        const vectors = await FirestoreService.getVectorDocuments(beamlineId);
        const uniqueFiles = new Set(vectors.map(v => v.fileId));

        return {
            totalDocuments: uniqueFiles.size,
            totalChunks: vectors.length,
        };
    }
}
