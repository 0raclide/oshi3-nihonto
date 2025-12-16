# Google Cloud Vision API Setup Guide

## Step 1: Go to Google Cloud Console

Open: **https://console.cloud.google.com/**

Login with your Google account.

---

## Step 2: Create or Select a Project

### Option A: Create New Project
1. Click the project dropdown (top left, next to "Google Cloud")
2. Click "NEW PROJECT"
3. Project name: `oshi3-nihonto` (or your choice)
4. Click "CREATE"
5. Wait for project creation (~30 seconds)

### Option B: Use Existing Project
1. Click the project dropdown
2. Select your existing project

---

## Step 3: Enable Cloud Vision API

1. Go to: **https://console.cloud.google.com/apis/library/vision.googleapis.com**
   - Or: Navigate → APIs & Services → Library → Search "Vision"
2. Click "Cloud Vision API"
3. Click "ENABLE"
4. Wait for API to enable (~10 seconds)

---

## Step 4: Create Service Account

1. Go to: **https://console.cloud.google.com/iam-admin/serviceaccounts**
   - Or: Navigate → IAM & Admin → Service Accounts
2. Click "+ CREATE SERVICE ACCOUNT"
3. Fill in:
   - **Service account name:** `oshi3-vision-ocr`
   - **Service account ID:** (auto-generated)
   - **Description:** "OCR service for Oshi3 Nihonto project"
4. Click "CREATE AND CONTINUE"

---

## Step 5: Grant Permissions

1. On "Grant this service account access to project" step:
   - **Select a role:** Search for "Cloud Vision AI Service Agent"
   - Or use: "Editor" (broader permissions but simpler)
2. Click "CONTINUE"
3. Click "DONE" (skip optional "Grant users access" step)

---

## Step 6: Create and Download JSON Key

1. Find your newly created service account in the list
2. Click on the service account email (e.g., `oshi3-vision-ocr@...`)
3. Go to the "KEYS" tab
4. Click "ADD KEY" → "Create new key"
5. Choose "JSON" format
6. Click "CREATE"
7. **JSON key file downloads automatically**
   - File name: `oshi3-nihonto-xxxxx.json`
   - Save location: Downloads folder

---

## Step 7: Move JSON Key to Project

```bash
# Create a secure directory
mkdir -p ~/.gcp

# Move the downloaded key
mv ~/Downloads/oshi3-nihonto-*.json ~/.gcp/oshi3-vision-key.json

# Secure the file (optional but recommended)
chmod 600 ~/.gcp/oshi3-vision-key.json
```

---

## Step 8: Update .env File

Edit your `.env` file:

```bash
cd /Users/christopherhill/Desktop/Claude_project/Oshi3

# Add this line to .env:
GOOGLE_APPLICATION_CREDENTIALS=/Users/christopherhill/.gcp/oshi3-vision-key.json
```

---

## Step 9: Verify Setup

Test that the credentials work:

```bash
node -e "const vision = require('@google-cloud/vision'); const client = new vision.ImageAnnotatorClient(); console.log('✅ Google Cloud Vision client initialized successfully!');"
```

Expected output:
```
✅ Google Cloud Vision client initialized successfully!
```

---

## Troubleshooting

### "API has not been enabled"
- Make sure you enabled the Cloud Vision API (Step 3)
- Wait 1-2 minutes for propagation

### "Could not load the default credentials"
- Check that GOOGLE_APPLICATION_CREDENTIALS path is correct
- Verify the JSON file exists and is readable

### "Permission denied"
- Make sure service account has "Cloud Vision AI Service Agent" role
- Or use "Editor" role for broader access

---

## Quick Reference

**Console URLs:**
- Cloud Console: https://console.cloud.google.com
- Enable Vision API: https://console.cloud.google.com/apis/library/vision.googleapis.com
- Service Accounts: https://console.cloud.google.com/iam-admin/serviceaccounts
- API Dashboard: https://console.cloud.google.com/apis/dashboard

**Key File Location:**
```
~/.gcp/oshi3-vision-key.json
```

**Environment Variable:**
```
GOOGLE_APPLICATION_CREDENTIALS=/Users/christopherhill/.gcp/oshi3-vision-key.json
```

---

## What's Next?

Once setup is complete:

1. ✅ Run database schema in Supabase
2. ✅ Set up Google Cloud Vision (this guide)
3. ⏭️ Run extraction: `npm run extract`
4. ⏭️ Run translation: `node translate.js`
