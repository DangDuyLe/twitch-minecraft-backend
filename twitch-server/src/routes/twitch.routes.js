const express = require('express');
const { requireAuth } = require('../auth');
const twitchService = require('../twitch');
const axios = require('axios');

const router = express.Router();

// Subscribe to Twitch events
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { type, version, condition } = req.body;

    if (!type || !version || !condition) {
      return res.status(400).json({ error: 'Missing required fields: type, version, condition' });
    }

    const callbackUrl = `${req.protocol}://${req.get('host')}/webhook/${req.user.userId}`;
    
    const result = await twitchService.subscribe(
      req.user.userId,
      type,
      version,
      condition,
      callbackUrl
    );

    res.json({
      message: 'Subscription created successfully',
      subscription: result
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get all subscriptions
router.get('/subscriptions', requireAuth, async (req, res) => {
  try {
    const subscriptions = await twitchService.getSubscriptions(req.user.userId);
    res.json(subscriptions);
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Delete subscription
router.delete('/subscriptions/:id', requireAuth, async (req, res) => {
  try {
    await twitchService.deleteSubscription(req.user.userId, req.params.id);
    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Quick setup - subscribe to all common events
router.post('/setup', requireAuth, async (req, res) => {
  try {
    const { broadcasterUserId } = req.body;

    if (!broadcasterUserId) {
      return res.status(400).json({ error: 'Missing broadcasterUserId' });
    }

    const callbackUrl = `${process.env.CALLBACK_URL}/webhook/${req.user.userId}`;
    const results = [];

    // Subscribe to all common events
    const events = [
      { type: 'channel.subscribe', version: '1', condition: { broadcaster_user_id: broadcasterUserId } },
      { type: 'channel.subscription.gift', version: '1', condition: { broadcaster_user_id: broadcasterUserId } },
      { type: 'channel.cheer', version: '1', condition: { broadcaster_user_id: broadcasterUserId } },
      { type: 'channel.raid', version: '1', condition: { to_broadcaster_user_id: broadcasterUserId } },
      { type: 'channel.follow', version: '2', condition: { broadcaster_user_id: broadcasterUserId, moderator_user_id: broadcasterUserId } }
    ];

    for (const event of events) {
      try {
        const result = await twitchService.subscribe(
          req.user.userId,
          event.type,
          event.version,
          event.condition,
          callbackUrl
        );
        results.push({ event: event.type, status: 'success', data: result });
      } catch (error) {
        results.push({ event: event.type, status: 'failed', error: error.message });
      }
    }

    res.json({
      message: 'Setup completed',
      results: results
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Lookup Twitch user by username to get broadcaster ID
router.get('/lookup-user', requireAuth, async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'Missing username parameter' });
    }

    const accessToken = await twitchService.getAccessToken(req.user.userId);

    const response = await axios.get(
      `https://api.twitch.tv/helix/users?login=${username}`,
      {
        headers: {
          'Client-ID': req.user.twitchClientId,
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.data.data || response.data.data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = response.data.data[0];
    res.json({
      id: userData.id,
      login: userData.login,
      display_name: userData.display_name,
      type: userData.type,
      broadcaster_type: userData.broadcaster_type,
      description: userData.description,
      profile_image_url: userData.profile_image_url,
      created_at: userData.created_at
    });
  } catch (error) {
    console.error('Lookup user error:', error);
    res.status(500).json({ 
      error: error.response?.data?.message || error.message || 'Internal server error' 
    });
  }
});

// Validate Twitch credentials (public endpoint - no auth required)
router.post('/validate-credentials', async (req, res) => {
  try {
    const { twitchClientId, twitchClientSecret } = req.body;

    if (!twitchClientId || !twitchClientSecret) {
      return res.status(400).json({ error: 'Missing twitchClientId or twitchClientSecret' });
    }

    // Try to get an access token with these credentials
    try {
      const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: twitchClientId,
          client_secret: twitchClientSecret,
          grant_type: 'client_credentials'
        }
      });

      res.json({
        valid: true,
        message: 'Credentials are valid',
        token_type: response.data.token_type,
        expires_in: response.data.expires_in
      });
    } catch (error) {
      res.status(401).json({
        valid: false,
        message: 'Invalid credentials',
        error: error.response?.data?.message || 'Authentication failed'
      });
    }
  } catch (error) {
    console.error('Validate credentials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
