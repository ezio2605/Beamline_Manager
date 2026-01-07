# JASRI File Management System - Cloud Edition

A cloud-native application for managing and comparing JASRI beamline operation manual files using AI-powered semantic analysis.

## 🌟 Features

- **Cloud Storage**: Files stored in Google Cloud Storage
- **Vector Search**: RAG-enhanced semantic search using Firestore
- **AI Comparison**: Gemini-powered file comparison
- **Auto-Deploy**: Continuous deployment from GitHub to Cloud Run
- **Scalable**: Automatically scales based on traffic

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
- Google Cloud account
- GitHub account
- Gemini API key

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

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Complete deployment walkthrough
- [Implementation Plan](./implementation_plan.md) - Technical architecture details

## 🔧 Environment Variables

Required environment variables:

```
GCP_PROJECT_ID=your-project-id
GCP_REGION=us-central1
JASRI_BUCKET_NAME=jasri-knowledge-base
NICHI_BUCKET_NAME=nichi-uploads
GEMINI_API_KEY=your-gemini-api-key
NODE_ENV=production
PORT=8080
```

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
- Gemini API

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
