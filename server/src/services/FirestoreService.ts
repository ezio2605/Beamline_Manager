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
    // Semantic Comparison Collections
    SEMANTIC_CHUNKS: 'semanticChunks',
    SECTION_CLASSIFICATIONS: 'sectionClassifications',
    MISSING_ELEMENTS_REPORTS: 'missingElementsReports',
    VENDOR_PROFILES: 'vendorProfiles',
    VENDOR_COMPARISONS: 'vendorComparisons',
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

    // ============================================
    // Semantic Comparison Methods
    // ============================================

    /**
     * Save semantic chunk
     */
    static async saveSemanticChunk(chunk: any): Promise<void> {
        await firestore.collection(COLLECTIONS.SEMANTIC_CHUNKS).doc(chunk.id).set(chunk);
    }

    /**
     * Get semantic chunks by document ID
     */
    static async getSemanticChunksByDocument(documentId: string): Promise<any[]> {
        const snapshot = await firestore
            .collection(COLLECTIONS.SEMANTIC_CHUNKS)
            .where('documentId', '==', documentId)
            .orderBy('chunkIndex', 'asc')
            .get();

        return snapshot.docs.map(doc => doc.data());
    }

    /**
     * Save section classification
     */
    static async saveSectionClassification(classification: any): Promise<void> {
        await firestore.collection(COLLECTIONS.SECTION_CLASSIFICATIONS).doc(classification.id).set(classification);
    }

    /**
     * Get section classifications by document ID
     */
    static async getSectionClassificationsByDocument(documentId: string): Promise<any[]> {
        const snapshot = await firestore
            .collection(COLLECTIONS.SECTION_CLASSIFICATIONS)
            .where('documentId', '==', documentId)
            .get();

        return snapshot.docs.map(doc => doc.data());
    }

    /**
     * Update classification status
     */
    static async updateClassificationStatus(
        classificationId: string,
        status: 'pending' | 'approved' | 'rejected' | 'needs_review',
        reviewedBy?: string
    ): Promise<void> {
        const updateData: any = {
            status,
            reviewedAt: new Date().toISOString(),
        };

        if (reviewedBy) {
            updateData.reviewedBy = reviewedBy;
        }

        await firestore.collection(COLLECTIONS.SECTION_CLASSIFICATIONS).doc(classificationId).update(updateData);
    }

    /**
     * Save missing elements report
     */
    static async saveMissingElementsReport(report: any): Promise<void> {
        await firestore.collection(COLLECTIONS.MISSING_ELEMENTS_REPORTS).doc(report.id).set(report);
    }

    /**
     * Get missing elements report by document ID
     */
    static async getMissingElementsReport(documentId: string): Promise<any | null> {
        const snapshot = await firestore
            .collection(COLLECTIONS.MISSING_ELEMENTS_REPORTS)
            .where('documentId', '==', documentId)
            .orderBy('generatedAt', 'desc')
            .limit(1)
            .get();

        return snapshot.empty ? null : snapshot.docs[0].data();
    }

    /**
     * Get all missing elements reports for a beamline
     */
    static async getMissingElementsReportsByBeamline(beamlineId: string): Promise<any[]> {
        const snapshot = await firestore
            .collection(COLLECTIONS.MISSING_ELEMENTS_REPORTS)
            .where('beamlineId', '==', beamlineId)
            .orderBy('generatedAt', 'desc')
            .get();

        return snapshot.docs.map(doc => doc.data());
    }

    /**
     * Save vendor profile
     */
    static async saveVendorProfile(profile: any): Promise<void> {
        await firestore.collection(COLLECTIONS.VENDOR_PROFILES).doc(profile.id).set(profile);
    }

    /**
     * Get vendor profile by name
     */
    static async getVendorProfile(vendorName: string): Promise<any | null> {
        const snapshot = await firestore
            .collection(COLLECTIONS.VENDOR_PROFILES)
            .where('name', '==', vendorName)
            .limit(1)
            .get();

        return snapshot.empty ? null : snapshot.docs[0].data();
    }

    /**
     * Get all vendor profiles
     */
    static async getAllVendorProfiles(): Promise<any[]> {
        const snapshot = await firestore
            .collection(COLLECTIONS.VENDOR_PROFILES)
            .orderBy('name', 'asc')
            .get();

        return snapshot.docs.map(doc => doc.data());
    }

    /**
     * Save vendor comparison
     */
    static async saveVendorComparison(comparison: any): Promise<void> {
        await firestore.collection(COLLECTIONS.VENDOR_COMPARISONS).doc(comparison.id).set(comparison);
    }

    /**
     * Get vendor comparison by ID
     */
    static async getVendorComparison(comparisonId: string): Promise<any | null> {
        const doc = await firestore.collection(COLLECTIONS.VENDOR_COMPARISONS).doc(comparisonId).get();
        return doc.exists ? doc.data() : null;
    }

    /**
     * Get vendor comparisons for a beamline
     */
    static async getVendorComparisonsByBeamline(beamlineId: string): Promise<any[]> {
        const snapshot = await firestore
            .collection(COLLECTIONS.VENDOR_COMPARISONS)
            .where('beamlineId', '==', beamlineId)
            .orderBy('generatedAt', 'desc')
            .get();

        return snapshot.docs.map(doc => doc.data());
    }

    /**
     * Delete all semantic data for a document
     */
    static async deleteSemanticDataForDocument(documentId: string): Promise<void> {
        const batch = firestore.batch();

        // Delete chunks
        const chunksSnapshot = await firestore
            .collection(COLLECTIONS.SEMANTIC_CHUNKS)
            .where('documentId', '==', documentId)
            .get();
        chunksSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // Delete classifications
        const classificationsSnapshot = await firestore
            .collection(COLLECTIONS.SECTION_CLASSIFICATIONS)
            .where('documentId', '==', documentId)
            .get();
        classificationsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // Delete reports
        const reportsSnapshot = await firestore
            .collection(COLLECTIONS.MISSING_ELEMENTS_REPORTS)
            .where('documentId', '==', documentId)
            .get();
        reportsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        await batch.commit();
        console.log(`✅ Deleted all semantic data for document ${documentId}`);
    }
}

