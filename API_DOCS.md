# BluesMinds AI Gateway - API Documentation

Complete API reference for developers integrating with BluesMinds AI Gateway.

## Quick Start

Get started in 3 simple steps:

1. **Sign up** and create an account at `/signup`
2. **Generate API key** from your dashboard at `/dashboard/keys`
3. **Make your first request:**

```bash
curl https://your-domain.com/api/v1/chat/completions \
  -H "Authorization: Bearer bm_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Response Format Notice](#response-format-notice)
- [Gateway Endpoints](#gateway-endpoints-openai-compatible)
  - [Chat Completions](#chat-completions)
  - [Embeddings](#embeddings)
  - [List Models](#list-models)
- [Authentication Endpoints](#authentication-endpoints)
- [API Key Management](#api-key-management)
- [Usage & Analytics](#usage--analytics)
- [Billing Endpoints](#billing-endpoints)
- [Rate Limits](#rate-limits)
- [Error Responses](#error-responses)
- [SDKs & Libraries](#sdks--libraries)
- [Health Check Endpoints](#health-check-endpoints)

---

## Base URL

The base URL for all API endpoints depends on your deployment:

```bash
# Production (set via NEXT_PUBLIC_APP_URL environment variable)
https://your-domain.vercel.app

# Local Development
http://localhost:3000
```

All API endpoints use the `/api/v1` prefix for OpenAI-compatible endpoints, though you can also use `/v1` directly (automatically rewritten).

## Authentication

All gateway API requests require an API key passed in the `Authorization` header:

```
Authorization: Bearer bm_your_api_key_here
```

### API Key Format
- Prefix: `bm_`
- Length: 35 characters (3 char prefix + 32 char random string)
- Example: `bm_abc123def456ghi789jkl012mno345p`

---

## Response Format Notice

BluesMinds uses two response formats depending on the endpoint type:

**OpenAI-Compatible Endpoints** (`/v1/chat/completions`, `/v1/models`):
- Return raw OpenAI-format responses (no wrapper)
- Compatible with OpenAI SDK and tools
- Example: `{ "id": "chatcmpl-123", "choices": [...] }`

**Management Endpoints** (`/api/auth/*`, `/api/keys`, `/api/usage/*`):
- Return wrapped responses with status indicator
- Format: `{ "success": true/false, "data": {...}, "error": {...} }`

---

## Gateway Endpoints (OpenAI-Compatible)

### Chat Completions

Generate chat completions with streaming support.

**Endpoint:** `POST /api/v1/chat/completions`

**Headers:**
```
Authorization: Bearer bm_your_api_key
Content-Type: application/json
```

**Request Body:**
```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": false
}
```

**Parameters:**
- `model` (required): Model name (e.g., "gpt-4", "claude-3-opus", "deepseek-chat")
- `messages` (required): Array of message objects with `role` and `content`
- `temperature` (optional): 0.0 to 2.0, controls randomness (default: 1.0)
- `max_tokens` (optional): Maximum tokens to generate
- `stream` (optional): Enable streaming responses (default: false)
- `tools` (optional): Array of tool/function definitions for function calling
- `tool_choice` (optional): Control which tool to use ("auto", "none", or specific tool)
- `top_p` (optional): Nucleus sampling parameter (0.0 to 1.0)
- `frequency_penalty` (optional): -2.0 to 2.0, penalize repeated tokens
- `presence_penalty` (optional): -2.0 to 2.0, penalize new topics
- `stop` (optional): Up to 4 stop sequences

**Supported Features:**
- ✅ Streaming responses
- ✅ Tool/function calling
- ✅ Multi-turn conversations
- ✅ System prompts
- ✅ Custom model mappings

**Response:**
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 9,
    "completion_tokens": 12,
    "total_tokens": 21
  }
}
```

**Response Headers:**
```
Content-Type: application/json
X-RateLimit-Limit-Requests: 100
X-RateLimit-Remaining-Requests: 95
X-RateLimit-Reset-Requests: 1704369600
```

**Streaming Response:**
```
data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"Hello"}}]}

data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"!"}}]}

data: [DONE]
```

**cURL Example:**
```bash
curl https://your-domain.com/api/v1/chat/completions \
  -H "Authorization: Bearer bm_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

**Python Example:**
```python
from openai import OpenAI

client = OpenAI(
    api_key="bm_your_api_key",
    base_url="https://your-domain.com/api/v1"
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
```

### Embeddings

Generate embeddings for text.

**Endpoint:** `POST /api/v1/embeddings`

**Headers:**
```
Authorization: Bearer bm_your_api_key
Content-Type: application/json
```

**Request Body:**
```json
{
  "input": "The quick brown fox jumps over the lazy dog",
  "model": "text-embedding-ada-002"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "object": "list",
    "data": [
      {
        "object": "embedding",
        "embedding": [0.1, 0.2, 0.3, ...],
        "index": 0
      }
    ],
    "model": "text-embedding-ada-002",
    "usage": {
      "prompt_tokens": 10,
      "total_tokens": 10
    }
  }
}
```

**Note:** Unlike chat completions, the embeddings endpoint wraps responses in a `{ success: true, data: ... }` envelope for consistency with other management endpoints.

### List Models

Get available models configured in your gateway.

**Endpoint:** `GET /api/v1/models`

**Headers:**
```
Authorization: Bearer bm_your_api_key
```

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4",
      "object": "model",
      "created": 1704369600,
      "owned_by": "blueminds"
    },
    {
      "id": "claude-3-opus",
      "object": "model",
      "created": 1704369600,
      "owned_by": "blueminds"
    }
  ]
}
```

**Note:** This endpoint returns only custom model mappings configured by the admin. All models are marked as owned by "blueminds" since they're proxied through the gateway.

---

## Authentication Endpoints

### Sign Up

Create a new user account.

**Endpoint:** `POST /api/auth/signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "John Doe",
  "company_name": "Acme Inc",
  "referral_code": "FRIEND123"
}
```

**Parameters:**
- `email` (required): Valid email address
- `password` (required): Secure password (min 8 characters)
- `full_name` (optional): User's full name
- `company_name` (optional): Company name
- `referral_code` (optional): Referral code from existing user

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "full_name": "John Doe"
    },
    "session": {
      "access_token": "eyJhbGci...",
      "refresh_token": "eyJhbGci...",
      "token_type": "bearer",
      "expires_in": 3600,
      "expires_at": 1704369600,
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com"
      }
    },
    "needs_verification": false
  }
}
```

### Login

Sign in to existing account.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "full_name": "John Doe",
      "tier": "pro"
    },
    "session": {
      "access_token": "eyJhbGci...",
      "refresh_token": "eyJhbGci...",
      "token_type": "bearer",
      "expires_in": 3600,
      "expires_at": 1704369600
    }
  }
}
```

### Logout

Sign out current session.

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <session_token>
```

### Get Current User

Get authenticated user details.

**Endpoint:** `GET /api/auth/me`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "full_name": "John Doe",
    "tier": "pro",
    "created_at": "2024-01-04T10:00:00Z"
  }
}
```

---

## API Key Management

### List API Keys

Get all API keys for the authenticated user.

**Endpoint:** `GET /api/keys`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "key_123",
      "name": "Production Key",
      "prefix": "bm_abc1",
      "scopes": ["chat", "embeddings"],
      "rate_limit": {
        "rpm": 100,
        "tpm": 1000000
      },
      "is_active": true,
      "last_used_at": "2024-01-04T10:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create API Key

Generate a new API key.

**Endpoint:** `POST /api/keys`

**Headers:**
```
Cookie: sb-<project>-auth-token=<session_token>
```

**Request Body:**
```json
{
  "name": "My API Key",
  "scopes": ["chat.completions", "embeddings", "models"],
  "rate_limit_rpm": 100,
  "rate_limit_tpm": 1000000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "api_key": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My API Key",
      "key_hash": "sha256_...",
      "prefix": "bm_abc1",
      "scopes": ["chat.completions", "embeddings", "models"],
      "rate_limit_rpm": 100,
      "rate_limit_tpm": 1000000,
      "is_active": true,
      "created_at": "2024-01-04T10:00:00Z",
      "updated_at": "2024-01-04T10:00:00Z"
    },
    "key": "bm_abc123def456ghi789jkl012mno345pqr",
    "message": "API key created. Save this key securely - you will not be able to see it again!"
  }
}
```

**Important:** The full API key is only returned once during creation. Save it securely!

### Update API Key

Update API key settings.

**Endpoint:** `PATCH /api/keys/:id`

**Request Body:**
```json
{
  "name": "Updated Name",
  "is_active": false
}
```

### Delete API Key

Revoke an API key.

**Endpoint:** `DELETE /api/keys/:id`

### Rotate API Key

Generate a new key and revoke the old one.

**Endpoint:** `POST /api/keys/:id/rotate`

---

## Usage & Analytics

### Usage Statistics

Get usage statistics for the authenticated user.

**Endpoint:** `GET /api/usage/stats`

**Query Parameters:**
- `start_date` (optional): Start date (ISO 8601)
- `end_date` (optional): End date (ISO 8601)
- `model` (optional): Filter by model
- `api_key_id` (optional): Filter by API key

**Response:**
```json
{
  "success": true,
  "data": {
    "total_requests": 1250,
    "total_tokens": 125000,
    "total_cost": 2.50,
    "by_model": {
      "gpt-4": {
        "requests": 500,
        "tokens": 50000,
        "cost": 1.50
      },
      "gpt-3.5-turbo": {
        "requests": 750,
        "tokens": 75000,
        "cost": 1.00
      }
    },
    "by_date": [
      {
        "date": "2024-01-01",
        "requests": 100,
        "tokens": 10000,
        "cost": 0.20
      }
    ]
  }
}
```

### Request Logs

Get detailed request logs.

**Endpoint:** `GET /api/usage/logs`

**Query Parameters:**
- `limit` (optional): Number of logs (default: 100, max: 1000)
- `offset` (optional): Pagination offset
- `api_key_id` (optional): Filter by API key
- `status` (optional): Filter by status (success, error)

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_123",
        "api_key_id": "key_123",
        "model": "gpt-4",
        "endpoint": "/v1/chat/completions",
        "status": "success",
        "prompt_tokens": 10,
        "completion_tokens": 50,
        "total_tokens": 60,
        "cost": 0.012,
        "response_time_ms": 1250,
        "created_at": "2024-01-04T10:00:00Z"
      }
    ],
    "total": 1250,
    "limit": 100,
    "offset": 0
  }
}
```

---

## Billing Endpoints

### Create Checkout Session

Create a Creem checkout session for subscription.

**Endpoint:** `POST /api/billing/checkout`

**Request Body:**
```json
{
  "tier": "starter"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://api.creem.io/v1/checkouts/..."
  }
}
```

### Customer Portal

Get Creem customer portal URL.

**Endpoint:** `POST /api/billing/portal`

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://portal.creem.io/..."
  }
}
```

---

## Rate Limits

All API keys have rate limits based on subscription tier:

| Tier | Requests/Min | Tokens/Min | Daily Tokens | Monthly Tokens |
|------|-------------|------------|--------------|----------------|
| Free | 60 | 90,000 | 300,000 | 10,000,000 |
| Starter | 100 | 500,000 | 1,000,000 | 30,000,000 |
| Pro | 1,000 | 5,000,000 | 10,000,000 | 300,000,000 |
| Enterprise | 5,000 | Unlimited | Unlimited | Unlimited |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704369600
```

**Rate Limit Exceeded Response:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "status": 429,
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset_at": "2024-01-04T10:01:00Z"
    }
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "status": 400,
    "details": {}
  }
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `AUTHENTICATION_ERROR` | 401 | Invalid or missing API key |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `NOT_FOUND` | 404 | Resource not found |
| `SERVER_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |
| `GATEWAY_ERROR` | 502 | Upstream LLM provider error |

---

## SDKs & Libraries

### Official

**OpenAI SDK (Python, Node.js):**
Works out of the box by changing the base URL.

**Python:**
```python
from openai import OpenAI

client = OpenAI(
    api_key="bm_your_api_key",
    base_url="https://your-domain.com/api/v1"
)
```

**Node.js:**
```javascript
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'bm_your_api_key',
  baseURL: 'https://your-domain.com/api/v1',
})
```

### Community

Community SDKs are coming soon! For now, use the official OpenAI SDK with a custom base URL as shown above.

---

## Webhooks (Coming Soon)

Webhook support for real-time event notifications is planned for a future release.

**Planned Events:**
- `api_key.created` - When a new API key is generated
- `api_key.revoked` - When an API key is revoked
- `usage.limit_reached` - When usage approaches or hits limits
- `subscription.updated` - When subscription tier changes
- `invoice.paid` - When billing invoice is paid

Stay tuned for updates!

---

## Health Check Endpoints

BluesMinds provides health check endpoints for monitoring and Kubernetes deployments.

### Health Check

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-04T10:00:00.000Z",
  "uptime": 3600.5,
  "database": {
    "connected": true,
    "latency_ms": 12
  },
  "memory": {
    "used_mb": 256,
    "total_mb": 512,
    "percentage": 50
  }
}
```

### Liveness Probe

**Endpoint:** `GET /api/health/live`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-04T10:00:00.000Z"
}
```

### Readiness Probe

**Endpoint:** `GET /api/health/ready`

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2024-01-04T10:00:00.000Z",
  "checks": {
    "database": "pass"
  }
}
```

---

## Support

- **GitHub:** Report issues at [github.com/yourusername/bluesminds](https://github.com)
- **Documentation:** Access docs at `/docs` or `/api-docs`
- **Dashboard:** Manage your account at `/dashboard`

---

**Last Updated:** 2026-01-05
**API Version:** 1.0.0
**Gateway Status:** Production Ready
