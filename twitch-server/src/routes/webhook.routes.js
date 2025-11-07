const express = require('express');
const database = require('../database.postgres');
const twitchService = require('../twitch');
const { addEvent } = require('./events.routes');
const { requireAuth } = require('../auth');

const router = express.Router();

// Test endpoint - send event directly without Twitch
router.post('/test', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: 'Missing type or data' });
    }

    // Map event type names
    let eventType = type;
    if (type === 'channel.follow') eventType = 'follow';
    if (type === 'channel.cheer') eventType = 'cheer';
    if (type === 'channel.subscribe') eventType = 'subscribe';
    if (type === 'channel.raid') eventType = 'raid';

    // Forward to Minecraft server
    try {
      await twitchService.sendToMinecraft(user, eventType, data);
      console.log(`📊 Test event sent to Minecraft: ${eventType}`);
    } catch (error) {
      console.error(`❌ Failed to send to Minecraft:`, error.message);
    }

    // Store event for web dashboard
    const eventForDashboard = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      eventType: eventType,
      timestamp: new Date().toISOString(),
      data: data,
      userName: data.userName || data.user_name || data.fromBroadcasterName || 'TestUser'
    };

    addEvent(user.userId, eventForDashboard);
    console.log(`📊 Test event stored for dashboard: ${eventType}`);

    res.json({
      success: true,
      message: 'Test event processed',
      eventType: eventType,
      storedEvent: eventForDashboard
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Webhook endpoint for specific user
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await database.getUserById(userId);

    if (!user) {
      console.warn(`⚠️ Webhook received for unknown user: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    const messageType = req.headers['twitch-eventsub-message-type'];

    // Verify signature with user's secret
    if (!twitchService.verifySignature(req, user.eventSubSecret)) {
      console.warn(`⚠️ Invalid signature for user ${user.username}`);
      return res.status(403).json({ error: 'Invalid signature' });
    }

    // Handle webhook verification challenge
    if (messageType === 'webhook_callback_verification') {
      console.log(`✅ Webhook verification for user ${user.username}`);
      return res.status(200).send(req.body.challenge);
    }

    // Handle revocation
    if (messageType === 'revocation') {
      console.log(`⚠️ Subscription revoked for user ${user.username}:`, req.body);
      return res.status(204).send();
    }

    // Handle notification
    if (messageType === 'notification') {
      const { subscription, event } = req.body;
      console.log(`📢 Received ${subscription.type} event for ${user.username}:`, event);

      // Process different event types
      let eventData = null;

      switch (subscription.type) {
        case 'channel.subscribe':
          eventData = {
            eventType: 'subscribe',
            data: {
              userName: event.user_name,
              userId: event.user_id,
              tier: event.tier,
              isGift: event.is_gift
            }
          };
          break;

        case 'channel.subscription.gift':
          eventData = {
            eventType: 'gift_subscription',
            data: {
              userName: event.user_name,
              userId: event.user_id,
              total: event.total,
              tier: event.tier,
              cumulativeTotal: event.cumulative_total
            }
          };
          break;

        case 'channel.cheer':
          eventData = {
            eventType: 'cheer',
            data: {
              userName: event.user_name,
              userId: event.user_id,
              bits: event.bits,
              message: event.message
            }
          };
          break;

        case 'channel.raid':
          eventData = {
            eventType: 'raid',
            data: {
              fromBroadcasterName: event.from_broadcaster_user_name,
              fromBroadcasterId: event.from_broadcaster_user_id,
              viewers: event.viewers
            }
          };
          break;

        case 'channel.follow':
          eventData = {
            eventType: 'follow',
            data: {
              userName: event.user_name,
              userId: event.user_id,
              followedAt: event.followed_at
            }
          };
          break;

        default:
          console.log(`⚠️ Unhandled event type: ${subscription.type}`);
          return res.status(204).send();
      }

      // Forward to Minecraft server
      if (eventData) {
        try {
          await twitchService.sendToMinecraft(user, eventData.eventType, eventData.data);
          
          // Store event for web dashboard
          const eventForDashboard = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            eventType: eventData.eventType,
            timestamp: new Date().toISOString(),
            data: eventData.data,
            userName: eventData.data.userName || eventData.data.fromBroadcasterName || 'Anonymous'
          };
          
          addEvent(userId, eventForDashboard);
          console.log(`📊 Event stored for dashboard: ${eventData.eventType}`);
          
        } catch (error) {
          console.error(`❌ Failed to forward event to Minecraft for ${user.username}:`, error.message);
          // Still return 204 to acknowledge receipt from Twitch
        }
      }

      return res.status(204).send();
    }

    res.status(200).send();
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
