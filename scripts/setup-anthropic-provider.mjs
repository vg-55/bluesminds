#!/usr/bin/env node

/**
 * Anthropic Provider Setup Script
 *
 * This script helps you set up Anthropic/Claude support in your BluesMinds gateway.
 * It configures LiteLLM servers with Anthropic backend and creates model mappings.
 *
 * Usage:
 *   node scripts/setup-anthropic-provider.mjs
 *
 * Prerequisites:
 *   - Anthropic API key
 *   - LiteLLM server configured with Anthropic support
 *   - Admin access to BluesMinds
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const CONFIG = {
  // Update these with your LiteLLM server details
  servers: [
    {
      name: 'Anthropic Primary',
      base_url: 'http://localhost:4000',  // Your LiteLLM server URL
      api_key: process.env.LITELLM_API_KEY || '',
      priority: 1,
      weight: 1.0,
      max_concurrent_requests: 100,
      supported_models: [
        'anthropic/claude-opus-4-5-20251031',
        'anthropic/claude-sonnet-4-5-20250929',
        'anthropic/claude-haiku-4-0-20250101',
        'claude-opus-4.5',
        'claude-sonnet-4.5',
        'claude-haiku-4',
      ],
    },
  ],

  // Model mappings to create
  modelMappings: [
    // Standard naming
    {
      custom_name: 'claude-opus-4.5',
      actual_model_name: 'anthropic/claude-opus-4-5-20251031',
      display_name: 'Claude Opus 4.5',
      description: 'Most capable Claude model for complex reasoning',
      priority: 1,
      weight: 1.0,
    },
    {
      custom_name: 'claude-sonnet-4.5',
      actual_model_name: 'anthropic/claude-sonnet-4-5-20250929',
      display_name: 'Claude Sonnet 4.5',
      description: 'Balanced Claude model for most use cases',
      priority: 1,
      weight: 1.0,
    },
    {
      custom_name: 'claude-haiku-4',
      actual_model_name: 'anthropic/claude-haiku-4-0-20250101',
      display_name: 'Claude Haiku 4',
      description: 'Fastest Claude model for simple tasks',
      priority: 1,
      weight: 1.0,
    },
    // Code-optimized naming (code/ prefix)
    {
      custom_name: 'code/claude-opus-4-5',
      actual_model_name: 'code/claude-opus-4-5',
      display_name: 'Claude Opus 4.5 (Code)',
      description: 'Claude Opus optimized for coding tasks',
      priority: 1,
      weight: 1.0,
    },
    {
      custom_name: 'code/claude-sonnet-4-5',
      actual_model_name: 'code/claude-sonnet-4-5',
      display_name: 'Claude Sonnet 4.5 (Code)',
      description: 'Claude Sonnet optimized for coding tasks',
      priority: 1,
      weight: 1.0,
    },
    {
      custom_name: 'code/claude-haiku-4',
      actual_model_name: 'code/claude-haiku-4',
      display_name: 'Claude Haiku 4 (Code)',
      description: 'Claude Haiku optimized for simple coding tasks',
      priority: 1,
      weight: 1.0,
    },
  ],
};

async function setupAnthropicProvider() {
  console.log('🚀 Setting up Anthropic provider...\n');

  try {
    // Step 1: Create servers
    console.log('📡 Creating LiteLLM servers...');
    const serverIds = [];

    for (const serverConfig of CONFIG.servers) {
      console.log(`  - Adding "${serverConfig.name}"...`);

      const { data: server, error } = await supabase
        .from('litellm_servers')
        .insert({
          name: serverConfig.name,
          base_url: serverConfig.base_url,
          api_key: serverConfig.api_key,
          priority: serverConfig.priority,
          weight: serverConfig.weight,
          max_concurrent_requests: serverConfig.max_concurrent_requests,
          supported_models: serverConfig.supported_models,
          is_active: true,
          health_status: 'unknown',
          current_requests: 0,
          total_requests: 0,
          failed_requests: 0,
          avg_response_time_ms: 0,
          metadata: {
            provider: 'anthropic',
            description: 'Anthropic Claude models via LiteLLM',
          },
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          console.log(`    ⚠️  Server "${serverConfig.name}" already exists, skipping...`);

          // Get existing server ID
          const { data: existing } = await supabase
            .from('litellm_servers')
            .select('id')
            .eq('name', serverConfig.name)
            .single();

          if (existing) {
            serverIds.push(existing.id);
          }
        } else {
          throw error;
        }
      } else {
        console.log(`    ✅ Created server (ID: ${server.id})`);
        serverIds.push(server.id);
      }
    }

    // Step 2: Create model mappings
    console.log('\n🎯 Creating model mappings...');

    for (const mapping of CONFIG.modelMappings) {
      console.log(`  - Mapping "${mapping.custom_name}" → "${mapping.actual_model_name}"...`);

      for (const serverId of serverIds) {
        const { data, error } = await supabase
          .from('custom_models')
          .insert({
            custom_name: mapping.custom_name,
            provider_id: serverId,
            actual_model_name: mapping.actual_model_name,
            display_name: mapping.display_name,
            description: mapping.description,
            priority: mapping.priority,
            weight: mapping.weight,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            console.log(`    ⚠️  Mapping already exists, skipping...`);
          } else {
            throw error;
          }
        } else {
          console.log(`    ✅ Created mapping (ID: ${data.id})`);
        }
      }
    }

    // Step 3: Test connectivity
    console.log('\n🔍 Testing server connectivity...');

    for (const serverConfig of CONFIG.servers) {
      try {
        const response = await fetch(`${serverConfig.base_url}/health`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${serverConfig.api_key}`,
          },
        });

        if (response.ok) {
          console.log(`  ✅ "${serverConfig.name}" is healthy`);
        } else {
          console.log(`  ⚠️  "${serverConfig.name}" returned status ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ "${serverConfig.name}" is not reachable: ${error.message}`);
        console.log(`     Make sure your LiteLLM server is running at ${serverConfig.base_url}`);
      }
    }

    // Step 4: Summary
    console.log('\n✅ Setup complete!\n');
    console.log('📋 Summary:');
    console.log(`  - Servers configured: ${CONFIG.servers.length}`);
    console.log(`  - Model mappings created: ${CONFIG.modelMappings.length}`);
    console.log('\n🎉 You can now use Anthropic models through BluesMinds!');
    console.log('\n📖 Example usage:');
    console.log(`
    curl -X POST https://api.bluesminds.com/v1/chat/completions \\
      -H "Authorization: Bearer YOUR_API_KEY" \\
      -H "Content-Type: application/json" \\
      -d '{
        "model": "claude-sonnet-4.5",
        "messages": [
          {"role": "user", "content": "Hello, Claude!"}
        ]
      }'
    `);

    console.log('\n📊 Next steps:');
    console.log('  1. Test your setup with the curl command above');
    console.log('  2. Check server health at /admin/providers');
    console.log('  3. Monitor usage at /admin/analytics');
    console.log('  4. Configure rate limits and quotas');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Main execution
console.log('╔══════════════════════════════════════════════════╗');
console.log('║   Anthropic Provider Setup for BluesMinds      ║');
console.log('╚══════════════════════════════════════════════════╝\n');

console.log('⚙️  Configuration:');
console.log(`  - Servers: ${CONFIG.servers.length}`);
console.log(`  - Models: ${CONFIG.modelMappings.length}`);
console.log('');

// Prompt for confirmation
if (process.argv.includes('--dry-run')) {
  console.log('🏃 Dry run mode - no changes will be made\n');
  console.log('Configuration preview:');
  console.log(JSON.stringify(CONFIG, null, 2));
  process.exit(0);
}

setupAnthropicProvider().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
