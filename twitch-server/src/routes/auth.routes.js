const express = require('express');
const database = require('../database.postgres');
const { requireAuth } = require('../auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, password, twitchClientId, twitchClientSecret, minecraftServerUrl } = req.body;

    // Validation
    if (!username || !password || !twitchClientId || !twitchClientSecret || !minecraftServerUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if username already exists
    const existingUser = await database.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Create user
    const result = await database.createUser(
      username,
      password,
      twitchClientId,
      twitchClientSecret,
      minecraftServerUrl
    );

    res.status(201).json({
      message: 'User created successfully',
      userId: result.userId,
      apiKey: result.apiKey,
      eventSubSecret: result.eventSubSecret,
      webhookUrl: `${req.protocol}://${req.get('host')}/webhook/${result.userId}`
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing username or password' });
    }

    const user = await database.verifyPassword(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Create session
    const sessionToken = await database.createSession(user.userId);

    res.json({
      message: 'Login successful',
      sessionToken: sessionToken,
      userId: user.userId,
      username: user.username,
      apiKey: user.apiKey,
      eventSubSecret: user.eventSubSecret,
      minecraftServerUrl: user.minecraftServerUrl
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await database.deleteSession(req.session.token);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info
router.get('/me', requireAuth, (req, res) => {
  try {
    const { passwordHash, twitchClientSecret, ...safeUser } = req.user;
    res.json(safeUser);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user settings
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { minecraftServerUrl, twitchClientId, twitchClientSecret } = req.body;
    const updates = {};

    if (minecraftServerUrl) updates.minecraftServerUrl = minecraftServerUrl;
    if (twitchClientId) updates.twitchClientId = twitchClientId;
    if (twitchClientSecret) updates.twitchClientSecret = twitchClientSecret;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await database.updateUser(req.user.userId, updates);
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
