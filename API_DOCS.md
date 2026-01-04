# BluesMinds AI Gateway - API Documentation

Complete API reference for developers integrating with BluesMinds AI Gateway.

## Base URL

```
Production: https://your-domain.com
Development: http://localhost:3000
```

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
- `model` (required): Model name (e.g., "gpt-4", "claude-3-opus")
- `messages` (required): Array of message objects
- `temperature` (optional): 0.0 to 2.0, default 1.0
- `max_tokens` (optional): Maximum tokens to generate
- `stream` (optional): Enable streaming, default false
- `top_p` (optional): Nucleus sampling parameter
- `frequency_penalty` (optional): -2.0 to 2.0
- `presence_penalty` (optional): -2.0 to 2.0
- `stop` (optional): Up to 4 stop sequences

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
```

### List Models

Get available models.

**Endpoint:** `GET /api/v1/models`

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4",
      "object": "model",
      "created": 1686935002,
      "owned_by": "openai"
    },
    {
      "id": "claude-3-opus",
      "object": "model",
      "created": 1686935002,
      "owned_by": "anthropic"
    }
  ]
}
```

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
  "full_name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "full_name": "John Doe",
      "tier": "free",
      "created_at": "2024-01-04T10:00:00Z"
    },
    "session": {
      "access_token": "eyJ...",
      "refresh_token": "eyJ...",
      "expires_at": 1704369600
    }
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

**Request Body:**
```json
{
  "name": "My API Key",
  "scopes": ["chat", "embeddings"],
  "rate_limit_rpm": 100,
  "rate_limit_tpm": 1000000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "key_123",
    "key": "bm_abc123def456...",
    "name": "My API Key",
    "scopes": ["chat", "embeddings"],
    "rate_limit": {
      "rpm": 100,
      "tpm": 1000000
    },
    "created_at": "2024-01-04T10:00:00Z"
  },
  "message": "API key created successfully. Save this key now, it won't be shown again."
}
```

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

Create a Stripe checkout session for subscription.

**Endpoint:** `POST /api/billing/checkout`

**Request Body:**
```json
{
  "price_id": "price_starter",
  "success_url": "https://your-app.com/success",
  "cancel_url": "https://your-app.com/cancel"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "cs_test_...",
    "url": "https://checkout.stripe.com/..."
  }
}
```

### Customer Portal

Get Stripe customer portal URL.

**Endpoint:** `POST /api/billing/portal`

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://billing.stripe.com/..."
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

- [BluesMinds Python Client](https://github.com/your-repo/python-client)
- [BluesMinds Go Client](https://github.com/your-repo/go-client)

---

## Webhooks

Configure webhooks to receive real-time notifications about events.

**Supported Events:**
- `api_key.created`
- `api_key.revoked`
- `usage.limit_reached`
- `subscription.updated`
- `invoice.paid`

**Webhook Payload:**
```json
{
  "id": "evt_123",
  "type": "usage.limit_reached",
  "created_at": "2024-01-04T10:00:00Z",
  "data": {
    "user_id": "user_123",
    "api_key_id": "key_123",
    "limit_type": "daily",
    "usage": 950000,
    "limit": 1000000
  }
}
```

---

## Support

- **Documentation:** https://docs.bluesminds.com
- **API Status:** https://status.bluesminds.com
- **Email:** support@bluesminds.com
- **Discord:** https://discord.gg/bluesminds

---

**Last Updated:** 2024-01-04
**API Version:** 1.0.0
