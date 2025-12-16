#!/usr/bin/env node

/**
 * Oshi3 Nihonto PDF Extraction Script
 *
 * Extracts pages from Juyo Zufu volumes, classifies them as oshigata/setsumei,
 * uploads to Supabase Storage, and creates database records.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const VOLUMES = [
  {
    number: 1,
    filename: 'data/1　第一回重要刀剣等図譜.pdf',
    contentStart: 5,
    contentEnd: 66
  },
  {
    number: 2,
    filename: 'data/2　第二回重要刀剣等図譜.pdf',
    contentStart: 5, // TBD - needs verification
    contentEnd: 82    // TBD - needs verification
  }
];

const OUTPUT_DIR = 'extracted';
const DPI = 300;

/**
 * Extract pages from PDF to JPG
 */
function extractPages(pdfPath, startPage, endPage, outputPrefix) {
  console.log(`📄 Extracting pages ${startPage}-${endPage} from ${pdfPath}...`);

  const cmd = `pdftoppm -jpeg -r ${DPI} -f ${startPage} -l ${endPage} "${pdfPath}" "${outputPrefix}"`;
  execSync(cmd, { stdio: 'inherit' });
}

/**
 * Classify page as oshigata or setsumei based on file size heuristic
 * Oshigata pages are typically larger (more graphics)
 * Setsumei pages are smaller (mostly text)
 */
function classifyPage(imagePath) {
  const stats = fs.statSync(imagePath);
  const fileSizeKB = stats.size / 1024;

  // Heuristic: if file > 150KB, likely oshigata (graphics-heavy)
  // if file < 150KB, likely setsumei (text-heavy)
  return fileSizeKB > 150 ? 'oshigata' : 'setsumei';
}

/**
 * Upload image to Supabase Storage
 */
async function uploadImage(imagePath, storagePath) {
  console.log(`☁️  Uploading ${storagePath}...`);

  const fileBuffer = fs.readFileSync(imagePath);
  const { data, error } = await supabase.storage
    .from('nihonto-images')
    .upload(storagePath, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) {
    console.error(`❌ Upload failed: ${error.message}`);
    throw error;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('nihonto-images')
    .getPublicUrl(storagePath);

  return publicUrl;
}

/**
 * Create database record for sword item
 */
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

  if (error) {
    console.error(`❌ Database insert failed: ${error.message}`);
    throw error;
  }

  console.log(`✅ Vol${volume} Item${itemNumber} created`);
}

/**
 * Process a volume
 */
async function processVolume(volume) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🗡️  Processing Volume ${volume.number}`);
  console.log(`${'='.repeat(60)}\n`);

  // Create output directory
  const volumeDir = path.join(OUTPUT_DIR, `vol${volume.number}`);
  if (!fs.existsSync(volumeDir)) {
    fs.mkdirSync(volumeDir, { recursive: true });
  }

  // Extract all content pages
  const outputPrefix = path.join(volumeDir, 'page');
  extractPages(volume.filename, volume.contentStart, volume.contentEnd, outputPrefix);

  // Get all extracted pages
  const files = fs.readdirSync(volumeDir)
    .filter(f => f.endsWith('.jpg'))
    .sort();

  console.log(`\n📊 Extracted ${files.length} pages\n`);

  // Process pages in pairs
  const totalPages = files.length;
  let itemNumber = 1;

  for (let i = 0; i < totalPages; i += 2) {
    if (i + 1 >= totalPages) break; // Need pairs

    const page1Path = path.join(volumeDir, files[i]);
    const page2Path = path.join(volumeDir, files[i + 1]);

    // Classify pages
    const page1Type = classifyPage(page1Path);
    const page2Type = classifyPage(page2Path);

    console.log(`\n--- Item ${itemNumber} ---`);
    console.log(`Page 1: ${files[i]} -> ${page1Type}`);
    console.log(`Page 2: ${files[i + 1]} -> ${page2Type}`);

    // Determine which is oshigata and which is setsumei
    let oshigataPath, setsumeiPath, oshigataPdfPage, setsumeiPdfPage;

    if (page1Type === 'oshigata' && page2Type === 'setsumei') {
      oshigataPath = page1Path;
      setsumeiPath = page2Path;
      oshigataPdfPage = volume.contentStart + i;
      setsumeiPdfPage = volume.contentStart + i + 1;
    } else if (page1Type === 'setsumei' && page2Type === 'oshigata') {
      setsumeiPath = page1Path;
      oshigataPath = page2Path;
      setsumeiPdfPage = volume.contentStart + i;
      oshigataPdfPage = volume.contentStart + i + 1;
    } else {
      console.warn(`⚠️  Could not determine page types for item ${itemNumber}, skipping`);
      continue;
    }

    // Upload images
    const oshigataStoragePath = `vol${volume.number}/item_${String(itemNumber).padStart(3, '0')}_oshigata.jpg`;
    const setsumeiStoragePath = `vol${volume.number}/item_${String(itemNumber).padStart(3, '0')}_setsumei.jpg`;

    try {
      const oshigataUrl = await uploadImage(oshigataPath, oshigataStoragePath);
      const setsumeiUrl = await uploadImage(setsumeiPath, setsumeiStoragePath);

      // Create database record
      await createDatabaseRecord(
        volume.number,
        itemNumber,
        oshigataUrl,
        setsumeiUrl,
        oshigataPdfPage,
        setsumeiPdfPage
      );

      itemNumber++;
    } catch (error) {
      console.error(`❌ Error processing item ${itemNumber}:`, error.message);
    }
  }

  console.log(`\n✅ Volume ${volume.number} complete: ${itemNumber - 1} items processed\n`);
}

/**
 * Main
 */
async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🗡️  OSHI3 NIHONTO EXTRACTION`);
  console.log(`${'='.repeat(60)}\n`);

  // Check environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables. Check your .env file.');
    process.exit(1);
  }

  // Process each volume
  for (const volume of VOLUMES) {
    await processVolume(volume);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ ALL VOLUMES PROCESSED`);
  console.log(`${'='.repeat(60)}\n`);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
