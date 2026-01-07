# 🚀 Deploying to Google Cloud Run - Complete Beginner's Guide

This guide will walk you through deploying your JASRI File Management System to Google Cloud Run, step by step. No prior cloud experience required!

## 📋 Prerequisites

Before you start, make sure you have:
- A Google Account (Gmail)
- Your code pushed to a GitHub repository
- A credit card (for Google Cloud - they offer $300 free credit for new users)

---

## Part 1: Setting Up Google Cloud Platform (GCP)

### Step 1: Create a Google Cloud Project

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Sign in** with your Google account
3. **Click** the project dropdown at the top (next to "Google Cloud")
4. **Click** "NEW PROJECT"
5. **Enter** a project name (e.g., "jasri-file-system")
6. **Click** "CREATE"
7. **Wait** for the project to be created (takes ~30 seconds)
8. **Select** your new project from the dropdown

### Step 2: Enable Required APIs

1. **Go to** "APIs & Services" > "Library" (use the search bar or left menu)
2. **Search for and enable** these APIs (click "ENABLE" for each):
   - Cloud Run API
   - Cloud Storage API
   - Cloud Firestore API
   - Cloud Build API
   - Artifact Registry API

### Step 3: Set Up Billing

1. **Go to** "Billing" in the left menu
2. **Click** "Link a billing account"
3. **Follow** the prompts to add your credit card
4. **Note**: New users get $300 free credit!

### Step 4: Get Your Gemini API Key

