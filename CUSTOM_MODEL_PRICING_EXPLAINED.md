# Custom Model Pricing - How It Works

## 🎯 Critical Understanding

**The system uses the model name the USER sends in their request for pricing lookup, NOT the resolved provider model name.**

## Example Scenario

### Setup
You create a custom model mapping:
```sql
INSERT INTO custom_models (custom_name, actual_model_name, provider_id)
VALUES ('my-chatbot', 'claude-sonnet-4.5', 'anthropic-server-id');
```

### What Happens

```
1. User Request
   POST /v1/chat/completions
   { "model": "my-chatbot" }
                ↓
2. Load Balancer Resolves
   "my-chatbot" → "claude-sonnet-4.5"
                ↓
3. Request to LiteLLM
   { "model": "claude-sonnet-4.5" }
                ↓
4. Response Received
   { "model": "claude-sonnet-4.5", "usage": {...} }
                ↓
5. Usage Logged With
   model: "my-chatbot"  ← IMPORTANT!
                ↓
6. Pricing Lookup
   SELECT * FROM model_pricing
   WHERE model_name = 'my-chatbot'  ← NOT 'claude-sonnet-4.5'
```

## ✅ Correct Pricing Setup

### For Standard API Calls
Users calling directly with provider model names:

```sql
-- User sends: { "model": "claude-sonnet-4.5" }
INSERT INTO model_pricing (model_name, price_per_request, provider, is_custom)
VALUES ('claude-sonnet-4.5', 0.0105, 'anthropic', false);
```

### For Custom Model Mappings
Users calling with your custom names:

```sql
-- User sends: { "model": "my-chatbot" }
INSERT INTO model_pricing (model_name, price_per_request, provider, is_custom)
VALUES ('my-chatbot', 0.0105, 'anthropic', true);
```

## 🚀 Quick Setup Scripts

### 1. Sync Standard Provider Models
```bash
# Adds pricing for all provider model names
node scripts/sync-model-pricing-production.mjs
```

This creates entries like:
- `claude-sonnet-4.5`
- `gpt-4-turbo`
- `gemini-1.5-pro`

### 2. Sync Custom Model Names
```bash
# Copies pricing from provider models to your custom names
node scripts/sync-custom-model-pricing.mjs
```

This creates entries like:
- `my-chatbot` (copies from `claude-sonnet-4.5`)
- `my-assistant` (copies from `gpt-4-turbo`)
- `fast-model` (copies from `claude-haiku-4`)

## 🎨 Real-World Examples

### Example 1: Simple Custom Name

**Setup:**
```javascript
// Custom model mapping
{
  custom_name: "prod-chatbot",
  actual_model_name: "claude-sonnet-4.5"
}
```

**Required Pricing:**
```sql
-- For users who call with "prod-chatbot"
INSERT INTO model_pricing (model_name, price_per_request)
VALUES ('prod-chatbot', 0.0105);

-- ALSO keep this for users who call directly
INSERT INTO model_pricing (model_name, price_per_request)
VALUES ('claude-sonnet-4.5', 0.0105);
```

**User Calls:**
```javascript
// Option A: Custom name
fetch('/v1/chat/completions', {
  body: { model: 'prod-chatbot' }  // Looks up 'prod-chatbot' pricing
})

// Option B: Direct name
fetch('/v1/chat/completions', {
  body: { model: 'claude-sonnet-4.5' }  // Looks up 'claude-sonnet-4.5' pricing
})
```

### Example 2: Multiple Providers for Failover

**Setup:**
```javascript
// Primary provider
{
  custom_name: "universal-gpt4",
  actual_model_name: "gpt-4-turbo",
  provider_id: "openai-primary",
  priority: 1
}

// Backup provider
{
  custom_name: "universal-gpt4",
  actual_model_name: "gpt-4-turbo",
  provider_id: "openai-backup",
  priority: 2
}
```

**Required Pricing:**
```sql
-- ONLY ONE entry needed for the custom name
INSERT INTO model_pricing (model_name, price_per_request)
VALUES ('universal-gpt4', 0.025);

-- The system doesn't care which provider handles it
-- Pricing is based on what the USER requested
```

### Example 3: Different Pricing for Same Model

**Setup:**
```javascript
// Enterprise tier
{
  custom_name: "enterprise-claude",
  actual_model_name: "claude-opus-4.5"
}

// Standard tier
{
  custom_name: "standard-claude",
  actual_model_name: "claude-sonnet-4.5"
}
```

**Required Pricing:**
```sql
-- Different pricing for different tiers
INSERT INTO model_pricing (model_name, price_per_request, notes)
VALUES
  ('enterprise-claude', 0.0625, 'Premium tier with Opus'),
  ('standard-claude', 0.0105, 'Standard tier with Sonnet');
```

## 🔍 Verification

### Check What Names Need Pricing

```sql
-- Find custom models without pricing
SELECT cm.custom_name, cm.actual_model_name
FROM custom_models cm
LEFT JOIN model_pricing mp ON cm.custom_name = mp.model_name
WHERE cm.is_active = true
  AND mp.model_name IS NULL;
```

### Check Current Pricing Coverage

```sql
-- Show all custom models and their pricing status
SELECT
  cm.custom_name,
  cm.actual_model_name,
  mp.price_per_request,
  CASE
    WHEN mp.model_name IS NOT NULL THEN '✅ Has Pricing'
    ELSE '❌ Missing Pricing'
  END as status
FROM custom_models cm
LEFT JOIN model_pricing mp ON cm.custom_name = mp.model_name
WHERE cm.is_active = true
ORDER BY status, cm.custom_name;
```

