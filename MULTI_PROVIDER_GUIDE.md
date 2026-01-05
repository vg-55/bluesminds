# Multi-Provider Model Mapping Guide

## Overview

The BluesMinds AI Gateway now supports mapping a single custom model name to **multiple providers** for automatic load balancing, failover, and high availability.

This means you can:
- ✅ Map "gpt-4" to multiple different LiteLLM servers
- ✅ Automatically rotate between providers based on load and health
- ✅ Configure priority for failover (primary → backup → fallback)
- ✅ Set weight for traffic distribution (60% to provider A, 40% to provider B)
- ✅ Automatic failover when a provider is unhealthy

## How It Works

### Architecture

```
User Request: "gpt-4"
       ↓
Gateway resolves "gpt-4" to multiple providers:
       ↓
   ┌─────────────────────────────────────┐
   │  Provider 1 (Priority 1, Weight 1.5)│ ← 60% traffic
   │  Provider 2 (Priority 1, Weight 1.0)│ ← 40% traffic
   │  Provider 3 (Priority 2, Weight 1.0)│ ← Backup
   └─────────────────────────────────────┘
       ↓
Load balancer selects best provider based on:
  - Priority (lower = higher priority)
  - Weight (higher = more traffic)
  - Health status (unhealthy providers skipped)
  - Current load (fewer active requests preferred)
       ↓
Request forwarded to selected provider
```

### Selection Algorithm

1. **Filter by health**: Remove unhealthy providers
2. **Group by priority**: Get all providers with highest priority (lowest number)
3. **Calculate load**: For each provider: `load = current_requests / (max_requests × weight)`
4. **Select best**: Choose provider with lowest load factor

## Database Schema

### Custom Models Table

```sql
CREATE TABLE custom_models (
  id UUID PRIMARY KEY,
  custom_name TEXT NOT NULL,           -- e.g., "gpt-4"
  provider_id UUID REFERENCES litellm_servers(id),
  actual_model_name TEXT NOT NULL,     -- e.g., "claude-sonnet-4-5"
  display_name TEXT,
  description TEXT,
  priority INTEGER DEFAULT 100,         -- 1-1000 (lower = higher priority)
  weight DECIMAL(3,2) DEFAULT 1.0,     -- 0.1-10.0 (higher = more traffic)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(custom_name, provider_id)     -- Same model can't map to same provider twice
);
```

## Setup Examples

### Example 1: Simple Failover (Primary + Backup)

Map "gpt-4" to two providers with automatic failover:

```javascript
const mappings = [
  {
    custom_name: 'gpt-4',
    provider_id: 'primary-provider-id',
    actual_model_name: 'claude-sonnet-4-5',
    priority: 1,  // Primary
    weight: 1.0,
  },
  {
    custom_name: 'gpt-4',
    provider_id: 'backup-provider-id',
    actual_model_name: 'claude-sonnet-4-5',
    priority: 2,  // Backup (only used if primary unavailable)
    weight: 1.0,
  },
];
```

**Behavior**: All requests go to the primary provider. If primary becomes unhealthy or overloaded, automatically switches to backup.

### Example 2: Load Balanced (60/40 split)

Distribute traffic across two providers:

```javascript
const mappings = [
  {
    custom_name: 'claude-opus',
    provider_id: 'provider-a-id',
    actual_model_name: 'claude-opus-4-5',
    priority: 1,
    weight: 1.5,  // Gets ~60% of traffic
  },
  {
    custom_name: 'claude-opus',
    provider_id: 'provider-b-id',
    actual_model_name: 'claude-opus-4-5',
    priority: 1,  // Same priority = load balanced
    weight: 1.0,  // Gets ~40% of traffic
  },
];
```

**Behavior**: Traffic is distributed proportionally based on weight. Provider A gets 60% (1.5/(1.5+1.0)) and Provider B gets 40%.

### Example 3: Multi-Tier Failover

Primary → Backup → Fallback with different models:

```javascript
const mappings = [
  {
    custom_name: 'smart-model',
    provider_id: 'premium-provider-id',
    actual_model_name: 'claude-opus-4-5',  // Best model
    priority: 1,
    weight: 1.0,
  },
  {
    custom_name: 'smart-model',
    provider_id: 'standard-provider-id',
    actual_model_name: 'claude-sonnet-4-5',  // Good model
    priority: 2,
    weight: 1.0,
  },
  {
    custom_name: 'smart-model',
    provider_id: 'budget-provider-id',
    actual_model_name: 'claude-3-5-sonnet-20241022',  // Fallback model
    priority: 3,
    weight: 1.0,
  },
];
```

**Behavior**: Uses Opus by default. If unavailable, falls back to Sonnet 4.5. If that's unavailable, uses Claude 3.5.

### Example 4: Geographic Distribution

Route traffic to different regions:

```javascript
const mappings = [
  {
    custom_name: 'global-model',
    provider_id: 'us-east-provider-id',
    actual_model_name: 'claude-sonnet-4-5',
    priority: 1,
    weight: 2.0,  // US gets more traffic
  },
  {
    custom_name: 'global-model',
    provider_id: 'eu-west-provider-id',
    actual_model_name: 'claude-sonnet-4-5',
    priority: 1,
    weight: 1.5,  // Europe gets medium traffic
  },
  {
    custom_name: 'global-model',
    provider_id: 'ap-south-provider-id',
    actual_model_name: 'claude-sonnet-4-5',
    priority: 1,
    weight: 0.5,  // Asia gets less traffic
  },
];
```

## Setup Instructions

### Method 1: Using the Helper Script

1. Run the setup script:
```bash
node scripts/setup-multi-provider-model.mjs
```

2. Follow the prompts and uncomment the configuration section

3. Modify the mappings for your needs

### Method 2: Direct SQL

```sql
-- First, apply the migration
\i supabase/migrations/007_multi_provider_models.sql

-- Then insert your mappings
INSERT INTO custom_models (custom_name, provider_id, actual_model_name, display_name, priority, weight)
VALUES
  ('gpt-4', 'provider-1-uuid', 'claude-sonnet-4-5', 'GPT-4 Primary', 1, 1.0),
  ('gpt-4', 'provider-2-uuid', 'claude-sonnet-4-5', 'GPT-4 Backup', 2, 1.0);
```

### Method 3: Via API (Admin Endpoint)

```bash
curl -X POST http://localhost:3000/api/admin/models \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "custom_name": "gpt-4",
    "provider_id": "provider-uuid",
    "actual_model_name": "claude-sonnet-4-5",
    "display_name": "GPT-4 Multi-Provider",
    "priority": 1,
    "weight": 1.0
  }'
```

## Configuration Parameters

### Priority

- **Range**: 1 - 1000
- **Lower = Higher Priority**: Priority 1 is tried before priority 2
- **Use Case**: Failover tiers (primary, backup, fallback)
- **Example**:
  - Priority 1: Primary providers (tried first)
  - Priority 2: Backup providers (tried if primary unavailable)
  - Priority 3: Fallback providers (last resort)

### Weight

- **Range**: 0.1 - 10.0
- **Higher = More Traffic**: Weight 2.0 gets twice the traffic of 1.0
- **Use Case**: Load distribution among providers at same priority
- **Formula**: `provider_traffic_share = provider_weight / sum_of_all_weights`
- **Example**:
  - Provider A (weight 1.5): 60% traffic
  - Provider B (weight 1.0): 40% traffic

## Monitoring & Observability

The gateway logs detailed information about multi-provider routing:

