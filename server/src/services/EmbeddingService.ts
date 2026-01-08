import { VertexAI } from '@google-cloud/vertexai';

// Initialize Vertex AI with Google Cloud project
const vertexAI = new VertexAI({
    project: process.env.GCP_PROJECT_ID || '',
    location: process.env.GCP_LOCATION || 'us-central1',
});

export class EmbeddingService {
    /**
     * Generate embedding for a text using Gemini
     */
    static async generateEmbedding(text: string): Promise<number[]> {
        try {
            const model = vertexAI.getGenerativeModel({ model: 'text-embedding-004' });

            const result = await model.embedContent({
                content: [{ role: 'user', parts: [{ text }] }]
            });
            return result.embedding?.values || [];
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw new Error('Failed to generate embedding');
        }
    }

    /**
     * Generate embeddings for multiple texts (batch)
     */
    static async generateEmbeddings(texts: string[]): Promise<number[][]> {
        const embeddings: number[][] = [];

        // Process in batches to avoid rate limits
        const batchSize = 5;
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchEmbeddings = await Promise.all(
                batch.map(text => this.generateEmbedding(text))
            );
            embeddings.push(...batchEmbeddings);

            // Small delay between batches
            if (i + batchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return embeddings;
    }
}
