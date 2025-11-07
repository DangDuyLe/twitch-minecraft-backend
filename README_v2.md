# Twitch-Minecraft Integration v2.0

## 🎉 What's New

### Multi-User System
- **User Registration & Authentication**: Each user can create their own account
- **Individual Credentials**: Each user manages their own Twitch API credentials
- **Isolated Webhooks**: Each user gets a unique webhook URL
- **Per-User Configuration**: Configure your own Minecraft server URL

### Enhanced Security
- ✅ **Proper Signature Verification**: 
  - HMAC-SHA256 validation with user-specific secrets
  - Timestamp validation (10-minute window) prevents replay attacks
  - Timing-safe comparison prevents timing attacks
- ✅ **Password Hashing**: SHA-256 hashed passwords
- ✅ **Session Management**: Secure 24-hour session tokens
- ✅ **API Keys**: Unique API keys for each user

### Expandable Architecture
- RESTful API design
- Modular route structure
- Easy to add new features
- Ready for database integration (currently in-memory)

---

## 📁 Project Structure

```
twitch-server/
├── src/
│   ├── index.js              # Main server entry point
│   ├── database.js           # In-memory database (replace with real DB)
│   ├── auth.js               # Authentication middleware
│   ├── twitch.js             # Twitch API service
│   └── routes/
│       ├── auth.routes.js    # /api/auth endpoints
│       ├── twitch.routes.js  # /api/twitch endpoints
│       └── webhook.routes.js # /webhook endpoints
├── .env                      # Environment config (optional)
├── .env.example             # Example environment file
└── package.json             # Dependencies

minecraft-plugin/
├── src/main/java/com/minepath/twitchplugin/
│   ├── TwitchStreamPlugin.java  # Main plugin
│   ├── EventHandler.java        # Event processing
│   ├── MobAttackListener.java   # Mining fatigue on hit
│   ├── TestCommand.java         # /twitchtest command
│   └── ReloadCommand.java       # /twitchreload command
└── build.gradle                 # Gradle build config
```

---

## 🚀 Quick Start

### 1. Start the Server

```bash
cd twitch-server
npm install
npm start
```

Server will run on `http://localhost:3000`

### 2. Register Your Account

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_secure_password",
    "twitchClientId": "your_twitch_client_id",
    "twitchClientSecret": "your_twitch_client_secret",
    "minecraftServerUrl": "http://localhost:8080"
  }'
```

**Save the response!** You'll get:
- `userId` - Your unique user ID
- `apiKey` - For API authentication
- `eventSubSecret` - For webhook verification
- `webhookUrl` - Give this to Twitch

### 3. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

Save the `sessionToken` from the response.

### 4. Setup Twitch Subscriptions

```bash
curl -X POST http://localhost:3000/api/twitch/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "broadcasterUserId": "YOUR_TWITCH_USER_ID"
  }'
```

This subscribes to all common events: subscribe, gift, cheer, raid, follow.

### 5. Setup ngrok (for local testing)

```bash
ngrok http 3000
```

Your webhook URL will be: `https://your-ngrok-url.ngrok.io/webhook/YOUR_USER_ID`

---

## 🔐 Security Improvements

### Old System (v1.0)
```javascript
// Single shared secret for all users
const TWITCH_EVENTSUB_SECRET = process.env.TWITCH_EVENTSUB_SECRET;

// Basic verification
function verifySignature(req) {
  const hmac = crypto.createHmac('sha256', TWITCH_EVENTSUB_SECRET);
  // ...
}
```

