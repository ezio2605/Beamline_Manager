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
     * Generate embedding for a text using Vertex AI
     */
    static async generateEmbedding(text: string): Promise<number[]> {
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
            console.error('Error generating embedding:', error);
            throw new Error('Failed to generate embedding');
        }
    }

    /**
     * Generate embeddings for multiple texts (batch)
     */
    static async generateEmbeddings(texts: string[]): Promise<number[][]> {
        const embeddings: number[][] = [];

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

            // Small delay between batches to respect rate limits
            if (i + batchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        return embeddings;
    }
}
