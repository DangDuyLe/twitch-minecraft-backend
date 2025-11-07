const express = require('express');
const { requireAuth } = require('../auth');
const twitchService = require('../twitch');

const router = express.Router();

// Get OAuth authorization URL
router.get('/authorize-url', requireAuth, (req, res) => {
  try {
    const user = req.user;
    // Use CALLBACK_URL from .env
    const redirectUri = `${process.env.CALLBACK_URL}/api/oauth/callback`;
    
    const scopes = [
      'channel:read:subscriptions',
      'bits:read',
      'moderator:read:followers'
    ].join(' ');

    const state = Buffer.from(JSON.stringify({ userId: user.userId })).toString('base64');

    const authUrl = `https://id.twitch.tv/oauth2/authorize?` +
      `client_id=${user.twitchClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${state}`;

    res.json({
      authUrl: authUrl,
      message: 'Open this URL in your browser to authorize',
      scopes: scopes.split(' ')
    });
  } catch (error) {
    console.error('Get auth URL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OAuth callback endpoint
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      return res.status(400).send(`
        <html>
          <body>
            <h1>❌ Authorization Failed</h1>
            <p>Error: ${error}</p>
            <p>Description: ${error_description || 'No description'}</p>
            <a href="/">Go back</a>
          </body>
        </html>
      `);
    }

    if (!code || !state) {
      return res.status(400).send('Missing code or state parameter');
    }

    // Decode state to get userId
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
    const redirectUri = `${process.env.CALLBACK_URL}/api/oauth/callback`;

    // Exchange code for token
    await twitchService.exchangeCodeForToken(userId, code, redirectUri);

    res.send(`
      <html>
        <head>
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; background: #0e0e10; color: #efeff1; }
            h1 { color: #9147ff; }
            .success { color: #00ff00; font-size: 64px; }
          </style>
        </head>
        <body>
          <div class="success">✅</div>
          <h1>Authorization Successful!</h1>
          <p>You can now close this window and use the setup endpoint.</p>
          <p>Your server can now subscribe to Twitch events.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>❌ Error</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
});

// Check OAuth status
router.get('/status', requireAuth, (req, res) => {
  try {
    const user = req.user;
    const hasUserToken = !!user.twitchUserAccessToken && 
                         user.twitchUserTokenExpiry > Date.now();

    res.json({
      authorized: hasUserToken,
      tokenExpiry: user.twitchUserTokenExpiry ? new Date(user.twitchUserTokenExpiry).toISOString() : null,
      message: hasUserToken ? 
        'User is authorized' : 
        'User needs to authorize. Call GET /api/oauth/authorize-url'
    });
  } catch (error) {
    console.error('OAuth status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get broadcaster ID of the authorized user
router.get('/broadcaster-id', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user has authorized
    const hasUserToken = !!user.twitchUserAccessToken && 
                         user.twitchUserTokenExpiry > Date.now();
    
    if (!hasUserToken) {
      return res.status(401).json({ 
        error: 'Not authorized',
        message: 'Please complete OAuth authorization first at GET /api/oauth/authorize-url'
      });
    }

    // Get user info from Twitch using their OAuth token
    const axios = require('axios');
    const response = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': user.twitchClientId,
        'Authorization': `Bearer ${user.twitchUserAccessToken}`
      }
    });

    if (!response.data.data || response.data.data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = response.data.data[0];
    res.json({
      broadcasterId: userData.id,
      username: userData.login,
      displayName: userData.display_name,
      broadcasterType: userData.broadcaster_type,
      profileImageUrl: userData.profile_image_url,
      message: `Use this broadcaster ID (${userData.id}) in your setup call`
    });
  } catch (error) {
    console.error('Get broadcaster ID error:', error);
    res.status(500).json({ 
      error: error.response?.data?.message || error.message || 'Internal server error' 
    });
  }
});

module.exports = router;
