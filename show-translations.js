#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: items, error } = await supabase
    .from('nihonto_items')
    .select('*')
    .order('volume', { ascending: true })
    .order('item_number', { ascending: true });

  if (error) throw error;

  for (const item of items) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`VOLUME ${item.volume} - ITEM ${item.item_number}`);
    console.log(`${'='.repeat(80)}\n`);
    console.log(item.setsumei_english);
    console.log(`\n`);
  }
}

main();
