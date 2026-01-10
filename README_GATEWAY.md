# BluesMinds AI Gateway

A production-grade AI gateway for managing multiple LLM providers through a unified API.

## Features

- **Unified API**: OpenAI-compatible API for accessing multiple LLM providers
- **Rate Limiting**: Request per minute (RPM), tokens per minute (TPM), and quota management
- **Load Balancing**: Intelligent routing across multiple LiteLLM servers
- **Usage Tracking**: Comprehensive logging and analytics
- **Billing**: Built-in subscription tiers and usage-based billing
- **Authentication**: Secure API key management with bcrypt hashing
- **Health Monitoring**: Automatic health checks and failover
- **Streaming Support**: Server-sent events (SSE) for streaming responses

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes (Edge Runtime)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **LLM Proxy**: LiteLLM

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account (or local Supabase instance)
- LiteLLM server(s) deployed

### Installation

1. **Clone and install dependencies**:
```bash
git clone <your-repo>
cd bluesminds
pnpm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your values:
- `NEXT_PUBLIC_SUPABASE_URL` and keys from your Supabase project
- `JWT_SECRET` and `API_KEY_SECRET` (generate with `openssl rand -base64 32`)
- `LITELLM_SERVER_1_URL` - Your LiteLLM server URL
- Other optional services (Creem, Redis, etc.)

3. **Run database migrations**:
```bash
# If using Supabase locally
npx supabase db push

# If using cloud Supabase, migrations are in supabase/migrations/
# Apply them via the Supabase dashboard or CLI
```

4. **Start the development server**:
```bash
pnpm dev
```

The gateway will be available at `http://localhost:3000`

### Setting Up LiteLLM Servers

BluesMinds proxies requests to LiteLLM servers. You need at least one LiteLLM server running.

**Quick LiteLLM setup**:

1. Create `litellm_config.yaml`:
```yaml
model_list:
  - model_name: gpt-4
    litellm_params:
      model: openai/gpt-4
      api_key: os.environ/OPENAI_API_KEY

  - model_name: claude-3-opus
    litellm_params:
      model: anthropic/claude-3-opus-20240229
      api_key: os.environ/ANTHROPIC_API_KEY

litellm_settings:
  set_verbose: true
```

2. Run LiteLLM:
```bash
docker run -p 4000:4000 \
  -e OPENAI_API_KEY=your_key \
  -e ANTHROPIC_API_KEY=your_key \
  -v $(pwd)/litellm_config.yaml:/app/config.yaml \
  ghcr.io/berriai/litellm:main-latest \
  --config /app/config.yaml
```

3. Add the server to BluesMinds via the admin panel or database:
```sql
INSERT INTO litellm_servers (name, base_url, priority, supported_models)
VALUES ('LiteLLM Primary', 'http://localhost:4000', 1, ARRAY['gpt-4', 'claude-3-opus']);
```

## API Usage

### 1. Create an Account

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "full_name": "John Doe"
  }'
```

### 2. Create an API Key

Login to the dashboard at `http://localhost:3000/dashboard` and create an API key, or use the API:

```bash
curl -X POST http://localhost:3000/api/keys \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "name": "My API Key",
    "scopes": ["chat.completions", "embeddings"]
  }'
```

Save the returned API key securely - you won't be able to see it again!

### 3. Make Requests

The API is OpenAI-compatible:

```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer bm_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

**Streaming**:
```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer bm_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### Using with OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/api/v1",
    api_key="bm_your_api_key_here"
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
```

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3000/api/v1',
  apiKey: 'bm_your_api_key_here',
});

const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(response.choices[0].message.content);
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/me` - Update profile

### API Keys
- `GET /api/keys` - List API keys
- `POST /api/keys` - Create API key
- `GET /api/keys/[id]` - Get API key
- `PATCH /api/keys/[id]` - Update API key
- `DELETE /api/keys/[id]` - Revoke API key
- `POST /api/keys/[id]/rotate` - Rotate API key

### Gateway (OpenAI-Compatible)
- `POST /api/v1/chat/completions` - Chat completions
- `POST /api/v1/embeddings` - Generate embeddings
- `GET /api/v1/models` - List available models

### Usage & Analytics
- `GET /api/usage/stats` - Usage statistics
- `GET /api/usage/logs` - Request logs

### Admin
- `GET /api/admin/servers` - List LiteLLM servers
- `POST /api/admin/servers` - Add server
- `PATCH /api/admin/servers/[id]` - Update server
- `DELETE /api/admin/servers/[id]` - Remove server
- `GET /api/admin/health` - Health summary
- `POST /api/admin/health` - Trigger health check

