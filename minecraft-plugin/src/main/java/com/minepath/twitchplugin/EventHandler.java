package com.minepath.twitchplugin;

import com.google.gson.JsonObject;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.entity.EntityType;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

import java.util.Random;

public class EventHandler {
    
    private final TwitchStreamPlugin plugin;
    private final Random random;
    
    public EventHandler(TwitchStreamPlugin plugin) {
        this.plugin = plugin;
        this.random = new Random();
    }
    
    public void handleEvent(String eventType, JsonObject data) {
        String configPath = "events." + eventType.replace("_", "");
        
        // Check if event is enabled
        if (!plugin.getConfig().getBoolean(configPath + ".enabled", false)) {
            plugin.getLogger().info("Event type " + eventType + " is disabled");
            return;
        }
        
        plugin.getLogger().info("Processing event: " + eventType);
        
        switch (eventType) {
            case "subscribe":
                handleSubscribe(data);
                break;
            case "gift_subscription":
                handleGiftSubscription(data);
                break;
            case "cheer":
                handleCheer(data);
                break;
            case "raid":
                handleRaid(data);
                break;
            case "follow":
                handleFollow(data);
                break;
            default:
                plugin.getLogger().warning("Unknown event type: " + eventType);
        }
    }
    
    private void handleSubscribe(JsonObject data) {
        String userName = data.get("userName").getAsString();
        boolean isGift = data.has("isGift") && data.get("isGift").getAsBoolean();
        
        if (isGift) {
            return; // Gift subs are handled separately
        }
        
        int amount = plugin.getConfig().getInt("events.subscribe.amount", 1);
        String mobType = plugin.getConfig().getString("events.subscribe.action", "spawn_zombie");
        
        Player target = getTargetPlayer();
        if (target == null) return;
        
        spawnMobs(target, EntityType.ZOMBIE, amount, userName);
        
        String message = plugin.getConfig().getString("events.subscribe.message", "")
                .replace("%player%", target.getName())
                .replace("%user%", userName);
        broadcastMessage(message);
    }
    
    private void handleGiftSubscription(JsonObject data) {
        String userName = data.get("userName").getAsString();
        int total = data.get("total").getAsInt();
        
        int amount = plugin.getConfig().getInt("events.giftsubscription.amount", 5);
        amount = Math.min(amount * total, plugin.getConfig().getInt("spawn.max_mobs_per_event", 50));
        
        Player target = getTargetPlayer();
        if (target == null) return;
        
        spawnMobs(target, EntityType.ZOMBIE, amount, userName);
        
        String message = plugin.getConfig().getString("events.giftsubscription.message", "")
                .replace("%player%", target.getName())
                .replace("%user%", userName)
                .replace("%amount%", String.valueOf(amount));
        broadcastMessage(message);
    }
    
    private void handleCheer(JsonObject data) {
        String userName = data.get("userName").getAsString();
        int bits = data.get("bits").getAsInt();
        
        int bitsPerMob = plugin.getConfig().getInt("events.cheer.bits_per_mob", 100);
        int amount = Math.max(1, bits / bitsPerMob);
        amount = Math.min(amount, plugin.getConfig().getInt("spawn.max_mobs_per_event", 50));
        
        String mobTypeName = plugin.getConfig().getString("events.cheer.mob_type", "skeleton");
        EntityType mobType = EntityType.valueOf(mobTypeName.toUpperCase());
        
        Player target = getTargetPlayer();
        if (target == null) return;
        
        spawnMobs(target, mobType, amount, userName);
        
        String message = plugin.getConfig().getString("events.cheer.message", "")
                .replace("%player%", target.getName())
                .replace("%user%", userName)
                .replace("%bits%", String.valueOf(bits))
                .replace("%amount%", String.valueOf(amount));
        broadcastMessage(message);
    }
    
    private void handleRaid(JsonObject data) {
        String fromBroadcaster = data.get("fromBroadcasterName").getAsString();
        int viewers = data.get("viewers").getAsInt();
        
        int viewersPerMob = plugin.getConfig().getInt("events.raid.viewers_per_mob", 10);
        int maxMobs = plugin.getConfig().getInt("events.raid.max_mobs", 20);
        int amount = Math.min(viewers / viewersPerMob, maxMobs);
        amount = Math.max(1, amount);
        
        String mobTypeName = plugin.getConfig().getString("events.raid.mob_type", "creeper");
        EntityType mobType = EntityType.valueOf(mobTypeName.toUpperCase());
        
        Player target = getTargetPlayer();
        if (target == null) return;
        
        spawnMobs(target, mobType, amount, fromBroadcaster);
        
        String message = plugin.getConfig().getString("events.raid.message", "")
                .replace("%player%", target.getName())
                .replace("%user%", fromBroadcaster)
                .replace("%viewers%", String.valueOf(viewers))
                .replace("%amount%", String.valueOf(amount));
        broadcastMessage(message);
    }
    
