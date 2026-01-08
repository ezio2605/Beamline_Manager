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
            // Use text-embedding model
            const model = vertexAI.preview.getGenerativeModel({
                model: 'text-multilingual-embedding-002',
            });

            const request = {
                contents: [{ role: 'user', parts: [{ text }] }],
            };

            const result = await model.generateContent(request);

            // For embedding models, the response contains the embedding
            const embedding = result.response.candidates?.[0]?.content?.parts?.[0]?.text;

            if (embedding) {
                // Parse the embedding if it's returned as a string
                try {
                    const parsed = JSON.parse(embedding);
                    return parsed.values || parsed || [];
                } catch {
                    return [];
                }
            }

            return [];
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

        // Process one at a time with delays to respect 60 req/min quota (1 req per second)
        const batchSize = 1;
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchEmbeddings = await Promise.all(
                batch.map(text => this.generateEmbedding(text))
            );
            embeddings.push(...batchEmbeddings);

            // 1.2 second delay to stay within 60 req/min quota
            if (i + batchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 1200));
            }
        }

        return embeddings;
    }
}
