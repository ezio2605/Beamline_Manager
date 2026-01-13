#!/usr/bin/env node

/**
 * File Upload Script for Beamline Resources
 * 
 * Usage:
 *   node upload-resource.js <beamline-id> <file-path>
 *   
 * Example:
 *   node upload-resource.js BL01 ./safety_manual.pdf
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

async function uploadFile(beamlineId, localFilePath) {
    try {
        // Validate inputs
        if (!beamlineId || !localFilePath) {
            console.error('❌ Error: Missing arguments');
            console.log('Usage: node upload-resource.js <beamline-id> <file-path>');
            console.log('Example: node upload-resource.js BL01 ./safety_manual.pdf');
            process.exit(1);
        }

        // Check if file exists
        if (!fs.existsSync(localFilePath)) {
            console.error(`❌ Error: File not found: ${localFilePath}`);
            process.exit(1);
        }

        // Get file info
        const fileName = path.basename(localFilePath);
        const fileStats = fs.statSync(localFilePath);
        const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);

        // Normalize beamline ID
        const normalizedBeamlineId = beamlineId.toLowerCase();

        // Destination path in Cloud Storage
        const destinationPath = `docs/${normalizedBeamlineId}/${fileName}`;

        console.log('\n📤 Uploading file to Google Cloud Storage...');
        console.log(`   Beamline: ${beamlineId}`);
        console.log(`   File: ${fileName} (${fileSizeMB} MB)`);
        console.log(`   Destination: gs://${BUCKET_NAME}/${destinationPath}`);

        // Upload the file
        const bucket = storage.bucket(BUCKET_NAME);
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

        // Make the file publicly accessible (optional - comment out if you want private files)
        const file = bucket.file(destinationPath);
        await file.makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destinationPath}`;

        console.log('\n✅ Upload successful!');
        console.log(`\n📋 File URL (use this in mockData.ts):`);
        console.log(`   ${publicUrl}`);
        console.log(`\n📝 Add to your mindmap:`);
        console.log(`   {`);
        console.log(`     name: '${fileName.replace(/\.[^/.]+$/, '')}',`);
        console.log(`     type: 'file',`);
        console.log(`     fileUrl: '${publicUrl}',`);
        console.log(`     description: 'Add description here'`);
        console.log(`   }`);

    } catch (error) {
        console.error('\n❌ Upload failed:', error.message);
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
        '.gif': 'image/gif'
    };
    return contentTypes[ext] || 'application/octet-stream';
}

// Main execution
const [beamlineId, filePath] = process.argv.slice(2);
uploadFile(beamlineId, filePath);
