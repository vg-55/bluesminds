import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://eoxoiqeswazggavqnocx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveG9pcWVzd2F6Z2dhdnFub2N4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzUzNDQ1NywiZXhwIjoyMDgzMTEwNDU3fQ.mQ-GOLUZFjL0GAv_X0UU4zPlFJNUwhpivxvZGnP5TMY'
);

const { data } = await supabase
  .from('custom_models')
  .select('custom_name, provider:litellm_servers(name, base_url), actual_model_name, priority, weight, is_active')
  .order('custom_name')
  .order('priority');

console.log('\n📊 Current Model Mappings:\n');
console.log('='.repeat(70));

const grouped = {};
data?.forEach((m) => {
  if (!grouped[m.custom_name]) {
    grouped[m.custom_name] = [];
  }
  grouped[m.custom_name].push(m);
});

for (const [modelName, mappings] of Object.entries(grouped)) {
  const isMulti = mappings.length > 1;
  console.log(`\n${isMulti ? '🔀' : '📍'} ${modelName} ${isMulti ? `(${mappings.length} providers)` : ''}`);

  mappings.forEach((m, i) => {
    const active = m.is_active ? '✓' : '✗';
    console.log(`   ${i + 1}. [${active}] ${m.provider.name} → ${m.actual_model_name}`);
    console.log(`      Priority: ${m.priority} | Weight: ${m.weight}`);
    console.log(`      URL: ${m.provider.base_url}`);
  });
}

console.log('\n' + '='.repeat(70));
console.log(`\nTotal: ${data?.length || 0} mappings | ${Object.keys(grouped).length} unique models | ${Object.values(grouped).filter(m => m.length > 1).length} multi-provider\n`);
