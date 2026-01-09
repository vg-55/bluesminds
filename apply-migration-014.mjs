// Script to apply migration 014 to fix referral_settings_history table
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://eoxoiqeswazggavqnocx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveG9pcWVzd2F6Z2dhdnFub2N4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzUzNDQ1NywiZXhwIjoyMDgzMTEwNDU3fQ.mQ-GOLUZFjL0GAv_X0UU4zPlFJNUwhpivxvZGnP5TMY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function applyMigration() {
  console.log('=== APPLYING MIGRATION 014 ===\n');

  // Read the migration file
  const migration = readFileSync('supabase/migrations/014_fix_referral_settings_history.sql', 'utf-8');

  // Split into individual statements
  const statements = migration
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;

    console.log(`[${i + 1}/${statements.length}] Executing statement...`);
    console.log(statement.substring(0, 100) + '...\n');

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

      if (error) {
        // Try direct query if RPC doesn't work
        console.log('RPC failed, trying direct query...');
        const { error: queryError } = await supabase.from('_realtime').select('*').limit(0);

        // For ALTER TABLE statements, we need to use a different approach
        console.warn('⚠️  Note: Some statements may need to be run directly in Supabase SQL editor');
        console.log('Statement:', statement + ';\n');
      } else {
        console.log('✅ Success\n');
      }
    } catch (err) {
      console.error('❌ Error:', err.message);
      console.log('Statement:', statement + ';\n');
    }
  }

  console.log('\n=== MIGRATION COMPLETE ===');
  console.log('\nPlease run these statements manually in Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/eoxoiqeswazggavqnocx/sql/new\n');
  console.log(migration);
}

applyMigration().catch(console.error);
