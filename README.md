# Beamline Manual Management System

> A cloud-native AI-powered platform for managing, visualizing, and comparing operation manuals across 26 JASRI synchrotron beamlines at SPring-8.

## 🎯 What is This?

This system automates the comparison and synchronization of operation manuals between **JASRI** (Japan Synchrotron Radiation Research Institute) and **Nichigagi (日技)** contractor documentation. It uses Google's Gemini AI with RAG (Retrieval-Augmented Generation) technology to perform semantic analysis and intelligent document comparison.

## ✨ Key Features

- 🗺️ **Interactive Mind Map**: Visualize all 26 beamlines and their documentation hierarchy
- 🤖 **AI-Powered Comparison**: Semantic analysis using Gemini AI with RAG technology
- ☁️ **Cloud-Native**: Built on Google Cloud Platform (Cloud Run, Cloud Storage, Firestore)
- 🔄 **Automated Workflow**: Three-case classification system (Update, Match, New)
- 📊 **Real-time Progress**: Track indexing and comparison progress
- 🚀 **Auto-Deploy**: Continuous deployment from GitHub to Cloud Run
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile

## 🏗️ Architecture

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Storage**: Google Cloud Storage
- **Database**: Firestore (metadata + vectors)
- **AI**: Gemini API
- **Deployment**: Google Cloud Run

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Google Cloud account with billing enabled
- GitHub account
- Vertex AI API enabled in Google Cloud

### Local Development

1. **Install dependencies**:
```bash
# Frontend
npm install

# Backend
cd server
npm install
cd ..
```

2. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your values
```

3. **Run locally**:
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd server
npm run dev
```

### Deploy to Cloud Run

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete step-by-step instructions.

## 📚 Documentation

> **📋 [Documentation Index](./DOCS_INDEX.md)** - Complete guide to all documentation files

### Getting Started
- **[📖 Complete Documentation](./DOCUMENTATION.md)** - Comprehensive guide covering everything
- **[⚡ Quick Start Guide](./QUICK_START.md)** - Get up and running in 5 minutes
- **[🎯 Feature Overview](./FEATURES.md)** - Detailed feature descriptions with diagrams
- **[🚀 Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Step-by-step Cloud Run deployment

### Technical Guides
- **[🗺️ Beamline Mind Map Guide](./BEAMLINE_MINDMAP_GUIDE.md)** - Mind map implementation details
- **[📏 Dynamic Sizing Guide](./DYNAMIC_SIZING_GUIDE.md)** - Dynamic visualization sizing
- **[📤 Upload Guide](./UPLOAD_GUIDE.md)** - File upload system architecture
- **[🔧 Resource Management Scripts](./scripts/README.md)** - Upload files and edit mindmaps

### What's Inside?

The **[Complete Documentation](./DOCUMENTATION.md)** covers:
- ✅ Project overview and purpose
- ✅ Detailed feature descriptions
- ✅ System architecture and data flow
- ✅ Complete user guide with screenshots
- ✅ API reference
- ✅ Troubleshooting guide
- ✅ Security considerations
- ✅ Performance benchmarks

## 🔧 Environment Variables

Required environment variables:

```env
# Google Cloud Configuration
GCP_PROJECT_ID=your-project-id
GCP_LOCATION=us-central1

# Google Cloud Authentication (Local Development Only)
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json

# Google Cloud Storage
GCS_BUCKET_NAME=your-bucket-name

# Firestore
FIRESTORE_DATABASE_ID=(default)

# Server Configuration
PORT=3001
NODE_ENV=development
```

See [VERTEX_AI_MIGRATION.md](./VERTEX_AI_MIGRATION.md) for detailed setup instructions.

## 📦 Project Structure

```
.
├── components/          # React components
├── services/           # Frontend services (legacy)
├── src/
│   └── api/           # API client
├── server/
│   └── src/
│       ├── routes/    # API routes
│       └── services/  # Backend services
├── Dockerfile         # Multi-stage Docker build
├── .env.example       # Environment template
└── DEPLOYMENT_GUIDE.md # Deployment instructions
```

## 🛠️ Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Axios
- D3.js

### Backend
- Node.js 20
- Express
- TypeScript
- Google Cloud Storage
- Firestore
- **Vertex AI (Gemini API)**

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to GitHub
5. Cloud Run will auto-deploy!

## 📞 Support

For deployment issues, see the [Troubleshooting section](./DEPLOYMENT_GUIDE.md#-troubleshooting) in the deployment guide.
