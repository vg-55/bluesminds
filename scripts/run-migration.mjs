// Simple migration script using direct SQL execution
import pkg from 'pg';
const { Client } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connection string (use the direct connection, not pooler)
const connectionString = 'postgresql://postgres.eoxoiqeswazggavqnocx:RW7p6J3wD6ViQyHb@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    console.log('Reading migration file...');
    const migrationPath = join(__dirname, '../supabase/migrations/008_referrals_and_codes.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('Applying migration...');
    await client.query(sql);
    console.log('✅ Migration applied successfully!');

    // Verify tables were created
    const { rows } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('referrals', 'redemption_codes', 'code_redemptions', 'referral_settings')
      ORDER BY table_name
    `);

    console.log('\n📋 Tables created:');
    rows.forEach(row => console.log(`  - ${row.table_name}`));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