    private void handleFollow(JsonObject data) {
        String userName = data.get("userName").getAsString();
        
        String itemName = plugin.getConfig().getString("events.follow.item", "GOLDEN_APPLE");
        int amount = plugin.getConfig().getInt("events.follow.amount", 1);
        
        Player target = getTargetPlayer();
        if (target == null) return;
        
        Material material = Material.valueOf(itemName);
        ItemStack item = new ItemStack(material, amount);
        target.getInventory().addItem(item);
        
        String message = plugin.getConfig().getString("events.follow.message", "")
                .replace("%player%", target.getName())
                .replace("%user%", userName);
        broadcastMessage(message);
    }
    
    private Player getTargetPlayer() {
        String mode = plugin.getConfig().getString("target.mode", "streamer");
        
        switch (mode.toLowerCase()) {
            case "streamer":
                String streamerName = plugin.getConfig().getString("target.streamer_username");
                
                // Try exact match first (case-sensitive)
                Player player = Bukkit.getPlayerExact(streamerName);
                
                // If not found, try case-insensitive search
                if (player == null) {
                    player = Bukkit.getPlayer(streamerName);
                }
                
                // For offline/cracked servers, search through online players manually
                if (player == null) {
                    for (Player onlinePlayer : Bukkit.getOnlinePlayers()) {
                        if (onlinePlayer.getName().equalsIgnoreCase(streamerName)) {
                            player = onlinePlayer;
                            break;
                        }
                    }
                }
                
                if (player == null) {
                    plugin.getLogger().warning("Target player '" + streamerName + "' not found!");
                    plugin.getLogger().warning("Make sure they are online and the username matches exactly");
                    plugin.getLogger().warning("Online players: ");
                    for (Player p : Bukkit.getOnlinePlayers()) {
                        plugin.getLogger().warning("  - " + p.getName());
                    }
                }
                return player;
                
            case "random":
                var players = Bukkit.getOnlinePlayers();
                if (players.isEmpty()) {
                    plugin.getLogger().warning("No players online to target!");
                    return null;
                }
                return (Player) players.toArray()[random.nextInt(players.size())];
                
            default:
                plugin.getLogger().warning("Unknown target mode: " + mode);
                return null;
        }
    }
    
    private void spawnMobs(Player target, EntityType mobType, int amount, String userName) {
        Location playerLoc = target.getLocation();
        String worldName = playerLoc.getWorld().getName();
        
        plugin.getLogger().info("Attempting to spawn " + amount + " " + mobType.name() + "(s) for " + target.getName());
        plugin.getLogger().info("Player world: " + worldName);
        
        // Check if player is in the mines world (or any world under mines/ folder)
        if (!worldName.startsWith("mines/")) {
            plugin.getLogger().warning("Player is not in a mines world! Current world: " + worldName);
            target.sendMessage(ChatColor.RED + "⚠ Mobs can only spawn in mines worlds!");
            return;
        }
        
        plugin.getLogger().info("Player is in mines world (" + worldName + ") - proceeding with spawn");
        plugin.getLogger().info("Location: X=" + playerLoc.getBlockX() + " Y=" + playerLoc.getBlockY() + " Z=" + playerLoc.getBlockZ());
        
        // Set world difficulty to Easy
        playerLoc.getWorld().setDifficulty(org.bukkit.Difficulty.EASY);
        
        int spawned = 0;
        for (int i = 0; i < amount; i++) {
            try {
                // Spawn 3 blocks in front of player
                Location spawnLoc = playerLoc.clone();
                spawnLoc.add(playerLoc.getDirection().multiply(3));
                
                // Ensure chunk is loaded
                if (!spawnLoc.getChunk().isLoaded()) {
                    spawnLoc.getChunk().load();
                }
                
                // Spawn mob
                LivingEntity entity = (LivingEntity) spawnLoc.getWorld().spawnEntity(spawnLoc, mobType);
                
                if (entity != null) {
                    spawned++;
                    plugin.getLogger().info("  ✓ Spawned " + mobType.name() + " #" + (i+1) + " (EntityID: " + entity.getEntityId() + ")");
                    
                    // Make mob target the player
                    if (entity instanceof org.bukkit.entity.Mob) {
                        ((org.bukkit.entity.Mob) entity).setTarget(target);
                    }
                    
                    // Set mob name to Twitch username
                    entity.setCustomName(ChatColor.RED + userName);
                    entity.setCustomNameVisible(true);
                    
                    // Lightning effect
                    spawnLoc.getWorld().strikeLightningEffect(spawnLoc);
                    
                } else {
                    plugin.getLogger().warning("  ✗ Failed to spawn " + mobType.name() + " #" + (i+1));
                }
            } catch (Exception e) {
                plugin.getLogger().severe("  ✗ Error spawning: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        plugin.getLogger().info("Spawned " + spawned + "/" + amount + " mobs in mines world");
        
        if (spawned > 0) {
            target.sendMessage(ChatColor.RED + "⚠ " + spawned + " Twitch mob(s) spawned in the mines!");
            target.sendMessage(ChatColor.YELLOW + "⛏ Watch out - they slow down mining speed!");
        }
    }
    
    private void broadcastMessage(String message) {
        if (message == null || message.isEmpty()) return;
        
        String colored = ChatColor.translateAlternateColorCodes('&', message);
        Bukkit.broadcastMessage(colored);
    }
}
