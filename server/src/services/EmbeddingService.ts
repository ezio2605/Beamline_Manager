import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

export class EmbeddingService {
    /**
     * Generate embedding for a text using OpenAI
     */
    static async generateEmbedding(text: string): Promise<number[]> {
        try {
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small', // Fast, cheap, high quality
                input: text,
                encoding_format: 'float',
            });

            return response.data[0].embedding;
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

        // OpenAI supports batch requests up to 2048 inputs
        // Process in smaller batches for reliability
        const batchSize = 100;
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);

            try {
                const response = await openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: batch,
                    encoding_format: 'float',
                });

                embeddings.push(...response.data.map(item => item.embedding));
            } catch (error) {
                console.error(`Error generating embeddings for batch ${i}:`, error);
                // Fallback to individual requests if batch fails
                for (const text of batch) {
                    try {
                        const embedding = await this.generateEmbedding(text);
                        embeddings.push(embedding);
                    } catch (err) {
                        console.error('Error generating individual embedding:', err);
                        embeddings.push([]); // Empty embedding on failure
                    }
                }
            }

            // Small delay between batches to be respectful
            if (i + batchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return embeddings;
    }
}
