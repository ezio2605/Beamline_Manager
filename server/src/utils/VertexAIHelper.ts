import { VertexAI, GenerativeModel, GenerationConfig } from '@google-cloud/vertexai';

export class VertexAIHelper {
    private static vertexAI: VertexAI | null = null;
    private static readonly DEFAULT_MODEL = 'gemini-2.0-flash-exp';
    private static readonly MAX_RETRIES = 3;
    private static readonly BASE_DELAY_MS = 1000;

    /**
     * Get or initialize the Vertex AI client
     */
    private static getClient(): VertexAI {
        if (!this.vertexAI) {
            this.vertexAI = new VertexAI({
                project: process.env.GCP_PROJECT_ID || '',
                location: process.env.GCP_LOCATION || 'us-central1',
            });
        }
        return this.vertexAI;
    }

    /**
     * Generate content with robust retry logic and exponential backoff
     */
    static async generateContentWithRetry(
        prompt: string,
        modelName: string = this.DEFAULT_MODEL,
        config?: GenerationConfig
    ): Promise<string> {
        const client = this.getClient();
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const model: GenerativeModel = client.getGenerativeModel({
                    model: modelName,
                    generationConfig: config
                });

                const result = await model.generateContent(prompt);
                const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text;

                if (response) {
                    return response;
                }

                throw new Error('Empty response from Vertex AI');

            } catch (error: any) {
                lastError = error;
                const isRateLimit = error.message?.includes('429') ||
                    error.status === 429 ||
                    error.code === 429 ||
                    error.message?.toLowerCase().includes('resource exhausted') ||
                    error.message?.toLowerCase().includes('too many requests');

                // If it's a rate limit or we haven't exhausted retries, wait and retry
                if (attempt < this.MAX_RETRIES) {
                    // Exponential backoff: 1s, 2s, 4s, 8s...
                    // Add some jitter to prevent thundering herd
                    const jitter = Math.random() * 500;
                    const delay = (Math.pow(2, attempt) * this.BASE_DELAY_MS) + jitter;

                    console.warn(`⚠️ Vertex AI request failed (Attempt ${attempt + 1}/${this.MAX_RETRIES + 1}). Retrying in ${Math.round(delay)}ms... Error: ${error.message}`);

                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error(`❌ Vertex AI request failed after ${this.MAX_RETRIES + 1} attempts.`);
                }
            }
        }

        throw lastError || new Error('Failed to generate content from Vertex AI after retries');
    }
}
