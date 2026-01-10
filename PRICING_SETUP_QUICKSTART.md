# Pricing Setup - Quick Start

## 🚀 TL;DR - Get Started in 2 Steps

```bash
# Step 1: Sync provider model pricing (claude-sonnet-4.5, gpt-4-turbo, etc.)
node scripts/sync-model-pricing-production.mjs

# Step 2: Sync custom model pricing (your custom names)
node scripts/sync-custom-model-pricing.mjs
```

Done! Your pricing is now configured. ✨

## 📚 Understanding the System

### The Critical Concept

**Pricing uses the model name the USER sends, not what the system resolves it to.**

```
User Request          Usage Logged       Pricing Lookup
┌─────────────┐       ┌─────────────┐    ┌─────────────┐
│ my-chatbot  │  →    │ my-chatbot  │ →  │ my-chatbot  │
└─────────────┘       └─────────────┘    └─────────────┘
      ↓
System Resolves
┌─────────────────┐
│ claude-sonnet   │  (sent to LiteLLM)
└─────────────────┘
```

### What You Need

| If users send... | You need pricing for... |
|-----------------|------------------------|
| `claude-sonnet-4.5` (direct) | `claude-sonnet-4.5` |
| `my-chatbot` (custom) | `my-chatbot` |
| Both | BOTH entries |

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `scripts/sync-model-pricing-production.mjs` | Sync standard provider models |
| `scripts/sync-custom-model-pricing.mjs` | Sync your custom model names |
| `MODEL_PRICING_GUIDE.md` | Complete pricing management guide |
| `CUSTOM_MODEL_PRICING_EXPLAINED.md` | Deep dive into how it works |

## 🎯 Common Scenarios

### Scenario 1: Only Using Provider Model Names
Users call: `claude-sonnet-4.5`, `gpt-4-turbo` directly

**Setup:**
```bash
node scripts/sync-model-pricing-production.mjs
```
✅ Done!

### Scenario 2: Using Custom Model Names
Users call: `my-chatbot`, `prod-assistant`

**Setup:**
```bash
# 1. Sync provider pricing first (base prices)
node scripts/sync-model-pricing-production.mjs

# 2. Create custom model mappings (via admin UI)
# Visit: /admin/models

# 3. Sync custom model pricing
node scripts/sync-custom-model-pricing.mjs
```
✅ Done!

### Scenario 3: Both Direct and Custom
Some users call `claude-sonnet-4.5`, others call `my-chatbot`

**Setup:**
```bash
# Sync both!
node scripts/sync-model-pricing-production.mjs
node scripts/sync-custom-model-pricing.mjs
```
✅ Done!

## 🔍 Quick Verification

### Check Current Pricing
```bash
# View all pricing entries
psql $DATABASE_URL -c "
  SELECT
    model_name,
    price_per_request,
    provider,
    is_custom
  FROM model_pricing
  ORDER BY is_custom, provider, model_name;
"
```

### Check Custom Mappings
```bash
# View custom model mappings
psql $DATABASE_URL -c "
  SELECT
    custom_name,
    actual_model_name,
    provider_id
  FROM custom_models
  WHERE is_active = true;
"
```

### Check What's Missing
```bash
# Find custom models without pricing
psql $DATABASE_URL -c "
  SELECT cm.custom_name, cm.actual_model_name
  FROM custom_models cm
  LEFT JOIN model_pricing mp ON cm.custom_name = mp.model_name
  WHERE cm.is_active = true AND mp.model_name IS NULL;
"
```

## 🎨 Admin UI

Alternative to scripts - use the web interface:

1. **Provider Models**: `/admin/model-pricing`
   - Click "Sync Models"
   - Select models to import
   - Set prices manually if needed

2. **Custom Models**: `/admin/models`
   - Create custom model mappings
   - Then run: `node scripts/sync-custom-model-pricing.mjs`

## 💰 Real Production Costs

| Provider | Model | Per Request* |
|----------|-------|--------------|
| Anthropic | claude-opus-4.5 | $0.0525 |
| Anthropic | claude-sonnet-4.5 | $0.0105 |
| Anthropic | claude-haiku-4 | $0.00088 |
| OpenAI | gpt-4-turbo | $0.025 |
| OpenAI | gpt-4o | $0.0125 |
| Google | gemini-1.5-pro | $0.00375 |

*Based on 1K input + 500 output tokens

## 🔧 Troubleshooting

### "My requests use default pricing ($0.005)"

**Cause:** No pricing entry for the model name users are sending

**Fix:**
```bash
# Check what model names are being used
psql $DATABASE_URL -c "
  SELECT model, COUNT(*)
  FROM usage_logs
  WHERE created_at > NOW() - INTERVAL '1 day'
  GROUP BY model
  ORDER BY count DESC;
"

# Add missing pricing
node scripts/sync-custom-model-pricing.mjs
```

### "Pricing doesn't match provider costs"

**Cause:** Old pricing data

**Fix:**
```bash
# Re-sync with latest costs
node scripts/sync-model-pricing-production.mjs
```

### "Custom model uses wrong price"

**Cause:** Custom model pricing not synced after mapping change

**Fix:**
```bash
# Re-sync custom model pricing
node scripts/sync-custom-model-pricing.mjs
```

## 📞 Next Steps

1. ✅ Run both sync scripts
2. ✅ Visit `/admin/model-pricing` to verify
3. ✅ Test with API call
4. ✅ Check `/dashboard` for accurate costs
5. 📖 Read full guides:
   - [MODEL_PRICING_GUIDE.md](./MODEL_PRICING_GUIDE.md) - Complete reference
   - [CUSTOM_MODEL_PRICING_EXPLAINED.md](./CUSTOM_MODEL_PRICING_EXPLAINED.md) - How it works

## 🎓 Remember

**One golden rule:**
> Pricing follows what the user REQUESTS, not what the system RESOLVES.

If users can call it, it needs a price! 💰
