import { VertexAI } from '@google-cloud/vertexai';
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { google } from '@google-cloud/aiplatform/build/protos/protos';

// Initialize Vertex AI client
const vertexAI = new VertexAI({
    project: process.env.GCP_PROJECT_ID || '',
    location: process.env.GCP_LOCATION || 'us-central1',
});

export class EmbeddingService {
    /**
     * Generate embedding for a text using Vertex AI with retry logic
     */
    static async generateEmbedding(text: string, retries: number = 3): Promise<number[]> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const client = new PredictionServiceClient({
                    apiEndpoint: `${process.env.GCP_LOCATION || 'us-central1'}-aiplatform.googleapis.com`,
                });

                const endpoint = `projects/${process.env.GCP_PROJECT_ID}/locations/${process.env.GCP_LOCATION || 'us-central1'}/publishers/google/models/text-embedding-004`;

                // Create instance with proper structure for text-embedding-004
                const instance = {
                    structValue: {
                        fields: {
                            content: {
                                stringValue: text,
                            },
                        },
                    },
                };

                const instances = [instance];
                const parameters = {
                    structValue: {
                        fields: {},
                    },
                };

                const request = {
                    endpoint,
                    instances,
                    parameters,
                };

                const [response] = await client.predict(request);
                const predictions = response.predictions;

                if (predictions && predictions.length > 0) {
                    const prediction = predictions[0];
                    // Extract embeddings from the struct value
                    const embeddingsField = prediction.structValue?.fields?.embeddings;
                    const valuesField = embeddingsField?.structValue?.fields?.values;
                    const listValue = valuesField?.listValue?.values;

                    if (listValue) {
                        return listValue.map((v: any) => v.numberValue || 0);
                    }
                }

                throw new Error('No embedding returned from Vertex AI');
            } catch (error) {
                lastError = error as Error;
                console.error(`⚠️  Error generating embedding (attempt ${attempt + 1}/${retries}):`, error);

                // If not the last attempt, wait before retrying (exponential backoff)
                if (attempt < retries - 1) {
                    const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                    console.log(`   Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // All retries failed
        console.error('❌ Failed to generate embedding after all retries');
        throw lastError || new Error('Failed to generate embedding');
    }

    /**
     * Generate embeddings for multiple texts (batch)
     */
    static async generateEmbeddings(texts: string[]): Promise<number[][]> {
        const embeddings: number[][] = [];
        const failedIndices: number[] = [];

        // Vertex AI text-embedding supports batch requests
        // Process in smaller batches for reliability (5 texts per request recommended)
        const batchSize = 5;
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);

            try {
                const client = new PredictionServiceClient({
                    apiEndpoint: `${process.env.GCP_LOCATION || 'us-central1'}-aiplatform.googleapis.com`,
                });

                const endpoint = `projects/${process.env.GCP_PROJECT_ID}/locations/${process.env.GCP_LOCATION || 'us-central1'}/publishers/google/models/text-embedding-004`;

                // Create instances with proper structure
                const instances = batch.map(text => ({
                    structValue: {
                        fields: {
                            content: {
                                stringValue: text,
                            },
                        },
                    },
                }));

                const parameters = {
                    structValue: {
                        fields: {},
                    },
                };

                const request = {
                    endpoint,
                    instances,
                    parameters,
                };

                const [response] = await client.predict(request);
                const predictions = response.predictions;

                if (predictions && predictions.length > 0) {
                    for (const prediction of predictions) {
                        const embeddingsField = prediction.structValue?.fields?.embeddings;
                        const valuesField = embeddingsField?.structValue?.fields?.values;
                        const listValue = valuesField?.listValue?.values;

                        if (listValue) {
                            embeddings.push(listValue.map((v: any) => v.numberValue || 0));
                        } else {
                            embeddings.push([]);
                        }
                    }
                } else {
                    throw new Error('No embeddings returned from batch request');
                }
            } catch (error) {
                console.error(`⚠️  Batch embedding failed for chunks ${i}-${i + batch.length - 1}, falling back to individual requests`);
                // Fallback to individual requests with retry logic
                for (let j = 0; j < batch.length; j++) {
                    const text = batch[j];
                    const globalIndex = i + j;
                    try {
                        console.log(`   Processing chunk ${globalIndex + 1}/${texts.length} individually...`);
                        const embedding = await this.generateEmbedding(text); // Uses retry logic
                        embeddings.push(embedding);
                    } catch (err) {
                        console.error(`❌ Failed to generate embedding for chunk ${globalIndex + 1} after retries:`, err);
                        failedIndices.push(globalIndex);
                        embeddings.push([]); // Placeholder - will be filtered out later
                    }
                }
            }

            // Small delay between batches to respect rate limits
            if (i + batchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Log summary
        if (failedIndices.length > 0) {
            console.warn(`⚠️  ${failedIndices.length} chunk(s) failed to generate embeddings: ${failedIndices.map(i => i + 1).join(', ')}`);
        }

        return embeddings;
    }
}
