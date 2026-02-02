import { Storage } from '@google-cloud/storage';

const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
});

const JASRI_BUCKET_NAME = process.env.JASRI_BUCKET_NAME || 'jasri-knowledge-base';
const NICHI_BUCKET_NAME = process.env.NICHI_BUCKET_NAME || 'nichi-uploads';
const OTHERS_BUCKET_NAME = process.env.OTHERS_BUCKET_NAME || 'others-uploads';

export class CloudStorageService {
    /**
     * Upload a file to Cloud Storage
     */
    static async uploadFile(
        bucketName: string,
        file: Express.Multer.File,
        destinationPath: string
    ): Promise<string> {
        const bucket = storage.bucket(bucketName);
        const blob = bucket.file(destinationPath);

        const blobStream = blob.createWriteStream({
            resumable: false,
            metadata: {
                contentType: file.mimetype,
            },
        });

        return new Promise((resolve, reject) => {
            blobStream.on('error', (err) => {
                reject(err);
            });

            blobStream.on('finish', () => {
                const publicUrl = `gs://${bucketName}/${destinationPath}`;
                resolve(publicUrl);
            });

            blobStream.end(file.buffer);
        });
    }

    /**
     * Upload JASRI file
     */
    static async uploadJasriFile(
        beamlineId: string,
        file: Express.Multer.File
    ): Promise<string> {
        const destinationPath = `${beamlineId}/original/${file.originalname}`;
        return this.uploadFile(JASRI_BUCKET_NAME, file, destinationPath);
    }

    /**
     * Upload Nichi file
     */
    static async uploadNichiFile(
        beamlineId: string,
        file: Express.Multer.File
    ): Promise<string> {
        const timestamp = Date.now();
        const destinationPath = `${beamlineId}/${timestamp}_${file.originalname}`;
        return this.uploadFile(NICHI_BUCKET_NAME, file, destinationPath);
    }

    /**
     * Download file from Cloud Storage
     */
    static async downloadFile(bucketName: string, filePath: string): Promise<Buffer> {
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(filePath);
        const [buffer] = await file.download();
        return buffer;
    }

    /**
     * List files in a bucket path
     */
    static async listFiles(bucketName: string, prefix: string): Promise<string[]> {
        const bucket = storage.bucket(bucketName);
        const [files] = await bucket.getFiles({ prefix });
        return files.map(file => file.name);
    }

    /**
     * Delete a file
     */
    static async deleteFile(bucketName: string, filePath: string): Promise<void> {
        const bucket = storage.bucket(bucketName);
        await bucket.file(filePath).delete();
    }

    /**
     * Get signed URL for temporary file access
     */
    static async getSignedUrl(bucketName: string, filePath: string): Promise<string> {
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(filePath);

        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        });

        return url;
    }

    /**
     * Check if bucket exists, create if not
     */
    static async ensureBucketExists(bucketName: string): Promise<void> {
        const bucket = storage.bucket(bucketName);
        const [exists] = await bucket.exists();

        if (!exists) {
            await storage.createBucket(bucketName, {
                location: process.env.GCP_REGION || 'us-central1',
                storageClass: 'STANDARD',
            });
            console.log(`✅ Created bucket: ${bucketName}`);
        }
    }

    /**
     * Initialize storage (create buckets if needed)
     */
    static async initialize(): Promise<void> {
        await this.ensureBucketExists(JASRI_BUCKET_NAME);
        await this.ensureBucketExists(NICHI_BUCKET_NAME);
        await this.ensureBucketExists(OTHERS_BUCKET_NAME);
        console.log('✅ Cloud Storage initialized');
    }
}
