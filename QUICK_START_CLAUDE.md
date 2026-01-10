# Quick Start: Using Claude Code Models

Get started with Claude models in under 5 minutes using the `code/` prefix naming convention.

## 1. Start LiteLLM (1 minute)

```bash
# Create config
cat > litellm-config.yaml << 'EOF'
model_list:
  - model_name: code/claude-sonnet-4-5
    litellm_params:
      model: claude-sonnet-4-5-20250929
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: code/claude-opus-4-5
    litellm_params:
      model: claude-opus-4-5-20251031
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: code/claude-haiku-4
    litellm_params:
      model: claude-haiku-4-0-20250101
      api_key: os.environ/ANTHROPIC_API_KEY
EOF

# Start with Docker
docker run -d --name litellm -p 4000:4000 \
  -v $(pwd)/litellm-config.yaml:/app/config.yaml \
  -e ANTHROPIC_API_KEY=sk-ant-your-key-here \
  ghcr.io/berriai/litellm:main-latest \
  --config /app/config.yaml
```

## 2. Add Server to BluesMinds (2 minutes)

### Via Admin Panel
1. Go to `https://your-gateway.com/admin/providers`
2. Click **Add Server**
3. Fill in:
   - Name: `Anthropic - Code Models`
   - Base URL: `http://localhost:4000` (or your LiteLLM URL)
   - Priority: `1`
   - Weight: `1.0`

### Via API
```bash
curl -X POST https://your-gateway.com/api/admin/servers \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Anthropic - Code Models",
    "base_url": "http://localhost:4000",
    "priority": 1,
    "weight": 1.0,
    "max_concurrent_requests": 100,
    "is_active": true
  }'
```

## 3. Create Model Mappings (2 minutes)

You need to create custom model mappings so users can use simple names like `code/claude-sonnet-4-5`:

### Via Admin Panel
1. Go to `/admin/models`
2. Click **Add Model Mapping**
3. Create these mappings:

| Custom Name | Actual Model Name | Description |
|-------------|-------------------|-------------|
| code/claude-sonnet-4-5 | code/claude-sonnet-4-5 | Claude Sonnet for coding |
| code/claude-opus-4-5 | code/claude-opus-4-5 | Claude Opus for complex code |
| code/claude-haiku-4 | code/claude-haiku-4 | Claude Haiku for simple tasks |

### Via Setup Script

Run the automated setup:

```bash
node scripts/setup-anthropic-provider.mjs
```

The script will create all necessary mappings automatically.

## 4. Test It Works! (30 seconds)

```bash
curl -X POST https://your-gateway.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "code/claude-sonnet-4-5",
    "messages": [
      {
        "role": "user",
        "content": "Write a hello world function in Python"
      }
    ]
  }'
```

## Example Code

### JavaScript/TypeScript

```typescript
const response = await fetch('https://your-gateway.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'code/claude-sonnet-4-5',  // Use the code/ prefix
    messages: [
      {
        role: 'user',
        content: 'Write a React component for a login form',
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

### Python

```python
import requests

response = requests.post(
    'https://your-gateway.com/v1/chat/completions',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json',
    },
    json={
        'model': 'code/claude-sonnet-4-5',
        'messages': [
            {
                'role': 'user',
                'content': 'Write a FastAPI endpoint for user authentication'
            }
        ],
        'temperature': 0.7,
        'max_tokens': 2000,
    }
)

print(response.json()['choices'][0]['message']['content'])
```

### Using OpenAI SDK

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  baseURL: 'https://your-gateway.com/v1',
});

const completion = await openai.chat.completions.create({
  model: 'code/claude-sonnet-4-5',
  messages: [
    { role: 'user', content: 'Explain async/await in JavaScript' }
  ],
});

console.log(completion.choices[0].message.content);
```

## Available Models

| Model Name | Best For | Speed | Cost |
|------------|----------|-------|------|
| `code/claude-sonnet-4-5` | General coding, recommended | ⭐⭐⭐⭐ | $$ |
| `code/claude-opus-4-5` | Complex refactoring, architecture | ⭐⭐⭐ | $$$$ |
| `code/claude-haiku-4` | Code completion, simple tasks | ⭐⭐⭐⭐⭐ | $ |

## Model Selection Guide

### Use Sonnet (code/claude-sonnet-4-5) for:
- Writing new features
- Code reviews
- Documentation generation
- Test creation
- General coding assistance

### Use Opus (code/claude-opus-4-5) for:
- Complex refactoring
- System architecture design
- Performance optimization
- Security analysis
- Large codebase understanding

### Use Haiku (code/claude-haiku-4) for:
- Code completion
- Simple bug fixes
- Code formatting
- Quick questions
- High-throughput scenarios

## Troubleshooting

### "Model not found"
1. Check LiteLLM is running: `curl http://localhost:4000/health`
2. List models: `curl http://localhost:4000/models`
3. Verify model mapping exists in `/admin/models`

### "Authentication failed"
1. Check your Anthropic API key is set: `echo $ANTHROPIC_API_KEY`
2. Restart LiteLLM after setting the key
3. Verify key at https://console.anthropic.com

### "Connection refused"
1. Check BluesMinds can reach LiteLLM:
   ```bash
   curl -v http://your-litellm-url:4000/health
   ```
2. Check firewall rules
3. Verify base URL in BluesMinds matches LiteLLM URL

## Monitoring

Check your usage:
- **Logs**: https://your-gateway.com/dashboard/logs
- **Analytics**: https://your-gateway.com/admin/analytics
- **Costs**: https://console.anthropic.com

The analytics should show:
- Provider: `anthropic`
- Model: `code/claude-sonnet-4-5`
- Token usage and costs

## Multi-Provider Setup (Optional)

For redundancy, add multiple LiteLLM instances:

```bash
# Primary
docker run -d --name litellm-primary -p 4000:4000 \
  -v $(pwd)/litellm-config.yaml:/app/config.yaml \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  ghcr.io/berriai/litellm:main-latest \
  --config /app/config.yaml

# Backup
docker run -d --name litellm-backup -p 4001:4000 \
  -v $(pwd)/litellm-config.yaml:/app/config.yaml \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY_BACKUP \
  ghcr.io/berriai/litellm:main-latest \
  --config /app/config.yaml
```

Then add both servers to BluesMinds with different priorities.

## What's Next?

1. ✅ Test your setup with the examples above
2. ✅ Check logs to verify requests are working
3. ✅ Set up monitoring and alerts
4. ✅ Configure rate limits for your API keys
5. ✅ Read the [full Anthropic guide](/docs/guides/anthropic) for advanced features

## Support

Need help? Check:
- [Complete Setup Guide](/docs/guides/setup-anthropic)
- [Troubleshooting Guide](/docs/guides/setup-anthropic#troubleshooting)
- [API Reference](/docs/api/chat)
- LiteLLM docs: https://docs.litellm.ai

---

**Time to First Request:** ~5 minutes
**Difficulty:** Easy
**Prerequisites:** Docker + Anthropic API key
