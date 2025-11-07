# How to Get Your Twitch Credentials

This guide will walk you through getting all the necessary credentials to use the Twitch-Minecraft integration.

---

## 📋 What You Need

You'll need three things from Twitch:
1. **Client ID** - Your application identifier
2. **Client Secret** - Your application password
3. **Broadcaster User ID** - Your Twitch channel's numeric ID

---

## 🔑 Step 1: Get Client ID and Client Secret

### 1.1 Go to Twitch Developers Console

Visit: **https://dev.twitch.tv/console**

### 1.2 Login with Your Twitch Account

- Click "Log in with Twitch"
- Use your streaming Twitch account credentials

### 1.3 Register a New Application

1. Click **"Register Your Application"** button
2. Fill in the form:
   - **Name**: `MyMinecraftIntegration` (or any name you want)
   - **OAuth Redirect URLs**: `http://localhost:3000` (or your server URL)
   - **Category**: Select `Application Integration`
   - **Client Type**: Select `Confidential`
   - (Optional) **Website**: Your website if you have one
3. Complete the CAPTCHA
4. Click **"Create"**

### 1.4 Get Your Credentials

1. Find your new application in the list
2. Click **"Manage"**
3. You'll see:
   - **Client ID**: A long string like `abc123def456ghi789jkl012mno345pq`
   - **Client Secret**: Click **"New Secret"** button to generate
     - ⚠️ **IMPORTANT**: Copy this immediately! You won't be able to see it again
     - If you lose it, click "New Secret" to generate a new one

**Example:**
```
Client ID:     hof5gwx0su6owfnys0yan9c87zr6t
Client Secret: 41vpdji4e9gif29md0ouet6fktd2
```

---

## 👤 Step 2: Get Your Broadcaster User ID

### Method 1: Using Twitch API (Recommended)

#### Option A: Via Browser
1. Go to: **https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/**
2. Enter your Twitch username (e.g., `HungPhan`)
3. Click "Get User ID"
4. Copy the numeric ID

#### Option B: Via Command Line (using curl)
```bash
# Replace YOUR_CLIENT_ID and YOUR_USERNAME
curl -X GET 'https://api.twitch.tv/helix/users?login=YOUR_USERNAME' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Client-Id: YOUR_CLIENT_ID'
```

First, get an access token:
```bash
curl -X POST 'https://id.twitch.tv/oauth2/token' \
  -d 'client_id=YOUR_CLIENT_ID' \
  -d 'client_secret=YOUR_CLIENT_SECRET' \
  -d 'grant_type=client_credentials'
```

### Method 2: Using Our Server (After Registration)

We can add an endpoint to help you find your ID:

```bash
# After you've registered and logged in
curl -X GET 'http://localhost:3000/api/twitch/lookup-user?username=YourTwitchUsername' \
  -H 'Authorization: Bearer YOUR_SESSION_TOKEN'
```

**Example Response:**
```json
{
  "id": "123456789",
  "login": "hungphan",
  "display_name": "HungPhan",
  "type": "",
  "broadcaster_type": "affiliate",
  "description": "Your channel description"
}
```

Your **Broadcaster User ID** is the `id` field: `123456789`

---

## 📝 Summary: What Each Credential Does

| Credential | What It Is | Where It's Used | Security Level |
|------------|------------|-----------------|----------------|
| **Client ID** | Public identifier for your app | Twitch API requests | Public (safe to share) |
| **Client Secret** | Password for your app | Twitch API authentication | 🔒 **SECRET** (never share!) |
| **Broadcaster User ID** | Your channel's numeric ID | EventSub subscriptions | Public (visible in API) |

---

## 🚀 Quick Start Example

Once you have all three credentials:

```bash
# 1. Register with the server
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "HungPhan",
    "password": "MySecurePassword123!",
    "twitchClientId": "hof5gwx0su6owfnys0yan9c87zr6t",
    "twitchClientSecret": "41vpdji4e9gif29md0ouet6fktd2",
    "minecraftServerUrl": "http://localhost:8080"
  }'

# Save the response - you'll get userId, apiKey, eventSubSecret, webhookUrl

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "HungPhan",
    "password": "MySecurePassword123!"
  }'

# Save the sessionToken from response

# 3. Setup Twitch subscriptions
curl -X POST http://localhost:3000/api/twitch/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "broadcasterUserId": "123456789"
  }'
```

---

## 🔐 Security Best Practices

### ✅ DO:
- Keep your **Client Secret** private
- Store credentials in environment variables or secure config
- Use HTTPS in production
- Rotate your Client Secret periodically

### ❌ DON'T:
- Commit credentials to Git
- Share your Client Secret publicly
- Use the same credentials across multiple apps
- Store credentials in plain text files

---

## 🆘 Troubleshooting

### "Invalid Client ID"
- Double-check you copied the entire Client ID
- Make sure there are no extra spaces
- Verify the application is still active in dev.twitch.tv/console

### "Invalid Client Secret"
- Generate a new secret (old one is invalidated)
- Copy it immediately after generation
- Don't include any quotes or spaces

### "Invalid Broadcaster User ID"
- Make sure it's the numeric ID, not the username
- Use the ID from the Twitch API, not a guess
- Verify the user exists and is active

### "OAuth Redirect URL Mismatch"
- In dev.twitch.tv/console, add `http://localhost:3000` to OAuth redirect URLs
- For production, use your actual domain (e.g., `https://yourdomain.com`)

---

## 🔄 Need to Change Credentials?

If you need to update your credentials later:

```bash
curl -X PATCH http://localhost:3000/api/auth/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "twitchClientId": "new_client_id",
    "twitchClientSecret": "new_client_secret",
    "minecraftServerUrl": "http://new-server:8080"
  }'
```

---

## 📚 Additional Resources

- **Twitch Developer Docs**: https://dev.twitch.tv/docs/
- **EventSub Guide**: https://dev.twitch.tv/docs/eventsub/
- **API Reference**: https://dev.twitch.tv/docs/api/reference/

---

## 💡 Pro Tips

1. **Create a dedicated Twitch app** for each project (easier to manage)
2. **Use descriptive names** like "MyChannel-Minecraft-Integration"
3. **Test with Twitch CLI** before going live: https://dev.twitch.tv/docs/cli
4. **Set up ngrok** for local development: `ngrok http 3000`

---

## ✅ Checklist

Before registering with the server, make sure you have:

- [ ] Twitch account created and logged in
- [ ] Application registered at dev.twitch.tv/console
- [ ] Client ID copied
- [ ] Client Secret generated and saved
- [ ] Broadcaster User ID found (your numeric channel ID)
- [ ] Minecraft server running on a known port (default: 8080)
- [ ] (Optional) ngrok running for local testing

You're ready to go! 🎉
