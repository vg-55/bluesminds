# Integration Guide for AI Coding Tools

This guide explains how to use BluesMinds AI Gateway with popular AI coding tools like Kilocode, Roo Code, and other OpenAI-compatible tools.

## Prerequisites

1. **Server Running**: Make sure your gateway is running
   ```bash
   pnpm dev
   ```

2. **API Key**: Create an API key from your dashboard
   - Visit: http://localhost:3000/dashboard/keys
   - Click "Create API Key"
   - Save the key immediately (it won't be shown again)

3. **Models Configured**: Ensure you have custom models set up
   - Visit: http://localhost:3000/admin/models
   - Add model mappings (e.g., gpt-4 → your actual model)

## Testing Your Setup

Before configuring any tools, verify your endpoint works:

```bash
node test-models-endpoint.mjs <your-api-key>
```

This should show you:
- ✅ Your available models
- ✅ The correct configuration settings
- ❌ Any errors that need fixing

## Configuration Settings

### For Kilocode, Roo Code, Continue, and similar tools:

```
Base URL: http://localhost:3000/api
API Key:  gw_your_key_here
Model:    gpt-4 (or any model from your /v1/models list)
```

### For Cursor IDE:

1. Open Settings → Models
2. Add OpenAI-compatible provider:
   - Base URL: `http://localhost:3000/api`
   - API Key: `gw_your_key_here`
3. Select model from dropdown

### For VSCode with Continue extension:

Edit `.continue/config.json`:

```json
{
  "models": [
    {
      "title": "GPT-4 via BluesMinds",
      "provider": "openai",
      "model": "gpt-4",
      "apiBase": "http://localhost:3000/api",
      "apiKey": "gw_your_key_here"
    }
  ]
}
```

## Common Issues and Solutions

### Issue 1: "Failed to get list of model names"

**Cause**: No models configured or authentication failure

**Solution**:
1. Check that you have custom models: http://localhost:3000/admin/models
2. Verify API key is valid: http://localhost:3000/dashboard/keys
3. Test endpoint: `node test-models-endpoint.mjs <your-api-key>`

### Issue 2: "Authentication failed"

**Cause**: Invalid API key or incorrect format

**Solution**:
1. Create a new API key from dashboard
2. Copy it immediately (shown only once)
3. Ensure you're using the full key starting with `gw_`
4. Some tools require `Bearer ` prefix, others don't (both formats are supported)

### Issue 3: "Model not found"

**Cause**: Tool is requesting a model name that doesn't exist in your custom models

**Solution**:
1. Check available models: `curl -H "Authorization: Bearer <key>" http://localhost:3000/api/v1/models`
2. Add missing model mappings in admin panel
3. Common models to add:
   - `gpt-4` → claude-sonnet-4-5-20250929
   - `gpt-4-turbo` → claude-sonnet-4-5-20250929
   - `gpt-3.5-turbo` → claude-3-5-sonnet-20241022
   - `claude-3-opus` → claude-opus-4.5
   - `deepseek-chat` → openai/deepseek-v3-1-250821

### Issue 4: "Connection refused" or "CORS error"

**Cause**: Server not running or CORS misconfiguration

**Solution**:
1. Ensure server is running: `pnpm dev`
2. Check server logs for CORS errors
3. In development, all origins are allowed by default
4. For production, set `ALLOWED_ORIGINS` in `.env`

### Issue 5: Empty model list

**Cause**: No custom models configured in database

**Solution**:
```bash
# Quick fix: Add common model mappings
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'your-supabase-url',
  'your-supabase-key'
);

const SERVER_ID = 'your-server-id';

const commonModels = [
  { custom: 'gpt-4', actual: 'claude-sonnet-4-5-20250929' },
  { custom: 'gpt-4-turbo', actual: 'claude-sonnet-4-5-20250929' },
  { custom: 'gpt-3.5-turbo', actual: 'claude-3-5-sonnet-20241022' },
];

(async () => {
  for (const model of commonModels) {
    await supabase.from('custom_models').insert({
      custom_name: model.custom,
      provider_id: SERVER_ID,
      actual_model_name: model.actual,
      display_name: model.custom,
      is_active: true,
    });
  }
  console.log('Models added!');
})();
"
```

## Verifying Your Setup

### 1. Check Models Endpoint

```bash
curl -H "Authorization: Bearer <your-key>" \
     http://localhost:3000/api/v1/models | jq
```

Expected response:
```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4",
      "object": "model",
      "created": 1704403200,
      "owned_by": "blueminds"
    },
    ...
  ]
}
```

### 2. Test Chat Completions

```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer <your-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 3. Check Logs

Monitor server logs for any errors:
```bash
# In your terminal where pnpm dev is running
# Look for lines like:
# [INFO] Models endpoint called
# [INFO] Models list retrieved successfully
```

## Production Deployment

When deploying to production:

1. **Use HTTPS**: Always use HTTPS for production
2. **Set Environment Variables**:
   ```
   ALLOWED_ORIGINS=https://your-domain.com
   NODE_ENV=production
   ```
3. **Update Tool Configuration**:
   ```
   Base URL: https://your-domain.com/api
   ```

## Need Help?

- Check server logs for detailed error messages
- Run the test script: `node test-models-endpoint.mjs <key>`
- Verify database has custom models configured
- Ensure API key has correct scopes (models, chat.completions)

## Example: Full Kilocode Configuration

1. Open Kilocode Settings
2. Select "Custom OpenAI Provider"
3. Enter:
   - **API Endpoint**: `http://localhost:3000/api`
   - **API Key**: `gw_InoS_abcdef123456...`
   - **Model**: `gpt-4`
4. Test connection
5. Start coding!

The gateway will automatically route your requests to the configured backend models while maintaining OpenAI API compatibility.
