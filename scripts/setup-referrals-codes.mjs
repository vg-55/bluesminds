// Setup referrals and codes tables using Supabase client
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eoxoiqeswazggavqnocx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveG9pcWVzd2F6Z2dhdnFub2N4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzUzNDQ1NywiZXhwIjoyMDgzMTEwNDU3fQ.mQ-GOLUZFjL0GAv_X0UU4zPlFJNUwhpivxvZGnP5TMY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupTables() {
  console.log('Setting up referrals and redemption codes tables...\n');

  try {
    // Note: The tables need to be created via SQL migrations
    // This script will verify the tables exist and add some sample data

    // Check if tables exist
    console.log('Checking if tables exist...');
    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('id')
      .limit(1);

    if (refError && refError.code === '42P01') {
      console.log('\n⚠️  Tables do not exist yet.');
      console.log('Please run the migration file manually via Supabase Dashboard:');
      console.log('1. Go to https://supabase.com/dashboard/project/eoxoiqeswazggavqnocx/editor');
      console.log('2. Copy the contents of supabase/migrations/008_referrals_and_codes.sql');
      console.log('3. Paste and execute in the SQL Editor');
      console.log('\nOr use the Supabase CLI:');
      console.log('npx supabase db reset --db-url <connection-string>');
      return;
    }

    console.log('✅ Tables exist!');

    // Check referral_settings
    console.log('\nChecking referral settings...');
    const { data: settings, error: settingsError } = await supabase
      .from('referral_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error checking settings:', settingsError);
    } else if (!settings) {
      console.log('Creating default referral settings...');
      const { error: insertError } = await supabase
        .from('referral_settings')
        .insert({
          referrer_reward_type: 'fixed',
          referrer_reward_value: 50.00,
          referee_reward_type: 'fixed',
          referee_reward_value: 10.00,
          min_purchase_amount: 100.00,
          enabled: true,
        });

      if (insertError) {
        console.error('Error creating settings:', insertError);
      } else {
        console.log('✅ Default settings created');
      }
    } else {
      console.log('✅ Settings already exist');
    }

    console.log('\n✅ Setup complete!');
    console.log('\nYou can now:');
    console.log('- Visit /admin/referrals to see the referral program');
    console.log('- Visit /admin/codes to manage redemption codes');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

setupTables();
