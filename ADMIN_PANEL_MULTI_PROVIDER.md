# Admin Panel Multi-Provider Configuration Guide

## Overview

The admin panel now fully supports configuring multi-provider model mappings with auto-rotation. You can manage everything through the UI without writing SQL or scripts.

## Accessing the Admin Panel

1. Navigate to: `http://localhost:3000/admin`
2. Log in with admin credentials
3. Click on **"Models"** in the sidebar

## Features

### 1. Multi-Provider Dashboard

**Stats Cards:**
- **Total Mappings**: Count of all provider-model mappings
- **Unique Models**: Number of distinct custom model names
- **Active Mappings**: Currently active mappings
- **Multi-Provider**: Models mapped to multiple providers (shows GitBranch icon)

### 2. Model Mappings Table

Displays all mappings with:
- **Custom Name**: What users specify in API calls
- **Provider**: LiteLLM server name + health status badge
- **Actual Model**: Provider-specific model name
- **Priority**: Failover/tier level (blue badge)
- **Weight**: Traffic distribution (purple badge)
- **Status**: Active/Inactive
- **Actions**: Toggle, Edit, Delete

### 3. Add/Edit Model Mapping Form

Fields:
- **Custom Name**: The unified name users will use (e.g., "my-model")
- **Display Name**: Human-readable name for display
- **Provider**: Select from available LiteLLM servers
- **Actual Model Name**: Provider-specific model (e.g., "claude-sonnet-4-5", "gpt-4-turbo")
- **Description**: Optional notes
- **Priority** (1-1000): Lower = higher priority
  - Hint: "Lower = higher priority (failover tiers)"
- **Weight** (0.1-10.0): Traffic distribution
  - Hint: "Higher = more traffic at same priority"
- **Active**: Enable/disable this mapping

**Form includes helpful tips:**
- Same custom name + different providers = auto-rotation
- Same priority = load balancing by weight
- Different priority = failover tiers

## Usage Examples

### Example 1: Create Primary + Backup Setup

1. Click **"Add Custom Model"**

2. **First Mapping (Primary):**
   ```
   Custom Name: my-unified-model
   Display Name: My Unified Model
   Provider: Primary LiteLLM Server
   Actual Model Name: claude-sonnet-4-5
   Priority: 1
   Weight: 1.0
   Active: ✓
   ```

3. Click **"Create Model"**

4. Click **"Add Custom Model"** again

5. **Second Mapping (Backup):**
   ```
   Custom Name: my-unified-model  (same name!)
   Display Name: My Unified Model
   Provider: Backup LiteLLM Server
   Actual Model Name: gpt-4-turbo
   Priority: 2
   Weight: 1.0
   Active: ✓
   ```

6. Click **"Create Model"**

**Result:** "my-unified-model" will use Primary (Claude) first, fail over to Backup (GPT-4) if primary is unhealthy.

### Example 2: Create Load-Balanced Setup (60/40)

1. **First Provider (60% traffic):**
   ```
   Custom Name: balanced-model
   Provider: Provider A
   Actual Model Name: claude-sonnet-4-5
   Priority: 1
   Weight: 1.5
   ```

2. **Second Provider (40% traffic):**
   ```
   Custom Name: balanced-model  (same name!)
   Provider: Provider B
   Actual Model Name: deepseek-chat
   Priority: 1  (same priority = load balance!)
   Weight: 1.0
   ```

**Result:** Traffic splits 60% to Provider A (1.5/(1.5+1.0)), 40% to Provider B.

### Example 3: Multi-Tier Failover

1. **Tier 1 - Premium:**
   ```
   Custom Name: smart-model
   Provider: Premium Provider
   Actual Model Name: claude-opus-4-5
   Priority: 1
   Weight: 1.0
   ```

2. **Tier 2 - Standard:**
   ```
   Custom Name: smart-model
   Provider: Standard Provider
   Actual Model Name: claude-sonnet-4-5
   Priority: 2
   Weight: 1.0
   ```

3. **Tier 3 - Budget:**
   ```
   Custom Name: smart-model
   Provider: Budget Provider
   Actual Model Name: deepseek-chat
   Priority: 3
   Weight: 1.0
   ```

