# Model Pricing Management Guide

## 🚨 Critical: How Model Names Work for Pricing

**IMPORTANT:** The system uses the model name the **USER sends** in their request for pricing lookup, NOT the resolved provider model name.

### Example:
- User sends: `{ "model": "my-chatbot" }`
- System resolves to: `claude-sonnet-4.5` (sends to provider)
- Usage is logged as: `my-chatbot`
- **Pricing lookup uses: `my-chatbot`** ← NOT `claude-sonnet-4.5`

### What This Means:
You need pricing entries for **BOTH**:
1. ✅ Provider model names (e.g., `claude-sonnet-4.5`) - for direct API calls
2. ✅ Custom model names (e.g., `my-chatbot`) - for custom mappings

📖 **Read [CUSTOM_MODEL_PRICING_EXPLAINED.md](./CUSTOM_MODEL_PRICING_EXPLAINED.md) for detailed explanation**

## Overview

Your AI Gateway supports **hybrid pricing**: token-based (accurate) + per-request (fallback). The system automatically uses token-based pricing when available and falls back to per-request pricing when tokens aren't provided.

## Real Production Costs (January 2026)

### Anthropic Claude

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Typical Per Request* |
|-------|----------------------|------------------------|---------------------|
| claude-opus-4.5 | $15.00 | $75.00 | ~$0.0525 |
| claude-sonnet-4.5 | $3.00 | $15.00 | ~$0.0105 |
| claude-haiku-4 | $0.25 | $1.25 | ~$0.00088 |
| claude-3-opus | $15.00 | $75.00 | ~$0.0525 |
| claude-3-sonnet | $3.00 | $15.00 | ~$0.0105 |
| claude-3-haiku | $0.25 | $1.25 | ~$0.00088 |

*Assuming 1000 input + 500 output tokens per request

### OpenAI

| Model | Input (per 1K tokens) | Output (per 1K tokens) | Typical Per Request* |
|-------|----------------------|------------------------|---------------------|
| GPT-4 Turbo | $0.01 | $0.03 | ~$0.025 |
| GPT-4o | $0.005 | $0.015 | ~$0.0125 |
| GPT-3.5 Turbo | $0.0005 | $0.0015 | ~$0.0013 |

### Google Gemini

| Model | Input (per 1K tokens) | Output (per 1K tokens) | Typical Per Request* |
|-------|----------------------|------------------------|---------------------|
| gemini-1.5-pro | $0.00125 | $0.005 | ~$0.00375 |
| gemini-1.5-flash | $0.000125 | $0.0005 | ~$0.00038 |

## What I've Done

✅ **Updated `lib/config/app.ts`**
   - Added real production costs for all models
   - Added Claude 4.5 variants (20251101, 20251001, etc.)
   - Documented pricing source and date

✅ **Created sync script**
   - `scripts/sync-model-pricing-production.mjs`
   - Syncs database with real production costs
   - Calculates per-request costs automatically

## How to Use

### Option 1: Run the Sync Scripts (Fastest)

#### Step 1: Sync Provider Model Pricing
```bash
# Sync standard provider models (claude-sonnet-4.5, gpt-4-turbo, etc.)
node scripts/sync-model-pricing-production.mjs
```

This will:
- Update all provider model pricing with real production costs
- Calculate per-request costs (assuming 1K input + 500 output tokens)
- Store both per-request and per-token pricing
- Mark all models as active

#### Step 2: Sync Custom Model Pricing
```bash
# Copy pricing from provider models to your custom model names
node scripts/sync-custom-model-pricing.mjs
```

This will:
- Find all custom model mappings
- Copy pricing from actual provider models to custom names
- Create pricing entries for user-facing custom names
- Report any missing base pricing

**Why both scripts?**
- Script 1 adds pricing for: `claude-sonnet-4.5`, `gpt-4-turbo`, etc.
- Script 2 adds pricing for: `my-chatbot`, `prod-assistant`, etc.
- Users can call either name, so you need both!

### Option 2: Via Admin UI

1. **Navigate to Admin Panel**
   ```
   http://localhost:3000/admin/model-pricing
   ```

2. **Sync Available Models**
   - Click "Sync Models" button
   - System discovers all models from your LiteLLM servers
   - Shows models with/without pricing

3. **Import Missing Models**
   - Set a default price (e.g., $0.005)
   - Select models to import
   - Click "Import Selected"

4. **Edit Individual Models**
   - Click edit icon on any model
   - Update pricing fields:
     - Price per request
     - Input tokens per 1K
     - Output tokens per 1K
   - Toggle active/inactive status

### Option 3: Manual Database Update

If you prefer direct database access:

```sql
-- Update a specific model
UPDATE model_pricing
SET
  price_per_request = 0.0105,
  price_per_1k_input_tokens = 0.003,
  price_per_1k_output_tokens = 0.015,
  notes = 'Real production costs (Jan 2026)'
WHERE model_name = 'claude-sonnet-4.5';

-- Add a new model
INSERT INTO model_pricing (
  model_name,
  price_per_request,
  price_per_1k_input_tokens,
  price_per_1k_output_tokens,
  provider,
  is_custom,
  is_active
) VALUES (
  'claude-opus-4-5-20251101',
  0.0525,
  0.015,
  0.075,
  'anthropic',
  false,
  true
);
```

