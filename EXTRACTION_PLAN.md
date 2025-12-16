# PDF Extraction Plan

## PDF Structure Analysis

### Volume 1 (第一回重要刀剣等図譜)
- **Total Pages:** 68
- **Content Pages:** ~5-66 (approx. 31 sword items)
- **Front Matter:** Pages 1-4 (title, blank, table of contents, blank)
- **Back Matter:** Pages 67-68 (blank, publication info)

### Volume 2 (第二回重要刀剣等図譜)
- **Total Pages:** 84
- **Content Pages:** TBD (needs verification)
- **Estimated Items:** ~40

## Page Pattern

Each sword item consists of TWO pages:
1. **Oshigata (押型)** - Sword rubbings/drawings showing blade patterns
2. **Setsumei (説明)** - Text description with metadata

**IMPORTANT:** Pattern order needs verification. Initial analysis shows:
- Some items: Oshigata THEN Setsumei
- Some items: Setsumei THEN Oshigata

Need programmatic approach to detect which page is which based on visual characteristics.

## Detection Strategy

### Oshigata Characteristics:
- Predominantly visual/graphical
- Shows sword blade tracings
- Minimal text (might have small labels)
- High contrast black/white images

### Setsumei Characteristics:
- Dense Japanese text
- Vertical writing (top to bottom, right to left)
- Contains structured information:
  - Sword type (太刀, 脇指, etc.)
  - Smith name (銘)
  - Measurements (法量)
  - Physical description (形状)
  - Historical context (伝来)

## Extraction Approach

### Step 1: Extract All Content Pages as JPG
```bash
# Volume 1: Extract pages 5-66
pdftoppm -jpeg -f 5 -l 66 vol1.pdf output/vol1

# Volume 2: Extract pages (TBD after analysis)
```

### Step 2: Classify Pages
Use computer vision or simple heuristics:
- Check text density
- Analyze image complexity
- Detect vertical text lines vs graphical content

### Step 3: Pair Pages
- Group consecutive pages into pairs
- Assign roles: oshigata + setsumei
- Generate item numbers (1, 2, 3, ...)

### Step 4: Store Metadata
```json
{
  "item_number": 1,
  "volume": 1,
  "pdf_page_oshigata": 5,
  "pdf_page_setsumei": 6,
  "sword_type": "extracted from setsumei",
  "smith_name": "extracted from setsumei"
}
```

## Database Schema (Draft)

```sql
CREATE TABLE nihonto_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  volume INT NOT NULL,           -- 1 or 2
  item_number INT NOT NULL,      -- Sequential within volume

  -- Image storage
  oshigata_url TEXT,             -- Supabase Storage URL
  setsumei_url TEXT,             -- Supabase Storage URL

  -- PDF metadata
  pdf_page_oshigata INT,         -- Original PDF page number
  pdf_page_setsumei INT,         -- Original PDF page number

  -- Content (extracted later)
  setsumei_japanese TEXT,        -- OCR'd Japanese text
  setsumei_english TEXT,         -- Translated English
  sword_metadata JSONB,          -- Structured data

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  translated_at TIMESTAMP,

  UNIQUE(volume, item_number)
);
```

## Storage Structure (Supabase)

```
Bucket: nihonto-images
├── vol1/
│   ├── item_001_oshigata.jpg
│   ├── item_001_setsumei.jpg
│   ├── item_002_oshigata.jpg
│   ├── item_002_setsumei.jpg
│   └── ...
└── vol2/
    ├── item_001_oshigata.jpg
    ├── item_001_setsumei.jpg
    └── ...
```

## Translation Pipeline

### Phase 1: Extract & Store Images
1. Extract all pages to JPG
2. Classify and pair pages
3. Upload to Supabase Storage
4. Create database records

### Phase 2: OCR & Translation (Optional but useful)
Use OpenRouter with vision model:
```javascript
// Send setsumei image to Claude Vision
const response = await openrouter.chat({
  model: "anthropic/claude-3.5-sonnet",
  messages: [{
    role: "user",
    content: [
      { type: "image_url", image_url: setsumei_url },
      { type: "text", text: "Extract and translate this Japanese sword description to English markdown." }
    ]
  }]
});
```

### Phase 3: Quality Control
- Manual review of translations
- Correction of errors
- Addition of missing metadata

## Implementation Order

1. ✅ Analyze PDF structure
2. ⏳ Create database schema
3. ⏳ Create Supabase Storage bucket
4. ⏳ Build extraction script
5. ⏳ Build classification logic
6. ⏳ Build upload pipeline
7. ⏳ Test with 5 sample items
8. ⏳ Run full extraction
9. ⏳ Build translation pipeline
10. ⏳ Run translations with progress tracking

## Notes

- High-quality JPG extraction: use `-jpeg -r 300` for 300 DPI
- Store original PDF page numbers for reference
- Keep raw images even after OCR/translation
- Consider batch processing for cost efficiency with OpenRouter
