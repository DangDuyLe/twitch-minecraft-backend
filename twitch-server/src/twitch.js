const crypto = require('crypto');
const axios = require('axios');
const database = require('./database.postgres');

class TwitchService {
  // Get app access token (for API calls that don't need user permission)
  async getAccessToken(userId) {
    const user = await database.getUserById(userId);
    if (!user) throw new Error('User not found');

    // Check if existing token is still valid
    const existingToken = await database.getTwitchToken(userId);
    if (existingToken) {
      return existingToken;
    }

    // Get new token
    try {
      const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: user.twitchClientId,
          client_secret: user.twitchClientSecret,
          grant_type: 'client_credentials'
        }
      });

      const { access_token, expires_in } = response.data;
      await database.updateTwitchToken(userId, access_token, expires_in);

      console.log(`✅ Obtained Twitch app access token for user ${user.username}`);
      return access_token;
    } catch (error) {
      console.error('❌ Error getting Twitch access token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get user access token (OAuth - required for most EventSub subscriptions)
  async getUserAccessToken(userId) {
    const user = await database.getUserById(userId);
    if (!user) throw new Error('User not found');

    // Check if existing token is still valid
    const existingToken = await database.getUserAccessToken(userId);
    if (existingToken) {
      return existingToken;
    }

    // Try to refresh if we have a refresh token
    if (user.twitchUserRefreshToken) {
      try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
          params: {
            client_id: user.twitchClientId,
            client_secret: user.twitchClientSecret,
            grant_type: 'refresh_token',
            refresh_token: user.twitchUserRefreshToken
          }
        });

        const { access_token, expires_in, refresh_token } = response.data;
        await database.updateUserAccessToken(userId, access_token, expires_in, refresh_token);

        console.log(`✅ Refreshed user access token for ${user.username}`);
        return access_token;
      } catch (error) {
        console.error('❌ Error refreshing token:', error.response?.data || error.message);
      }
    }

    throw new Error('No user access token available. User needs to authorize via OAuth.');
  }

  // Exchange OAuth code for user access token
  async exchangeCodeForToken(userId, code, redirectUri) {
    const user = await database.getUserById(userId);
    if (!user) throw new Error('User not found');

    try {
      const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: user.twitchClientId,
          client_secret: user.twitchClientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        }
      });

      const { access_token, expires_in, refresh_token } = response.data;
      await database.updateUserAccessToken(userId, access_token, expires_in, refresh_token);

      console.log(`✅ User ${user.username} authorized successfully`);
      return { access_token, expires_in, refresh_token };
    } catch (error) {
      console.error('❌ Error exchanging code for token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Verify Twitch EventSub signature
  verifySignature(req, eventSubSecret) {
    const messageId = req.headers['twitch-eventsub-message-id'];
    const timestamp = req.headers['twitch-eventsub-message-timestamp'];
    const messageSignature = req.headers['twitch-eventsub-message-signature'];

    if (!messageId || !timestamp || !messageSignature) {
      console.warn('⚠️ Missing signature headers');
      return false;
    }

    // Check timestamp to prevent replay attacks (messages older than 10 minutes are rejected)
    const messageTimestamp = new Date(timestamp).getTime();
    const currentTimestamp = Date.now();
    const tenMinutesInMs = 10 * 60 * 1000;

    if (Math.abs(currentTimestamp - messageTimestamp) > tenMinutesInMs) {
      console.warn('⚠️ Message timestamp too old or too far in future');
      return false;
    }

    // Verify signature
    const body = JSON.stringify(req.body);
    const hmac = crypto.createHmac('sha256', eventSubSecret);
    hmac.update(messageId + timestamp + body);
    const expectedSignature = 'sha256=' + hmac.digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(messageSignature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.warn('⚠️ Invalid signature:', {
        received: messageSignature,
        expected: expectedSignature
      });
    }

    return isValid;
  }

  // Subscribe to EventSub
  async subscribe(userId, type, version, condition, callbackUrl) {
    const user = await database.getUserById(userId);
    if (!user) throw new Error('User not found');

    // Webhooks ALWAYS use app access token
    // However, some events require the broadcaster to have authorized the app first
    // The authorization grants permissions to the Client ID, not the token
    const requiresPriorAuth = [
      'channel.subscribe',
      'channel.subscription.gift',
      'channel.subscription.message',
      'channel.cheer',
      'channel.follow'
    ];

    // Check if user has authorized (for events that require it)
    if (requiresPriorAuth.includes(type)) {
      const hasAuth = await database.getUserAccessToken(userId);
      if (!hasAuth) {
        throw new Error(`Event type '${type}' requires broadcaster authorization. Please complete OAuth flow first at GET /api/oauth/authorize-url`);
      }
    }

    // Always use app access token for webhook subscriptions
    const accessToken = await this.getAccessToken(userId);

    try {
      const response = await axios.post(
        'https://api.twitch.tv/helix/eventsub/subscriptions',
        {
          type: type,
          version: version,
          condition: condition,
          transport: {
            method: 'webhook',
            callback: callbackUrl,
            secret: user.eventSubSecret
          }
        },
        {
          headers: {
            'Client-ID': user.twitchClientId,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Subscribed to ${type} for user ${user.username}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error subscribing to ${type}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Get all subscriptions for user
  async getSubscriptions(userId) {
    const user = await database.getUserById(userId);
    if (!user) throw new Error('User not found');

    const accessToken = await this.getAccessToken(userId);

    try {
      const response = await axios.get(
        'https://api.twitch.tv/helix/eventsub/subscriptions',
        {
          headers: {
            'Client-ID': user.twitchClientId,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Error getting subscriptions:', error.response?.data || error.message);
      throw error;
    }
  }

  // Delete subscription
  async deleteSubscription(userId, subscriptionId) {
    const user = await database.getUserById(userId);
    if (!user) throw new Error('User not found');

    const accessToken = await this.getAccessToken(userId);

    try {
      await axios.delete(
        `https://api.twitch.tv/helix/eventsub/subscriptions?id=${subscriptionId}`,
        {
          headers: {
            'Client-ID': user.twitchClientId,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      console.log(`✅ Deleted subscription ${subscriptionId} for user ${user.username}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting subscription:', error.response?.data || error.message);
      throw error;
    }
  }

  // Send event to Minecraft server
  async sendToMinecraft(user, eventType, data) {
    try {
      const base = (user.minecraftServerUrl || '').toString().replace(/\/+$/,'');
      const targetUrl = `${base}/twitch-event`;
      console.log(`→ Forwarding ${eventType} to Minecraft at ${targetUrl}`);

      const response = await axios.post(
        targetUrl,
        {
          eventType: eventType,
          data: data
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user.userId
          }
        }
      );

      console.log(`✅ Sent ${eventType} to Minecraft server for ${user.username} (status ${response.status})`);
      return response.data;
    } catch (error) {
      // Log as much detail as possible to help debug network/SSL/errors from Render logs
      console.error('❌ Error sending to Minecraft server:', {
        target: user?.minecraftServerUrl,
        eventType,
        message: error?.message,
        code: error?.code,
        responseStatus: error?.response?.status,
        responseData: error?.response?.data
      });
      console.error(error && error.stack ? error.stack : error);
      throw error;
    }
  }
}

module.exports = new TwitchService();
