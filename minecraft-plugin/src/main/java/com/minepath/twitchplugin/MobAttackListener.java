package com.minepath.twitchplugin;

import org.bukkit.ChatColor;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.potion.PotionEffect;
import org.bukkit.potion.PotionEffectType;

public class MobAttackListener implements Listener {
    
    private final TwitchStreamPlugin plugin;
    
    public MobAttackListener(TwitchStreamPlugin plugin) {
        this.plugin = plugin;
    }
    
    @EventHandler
    public void onEntityDamageByEntity(EntityDamageByEntityEvent event) {
        // Check if the victim is a player
        if (!(event.getEntity() instanceof Player)) {
            return;
        }
        
        Player player = (Player) event.getEntity();
        Entity damager = event.getDamager();
        
        // Check if the damager is a Twitch mob (has a custom name with red color)
        if (damager.getCustomName() != null && damager.getCustomName().startsWith(ChatColor.RED.toString())) {
            // Apply Mining Fatigue effect (slowdown mining speed)
            int duration = plugin.getConfig().getInt("effects.mining_fatigue.duration", 200); // 10 seconds (200 ticks)
            int amplifier = plugin.getConfig().getInt("effects.mining_fatigue.amplifier", 1); // Level 2
            
            PotionEffect miningFatigue = new PotionEffect(
                PotionEffectType.SLOW_DIGGING,
                duration,
                amplifier,
                false,
                true,
                true
            );
            
            player.addPotionEffect(miningFatigue);
            
            String mobName = ChatColor.stripColor(damager.getCustomName());
            plugin.getLogger().info("Twitch mob (" + mobName + ") hit " + player.getName() + " - Applied Mining Fatigue " + (amplifier + 1));
            player.sendMessage(ChatColor.DARK_RED + "⛏ Mining speed reduced by " + mobName + "!");
        }
    }
}
