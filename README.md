# BluesMinds AI Gateway

A production-grade API gateway for managing multiple LLM providers with built-in authentication, rate limiting, load balancing, and billing.

## Features

- **Multi-Provider Support**: Route requests to OpenAI, Anthropic, Google, and more through LiteLLM
- **API Key Management**: Create, rotate, and revoke API keys with custom scopes
- **Rate Limiting**: Per-key rate limits (RPM, TPM) and usage quotas
- **Load Balancing**: Intelligent request distribution across multiple LiteLLM servers
- **Usage Tracking**: Detailed analytics and cost tracking per API key
- **Billing Integration**: Creem-powered subscriptions with multiple tiers
- **Health Monitoring**: Automatic health checks for backend servers
- **OpenAI Compatible**: Drop-in replacement for OpenAI API
- **Dashboard**: Full-featured web dashboard for management

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment

```bash
bash scripts/setup-env.sh
```

Follow the prompts to configure your environment variables.

### 3. Validate Setup

```bash
bash scripts/validate-setup.sh
```

This will check if everything is configured correctly.

### 4. Set Up Database

```bash
supabase link --project-ref your-project-ref
supabase db push
```

### 5. Start the Application

```bash
pnpm dev
```

Visit http://localhost:3000 to see your gateway!

## Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide with detailed instructions
- **[API Documentation](./docs/API.md)** - API endpoints and usage
- **[Architecture](./docs/ARCHITECTURE.md)** - System architecture overview

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth + Custom API Keys
- **Billing**: Creem
- **LLM Proxy**: LiteLLM
- **UI**: React 19, TailwindCSS, Radix UI
- **Language**: TypeScript

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│      BluesMinds Gateway             │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │     Auth     │  │Rate Limiter │ │
│  └──────────────┘  └─────────────┘ │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │Load Balancer │  │Usage Track  │ │
│  └──────────────┘  └─────────────┘ │
└─────────┬───────────────────────────┘
          │
          ▼
┌──────────────────────┐
│  LiteLLM Servers     │
│  ┌────────────────┐  │
│  │ Server 1       │  │
│  │ Server 2       │  │
│  │ Server 3       │  │
│  └────────────────┘  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   LLM Providers      │
│  ┌────────────────┐  │
│  │ OpenAI         │  │
│  │ Anthropic      │  │
│  │ Google         │  │
│  └────────────────┘  │
└──────────────────────┘
```

## Key Concepts

### API Keys

Every request must include an API key for authentication:

```bash
Authorization: Bearer bm_your_api_key_here
```

API keys can be scoped to specific operations and have individual rate limits.

### Rate Limiting

Three levels of rate limiting:
- **Requests per minute (RPM)**
- **Tokens per minute (TPM)**
- **Daily/Monthly quotas**

Limits are enforced per API key and vary by subscription tier.

### Load Balancing

Requests are distributed across LiteLLM servers using:
- Weighted round-robin
- Health-aware routing
- Automatic failover

### Usage Tracking

All requests are logged with:
- Model used
- Token counts (prompt + completion)
- Response time
- Cost calculation
- Success/error status

## Usage Example

### Using cURL

```bash
curl http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer bm_your_api_key" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### Using OpenAI Python SDK

```python
from openai import OpenAI

client = OpenAI(
    api_key="bm_your_api_key",
    base_url="http://localhost:3000/api/v1"
)

response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
```

### Using OpenAI Node.js SDK

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'bm_your_api_key',
  baseURL: 'http://localhost:3000/api/v1',
});

const response = await client.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(response.choices[0].message.content);
```

## Subscription Tiers

### Free
- 60 requests/minute
- 90K tokens/minute
- Basic models

### Starter ($29/month)
- 100 requests/minute
- 1M tokens/day
- All models
- Priority support

### Pro ($99/month)
- 1000 requests/minute
- 10M tokens/day
- All models
- Advanced analytics
- Priority support

### Enterprise ($299/month)
- 5000 requests/minute
- Unlimited tokens
- All models
- Dedicated support
- Custom integrations

## Dashboard Features

- **Overview**: Real-time stats, usage charts, recent requests
- **API Keys**: Create, manage, and revoke keys
- **Usage**: Detailed usage analytics and cost breakdown
- **Billing**: Manage subscriptions and view invoices
- **Settings**: Configure account and preferences

## API Endpoints

### Gateway Endpoints

- `POST /api/v1/chat/completions` - Chat completions (OpenAI compatible)
- `POST /api/v1/embeddings` - Generate embeddings
- `POST /api/v1/completions` - Text completions

### Management Endpoints

- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/keys` - List API keys
- `POST /api/keys` - Create API key
- `PATCH /api/keys/:id` - Update API key
- `DELETE /api/keys/:id` - Revoke API key
- `GET /api/usage` - Get usage statistics

### Billing Endpoints

- `POST /api/billing/checkout` - Create checkout session
- `POST /api/billing/portal` - Access billing portal
- `POST /api/billing/webhook` - Creem webhook handler

## Development

### Project Structure

```
bluesminds/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── billing/      # Billing endpoints
│   │   ├── keys/         # API key management
│   │   └── v1/           # Gateway proxy endpoints
│   ├── dashboard/        # Dashboard pages
│   └── (marketing)/      # Public pages
├── components/            # React components
│   ├── dashboard/        # Dashboard components
│   └── ui/              # UI components
├── lib/                  # Core library code
│   ├── gateway/         # Gateway modules
│   │   ├── auth.ts      # Authentication
│   │   ├── rate-limiter.ts
│   │   ├── load-balancer.ts
│   │   ├── proxy.ts
│   │   ├── usage-tracker.ts
│   │   └── health-monitor.ts
│   ├── billing/         # Creem integration
│   ├── supabase/        # Database client
│   └── types/           # TypeScript types
├── supabase/
│   └── migrations/      # Database migrations
└── scripts/             # Utility scripts
```

### Running Tests

```bash
pnpm test
```

### Building for Production

```bash
pnpm build
pnpm start
```

## Environment Variables

See `.env.example` for all required environment variables.

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `API_KEY_SECRET`

Optional (for billing):
- `CREEM_API_KEY`
- `CREEM_WEBHOOK_SECRET`
- `CREEM_PRODUCT_*`

## Security

- API keys are hashed using bcrypt before storage
- Rate limiting prevents abuse
- Row Level Security (RLS) on database
- Environment variables for sensitive data
- HTTPS required in production
- Webhook signature verification

## Monitoring

The gateway includes built-in monitoring:
- Health checks every 60 seconds
- Usage logging for all requests
- Error tracking and retry logic
- Performance metrics

## Contributing

This is a production system for managing LLM access. Contributions should:
- Include tests
- Follow TypeScript best practices
- Update documentation
- Not introduce breaking changes without discussion

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check [SETUP.md](./SETUP.md) for detailed setup instructions
- Review API documentation
- Check LiteLLM docs: https://docs.litellm.ai/
- Check Supabase docs: https://supabase.com/docs

## Roadmap

- [ ] Advanced analytics dashboard
- [ ] Custom model pricing
- [ ] Team management
- [ ] Webhook notifications
- [ ] GraphQL support
- [ ] More LLM providers
- [ ] Caching layer
- [ ] Request replay
- [ ] A/B testing support

---

Built with ❤️ using Next.js, Supabase, and LiteLLM