## Rate Limits

Each API key has configurable rate limits:

- **RPM (Requests Per Minute)**: Maximum requests per minute
- **TPM (Tokens Per Minute)**: Maximum tokens per minute
- **Daily Quota**: Maximum tokens per day
- **Monthly Quota**: Maximum tokens per month

Default limits by tier:

| Tier | RPM | TPM | Daily | Monthly |
|------|-----|-----|-------|---------|
| Free | 10 | 10K | 1K | 10K |
| Starter | 60 | 100K | 20K | 500K |
| Pro | 200 | 500K | 100K | 2M |
| Enterprise | 1000 | 2M | 500K | 10M |

## Architecture

```
┌─────────────┐
│   Clients   │ (Your Applications)
└──────┬──────┘
       │ API Key Auth
       ▼
┌─────────────────────────────┐
│  BluesMinds Gateway         │
│  1. Authentication          │
│  2. Rate Limiting           │
│  3. Load Balancing          │
│  4. Request Proxying        │
│  5. Usage Tracking          │
└──────┬──────────────────────┘
       │
       ├─────┐ Round-robin + Health
       ▼     ▼
┌──────────┐ ┌──────────┐
│ LiteLLM  │ │ LiteLLM  │
│ Server 1 │ │ Server 2 │
└────┬─────┘ └────┬─────┘
     │            │
     └─────┬──────┘
           ▼
    ┌─────────────────┐
    │ OpenAI/Anthropic│
    │ Google/etc      │
    └─────────────────┘
```

## Database Schema

See `supabase/migrations/` for the complete schema:

- **users**: User accounts with tiers and credits
- **api_keys**: API key management with rate limits
- **litellm_servers**: LiteLLM server pool
- **usage_logs**: Request logs (partitioned by month)
- **rate_limit_state**: Rate limit tracking
- **billing_plans**: Subscription tiers
- **invoices**: Monthly billing

## Development

### Project Structure

```
bluesminds/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── keys/         # API key management
│   │   ├── v1/           # Gateway proxy endpoints
│   │   ├── usage/        # Usage & analytics
│   │   └── admin/        # Admin endpoints
│   ├── dashboard/        # Dashboard UI (to be built)
│   └── page.tsx          # Landing page
├── lib/
│   ├── gateway/          # Core gateway modules
│   │   ├── auth.ts       # Authentication
│   │   ├── api-keys.ts   # API key management
│   │   ├── rate-limiter.ts # Rate limiting
│   │   ├── load-balancer.ts # Server selection
│   │   ├── proxy.ts      # Request proxying
│   │   ├── usage-tracker.ts # Usage logging
│   │   └── health-monitor.ts # Health checks
│   ├── config/           # Configuration
│   ├── supabase/         # Supabase client
│   ├── types/            # TypeScript types
│   ├── utils/            # Utilities
│   └── validations/      # Zod schemas
└── supabase/
    └── migrations/       # Database migrations
```

### Running Tests

```bash
# Unit tests (to be added)
pnpm test

# Integration tests (to be added)
pnpm test:integration

# E2E tests (to be added)
pnpm test:e2e
```

### Deployment

#### Vercel (Recommended)

```bash
vercel deploy
```

Set environment variables in Vercel dashboard.

#### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
CMD ["pnpm", "start"]
```

## Monitoring

- **Health Checks**: Automatic health monitoring every 60 seconds
- **Metrics**: Request count, token usage, costs, error rates
- **Alerts**: Server degradation/failure notifications

## Security

- API keys hashed with bcrypt (never stored in plain text)
- Rate limiting to prevent abuse
- Input validation with Zod
- SQL injection prevention (parameterized queries)
- HTTPS only in production
- Supabase Row Level Security (RLS)

## Troubleshooting

### "No healthy servers available"

- Check that at least one LiteLLM server is configured and running
- Verify server URL is accessible from the gateway
- Check server health status in admin panel

### Rate limit errors

- Check your API key's rate limits
- Monitor usage in dashboard
- Upgrade tier if needed

### Authentication errors

- Verify API key is correct and active
- Check API key hasn't expired
- Ensure API key has required scopes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

[Your License Here]

## Support

- Documentation: [Your Docs URL]
- Community: https://t.me/apibluesminds
- Issues: [GitHub Issues URL]

---

Built with ❤️ by the BluesMinds team
