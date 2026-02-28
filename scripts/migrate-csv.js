require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const CSV_PATH = process.argv[2] || './customers.csv';
const CSV_HEADERS = ['Last Name','First Name','Business','Address','City','State','Zip','Phone','Miscellaneous'];

async function migrate() {
  console.log(`Reading CSV from: ${CSV_PATH}`);
  const rows = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv({ headers: CSV_HEADERS, skipLines: 1, mapValues: ({ value }) => (value || '').trim() }))
      .on('data', row => rows.push({
        last_name: row['Last Name'] || '',
        first_name: row['First Name'] || '',
        business: row['Business'] || '',
        address: row['Address'] || '',
        city: row['City'] || '',
        state: row['State'] || '',
        zip: row['Zip'] || '',
        phone: row['Phone'] || '',
        miscellaneous: row['Miscellaneous'] || ''
      }))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Parsed ${rows.length} rows from CSV`);

  // Insert in batches of 500
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase.from('customers').insert(chunk);
    if (error) {
      console.error(`Insert error at row ${i}:`, error.message);
      return;
    }
    console.log(`Inserted rows ${i + 1} to ${i + chunk.length}`);
  }

  console.log('Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
