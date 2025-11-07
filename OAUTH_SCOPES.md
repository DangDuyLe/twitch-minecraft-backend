# Twitch OAuth Scopes Required

Some Twitch EventSub subscriptions require **user access tokens** instead of app access tokens.

## 🔐 Authorization Types

### App Access Token (Client Credentials)
- ✅ Works for: `channel.raid`
- ❌ Doesn't work for: Most channel events

### User Access Token (OAuth)
- ✅ Required for: `channel.subscribe`, `channel.subscription.gift`, `channel.cheer`, `channel.follow`
- ✅ Requires the broadcaster to authorize your app

## 📝 Required Scopes

| Event Type | Required Scope |
|------------|----------------|
| `channel.subscribe` | `channel:read:subscriptions` |
| `channel.subscription.gift` | `channel:read:subscriptions` |
| `channel.cheer` | `bits:read` |
| `channel.follow` | `moderator:read:followers` |
| `channel.raid` | None (app token works) |

## 🔧 Solution: Implement OAuth Flow

You need to add an OAuth authorization flow where users grant your app permission to access their channel data.

### Option 1: Manual OAuth Token (Quick Fix)

1. Go to: https://twitchtokengenerator.com/
2. Select these scopes:
   - `channel:read:subscriptions`
   - `bits:read`
   - `moderator:read:followers`
3. Generate token
4. Use that token instead of app access token

### Option 2: Implement OAuth Flow (Recommended)

Add these endpoints to your server to handle the full OAuth flow.

## 🚀 I'll implement the full OAuth solution now...
