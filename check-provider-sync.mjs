import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eoxoiqeswazggavqnocx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveG9pcWVzd2F6Z2dhdnFub2N4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzUzNDQ1NywiZXhwIjoyMDgzMTEwNDU3fQ.mQ-GOLUZFjL0GAv_X0UU4zPlFJNUwhpivxvZGnP5TMY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('='.repeat(70));
console.log('MULTI-PROVIDER DIAGNOSTIC REPORT');
console.log('='.repeat(70));
console.log('');

// 1. Check configured providers
console.log('📦 CONFIGURED PROVIDERS (litellm_servers table)');
console.log('-'.repeat(70));
const { data: servers, error: serversError } = await supabase
  .from('litellm_servers')
  .select('id, name, base_url, is_active, health_status, total_requests, failed_requests, supported_models')
  .order('priority', { ascending: true });

if (serversError) {
  console.error('❌ Error fetching servers:', serversError);
} else if (!servers || servers.length === 0) {
  console.log('⚠️  No providers configured in database!');
} else {
  console.log(`✅ Found ${servers.length} provider(s):\n`);
  servers.forEach((server, index) => {
    console.log(`${index + 1}. ${server.name}`);
    console.log(`   ID: ${server.id}`);
    console.log(`   URL: ${server.base_url}`);
    console.log(`   Status: ${server.is_active ? '✅ Active' : '❌ Inactive'}`);
    console.log(`   Health: ${server.health_status}`);
    console.log(`   Total Requests: ${server.total_requests}`);
    console.log(`   Failed Requests: ${server.failed_requests}`);
    console.log(`   Supported Models: ${server.supported_models?.length || 0} models`);
    if (server.supported_models && server.supported_models.length > 0) {
      console.log(`   Models: ${server.supported_models.slice(0, 3).join(', ')}${server.supported_models.length > 3 ? '...' : ''}`);
    }
    console.log('');
  });
}

// 2. Check usage logs
console.log('\n📊 USAGE LOGS ANALYSIS');
console.log('-'.repeat(70));
const { data: usageLogs, error: logsError } = await supabase
  .from('usage_logs')
  .select('provider, model, total_tokens, cost_usd, created_at')
  .order('created_at', { ascending: false })
  .limit(100);

if (logsError) {
  console.error('❌ Error fetching usage logs:', logsError);
} else if (!usageLogs || usageLogs.length === 0) {
  console.log('⚠️  No usage logs found! This is why analytics shows no provider data.');
} else {
  console.log(`✅ Found ${usageLogs.length} recent usage log(s)\n`);

  // Group by provider
  const providerStats = {};
  usageLogs.forEach(log => {
    const provider = log.provider || 'unknown';
    if (!providerStats[provider]) {
      providerStats[provider] = {
        requests: 0,
        totalCost: 0,
        models: new Set(),
      };
    }
    providerStats[provider].requests++;
    providerStats[provider].totalCost += parseFloat(log.cost_usd) || 0;
    if (log.model) {
      providerStats[provider].models.add(log.model);
    }
  });

  console.log('Provider Distribution in Usage Logs:\n');
  Object.entries(providerStats).forEach(([provider, stats]) => {
    const percentage = ((stats.requests / usageLogs.length) * 100).toFixed(1);
    console.log(`📍 ${provider}`);
    console.log(`   Requests: ${stats.requests} (${percentage}%)`);
    console.log(`   Total Cost: $${stats.totalCost.toFixed(4)}`);
    console.log(`   Unique Models: ${stats.models.size}`);
    console.log('');
  });
}

// 3. Check custom model mappings
console.log('\n🔀 CUSTOM MODEL MAPPINGS');
console.log('-'.repeat(70));
const { data: customModels, error: modelsError } = await supabase
  .from('custom_models')
  .select('custom_name, actual_model_name, provider_id, is_active, priority, weight')
  .eq('is_active', true)
  .order('custom_name', { ascending: true });

if (modelsError) {
  console.error('❌ Error fetching custom models:', modelsError);
} else if (!customModels || customModels.length === 0) {
  console.log('⚠️  No custom model mappings configured.');
  console.log('   This means clients must use exact model names from providers.');
} else {
  console.log(`✅ Found ${customModels.length} custom model mapping(s):\n`);

  // Group by custom name to show multi-provider mappings
  const modelGroups = {};
  customModels.forEach(mapping => {
    if (!modelGroups[mapping.custom_name]) {
      modelGroups[mapping.custom_name] = [];
    }
    modelGroups[mapping.custom_name].push(mapping);
  });

  Object.entries(modelGroups).forEach(([customName, mappings]) => {
    console.log(`📌 "${customName}" → ${mappings.length} provider(s)`);
    mappings.forEach((mapping, index) => {
      const server = servers?.find(s => s.id === mapping.provider_id);
      console.log(`   ${index + 1}. ${server?.name || 'Unknown'} (Priority: ${mapping.priority}, Weight: ${mapping.weight})`);
      console.log(`      Actual Model: ${mapping.actual_model_name}`);
    });
    console.log('');
  });
}

// 4. Summary and recommendations
console.log('\n💡 DIAGNOSIS & RECOMMENDATIONS');
console.log('='.repeat(70));

const configuredCount = servers?.length || 0;
const activeCount = servers?.filter(s => s.is_active).length || 0;
const healthyCount = servers?.filter(s => s.health_status === 'healthy').length || 0;
const hasUsageLogs = usageLogs && usageLogs.length > 0;
const providersInLogs = hasUsageLogs ? new Set(usageLogs.map(l => l.provider)).size : 0;

if (configuredCount === 0) {
  console.log('❌ CRITICAL: No providers configured!');
  console.log('   → Add providers via Admin Panel → Providers');
} else if (configuredCount === 1) {
  console.log('⚠️  Only 1 provider configured.');
  console.log('   → Multi-provider load balancing requires at least 2 providers');
  console.log('   → Add more providers via Admin Panel → Providers');
} else {
  console.log(`✅ ${configuredCount} provider(s) configured`);

  if (activeCount < configuredCount) {
    console.log(`⚠️  Only ${activeCount} provider(s) are active (${configuredCount - activeCount} inactive)`);
    console.log('   → Activate providers via Admin Panel → Providers');
  }

  if (healthyCount < activeCount) {
    console.log(`⚠️  Only ${healthyCount} provider(s) are healthy (${activeCount - healthyCount} degraded/unhealthy)`);
    console.log('   → Check provider health via Admin Panel → Providers → Check Health');
  }
}

if (!hasUsageLogs) {
  console.log('\n⚠️  No usage data yet');
  console.log('   → Admin analytics will show "No provider data yet"');
  console.log('   → Make some API requests to generate usage data');
} else if (providersInLogs === 1 && configuredCount > 1) {
  console.log(`\n⚠️  Multiple providers configured but only ${providersInLogs} provider in usage logs`);
  console.log('   → Possible causes:');
  console.log('      1. Other providers are inactive or unhealthy');
  console.log('      2. Model routing only uses one provider (check custom_models table)');
  console.log('      3. Need to make more requests to see load balancing in action');
} else if (providersInLogs > 1) {
  console.log(`\n✅ Multi-provider is working! ${providersInLogs} providers active in usage logs`);
}

console.log('\n' + '='.repeat(70));
console.log('END OF DIAGNOSTIC REPORT');
console.log('='.repeat(70));