```json
{
  "level": "info",
  "message": "Custom model resolved with multiple providers",
  "customName": "gpt-4",
  "providerCount": 3,
  "providers": [
    {
      "providerId": "abc-123",
      "actualModel": "claude-sonnet-4-5",
      "priority": 1,
      "weight": 1.5
    },
    {
      "providerId": "def-456",
      "actualModel": "claude-sonnet-4-5",
      "priority": 1,
      "weight": 1.0
    },
    {
      "providerId": "ghi-789",
      "actualModel": "claude-opus-4-5",
      "priority": 2,
      "weight": 1.0
    }
  ]
}
```

```json
{
  "level": "info",
  "message": "Server selected",
  "serverId": "abc-123",
  "serverName": "Primary Provider",
  "requestedModel": "gpt-4",
  "actualModel": "claude-sonnet-4-5",
  "isCustomModel": true,
  "availableProviders": 3,
  "serverPriority": 1,
  "serverWeight": 1.5,
  "reason": "multi_provider_rotation"
}
```

## Health-Based Auto-Failover

The system automatically:
- ✅ Monitors provider health (healthy, degraded, unhealthy)
- ✅ Excludes unhealthy providers from selection
- ✅ Automatically fails over to backup providers
- ✅ Returns to primary when it becomes healthy again

Health status is updated based on:
- Error rate: < 5% = healthy, 5-20% = degraded, > 20% = unhealthy
- Response time
- Connection failures

## Best Practices

### 1. Start with Simple Failover
```javascript
// Good starting point
Priority 1: Primary provider
Priority 2: Backup provider
```

### 2. Use Same Priority for Load Balancing
```javascript
// All at priority 1 = traffic distributed by weight
Priority 1, Weight 1.5: Provider A
Priority 1, Weight 1.0: Provider B
```

### 3. Different Priorities for Tiering
```javascript
// Clear failover tiers
Priority 1: Production-grade providers
Priority 2: Standard providers
Priority 3: Budget/fallback providers
```

### 4. Monitor Provider Performance
- Check usage logs to see which providers are being used
- Adjust weights based on performance and cost
- Use health metrics to identify problematic providers

### 5. Test Failover Behavior
- Temporarily mark a provider as unhealthy to test failover
- Verify backup providers can handle the load
- Monitor response times during failover

## Troubleshooting

### All Providers Unavailable

**Error**: `Model "gpt-4" is configured but no healthy providers are available`

**Solution**:
- Check provider health status in admin panel
- Verify provider URLs are correct and accessible
- Check provider API keys are valid

### Traffic Not Distributing as Expected

**Issue**: One provider getting all traffic

**Solution**:
- Verify providers have **same priority** for load balancing
- Check that all providers are marked as `is_active: true`
- Ensure providers are healthy (not unhealthy status)
- Review weight ratios

### Duplicate Mapping Error

**Error**: `duplicate key value violates unique constraint`

**Solution**: You're trying to map the same custom model to the same provider twice. Each (custom_name, provider_id) pair must be unique.

## API Reference

### List Multi-Provider Mappings

```bash
curl http://localhost:3000/api/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Response shows which models have multiple providers:

```json
{
  "data": [
    {
      "id": "gpt-4",
      "providers": ["Provider 1", "Provider 2"],
      "provider_count": 2
    }
  ]
}
```

## Migration

To enable multi-provider support on existing database:

```bash
# Apply the migration
npx supabase db push

# Or manually run:
psql -d your_database -f supabase/migrations/007_multi_provider_models.sql
```

This migration:
- ✅ Removes UNIQUE constraint on `custom_name`
- ✅ Adds `priority` and `weight` columns
- ✅ Adds UNIQUE constraint on `(custom_name, provider_id)` pair
- ✅ Preserves existing data

## Support

For issues or questions:
1. Check logs for detailed routing information
2. Verify provider health in admin panel
3. Test individual providers separately
4. Review this guide for configuration best practices

---

**Next Steps**:
1. Apply the migration: `supabase/migrations/007_multi_provider_models.sql`
2. Run the setup script: `node scripts/setup-multi-provider-model.mjs`
3. Create your first multi-provider mapping
4. Monitor the logs to see it in action
