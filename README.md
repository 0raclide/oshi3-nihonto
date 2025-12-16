# Oshi3 Nihonto - Japanese Sword Catalog Digitization

Digitization and translation project for Juyo Zufu (重要刀剣等図譜) - Important Japanese Sword Catalog volumes.

## Project Overview

This project extracts sword catalog pages from PDF, stores them in a database with images, and translates Japanese descriptions to English using a 3-step AI pipeline.

## Tech Stack

- **Database:** Supabase (PostgreSQL + Storage)
- **OCR:** Google Cloud Vision API
- **Translation:** OpenRouter (Claude 3.5 Sonnet)
- **Processing:** Node.js

## Project Structure

```
oshi3-nihonto/
├── data/                           # Source PDFs (gitignored)
│   ├── 1　第一回重要刀剣等図譜.pdf
│   └── 2　第二回重要刀剣等図譜.pdf
├── samples/                        # Sample extracted pages
├── extracted/                      # Full extraction output (gitignored)
├── extract.js                      # PDF extraction script
├── translate.js                    # Translation pipeline script
├── schema.sql                      # Database schema
├── EXTRACTION_PLAN.md              # Detailed extraction strategy
├── SETUP.md                        # Infrastructure setup summary
└── CLAUDE.md                       # Development guidelines
```

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# Supabase
SUPABASE_URL=https://itbhfhyptogxcjbjfzwx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_key_here

# OpenRouter
OPENROUTER_API_KEY=your_key_here

# Google Cloud Vision
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Database Schema

Go to Supabase SQL Editor:
https://supabase.com/dashboard/project/itbhfhyptogxcjbjfzwx/sql/new

Copy and run the contents of `schema.sql`

### 4. Set up Google Cloud Vision

1. Go to: https://console.cloud.google.com
2. Create a new project (or use existing)
3. Enable "Cloud Vision API"
4. Create a service account
5. Download JSON key file
6. Set path in `.env`:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
   ```

## Usage

### Extract PDFs

Extract pages from PDFs, classify them, and upload to Supabase:

```bash
npm run extract
```

This will:
- Extract all pages from both volumes as high-quality JPEGs (300 DPI)
- Classify pages as oshigata (sword drawings) or setsumei (descriptions)
- Pair pages correctly
- Upload to Supabase Storage
- Create database records

### Translate Descriptions

Run the 3-step translation pipeline:

```bash
node translate.js
```

**Pipeline Steps:**
1. **Google Cloud Vision OCR** → Extract Japanese text
2. **LLM + Vision** (OCR + JPEG) → Correct OCR errors → OCR'
3. **LLM** (OCR') → Translate to English Markdown

Output format:
```markdown
# [Sword Type] - [Smith Name]

## Basic Information
- Classification, signature, period, etc.

## Measurements
- Dimensions in cm

## Physical Description
- Blade shape, curvature, etc.

## Hamon - Temper Pattern
## Jigane - Steel Pattern
## Nakago - Tang
## Historical Context
## Notes
```

## Database Schema

```sql
CREATE TABLE nihonto_items (
  id UUID PRIMARY KEY,
  volume INT,                    -- 1 or 2
  item_number INT,               -- Sequential within volume

  oshigata_url TEXT,             -- Sword drawing image URL
  setsumei_url TEXT,             -- Description image URL

  pdf_page_oshigata INT,         -- Original PDF page number
  pdf_page_setsumei INT,         -- Original PDF page number

  setsumei_japanese TEXT,        -- Corrected Japanese OCR
  setsumei_english TEXT,         -- English translation (Markdown)

  sword_metadata JSONB,          -- Structured data

  created_at TIMESTAMP,
  translated_at TIMESTAMP
);
```

## Storage Structure

```
Bucket: nihonto-images (public)
├── vol1/
│   ├── item_001_oshigata.jpg
│   ├── item_001_setsumei.jpg
│   ├── item_002_oshigata.jpg
│   └── ...
└── vol2/
    └── ...
```

## Cost Estimation

**Per Item (2 pages):**
- Google Cloud Vision: ~$0.0015 (text detection)
- OpenRouter (Claude 3.5 Sonnet):
  - OCR Correction: ~$0.01 (with vision)
  - Translation: ~$0.005 (text only)
- **Total per item:** ~$0.0165

**Full Project (~70 items):**
- **Estimated cost:** ~$1.16

## Development

See `CLAUDE.md` for development guidelines and workflow.

## License

MIT

## Repository

https://github.com/0raclide/oshi3-nihonto
