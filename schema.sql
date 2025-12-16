-- Oshi3 Nihonto Database Schema

-- Main table for sword items
CREATE TABLE IF NOT EXISTS nihonto_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Volume and item identification
  volume INT NOT NULL CHECK (volume IN (1, 2)),
  item_number INT NOT NULL,

  -- Image storage (Supabase Storage URLs)
  oshigata_url TEXT,
  setsumei_url TEXT,

  -- PDF metadata
  pdf_page_oshigata INT,
  pdf_page_setsumei INT,

  -- Content (extracted and translated)
  setsumei_japanese TEXT,
  setsumei_english TEXT,
  sword_metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  translated_at TIMESTAMP,

  -- Constraints
  UNIQUE(volume, item_number)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_nihonto_volume ON nihonto_items(volume);
CREATE INDEX IF NOT EXISTS idx_nihonto_item_number ON nihonto_items(item_number);
CREATE INDEX IF NOT EXISTS idx_nihonto_created_at ON nihonto_items(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE nihonto_items ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access
CREATE POLICY "Public read access" ON nihonto_items
  FOR SELECT
  USING (true);

-- Policy: Allow authenticated users to insert/update
CREATE POLICY "Authenticated users can insert" ON nihonto_items
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON nihonto_items
  FOR UPDATE
  USING (true);
