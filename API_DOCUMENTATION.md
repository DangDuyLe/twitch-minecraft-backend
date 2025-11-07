# Twitch-Minecraft Integration API v2.0

## Overview

This is a multi-user system where each user can:
1. Register with their own Twitch credentials
2. Get a unique webhook URL and API key
3. Subscribe to Twitch events
4. Forward events to their Minecraft server with proper signature verification

## Base URL

```
http://localhost:3000
```

---

## Authentication Endpoints

### 1. Register User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "username": "your_username",
  "password": "your_secure_password",
  "twitchClientId": "your_twitch_client_id",
  "twitchClientSecret": "your_twitch_client_secret",
  "minecraftServerUrl": "http://localhost:8080"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "userId": "uuid-here",
  "apiKey": "your-api-key",
  "eventSubSecret": "your-eventsub-secret",
  "webhookUrl": "http://localhost:3000/webhook/uuid-here"
}
```

**Important:** Save these values! You'll need them for:
- `apiKey`: Authentication for API calls
- `eventSubSecret`: Twitch EventSub webhook secret
- `webhookUrl`: URL to give Twitch for callbacks

---

### 2. Login

Authenticate and get a session token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "sessionToken": "your-session-token",
  "userId": "uuid-here",
  "username": "your_username",
  "apiKey": "your-api-key",
  "eventSubSecret": "your-eventsub-secret",
  "minecraftServerUrl": "http://localhost:8080"
}
```

**Headers for subsequent requests:**
```
Authorization: Bearer your-session-token
```

---

### 3. Logout

End your session.

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer your-session-token
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

### 4. Get Current User

Get your user information.

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer your-session-token
```

**Response:**
```json
{
  "userId": "uuid-here",
  "username": "your_username",
  "apiKey": "your-api-key",
  "eventSubSecret": "your-eventsub-secret",
  "twitchClientId": "your-twitch-client-id",
  "minecraftServerUrl": "http://localhost:8080",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "isActive": true
}
```

---

### 5. Update Settings

Update your Minecraft server URL or Twitch credentials.

**Endpoint:** `PATCH /api/auth/me`

**Headers:**
```
Authorization: Bearer your-session-token
```

**Request Body:**
```json
{
  "minecraftServerUrl": "http://new-server:8080",
  "twitchClientId": "new_client_id",
  "twitchClientSecret": "new_client_secret"
}
```

---

## Twitch Event Subscription Endpoints

### 6. Subscribe to Event

Subscribe to a specific Twitch event.

**Endpoint:** `POST /api/twitch/subscribe`

**Headers:**
```
Authorization: Bearer your-session-token
```

**Request Body:**
```json
{
  "type": "channel.subscribe",
  "version": "1",
  "condition": {
    "broadcaster_user_id": "12345678"
  }
}
```

**Common Event Types:**
- `channel.subscribe` - New subscriptions
- `channel.subscription.gift` - Gift subscriptions
- `channel.cheer` - Bits cheered
- `channel.raid` - Channel raids
- `channel.follow` - New followers

---

### 7. Get All Subscriptions

Get all your active Twitch EventSub subscriptions.

**Endpoint:** `GET /api/twitch/subscriptions`

**Headers:**
```
Authorization: Bearer your-session-token
```

**Response:**
```json
{
  "data": [
    {
      "id": "subscription-id",
      "status": "enabled",
      "type": "channel.subscribe",
      "version": "1",
      "condition": {
        "broadcaster_user_id": "12345678"
      },
      "created_at": "2025-01-01T00:00:00Z",
      "transport": {
        "method": "webhook",
        "callback": "http://localhost:3000/webhook/your-user-id"
      }
    }
  ],
  "total": 1,
  "total_cost": 1,
  "max_total_cost": 10000
}
```

---

### 8. Delete Subscription

Delete a specific subscription.

**Endpoint:** `DELETE /api/twitch/subscriptions/:id`

**Headers:**
```
Authorization: Bearer your-session-token
```

---

### 9. Quick Setup

Subscribe to all common events at once.

**Endpoint:** `POST /api/twitch/setup`

**Headers:**
```
Authorization: Bearer your-session-token
```

**Request Body:**
```json
{
  "broadcasterUserId": "12345678"
}
```

**Response:**
```json
{
  "message": "Setup completed",
  "results": [
    { "event": "channel.subscribe", "status": "success", "data": {...} },
    { "event": "channel.subscription.gift", "status": "success", "data": {...} },
    { "event": "channel.cheer", "status": "success", "data": {...} },
    { "event": "channel.raid", "status": "success", "data": {...} },
    { "event": "channel.follow", "status": "success", "data": {...} }
  ]
}
```

---

## Webhook Endpoint

### 10. Twitch EventSub Webhook

This endpoint receives events from Twitch (not called directly by you).

**Endpoint:** `POST /webhook/:userId`

**How it works:**
1. Twitch sends events to your webhook URL
2. Server verifies signature using your `eventSubSecret`
3. Server forwards event to your Minecraft server

**Security:**
- Signature verification prevents unauthorized requests
- Timestamp validation prevents replay attacks
- User-specific secrets isolate each user

---

## Usage Example

### Step 1: Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "streamer123",
    "password": "securePassword123",
    "twitchClientId": "abc123...",
    "twitchClientSecret": "xyz789...",
    "minecraftServerUrl": "http://localhost:8080"
  }'
```

### Step 2: Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "streamer123",
    "password": "securePassword123"
  }'
```

### Step 3: Setup Twitch Subscriptions
```bash
curl -X POST http://localhost:3000/api/twitch/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-session-token" \
  -d '{
    "broadcasterUserId": "123456789"
  }'
```

### Step 4: Configure ngrok (for local testing)
```bash
ngrok http 3000
```

Then update your webhook URL in Twitch (done automatically by API).

---

## Security Features

1. **Password Hashing**: Passwords are hashed using SHA-256
2. **Session Tokens**: 32-byte random tokens with 24-hour expiry
3. **API Keys**: Unique per user for authentication
4. **Signature Verification**: 
   - HMAC-SHA256 signature validation
   - Timestamp verification (10-minute window)
   - Timing-safe comparison to prevent timing attacks
5. **User Isolation**: Each user has their own:
   - EventSub secret
   - Twitch credentials
   - Minecraft server URL
   - Webhook endpoint

---

## Migration from v1.0

If you're using the old single-user system:

1. **Register your account** with your existing credentials
2. **Update your EventSub subscriptions** to use the new webhook URL
3. **Keep your Minecraft plugin** - no changes needed!
4. **Remove old environment variables** - credentials now in database

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message here"
}
```

Common status codes:
- `400` - Bad request (missing/invalid fields)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (invalid signature)
- `404` - Not found
- `409` - Conflict (username exists)
- `500` - Internal server error
