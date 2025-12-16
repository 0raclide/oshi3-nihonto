#!/usr/bin/env node

/**
 * Oshi3 Nihonto Translation Pipeline
 *
 * 3-Step Process:
 * 1. Google Cloud Vision OCR → Extract Japanese text
 * 2. LLM + (OCR + JPEG) → Correct OCR errors (OCR')
 * 3. LLM + OCR' → Translate to English Markdown
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const vision = require('@google-cloud/vision');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const visionClient = new vision.ImageAnnotatorClient();

// OpenRouter API endpoint
const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';

// Model selection
const VISION_MODEL = 'anthropic/claude-3.5-sonnet'; // For OCR correction (needs vision)
const TEXT_MODEL = 'anthropic/claude-3.5-sonnet';   // For translation

/**
 * Step 1: Extract OCR using Google Cloud Vision
 */
async function extractOCR(imagePath) {
  console.log('📄 Step 1: Running Google Cloud Vision OCR...');

  const [result] = await visionClient.textDetection(imagePath);
  const detections = result.textAnnotations;

  if (!detections || detections.length === 0) {
    throw new Error('No text detected in image');
  }

  // First annotation contains the full text
  const fullText = detections[0].description;

  console.log(`✅ Extracted ${fullText.length} characters`);
  return fullText;
}

/**
 * Step 2: Correct OCR using LLM with vision
 */
async function correctOCR(rawOCR, imageUrl) {
  console.log('🔍 Step 2: Correcting OCR with LLM + Vision...');

  const correctionPrompt = `You are a Japanese historical sword catalog expert.

I have OCR text extracted from a Japanese sword catalog (重要刀剣等図譜). The OCR may contain errors due to:
- Old/historical kanji forms
- Vertical text layout confusion
- Similar-looking characters
- Technical sword terminology

**Your task:** Review the OCR text alongside the image and produce CORRECTED Japanese text.

**Instructions:**
1. Compare the OCR with the actual image
2. Fix any OCR errors you identify
3. Preserve the original structure and layout
4. Use proper historical kanji forms when appropriate
5. Output ONLY the corrected Japanese text, nothing else

**OCR Text:**
${rawOCR}

**Corrected Text:**`;

  const response = await fetch(OPENROUTER_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/0raclide/oshi3-nihonto',
      'X-Title': 'Oshi3 Nihonto OCR Correction'
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            },
            {
              type: 'text',
              text: correctionPrompt
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  const correctedOCR = data.choices[0].message.content;

  console.log(`✅ OCR corrected`);
  return correctedOCR;
}

/**
 * Step 3: Translate to English Markdown
 */
async function translateToMarkdown(correctedOCR) {
  console.log('🌐 Step 3: Translating to English Markdown...');

  const translationPrompt = `You are a Japanese sword expert translator specializing in historical sword catalogs.

I have a corrected Japanese text description from a Important Sword Catalog (重要刀剣等図譜).

**Your task:** Translate this to well-structured English Markdown.

**Output Format:**

# [Sword Type] - [Smith/School Name]

## Basic Information
- **Classification:** [太刀/脇指/短刀/etc.]
- **Signature (銘):** [Transcribe signature]
- **Attribution:** [If unsigned, the attributed smith/school]
- **Period:** [Estimated period/era]

## Measurements (法量)
- **Total Length:** [XX cm]
- **Blade Length:** [XX cm]
- **Curvature (反り):** [XX cm]
- **Base Width (元幅):** [XX cm]
- **Tip Width (先幅):** [XX cm]
- **Blade Thickness:** [XX cm]

## Physical Description (形状)
[Detailed description of blade shape, curvature, thickness, tip form, etc.]

## Hamon (刃文) - Temper Pattern
[Description of the temper line pattern]

## Jigane (地鉄) - Steel Pattern
[Description of the steel grain pattern]

## Nakago (茎) - Tang
[Description of tang condition, file marks, patina, holes, etc.]

## Historical Context (伝来)
[Provenance, ownership history, notable information]

## Notes
[Any additional observations or scholarly notes]

---

**Japanese Text:**
${correctedOCR}

**English Translation (Markdown):**`;

  const response = await fetch(OPENROUTER_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/0raclide/oshi3-nihonto',
      'X-Title': 'Oshi3 Nihonto Translation'
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'user',
          content: translationPrompt
        }
      ],
      max_tokens: 8000,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  const markdown = data.choices[0].message.content;

  console.log(`✅ Translation complete`);
  return markdown;
}

/**
 * Process a single item
 */
async function processItem(item) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🗡️  Processing Vol${item.volume} Item ${item.item_number}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Download setsumei image
    const imageUrl = item.setsumei_url;
    const imagePath = `/tmp/setsumei_${item.id}.jpg`;

    console.log('⬇️  Downloading image...');
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    fs.writeFileSync(imagePath, Buffer.from(imageBuffer));

    // Step 1: Google Cloud Vision OCR
    const rawOCR = await extractOCR(imagePath);

    // Step 2: Correct OCR with LLM + Vision
    const correctedOCR = await correctOCR(rawOCR, imageUrl);

    // Step 3: Translate to Markdown
    const englishMarkdown = await translateToMarkdown(correctedOCR);

    // Update database
    console.log('💾 Updating database...');
    const { error } = await supabase
      .from('nihonto_items')
      .update({
        setsumei_japanese: correctedOCR,
        setsumei_english: englishMarkdown,
        translated_at: new Date().toISOString()
      })
      .eq('id', item.id);

    if (error) throw error;

    // Cleanup
    fs.unlinkSync(imagePath);

    console.log(`✅ Vol${item.volume} Item ${item.item_number} translation complete\n`);

    return {
      success: true,
      item_id: item.id,
      volume: item.volume,
      item_number: item.item_number
    };

  } catch (error) {
    console.error(`❌ Error processing Vol${item.volume} Item ${item.item_number}:`, error.message);

    return {
      success: false,
      item_id: item.id,
      volume: item.volume,
      item_number: item.item_number,
      error: error.message
    };
  }
}

/**
 * Main
 */
async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🌐 OSHI3 NIHONTO TRANSLATION PIPELINE`);
  console.log(`${'='.repeat(60)}\n`);

  // Validate environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENROUTER_API_KEY) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  // Get untranslated items
  console.log('🔍 Fetching untranslated items...\n');
  const { data: items, error } = await supabase
    .from('nihonto_items')
    .select('*')
    .is('setsumei_english', null)
    .order('volume', { ascending: true })
    .order('item_number', { ascending: true });

  if (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.log('✅ No items to translate. All done!');
    return;
  }

  console.log(`📊 Found ${items.length} items to translate\n`);

  // Process items
  const results = [];
  for (const item of items) {
    const result = await processItem(item);
    results.push(result);

    // Rate limiting: wait 2 seconds between items
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 TRANSLATION SUMMARY`);
  console.log(`${'='.repeat(60)}\n`);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}\n`);

  if (failed > 0) {
    console.log('Failed items:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - Vol${r.volume} Item ${r.item_number}: ${r.error}`);
    });
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