**Result:** Uses Opus by default → falls back to Sonnet → falls back to DeepSeek.

## Visual Indicators

### Priority Badges (Blue)
- Shows the priority number
- Lower numbers appear first in the list
- Models with priority 1 are tried before priority 2

### Weight Badges (Purple)
- Shows the weight multiplier (e.g., "1.5×")
- Higher values get more traffic
- Only matters when priorities are equal

### Health Status Badges
- **Green**: Healthy provider
- **Yellow**: Degraded provider
- **Red**: Unhealthy provider

### Status Badges
- **Green with checkmark**: Active mapping
- **Gray with X**: Inactive mapping

## Table Organization

The table is ordered by:
1. **Custom Name** (alphabetical)
2. **Priority** (ascending - lower first)
3. **Weight** (descending - higher first)

This makes it easy to see multi-provider setups grouped together.

## Managing Mappings

### Edit a Mapping
1. Click the edit icon (pencil) in the Actions column
2. Modify any fields
3. Click "Update Model"

### Toggle Active/Inactive
1. Click the toggle icon in the Actions column
2. Mapping immediately activates/deactivates
3. Inactive mappings are excluded from rotation

### Delete a Mapping
1. Click the delete icon (trash) in the Actions column
2. Confirm deletion
3. Mapping is permanently removed

## Testing Your Configuration

After setting up multi-provider mappings:

1. **Check the Stats:**
   - Multi-Provider card should show models with multiple mappings

2. **Make API Requests:**
   ```bash
   curl http://localhost:3000/v1/chat/completions \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "model": "my-unified-model",
       "messages": [{"role": "user", "content": "Hello"}]
     }'
   ```

3. **Monitor Logs:**
   - Look for "Custom model resolved with multiple providers"
   - Check which provider was selected
   - Verify rotation is working

4. **Test Failover:**
   - Temporarily deactivate the primary provider
   - Confirm requests automatically route to backup

## Best Practices

### Priority Configuration
- **Priority 1**: Primary/production providers
- **Priority 2**: Backup providers
- **Priority 3**: Emergency fallback providers

### Weight Configuration
- **Equal weights (1.0)**: Even distribution
- **Higher weights (1.5-2.0)**: More traffic to better/cheaper providers
- **Lower weights (0.5)**: Limited traffic for testing

### Naming Conventions
- Use clear, descriptive custom names
- Keep display names consistent across providers
- Add descriptions to explain the strategy

### Health Monitoring
- Regularly check provider health status
- Keep at least one healthy provider per priority level
- Consider disabling consistently unhealthy providers

## Troubleshooting

### "No models available" error
- Check at least one mapping is **Active**
- Verify provider is **Active** and **Healthy**
- Check provider health in Providers page

### Traffic not distributing as expected
- Confirm providers have **same priority** for load balancing
- Verify **weights** are set correctly
- Check if some providers are unhealthy (auto-excluded)

### Duplicate mapping error
- Each (Custom Name + Provider) pair must be unique
- You can't map the same model to the same provider twice
- Edit existing mapping instead

## Advanced Configuration

### Geographic Distribution
Set weights based on expected traffic from regions:
```
US Provider: priority 1, weight 2.0 (50%)
EU Provider: priority 1, weight 1.5 (37.5%)
Asia Provider: priority 1, weight 0.5 (12.5%)
```

### Cost Optimization
Use priority tiers with cost in mind:
```
Cheap Model: priority 1, weight 3.0
Mid-tier Model: priority 1, weight 1.0
Premium Model: priority 2, weight 1.0 (backup only)
```

### A/B Testing
Split traffic evenly to test different models:
```
Model A: priority 1, weight 1.0 (50%)
Model B: priority 1, weight 1.0 (50%)
```

## Summary

✅ **No code required** - Configure everything through UI
✅ **Visual feedback** - Color-coded badges and health indicators
✅ **Flexible strategies** - Support for failover, load balancing, and hybrid
✅ **Real-time updates** - Changes take effect immediately
✅ **Safe management** - Confirmation dialogs prevent accidents

The admin panel makes it easy to configure sophisticated multi-provider routing without touching the database or writing scripts!
