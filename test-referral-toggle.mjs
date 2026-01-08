// Test script to check and update referral settings
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eoxoiqeswazggavqnocx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveG9pcWVzd2F6Z2dhdnFub2N4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzUzNDQ1NywiZXhwIjoyMDgzMTEwNDU3fQ.mQ-GOLUZFjL0GAv_X0UU4zPlFJNUwhpivxvZGnP5TMY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testReferralSettings() {
  console.log('=== CHECKING CURRENT REFERRAL SETTINGS ===\n');

  // Get current settings
  const { data: currentSettings, error: fetchError } = await supabase
    .from('referral_settings')
    .select('*')
    .single();

  if (fetchError) {
    console.error('Error fetching settings:', fetchError);
    return;
  }

  console.log('Current settings:');
  console.log('- ID:', currentSettings.id);
  console.log('- Enabled:', currentSettings.enabled);
  console.log('- Reward Type:', currentSettings.reward_type);
  console.log('- Referrer Reward:', currentSettings.referrer_reward_value);
  console.log('- Referee Reward:', currentSettings.referee_reward_value);
  console.log('- Referrer Requests:', currentSettings.referrer_requests);
  console.log('- Referee Requests:', currentSettings.referee_requests);
  console.log('- Min Qualifying Requests:', currentSettings.min_qualifying_requests);
  console.log('- Updated At:', currentSettings.updated_at);

  console.log('\n=== TESTING TOGGLE (TURNING OFF) ===\n');

  // Try to toggle off
  const { data: updatedSettings, error: updateError } = await supabase
    .from('referral_settings')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('id', currentSettings.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating settings:', updateError);
    return;
  }

  console.log('After update:');
  console.log('- Enabled:', updatedSettings.enabled);
  console.log('- Updated At:', updatedSettings.updated_at);

  console.log('\n=== TESTING TOGGLE (TURNING BACK ON) ===\n');

  // Toggle back on
  const { data: revertedSettings, error: revertError } = await supabase
    .from('referral_settings')
    .update({ enabled: true, updated_at: new Date().toISOString() })
    .eq('id', currentSettings.id)
    .select()
    .single();

  if (revertError) {
    console.error('Error reverting settings:', revertError);
    return;
  }

  console.log('After reverting:');
  console.log('- Enabled:', revertedSettings.enabled);
  console.log('- Updated At:', revertedSettings.updated_at);

  console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
}

testReferralSettings().catch(console.error);
