import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import filesRouter from './routes/files.js';
import comparisonRouter from './routes/comparison.js';
import standardStructureRouter from './routes/standardStructure.js';
import semanticComparisonRouter from './routes/semanticComparison.js';
import { CloudStorageService } from './services/CloudStorageService.js';
import { FirestoreService } from './services/FirestoreService.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/files', filesRouter);
app.use('/api/comparison', comparisonRouter);
app.use('/api/standard-structure', standardStructureRouter);
app.use('/api/semantic-comparison', semanticComparisonRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        config: {
            projectId: process.env.GCP_PROJECT_ID || 'NOT_SET',
            region: process.env.GCP_LOCATION || process.env.GCP_REGION || 'us-central1',
        }
    });
});

// Serve static files from React build (in production)
const clientBuildPath = path.join(__dirname, './public');
app.use(express.static(clientBuildPath));

// Serve React app for all other routes (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Initialize GCP services and start server
async function startServer() {
    try {
        console.log('🔧 Initializing GCP services...');

        // Validate environment variables
        if (!process.env.GCP_PROJECT_ID) {
            console.warn('⚠️  GCP_PROJECT_ID not set - GCP services may fail');
        }

        // Initialize Cloud Storage (creates buckets if needed)
        await CloudStorageService.initialize();

        // Initialize Firestore
        await FirestoreService.initialize();

        console.log('✅ GCP services initialized successfully');

    } catch (error: any) {
        console.error('❌ GCP initialization error:', error.message);
        console.error('💡 Check:');
        console.error('   - GCP_PROJECT_ID environment variable is set');
        console.error('   - Service account has Storage Admin, Datastore User, Vertex AI User roles');
        console.error('   - Buckets exist or service account can create them');
        console.warn('⚠️  Server will start but GCP features may not work');
    }

    // Start Express server
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔥 API available at http://localhost:${PORT}/api`);
    });
}

startServer();
