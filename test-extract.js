#!/usr/bin/env node

/**
 * Test extraction - First 2 items from Volume 1 only
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

// Test with first 2 items = 4 pages (pages 5-8)
const TEST_CONFIG = {
  number: 1,
  filename: 'data/1　第一回重要刀剣等図譜.pdf',
  startPage: 5,
  endPage: 8  // Just 4 pages = 2 items
};

function extractPages(pdfPath, startPage, endPage, outputPrefix) {
  console.log(`📄 Extracting pages ${startPage}-${endPage} from ${pdfPath}...`);
  const cmd = `pdftoppm -jpeg -r ${DPI} -f ${startPage} -l ${endPage} "${pdfPath}" "${outputPrefix}"`;
  execSync(cmd, { stdio: 'inherit' });
}

function classifyPage(imagePath) {
  const stats = fs.statSync(imagePath);
  const fileSizeKB = stats.size / 1024;
  return fileSizeKB > 150 ? 'oshigata' : 'setsumei';
}

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
  console.log(`✅ Vol${volume} Item${itemNumber} created`);
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🗡️  TEST EXTRACTION - First 2 Items from Volume 1`);
  console.log(`${'='.repeat(60)}\n`);

  // Create output directory
  const volumeDir = path.join(OUTPUT_DIR, 'vol1_test');
  if (!fs.existsSync(volumeDir)) {
    fs.mkdirSync(volumeDir, { recursive: true });
  }

  // Extract pages
  const outputPrefix = path.join(volumeDir, 'page');
  extractPages(TEST_CONFIG.filename, TEST_CONFIG.startPage, TEST_CONFIG.endPage, outputPrefix);

  // Get extracted files
  const files = fs.readdirSync(volumeDir)
    .filter(f => f.endsWith('.jpg'))
    .sort();

  console.log(`\n📊 Extracted ${files.length} pages\n`);

  // Process in pairs
  let itemNumber = 1;
  for (let i = 0; i < files.length; i += 2) {
    if (i + 1 >= files.length) break;

    const page1Path = path.join(volumeDir, files[i]);
    const page2Path = path.join(volumeDir, files[i + 1]);

    const page1Type = classifyPage(page1Path);
    const page2Type = classifyPage(page2Path);

    console.log(`\n--- Item ${itemNumber} ---`);
    console.log(`Page 1: ${files[i]} (${Math.round(fs.statSync(page1Path).size/1024)}KB) -> ${page1Type}`);
    console.log(`Page 2: ${files[i + 1]} (${Math.round(fs.statSync(page2Path).size/1024)}KB) -> ${page2Type}`);

    let oshigataPath, setsumeiPath, oshigataPdfPage, setsumeiPdfPage;

    if (page1Type === 'oshigata' && page2Type === 'setsumei') {
      oshigataPath = page1Path;
      setsumeiPath = page2Path;
      oshigataPdfPage = TEST_CONFIG.startPage + i;
      setsumeiPdfPage = TEST_CONFIG.startPage + i + 1;
    } else if (page1Type === 'setsumei' && page2Type === 'oshigata') {
      setsumeiPath = page1Path;
      oshigataPath = page2Path;
      setsumeiPdfPage = TEST_CONFIG.startPage + i;
      oshigataPdfPage = TEST_CONFIG.startPage + i + 1;
    } else {
      console.warn(`⚠️  Could not determine page types, skipping`);
      continue;
    }

    // Upload
    const oshigataStoragePath = `vol1/test_item_${itemNumber}_oshigata.jpg`;
    const setsumeiStoragePath = `vol1/test_item_${itemNumber}_setsumei.jpg`;

    const oshigataUrl = await uploadImage(oshigataPath, oshigataStoragePath);
    const setsumeiUrl = await uploadImage(setsumeiPath, setsumeiStoragePath);

    // Create DB record
    await createDatabaseRecord(
      TEST_CONFIG.number,
      itemNumber,
      oshigataUrl,
      setsumeiUrl,
      oshigataPdfPage,
      setsumeiPdfPage
    );

    itemNumber++;
  }

  console.log(`\n✅ Test extraction complete: ${itemNumber - 1} items processed\n`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