1. **Go to**: https://aistudio.google.com/app/apikey
2. **Click** "Create API Key"
3. **Select** your project
4. **Copy** the API key (you'll need this later)

---

## Part 2: Setting Up Cloud Storage and Firestore

### Step 5: Create Cloud Storage Buckets

1. **Go to** "Cloud Storage" > "Buckets"
2. **Click** "CREATE BUCKET"
3. **For JASRI files**:
   - Name: `jasri-knowledge-base` (must be globally unique, add your project ID if needed)
   - Location: Choose "Region" and select `us-central1`
   - Storage class: Standard
   - Click "CREATE"
4. **Repeat** for Nichi files:
   - Name: `nichi-uploads`
   - Same settings as above

### Step 6: Set Up Firestore

1. **Go to** "Firestore" in the left menu
2. **Click** "CREATE DATABASE"
3. **Select** "Native mode"
4. **Choose** location: `us-central1`
5. **Click** "CREATE"

---

## Part 3: Deploying from GitHub to Cloud Run

### Step 7: Push Your Code to GitHub

1. **Open** your terminal in the project directory
2. **Run** these commands:

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - ready for Cloud Run deployment"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

### Step 8: Deploy to Cloud Run from GitHub

1. **Go to** Cloud Run in Google Cloud Console
2. **Click** "CREATE SERVICE"
3. **Select** "Continuously deploy from a repository (source-based)"
4. **Click** "SET UP WITH CLOUD BUILD"

5. **Connect to GitHub**:
   - Click "GitHub"
   - Click "Authenticate"
   - Sign in to GitHub and authorize Google Cloud Build
   - Select your repository
   - Click "NEXT"

6. **Configure Build**:
   - Branch: `^main$`
   - Build Type: "Dockerfile"
   - Source location: `/Dockerfile`
   - Click "SAVE"

7. **Configure Service**:
   - Service name: `jasri-app`
   - Region: `us-central1`
   - CPU allocation: "CPU is only allocated during request processing"
   - Minimum instances: 0
   - Maximum instances: 10
   - Authentication: "Allow unauthenticated invocations" (for public access)

8. **Set Environment Variables** (IMPORTANT!):
   - Click "CONTAINER, VARIABLES & SECRETS, CONNECTIONS"
   - Click "VARIABLES & SECRETS" tab
   - Add these environment variables:

   | Name | Value |
   |------|-------|
   | `GCP_PROJECT_ID` | Your project ID (e.g., jasri-file-system) |
   | `GCP_REGION` | `us-central1` |
   | `JASRI_BUCKET_NAME` | `jasri-knowledge-base` (or your bucket name) |
   | `NICHI_BUCKET_NAME` | `nichi-uploads` (or your bucket name) |
   | `GEMINI_API_KEY` | Your Gemini API key from Step 4 |
   | `NODE_ENV` | `production` |
   | `PORT` | `8080` |

9. **Click** "CREATE"

10. **Wait** for deployment (5-10 minutes for first deployment)

---

## Part 4: Verifying Your Deployment

### Step 9: Test Your Application

1. **Once deployed**, you'll see a URL like: `https://jasri-app-xxxxx-uc.a.run.app`
2. **Click** the URL to open your application
3. **Test the features**:
   - Select a beamline (e.g., BL01)
   - Try uploading a JASRI file (PDF or DOCX)
   - Click "Index JASRI Files"
   - Upload a Nichi file
   - Click "Compare"

### Step 10: Check Logs (If Something Goes Wrong)

1. **Go to** Cloud Run > Your service
2. **Click** "LOGS" tab
3. **Look for** error messages (they'll be in red)

---

## Part 5: Ongoing Management

### Updating Your App

Every time you push to GitHub, Cloud Run will automatically rebuild and redeploy:

```bash
# Make your code changes
git add .
git commit -m "Your update message"
git push
```

Cloud Run will automatically detect the push and redeploy (takes ~5 minutes).

### Monitoring Costs

1. **Go to** "Billing" > "Reports"
2. **View** your spending
3. **Note**: With the free tier, you get:
   - 2 million requests/month free
   - 360,000 GB-seconds of memory free
   - 180,000 vCPU-seconds free

### Viewing Uploaded Files

1. **Go to** "Cloud Storage" > "Buckets"
2. **Click** on `jasri-knowledge-base` or `nichi-uploads`
3. **Browse** files organized by beamline

### Viewing Comparison Results

1. **Go to** "Firestore" > "Data"
2. **Click** "comparisons" collection
3. **View** all comparison results

---

## 🎯 Quick Reference

### Your Application URLs

- **App URL**: `https://jasri-app-xxxxx-uc.a.run.app` (get from Cloud Run console)
- **API Health Check**: `https://jasri-app-xxxxx-uc.a.run.app/api/health`

### Important GCP Locations

- **Cloud Run**: https://console.cloud.google.com/run
- **Cloud Storage**: https://console.cloud.google.com/storage
- **Firestore**: https://console.cloud.google.com/firestore
- **Logs**: https://console.cloud.google.com/logs

### Environment Variables Reference

```
GCP_PROJECT_ID=your-project-id
GCP_REGION=us-central1
JASRI_BUCKET_NAME=jasri-knowledge-base
NICHI_BUCKET_NAME=nichi-uploads
GEMINI_API_KEY=your-api-key
NODE_ENV=production
PORT=8080
```

---

## 🐛 Troubleshooting

### Problem: "Permission denied" errors

**Solution**: Make sure your Cloud Run service has the right permissions:
1. Go to Cloud Run > Your service
2. Click "PERMISSIONS" tab
3. Ensure the service account has these roles:
   - Cloud Run Admin
   - Storage Admin
   - Firestore User

### Problem: "Module not found" errors

**Solution**: Make sure you installed dependencies:
```bash
cd server
npm install
cd ..
npm install
```

### Problem: Files not uploading

**Solution**: Check bucket names in environment variables match actual bucket names.

### Problem: Comparison not working

**Solution**: 
1. Check Gemini API key is set correctly
2. Verify you indexed JASRI files first
3. Check logs for specific error messages

---

## 📞 Getting Help

If you encounter issues:

1. **Check the logs** in Cloud Run
2. **Verify environment variables** are set correctly
3. **Ensure all APIs are enabled**
4. **Check billing is active**

---

## 🎉 Success!

You've successfully deployed your JASRI File Management System to Google Cloud Run! Your application is now:

- ✅ Accessible from anywhere via URL
- ✅ Automatically scaling based on traffic
- ✅ Storing files in Cloud Storage
- ✅ Using Firestore for metadata and vectors
- ✅ Auto-deploying on every GitHub push

**Next Steps**:
- Share the URL with your team
- Upload your JASRI knowledge base
- Start comparing files!
