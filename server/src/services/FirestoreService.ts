import { Firestore, FieldValue } from '@google-cloud/firestore';

const firestore = new Firestore({
    projectId: process.env.GCP_PROJECT_ID,
});

// Collection names
const COLLECTIONS = {
    FILES: 'files',
    COMPARISONS: 'comparisons',
    VECTORS: 'vectors',
    LOGS: 'logs',
};

export interface FileMetadata {
    id: string;
    filename: string;
    beamlineId: string;
    fileType: 'jasri' | 'nichi';
    storagePath: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
    status: 'uploaded' | 'indexed' | 'processed' | 'error';
    lastCompared?: string;
    comparisonCase?: 'case1' | 'case2' | 'case3' | 'case4' | 'case5';
}

export interface ComparisonResult {
    id: string;
    jasriFileId?: string;
    nichiFileId: string;
    beamlineId: string;
    case: 'case1' | 'case2' | 'case3' | 'case4' | 'case5';
    timestamp: string;
    differences: string;
    aiInsights: string;
    actionTaken: string;
    retrievedDocs?: any[];
}

export interface VectorDocument {
    id: string;
    fileId: string;
    beamlineId: string;
    content: string;
    embedding: number[];
    chunkIndex: number;
    metadata: Record<string, any>;
    createdAt: string;
}

export class FirestoreService {
    /**
     * Save file metadata
     */
    static async saveFileMetadata(metadata: FileMetadata): Promise<void> {
        await firestore.collection(COLLECTIONS.FILES).doc(metadata.id).set(metadata);
    }

    /**
     * Get file metadata by ID
     */
    static async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
        const doc = await firestore.collection(COLLECTIONS.FILES).doc(fileId).get();
        return doc.exists ? (doc.data() as FileMetadata) : null;
    }

    /**
     * Get all JASRI files for a beamline
     */
    static async getJasriFiles(beamlineId: string): Promise<FileMetadata[]> {
        const snapshot = await firestore
            .collection(COLLECTIONS.FILES)
            .where('beamlineId', '==', beamlineId)
            .where('fileType', '==', 'jasri')
            .get();

        return snapshot.docs.map(doc => doc.data() as FileMetadata);
    }

    /**
     * Get all Nichi files for a beamline
     */
    static async getNichiFiles(beamlineId: string): Promise<FileMetadata[]> {
        const snapshot = await firestore
            .collection(COLLECTIONS.FILES)
            .where('beamlineId', '==', beamlineId)
            .where('fileType', '==', 'nichi')
            .get();

        return snapshot.docs.map(doc => doc.data() as FileMetadata);
    }

    /**
     * Update file status
     */
    static async updateFileStatus(
        fileId: string,
        status: FileMetadata['status']
    ): Promise<void> {
        await firestore.collection(COLLECTIONS.FILES).doc(fileId).update({ status });
    }

    /**
     * Save comparison result
     */
    static async saveComparisonResult(result: ComparisonResult): Promise<void> {
        await firestore.collection(COLLECTIONS.COMPARISONS).doc(result.id).set(result);
    }

    /**
     * Get comparison results for a beamline
     */
    static async getComparisonResults(beamlineId: string): Promise<ComparisonResult[]> {
        const snapshot = await firestore
            .collection(COLLECTIONS.COMPARISONS)
            .where('beamlineId', '==', beamlineId)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();

        return snapshot.docs.map(doc => doc.data() as ComparisonResult);
    }

    /**
     * Get a specific comparison result by ID
     */
    static async getComparisonResult(resultId: string): Promise<ComparisonResult | null> {
        const doc = await firestore.collection(COLLECTIONS.COMPARISONS).doc(resultId).get();
        return doc.exists ? (doc.data() as ComparisonResult) : null;
    }

    /**
     * Save vector document
     */
    static async saveVectorDocument(vectorDoc: VectorDocument): Promise<void> {
        await firestore.collection(COLLECTIONS.VECTORS).doc(vectorDoc.id).set(vectorDoc);
    }

    /**
     * Get all vector documents for a beamline
     */
    static async getVectorDocuments(beamlineId: string): Promise<VectorDocument[]> {
        const snapshot = await firestore
            .collection(COLLECTIONS.VECTORS)
            .where('beamlineId', '==', beamlineId)
            .get();

        return snapshot.docs.map(doc => doc.data() as VectorDocument);
    }

    /**
     * Delete vector documents for a file
     */
    static async deleteVectorDocuments(fileId: string): Promise<void> {
        const snapshot = await firestore
            .collection(COLLECTIONS.VECTORS)
            .where('fileId', '==', fileId)
            .get();

        const batch = firestore.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }

    /**
     * Find similar vectors using cosine similarity
     */
    static async findSimilarVectors(
        queryEmbedding: number[],
        beamlineId: string,
        topK: number = 5
    ): Promise<Array<{ document: VectorDocument; score: number }>> {
        const vectors = await this.getVectorDocuments(beamlineId);

        // Calculate cosine similarity
        const results = vectors.map(vec => ({
            document: vec,
            score: this.cosineSimilarity(queryEmbedding, vec.embedding),
        }));

        // Sort by score descending and return top K
        return results.sort((a, b) => b.score - a.score).slice(0, topK);
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private static cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Save log entry
     */
    static async saveLog(logData: any): Promise<void> {
        await firestore.collection(COLLECTIONS.LOGS).add({
            ...logData,
            timestamp: FieldValue.serverTimestamp(),
        });
    }

    /**
     * Initialize Firestore (create indexes if needed)
     */
    static async initialize(): Promise<void> {
        // Firestore collections are created automatically
        console.log('✅ Firestore initialized');
    }
}
