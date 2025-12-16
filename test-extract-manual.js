#!/usr/bin/env node

/**
 * Manual test extraction - First 2 items with manual pairing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const OUTPUT_DIR = 'extracted';
const DPI = 300;

// Manual pairing based on visual inspection
const ITEMS = [
  {
    itemNumber: 1,
    oshigataPage: 5,
    setsumeiPage: 6
  },
  {
    itemNumber: 2,
    oshigataPage: 7,
    setsumeiPage: 8
  }
];

async function uploadImage(imagePath, storagePath) {
  console.log(`☁️  Uploading ${storagePath}...`);
  const fileBuffer = fs.readFileSync(imagePath);
  const { data, error } = await supabase.storage
    .from('nihonto-images')
    .upload(storagePath, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('nihonto-images')
    .getPublicUrl(storagePath);

  return publicUrl;
}

async function createDatabaseRecord(volume, itemNumber, oshigataUrl, setsumeiUrl, pdfPageOshigata, pdfPageSetsumei) {
  console.log(`💾 Creating database record for Vol${volume} Item${itemNumber}...`);

  const { data, error } = await supabase
    .from('nihonto_items')
    .insert({
      volume,
      item_number: itemNumber,
      oshigata_url: oshigataUrl,
      setsumei_url: setsumeiUrl,
      pdf_page_oshigata: pdfPageOshigata,
      pdf_page_setsumei: pdfPageSetsumei
    });

  if (error) throw error;
  console.log(`✅ Vol${volume} Item ${itemNumber} created`);
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🗡️  TEST EXTRACTION - First 2 Items (Manual Pairing)`);
  console.log(`${'='.repeat(60)}\n`);

  const volumeDir = path.join(OUTPUT_DIR, 'vol1_test');

  for (const item of ITEMS) {
    console.log(`\n--- Item ${item.itemNumber} ---`);

    const oshigataFile = `page-${String(item.oshigataPage).padStart(2, '0')}.jpg`;
    const setsumeiFile = `page-${String(item.setsumeiPage).padStart(2, '0')}.jpg`;

    const oshigataPath = path.join(volumeDir, oshigataFile);
    const setsumeiPath = path.join(volumeDir, setsumeiFile);

    console.log(`Oshigata: ${oshigataFile} (PDF page ${item.oshigataPage})`);
    console.log(`Setsumei: ${setsumeiFile} (PDF page ${item.setsumeiPage})`);

    // Upload
    const oshigataStoragePath = `vol1/item_${String(item.itemNumber).padStart(3, '0')}_oshigata.jpg`;
    const setsumeiStoragePath = `vol1/item_${String(item.itemNumber).padStart(3, '0')}_setsumei.jpg`;

    const oshigataUrl = await uploadImage(oshigataPath, oshigataStoragePath);
    const setsumeiUrl = await uploadImage(setsumeiPath, setsumeiStoragePath);

    // Create DB record
    await createDatabaseRecord(
      1, // volume
      item.itemNumber,
      oshigataUrl,
      setsumeiUrl,
      item.oshigataPage,
      item.setsumeiPage
    );
  }

  console.log(`\n✅ Test extraction complete: ${ITEMS.length} items processed\n`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
