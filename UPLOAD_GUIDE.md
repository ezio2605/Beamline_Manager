# 📤 How to Upload JASRI Files - Quick Guide

## Where to Upload JASRI Files

**Answer: Through the Web UI!** 🌐

Once your app is deployed to Cloud Run, you upload files directly through your browser.

---

## Step-by-Step Instructions

### 1. **Open Your Application**
- Go to your Cloud Run URL: `https://jasri-app-xxxxx-uc.a.run.app`
- Or run locally: `http://localhost:3000`

### 2. **Select a Beamline**
- Click on a beamline from the left sidebar (e.g., **BL01**)

### 3. **Upload JASRI Files**
- Click the green **"Upload JASRI Files"** button (top right)
- Select your PDF or DOCX files
- Click "Open"
- Files automatically upload to Cloud Storage!

### 4. **Index the Files** (Important!)
- After uploading, click **"Index JASRI Files"**
- Wait for indexing to complete
- This creates vector embeddings for AI search

### 5. **Upload Nichi Files** (When Ready)
- Click **"Upload Nichi Files"**
- Select your Nichi PDF/DOCX files
- Click "Open"

### 6. **Compare**
- Click **"Compare"** button
- AI analyzes and shows results (Case 1/2/3)

---

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  BL01 Workspace                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│  │ Index JASRI  │ │Upload JASRI  │ │Upload Nichi  ││
│  │   Files      │ │   Files      │ │   Files      ││
│  └──────────────┘ └──────────────┘ └──────────────┘│
│                                    ┌──────────────┐ │
│                                    │   Compare    │ │
│                                    └──────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Supported File Types

✅ **PDF** (`.pdf`)  
✅ **Word Documents** (`.docx`, `.doc`)  
✅ **Text Files** (`.txt`, `.md`)

---

## Where Files Are Stored

- **JASRI Files** → Google Cloud Storage bucket: `jasri-knowledge-base`
- **Nichi Files** → Google Cloud Storage bucket: `nichi-uploads`
- **Metadata** → Firestore database
- **Vectors** → Firestore (for AI search)

---

## Important Notes

⚠️ **You must index JASRI files** before comparison will work  
⚠️ **Upload JASRI files first**, then Nichi files  
⚠️ **One beamline at a time** - select beamline, upload, index, repeat  

---

## Quick Workflow

1. Select **BL01**
2. Click **"Upload JASRI Files"** → Select PDFs → Upload
3. Click **"Index JASRI Files"** → Wait for completion
4. Repeat for **BL02**, **BL03**, etc.
5. When you receive Nichi files:
   - Select beamline
   - Click **"Upload Nichi Files"**
   - Click **"Compare"**
   - View results!

---

## Troubleshooting

**Q: Where's the upload button?**  
A: Top right of the screen, green button says "Upload JASRI Files"

**Q: Can I upload multiple files at once?**  
A: Yes! Select multiple files in the file picker

**Q: What if indexing fails?**  
A: Make sure you uploaded files first, and check your Gemini API key is set

**Q: How do I know files uploaded successfully?**  
A: You'll see a success message, and files appear in Cloud Storage console

---

## Next Steps

After uploading and indexing JASRI files for all beamlines:
- Your knowledge base is ready!
- Upload Nichi files as you receive them
- Run comparisons to get AI-powered analysis

🎉 **That's it! No local folders, no manual file management - everything through the UI!**
