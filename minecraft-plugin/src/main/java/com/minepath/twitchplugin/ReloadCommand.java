package com.minepath.twitchplugin;

import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;

public class ReloadCommand implements CommandExecutor {
    
    private final TwitchStreamPlugin plugin;
    
    public ReloadCommand(TwitchStreamPlugin plugin) {
        this.plugin = plugin;
    }
    
    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        plugin.reloadConfig();
        sender.sendMessage(ChatColor.GREEN + "TwitchStreamPlugin configuration reloaded!");
        return true;
    }
}
