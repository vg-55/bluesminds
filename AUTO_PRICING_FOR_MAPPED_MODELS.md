# Automatic Pricing for Mapped Models

## Overview
The Model Pricing Management system now automatically creates and manages pricing entries when you create custom model mappings. This eliminates the manual step of adding pricing for each mapped model.

## How It Works

### When You Create a Custom Model Mapping
When you create a custom model mapping in the **Models** admin section (e.g., `my-gpt4` → `gpt-4-turbo`):

1. **Auto-creates pricing entry** for `my-gpt4`
2. **Sets default pricing** to $0.005/request
3. **Detects provider** from the actual model name
4. **Marks as custom** (`is_custom=true`) so it appears in Model Pricing Management
5. **Adds a note** explaining it was auto-created

### When You Update a Custom Model
- **Deactivate mapping** → Auto-deactivates its pricing
- **Activate mapping** → Auto-activates its pricing

### When You Delete a Custom Model
- **Deletes auto-created pricing** (only if it has the auto-created note)
- **Preserves manual pricing** (if you edited it)

## What You See in Model Pricing Management

The Model Pricing page now shows **only**:
1. ✅ **Active custom model mappings** (from `custom_models.custom_name`)
2. ✅ **Models marked as custom** (from `model_pricing.is_custom=true`)

This filtered view keeps the UI clean and focused on your actual mapped/custom models.

## Usage Examples

### Example 1: Create Your First Custom Model
1. Go to **Admin → Models**
2. Click "Add Model"
3. Create mapping: `my-claude` → `claude-3-5-sonnet-20241022`
4. Go to **Admin → Model Pricing**
5. ✨ **You'll see `my-claude` automatically!**
6. Click Edit to adjust the pricing from the default $0.005/request

### Example 2: Sync Existing Custom Models
If you already have custom model mappings without pricing:

```bash
node scripts/sync-custom-model-pricing.mjs
```

This script will:
- Find all active custom model mappings
- Create pricing entries for any without pricing
- Use default $0.005/request pricing

### Example 3: Mark Seed Models as Custom
To show the built-in seed models (gpt-4, claude-3, etc.) in the pricing UI:

```bash
node scripts/mark-seed-models-custom.mjs
```

This will mark seed models as `is_custom=true` so they appear in the filtered view.

## Files Changed

### Backend
- **`app/api/admin/models/route.ts`**
  - POST: Auto-creates pricing when custom model is created
  - PATCH: Auto-updates pricing status when model is activated/deactivated
  - DELETE: Auto-deletes pricing when custom model is deleted

- **`app/api/admin/model-pricing/route.ts`**
  - GET: Filters to show only mapped/custom models

- **`app/api/admin/model-pricing/sync/route.ts`**
  - GET: Only syncs custom/mapped models (no longer pulls all server models)

### Frontend
- **`app/admin/model-pricing/page.tsx`**
  - Updated description text
  - Added informational notice about filtering

### Scripts
- **`scripts/sync-custom-model-pricing.mjs`** - Sync pricing for existing mappings
- **`scripts/mark-seed-models-custom.mjs`** - Mark seed models as custom
- **`supabase/migrations/20260110_000002_mark_seed_models_custom.sql`** - Migration for seed models

## Benefits

✅ **No manual work** - Pricing auto-created when you create mappings
✅ **Clean UI** - Only see relevant models, not all possible models
✅ **Automatic sync** - Pricing status follows model status
✅ **Safe deletion** - Only deletes auto-created pricing, preserves manual edits
✅ **Default pricing** - Always starts with sensible $0.005/request default

## Configuration

### Default Pricing
The default price per request is **$0.005** (0.5 cents per request).

To change this, edit the value in:
- `app/api/admin/models/route.ts` line ~140

### Provider Detection
Providers are auto-detected from the actual model name:
- `gpt-4-turbo` → `openai`
- `claude-3-opus` → `anthropic`
- `gemini-pro` → `google`
- etc.

See `extractProviderFromModel()` function for full logic.

## Troubleshooting

### No models shown in Model Pricing Management?
**Cause**: You don't have any custom model mappings or custom pricing entries.

**Solution**:
1. Create custom model mappings in **Admin → Models**, OR
2. Run `node scripts/mark-seed-models-custom.mjs` to show seed models

### Custom model created but no pricing visible?
**Cause**: The pricing was created but model might be inactive, or there was an error.

**Solution**:
1. Check if custom model is active in Models section
2. Run `node scripts/sync-custom-model-pricing.mjs` to sync
3. Check browser console for errors

### Want to show ALL models (not just mapped/custom)?
**Solution**: This is by design for a cleaner UI. If you need to see all models:
- The filter can be temporarily disabled by commenting out the filtering logic in `app/api/admin/model-pricing/route.ts` lines 68-91

## Migration Path

If you had the old system:
1. Run `node scripts/sync-custom-model-pricing.mjs` to create pricing for existing mappings
2. Run `node scripts/mark-seed-models-custom.mjs` if you want seed models visible
3. All future custom models will auto-create pricing ✨

## Notes

- Auto-created pricing entries have `notes` field starting with "Auto-created for custom model mapping"
- Only auto-created entries are deleted when removing mappings
- Manual pricing entries (added via UI) are preserved even if you delete the mapping
- Default pricing can be edited in the UI after creation