### New System (v2.0)
```javascript
// Each user has their own secret
user.eventSubSecret = crypto.randomBytes(32).toString('hex');

// Enhanced verification
function verifySignature(req, eventSubSecret) {
  // 1. Check timestamp (prevents replay attacks)
  const timestamp = new Date(req.headers['twitch-eventsub-message-timestamp']).getTime();
  if (Math.abs(Date.now() - timestamp) > 10 * 60 * 1000) {
    return false; // Too old
  }
  
  // 2. Calculate expected signature
  const hmac = crypto.createHmac('sha256', eventSubSecret);
  hmac.update(messageId + timestamp + body);
  const expected = 'sha256=' + hmac.digest('hex');
  
  // 3. Timing-safe comparison (prevents timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(received),
    Buffer.from(expected)
  );
}
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get session token
- `POST /api/auth/logout` - Logout (requires auth)
- `GET /api/auth/me` - Get current user info (requires auth)
- `PATCH /api/auth/me` - Update settings (requires auth)

### Twitch Integration
- `POST /api/twitch/subscribe` - Subscribe to specific event (requires auth)
- `GET /api/twitch/subscriptions` - Get all subscriptions (requires auth)
- `DELETE /api/twitch/subscriptions/:id` - Delete subscription (requires auth)
- `POST /api/twitch/setup` - Quick setup all events (requires auth)

### Webhooks
- `POST /webhook/:userId` - Receive Twitch events (called by Twitch)

### System
- `GET /` - API information
- `GET /health` - Health check

---

## 🔄 How It Works

1. **User registers** with their Twitch credentials
2. **System generates** unique API key and EventSub secret
3. **User subscribes** to Twitch events via API
4. **Twitch sends events** to user's webhook URL: `/webhook/{userId}`
5. **Server verifies** signature using user's secret
6. **Server forwards** event to user's Minecraft server
7. **Minecraft plugin** processes event and spawns mobs

```
┌─────────┐      ┌──────────┐      ┌─────────┐      ┌───────────┐
│ Twitch  │─────>│  Server  │─────>│Signature│─────>│ Minecraft │
│  Event  │      │/webhook/ │      │  Valid? │      │  Plugin   │
└─────────┘      └──────────┘      └─────────┘      └───────────┘
                       │                                     │
                       │  User's eventSubSecret              │
                       │  User's minecraftServerUrl          │
                       └─────────────────────────────────────┘
```

---

## 🗄️ Database Migration

Currently uses **in-memory storage** (data lost on restart). To use a real database:

### Option 1: MongoDB
```javascript
// database.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  passwordHash: String,
  apiKey: String,
  eventSubSecret: String,
  twitchClientId: String,
  twitchClientSecret: String,
  minecraftServerUrl: String
});

module.exports = mongoose.model('User', UserSchema);
```

### Option 2: PostgreSQL
```javascript
// database.js
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'twitch_minecraft',
  user: 'your_user',
  password: 'your_password'
});

// CREATE TABLE users (...)
```

---

## 📝 Full API Documentation

See `API_DOCUMENTATION.md` for complete API reference with examples.

---

## 🎮 Minecraft Plugin

**No changes needed!** The plugin works the same way:
- Receives POST requests at `/twitch-event`
- Processes events based on config.yml
- Spawns mobs with Twitch usernames
- Applies mining fatigue on hit
- Only works in `mines/*` worlds

---

## 🐛 Troubleshooting

### "Invalid signature"
- Check that your `eventSubSecret` is correct
- Verify timestamp is current (within 10 minutes)
- Ensure webhook URL includes your correct `userId`

### "User not found"
- Verify you're using the correct `userId` in webhook URL
- Check user exists and is active

### Events not forwarding to Minecraft
- Check `minecraftServerUrl` is correct
- Verify Minecraft plugin is running on port 8080
- Check plugin logs for errors

### Session expired
- Login again to get new session token
- Tokens expire after 24 hours

---

## 🔮 Future Enhancements

- [ ] Real database (MongoDB/PostgreSQL)
- [ ] Password reset functionality
- [ ] Email verification
- [ ] Rate limiting per user
- [ ] Event history/logs
- [ ] Web dashboard UI
- [ ] Multiple Minecraft servers per user
- [ ] Custom event handlers
- [ ] Analytics and statistics

---

## 📄 License

MIT

---

## 🤝 Contributing

This is now a fully expandable system! Easy to add:
- New event types
- New authentication methods (OAuth, JWT)
- New database backends
- New features and endpoints

---

## ⚡ Performance Notes

- In-memory database is fast but not persistent
- Each user's credentials are isolated
- Signature verification uses timing-safe comparison
- Session tokens are efficient (no DB lookup per request with cache)
- Async/await for all I/O operations

Enjoy your new expandable Twitch-Minecraft integration! 🚀
