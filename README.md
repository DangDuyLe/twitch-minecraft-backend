# Twitch Stream Plugin

A comprehensive integration system that connects Twitch events (subscriptions, donations, cheers, raids) to Minecraft gameplay. When viewers interact with your Twitch stream, it triggers exciting in-game events!

## 🎮 Features

- **Real-time Twitch Integration**: Uses Twitch EventSub webhooks for instant event notifications
- **Multiple Event Types**:
  - Subscriptions → Spawn zombies
  - Gift Subscriptions → Spawn multiple zombies
  - Bits/Cheers → Spawn skeletons (scaled by bits amount)
  - Raids → Spawn creepers (scaled by viewer count)
  - Follows → Give items to players
- **Configurable Actions**: Customize what happens for each event type
- **HTTP Communication**: Node.js server forwards events to Minecraft plugin via HTTP
- **Easy Testing**: Built-in commands to test functionality without real Twitch events

## 📁 Project Structure

```
twitch-stream-plugin/
├── twitch-server/          # Node.js server for Twitch API
│   ├── src/
│   │   └── index.js        # Main server file
│   ├── package.json
│   └── .env.example
│
└── minecraft-plugin/       # Java plugin for Minecraft
    ├── src/main/
    │   ├── java/com/minepath/twitchplugin/
    │   │   ├── TwitchStreamPlugin.java
    │   │   ├── EventHandler.java
    │   │   ├── TestCommand.java
    │   │   └── ReloadCommand.java
    │   └── resources/
    │       ├── plugin.yml
    │       └── config.yml
    ├── build.gradle
    ├── settings.gradle
    ├── gradlew
    └── gradlew.bat
```

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** (v16 or higher)
- **Java** (17 or higher)
- **Spigot/Paper Minecraft Server** (1.20.1 or compatible)
- **Twitch Developer Account**
- **Public URL** for webhooks (use ngrok for local development)

### Part 1: Twitch Server Setup

1. **Navigate to the server directory**:
   ```powershell
   cd twitch-server
   ```

2. **Install dependencies**:
   ```powershell
   npm install
   ```

3. **Configure environment variables**:
   - Copy `.env.example` to `.env`:
     ```powershell
     copy .env.example .env
     ```
   - Edit `.env` and fill in your Twitch credentials:
     - Get `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` from https://dev.twitch.tv/console/apps
     - Generate a random string for `TWITCH_EVENTSUB_SECRET`
     - Get `BROADCASTER_USER_ID` by calling Twitch API or using https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/
     - Set `CALLBACK_URL` to your public URL (e.g., `https://your-ngrok-url.ngrok.io`)

4. **Start the server**:
   ```powershell
   npm start
   ```

5. **Subscribe to Twitch events**:
   - Uncomment the line `await setupSubscriptions();` in `src/index.js`
   - Restart the server to automatically subscribe to events

### Part 2: Minecraft Plugin Setup

1. **Navigate to the plugin directory**:
   ```powershell
   cd minecraft-plugin
   ```

2. **Build the plugin**:
   ```powershell
   .\gradlew.bat build
   ```

3. **Install the plugin**:
   - Copy `build/libs/TwitchStreamPlugin-1.0.0.jar` to your Minecraft server's `plugins/` folder
   - Restart or reload your Minecraft server

4. **Configure the plugin**:
   - Edit `plugins/TwitchStreamPlugin/config.yml`
   - Set `target.streamer_username` to your Minecraft username
   - Customize event actions, mob types, and spawn settings as desired

### Part 3: Local Development with ngrok

For testing locally, you need to expose your server to the internet:

1. **Install ngrok**: https://ngrok.com/download

2. **Start ngrok**:
   ```powershell
   ngrok http 3000
   ```

3. **Update your `.env`**:
   - Copy the HTTPS URL from ngrok (e.g., `https://abc123.ngrok.io`)
   - Set `CALLBACK_URL=https://abc123.ngrok.io` in your `.env` file
   - Restart the Node.js server

## 🎯 Testing

### Test the Minecraft Plugin

Use the `/twitchtest` command in-game:

```
/twitchtest subscribe    # Test subscription event
/twitchtest gift         # Test gift subscription event
/twitchtest cheer        # Test cheer/bits event
/twitchtest raid         # Test raid event
/twitchtest follow       # Test follow event
```

### Test the Integration

1. Start both the Node.js server and Minecraft server
2. Use the test command or trigger a real Twitch event
3. Watch the mobs spawn in Minecraft!

## ⚙️ Configuration

### Twitch Server (`twitch-server/.env`)

- `TWITCH_CLIENT_ID`: Your Twitch application client ID
- `TWITCH_CLIENT_SECRET`: Your Twitch application secret
- `TWITCH_EVENTSUB_SECRET`: Secret for webhook verification (random string)
- `BROADCASTER_USER_ID`: Your Twitch user ID
- `CALLBACK_URL`: Public URL for receiving webhooks
- `MINECRAFT_PLUGIN_URL`: URL of your Minecraft plugin (default: http://localhost:8080)

### Minecraft Plugin (`plugins/TwitchStreamPlugin/config.yml`)

- **Events**: Enable/disable specific events and configure actions
- **Target**: Choose how to select the target player (streamer, random, etc.)
- **Spawn**: Configure mob spawn radius and limits
- **Debug**: Enable logging for troubleshooting

## 📝 Commands

### Minecraft Plugin Commands

- `/twitchtest <event_type>` - Test plugin functionality
- `/twitchreload` - Reload plugin configuration

## 🔧 Troubleshooting

### Server Issues

- **"Invalid signature"**: Check that `TWITCH_EVENTSUB_SECRET` matches in both Twitch subscriptions and your code
- **"Connection refused"**: Ensure ngrok is running and the URL is correct
- **"401 Unauthorized"**: Verify your Twitch credentials are correct

### Plugin Issues

- **Plugin not loading**: Check server logs for Java errors, ensure Java 17+ is used
- **Mobs not spawning**: Check `config.yml` - ensure events are enabled and target player is online
- **HTTP errors**: Verify port 8080 is not in use, check firewall settings

## 🌟 Customization Ideas

- Add particle effects when mobs spawn
- Give players buffs/debuffs based on event types
- Create boss fights for large donations
- Spawn loot chests for subscribers
- Teleport players for raids
- Custom sound effects for each event

## 📚 Resources

- [Twitch EventSub Documentation](https://dev.twitch.tv/docs/eventsub/)
- [Spigot API Documentation](https://hub.spigotmc.org/javadocs/spigot/)
- [ngrok Documentation](https://ngrok.com/docs)

## 📄 License

MIT License - feel free to modify and use as you wish!

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

---

**Happy Streaming!** 🎮✨