## Pricing Strategy

### Hybrid Cost Calculation

The system uses a smart hybrid approach (see `lib/gateway/usage-tracker.ts`):

```typescript
// If tokens available: Use accurate token-based pricing
if (promptTokens > 0 || completionTokens > 0) {
  cost = (promptTokens / 1000) * inputCost + (completionTokens / 1000) * outputCost
}
// Otherwise: Fall back to per-request pricing
else {
  cost = perRequestCost
}
```

### Benefits

✅ **Accurate** - Uses real token counts when available
✅ **Reliable** - Falls back to per-request when tokens missing
✅ **Flexible** - Supports both pricing models
✅ **Transparent** - Logs token source (actual/estimated/unknown)

## Adding New Models

### 1. Add to Config File

Edit `lib/config/app.ts`:

```typescript
// Add to modelPricing object
'new-model-name': { input: 0.003, output: 0.015 }

// Add to modelPricingRequests object
'new-model-name': 0.008
```

### 2. Add to Sync Script

Edit `scripts/sync-model-pricing-production.mjs`:

```javascript
const PRODUCTION_PRICING = {
  // ... existing models
  'new-model-name': {
    input: 0.003,
    output: 0.015,
    provider: 'anthropic'
  },
}
```

### 3. Run Sync

```bash
node scripts/sync-model-pricing-production.mjs
```

## Monitoring Costs

### Via Dashboard

Navigate to `/dashboard` to view:
- Total requests
- Total cost
- Cost per model
- Token usage trends

### Via API

```bash
# Get usage stats
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-gateway.com/api/admin/analytics
```

## Best Practices

### 1. Regular Price Updates

✅ Check provider pricing pages monthly
✅ Run sync script after price changes
✅ Notify users of significant cost changes

### 2. Per-Request Calculation

The sync script uses this formula:
```
per_request_cost = (1000 tokens * input_cost) + (500 tokens * output_cost)
```

Adjust if your typical usage differs:
- Edit `TYPICAL_INPUT_TOKENS` in the script
- Edit `TYPICAL_OUTPUT_TOKENS` in the script

### 3. Cost Alerts

Set up alerts for:
- Daily spend > threshold
- Unusual usage patterns
- New expensive models being used

### 4. Model Testing

Before updating production:
1. Test new pricing in staging
2. Verify calculations are correct
3. Check billing accuracy

## Troubleshooting

### Models Missing from UI

**Problem**: Models don't appear in `/admin/model-pricing`

**Solution**:
1. Check if models are in `litellm_servers.supported_models`
2. Verify models are active (`is_active = true`)
3. Click "Sync Models" to refresh

### Incorrect Costs

**Problem**: Costs don't match provider pricing

**Solution**:
1. Check token counts in `usage_logs` table
2. Verify `token_source` field (should be 'actual' not 'estimated')
3. Recalculate costs:
   ```sql
   SELECT
     model,
     prompt_tokens,
     completion_tokens,
     cost_usd,
     (prompt_tokens / 1000.0 * 0.003) + (completion_tokens / 1000.0 * 0.015) as calculated_cost
   FROM usage_logs
   WHERE model = 'claude-sonnet-4.5'
   LIMIT 10;
   ```

### Default Pricing Used

**Problem**: All requests use default pricing ($0.005)

**Solution**:
1. Check if model exists in `model_pricing` table
2. Add model via sync script or admin UI
3. Verify model name matches exactly (case-sensitive)

## Database Schema

```sql
-- model_pricing table
CREATE TABLE model_pricing (
  id uuid PRIMARY KEY,
  model_name text UNIQUE NOT NULL,
  price_per_request numeric NOT NULL,
  price_per_1k_input_tokens numeric,
  price_per_1k_output_tokens numeric,
  provider text NOT NULL,
  is_custom boolean DEFAULT false,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Quick Reference

### File Locations

| What | Where |
|------|-------|
| Token pricing config | `lib/config/app.ts` |
| Cost calculation | `lib/gateway/usage-tracker.ts` |
| Admin UI | `app/admin/model-pricing/page.tsx` |
| API routes | `app/api/admin/model-pricing/route.ts` |
| Sync script | `scripts/sync-model-pricing-production.mjs` |
| Documentation | `content/docs/guides/models.mdx` |

### Commands

```bash
# Sync pricing with production costs
node scripts/sync-model-pricing-production.mjs

# View current pricing in DB
psql $DATABASE_URL -c "SELECT model_name, price_per_request, provider FROM model_pricing ORDER BY provider, model_name;"

# Export pricing to CSV
psql $DATABASE_URL -c "COPY (SELECT * FROM model_pricing) TO STDOUT CSV HEADER;" > pricing-backup.csv
```

## Next Steps

1. ✅ Run the sync script to update your database
2. ✅ Visit `/admin/model-pricing` to verify changes
3. ✅ Test with a few API requests
4. ✅ Monitor costs in `/dashboard`
5. 📅 Set calendar reminder to check pricing monthly

## Support

For questions or issues:
- Check usage logs: `/dashboard/logs`
- View analytics: `/admin/analytics`
- Review documentation: `/docs/guides/models`

---

**Last Updated**: January 2026
**Source**: Provider pricing pages (Anthropic, OpenAI, Google)
