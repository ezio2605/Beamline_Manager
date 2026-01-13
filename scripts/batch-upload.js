#!/usr/bin/env node

/**
 * Batch File Upload Script for Beamline Resources
 * 
 * Usage:
 *   node batch-upload.js <beamline-id> <directory-path>
 *   
 * Example:
 *   node batch-upload.js BL01 ./bl01_documents
 */

const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Google Cloud Storage
const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME;

async function batchUpload(beamlineId, directoryPath) {
    try {
        // Validate inputs
        if (!beamlineId || !directoryPath) {
            console.error('❌ Error: Missing arguments');
            console.log('Usage: node batch-upload.js <beamline-id> <directory-path>');
            console.log('Example: node batch-upload.js BL01 ./bl01_documents');
            process.exit(1);
        }

        // Check if directory exists
        if (!fs.existsSync(directoryPath)) {
            console.error(`❌ Error: Directory not found: ${directoryPath}`);
            process.exit(1);
        }

        if (!fs.statSync(directoryPath).isDirectory()) {
            console.error(`❌ Error: Path is not a directory: ${directoryPath}`);
            process.exit(1);
        }

        // Get all files in directory
        const files = fs.readdirSync(directoryPath)
            .filter(file => {
                const filePath = path.join(directoryPath, file);
                return fs.statSync(filePath).isFile();
            });

        if (files.length === 0) {
            console.log('⚠️  No files found in directory');
            process.exit(0);
        }

        console.log(`\n📤 Batch Upload Starting...`);
        console.log(`   Beamline: ${beamlineId}`);
        console.log(`   Directory: ${directoryPath}`);
        console.log(`   Files to upload: ${files.length}\n`);

        const bucket = storage.bucket(BUCKET_NAME);
        const normalizedBeamlineId = beamlineId.toLowerCase();
        const results = [];

        // Upload each file
        for (let i = 0; i < files.length; i++) {
            const fileName = files[i];
            const localFilePath = path.join(directoryPath, fileName);
            const destinationPath = `docs/${normalizedBeamlineId}/${fileName}`;

            try {
                console.log(`[${i + 1}/${files.length}] Uploading: ${fileName}...`);

                await bucket.upload(localFilePath, {
                    destination: destinationPath,
                    metadata: {
                        contentType: getContentType(fileName),
                        metadata: {
                            uploadedAt: new Date().toISOString(),
                            beamlineId: beamlineId,
                            originalName: fileName
                        }
                    }
                });

                // Make public
                const file = bucket.file(destinationPath);
                await file.makePublic();

                const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destinationPath}`;

                results.push({
                    fileName,
                    url: publicUrl,
                    status: 'success'
                });

                console.log(`   ✅ Success: ${fileName}`);

            } catch (error) {
                console.error(`   ❌ Failed: ${fileName} - ${error.message}`);
                results.push({
                    fileName,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        // Summary
        const successCount = results.filter(r => r.status === 'success').length;
        const failedCount = results.filter(r => r.status === 'failed').length;

        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 Upload Summary`);
        console.log(`${'='.repeat(60)}`);
        console.log(`   Total files: ${files.length}`);
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ❌ Failed: ${failedCount}`);

        // Generate mindmap code
        if (successCount > 0) {
            console.log(`\n📝 Add these to your mindmap (mockData.ts):\n`);
            console.log(`children: [`);

            results
                .filter(r => r.status === 'success')
                .forEach(r => {
                    const displayName = r.fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
                    console.log(`  {`);
                    console.log(`    name: '${displayName}',`);
                    console.log(`    type: 'file',`);
                    console.log(`    fileUrl: '${r.url}',`);
                    console.log(`    description: 'Add description here'`);
                    console.log(`  },`);
                });

            console.log(`]`);
        }

        // Save results to JSON file
        const resultsFile = `upload-results-${beamlineId}-${Date.now()}.json`;
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        console.log(`\n💾 Results saved to: ${resultsFile}`);

    } catch (error) {
        console.error('\n❌ Batch upload failed:', error.message);
        process.exit(1);
    }
}

function getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
    return contentTypes[ext] || 'application/octet-stream';
}

// Main execution
const [beamlineId, directoryPath] = process.argv.slice(2);
batchUpload(beamlineId, directoryPath);