### Test Pricing Lookup

```sql
-- Test what price would be used for a request
SELECT
  model_name,
  price_per_request,
  price_per_1k_input_tokens,
  price_per_1k_output_tokens,
  provider,
  is_custom
FROM model_pricing
WHERE model_name = 'YOUR-MODEL-NAME-HERE';
```

## 📋 Step-by-Step Setup Guide

### Step 1: Add Provider Model Pricing
```bash
# Adds: claude-sonnet-4.5, gpt-4-turbo, etc.
node scripts/sync-model-pricing-production.mjs
```

### Step 2: Create Custom Model Mappings
Via Admin UI at `/admin/models` or:
```bash
curl -X POST https://your-gateway.com/api/admin/models \
  -H "Authorization: Bearer ADMIN_KEY" \
  -d '{
    "custom_name": "my-assistant",
    "actual_model_name": "claude-sonnet-4.5",
    "provider_id": "your-server-id"
  }'
```

### Step 3: Sync Custom Model Pricing
```bash
# Copies pricing from provider models to custom names
node scripts/sync-custom-model-pricing.mjs
```

### Step 4: Verify
```bash
# Check the admin UI
open http://localhost:3000/admin/model-pricing

# Or query directly
psql $DATABASE_URL -c "
  SELECT model_name, price_per_request, is_custom
  FROM model_pricing
  ORDER BY is_custom, model_name;
"
```

## ⚠️ Common Mistakes

### ❌ Wrong: Only adding provider model pricing
```sql
-- User sends: { "model": "my-chatbot" }
-- Only this exists:
INSERT INTO model_pricing VALUES ('claude-sonnet-4.5', ...);

-- Result: Falls back to default pricing ($0.005)
-- Because 'my-chatbot' is not found!
```

### ✅ Correct: Adding both
```sql
-- Add pricing for both the custom name AND provider name
INSERT INTO model_pricing VALUES ('my-chatbot', ...);
INSERT INTO model_pricing VALUES ('claude-sonnet-4.5', ...);

-- Now works for both:
-- { "model": "my-chatbot" } ✅
-- { "model": "claude-sonnet-4.5" } ✅
```

## 🎯 Best Practices

### 1. **Always Sync After Adding Custom Models**
```bash
# Whenever you add a custom model mapping, run:
node scripts/sync-custom-model-pricing.mjs
```

### 2. **Keep Provider Pricing as Source of Truth**
- Update provider model pricing first
- Then sync to custom models
- This ensures consistency

### 3. **Use Descriptive Custom Names**
```javascript
// Good
"production-chatbot-v2"
"dev-fast-model"
"enterprise-premium"

// Avoid
"model1"
"test"
"m"
```

### 4. **Monitor Usage Logs**
```sql
-- See what model names users are actually sending
SELECT
  model,
  COUNT(*) as request_count,
  SUM(cost_usd) as total_cost
FROM usage_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY model
ORDER BY request_count DESC;
```

## 🔧 Troubleshooting

### Issue: "My custom model uses default pricing"

**Diagnosis:**
```sql
-- Check if pricing exists for the custom name
SELECT * FROM model_pricing WHERE model_name = 'your-custom-name';
```

**Solution:**
```bash
# Sync custom model pricing
node scripts/sync-custom-model-pricing.mjs
```

### Issue: "Pricing is wrong after changing custom mapping"

**Cause:** Custom model pricing points to old actual model

**Solution:**
```bash
# Re-sync to update pricing based on new mappings
node scripts/sync-custom-model-pricing.mjs --update
```

Or manually update:
```sql
-- Find the correct pricing
SELECT price_per_request FROM model_pricing
WHERE model_name = 'new-actual-model';

-- Update custom model pricing
UPDATE model_pricing
SET price_per_request = 0.0105,
    notes = 'Updated after mapping change'
WHERE model_name = 'your-custom-name';
```

## 📊 Complete Example

```bash
# 1. Setup: Add LiteLLM server with Claude support
# (Via admin UI or API)

# 2. Add provider model pricing
node scripts/sync-model-pricing-production.mjs
# ✅ Creates: claude-sonnet-4.5 → $0.0105

# 3. Create custom model mapping
curl -X POST /api/admin/models -d '{
  "custom_name": "prod-assistant",
  "actual_model_name": "claude-sonnet-4.5",
  "provider_id": "anthropic-server-123"
}'

# 4. Sync custom model pricing
node scripts/sync-custom-model-pricing.mjs
# ✅ Creates: prod-assistant → $0.0105 (copied from claude-sonnet-4.5)

# 5. Test!
curl -X POST /v1/chat/completions \
  -H "Authorization: Bearer gw_xxx" \
  -d '{
    "model": "prod-assistant",
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# 6. Check usage log
psql $DATABASE_URL -c "
  SELECT model, cost_usd, token_source
  FROM usage_logs
  ORDER BY created_at DESC
  LIMIT 1;
"
# Shows: model='prod-assistant', cost_usd=0.0105
```

## 🎓 Summary

| Question | Answer |
|----------|--------|
| What name is logged? | The name the user sends (custom or provider) |
| What name is used for pricing? | The name that was logged (same as user sent) |
| What name goes to LiteLLM? | The resolved provider name (actual_model_name) |
| Do I need both names in pricing? | Yes, if you want to support both usage patterns |
| How do I sync custom pricing? | Run `sync-custom-model-pricing.mjs` |

---

**Remember:** Pricing follows the USER's perspective (what they request), not the SYSTEM's perspective (what provider handles it).
