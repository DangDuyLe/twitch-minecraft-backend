package com.minepath.twitchplugin;

import com.google.gson.JsonObject;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

public class TestCommand implements CommandExecutor {
    
    private final TwitchStreamPlugin plugin;
    
    public TestCommand(TwitchStreamPlugin plugin) {
        this.plugin = plugin;
    }
    
    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length < 1) {
            sender.sendMessage(ChatColor.RED + "Usage: /twitchtest <event_type>");
            sender.sendMessage(ChatColor.YELLOW + "Available events: subscribe, gift, cheer, raid, follow");
            return true;
        }
        
        String eventType = args[0].toLowerCase();
        JsonObject testData = new JsonObject();
        
        switch (eventType) {
            case "subscribe":
            case "sub":
                testData.addProperty("userName", "TestUser");
                testData.addProperty("userId", "12345");
                testData.addProperty("tier", "1000");
                testData.addProperty("isGift", false);
                plugin.getEventHandler().handleEvent("subscribe", testData);
                sender.sendMessage(ChatColor.GREEN + "Triggered test subscription event!");
                break;
                
            case "gift":
            case "gift_subscription":
                testData.addProperty("userName", "TestGifter");
                testData.addProperty("userId", "12345");
                testData.addProperty("total", 5);
                testData.addProperty("tier", "1000");
                plugin.getEventHandler().handleEvent("gift_subscription", testData);
                sender.sendMessage(ChatColor.GREEN + "Triggered test gift subscription event!");
                break;
                
            case "cheer":
            case "bits":
                testData.addProperty("userName", "TestCheerer");
                testData.addProperty("userId", "12345");
                testData.addProperty("bits", 500);
                testData.addProperty("message", "Test cheer message!");
                plugin.getEventHandler().handleEvent("cheer", testData);
                sender.sendMessage(ChatColor.GREEN + "Triggered test cheer event!");
                break;
                
            case "raid":
                testData.addProperty("fromBroadcasterName", "TestRaider");
                testData.addProperty("viewers", 100);
                plugin.getEventHandler().handleEvent("raid", testData);
                sender.sendMessage(ChatColor.GREEN + "Triggered test raid event!");
                break;
                
            case "follow":
                testData.addProperty("userName", "TestFollower");
                testData.addProperty("userId", "12345");
                testData.addProperty("followedAt", "2024-01-01T00:00:00Z");
                plugin.getEventHandler().handleEvent("follow", testData);
                sender.sendMessage(ChatColor.GREEN + "Triggered test follow event!");
                break;
                
            default:
                sender.sendMessage(ChatColor.RED + "Unknown event type: " + eventType);
                sender.sendMessage(ChatColor.YELLOW + "Available events: subscribe, gift, cheer, raid, follow");
                return true;
        }
        
        return true;
    }
}
