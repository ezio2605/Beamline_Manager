import axios, { type AxiosInstance } from 'axios';

// API base URL - defaults to same origin in production, localhost in development
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || (
    (import.meta.env.DEV as boolean) ? 'http://localhost:8080' : ''
);

// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: 120000, // 2 minutes for file uploads and processing
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
apiClient.interceptors.request.use(
    (config) => {
        const isFormData = config.data instanceof FormData;
        if (isFormData) {
            // Remove any Content-Type so axios/browser can set multipart/form-data with the boundary
            if (config.headers) {
                delete (config.headers as any)['Content-Type'];
                delete (config.headers as any)['content-type'];
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

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

/**
 * API Client for backend communication
 */
export class ApiClient {
    /**
     * Upload JASRI files
     */
    static async uploadJasriFiles(beamlineId: string, files: File[]): Promise<FileMetadata[]> {
        const formData = new FormData();
        formData.append('beamlineId', beamlineId);
        files.forEach(file => formData.append('files', file));

        const response = await apiClient.post('/files/upload/jasri', formData);

        return response.data.files;
    }

    /**
     * Upload Nichi files
     */
    static async uploadNichiFiles(beamlineId: string, files: File[]): Promise<FileMetadata[]> {
        const formData = new FormData();
        formData.append('beamlineId', beamlineId);
        files.forEach(file => formData.append('files', file));

        const response = await apiClient.post('/files/upload/nichi', formData);

        return response.data.files;
    }

    /**
     * Get JASRI files for a beamline
     */
    static async getJasriFiles(beamlineId: string): Promise<FileMetadata[]> {
        const response = await apiClient.get(`/files/jasri/${beamlineId}`);
        return response.data.files;
    }

    /**
     * Get Nichi files for a beamline
     */
    static async getNichiFiles(beamlineId: string): Promise<FileMetadata[]> {
        const response = await apiClient.get(`/files/nichi/${beamlineId}`);
        return response.data.files;
    }

    /**
     * Get file content by file ID
     */
    static async getFileContent(fileId: string): Promise<{
        fileId: string;
        filename: string;
        content: string;
        metadata: any;
    }> {
        const response = await apiClient.get(`/files/content/${fileId}`);
        return response.data;
    }

    /**
     * Index JASRI files into vector store
     */
    static async indexJasriFiles(beamlineId: string): Promise<{
        indexedFiles: string[];
        errors?: string[];
        stats: { totalDocuments: number; totalChunks: number };
    }> {
        const response = await apiClient.post('/files/index', { beamlineId });
        return response.data;
    }

    /**
     * Get indexing statistics
     */
    static async getIndexStats(beamlineId: string): Promise<{
        totalDocuments: number;
        totalChunks: number;
    }> {
        const response = await apiClient.get(`/files/stats/${beamlineId}`);
        return response.data.stats;
    }

    /**
     * Compare Nichi files with JASRI files
     */
    static async compareFiles(beamlineId: string, nichiFileIds: string[]): Promise<{
        results: ComparisonResult[];
        errors?: string[];
    }> {
        const response = await apiClient.post('/comparison/compare', {
            beamlineId,
            nichiFileIds,
        });
        return response.data;
    }

    /**
     * Get comparison results for a beamline
     */
    static async getComparisonResults(beamlineId: string): Promise<ComparisonResult[]> {
        const response = await apiClient.get(`/comparison/results/${beamlineId}`);
        return response.data.results;
    }

    /**
     * Get comparison statistics
     */
    static async getComparisonStats(beamlineId: string): Promise<{
        total: number;
        case1: number;
        case2: number;
        case3: number;
    }> {
        const response = await apiClient.get(`/comparison/stats/${beamlineId}`);
        return response.data.stats;
    }

    /**
     * Health check
     */
    static async healthCheck(): Promise<{ status: string; timestamp: string }> {
        const response = await apiClient.get('/health');
        return response.data;
    }
}

export default apiClient;
