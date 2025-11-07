package com.minepath.twitchplugin;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class TwitchStreamPlugin extends JavaPlugin {
    
    private HttpServer server;
    private Gson gson;
    private EventHandler eventHandler;
    
    @Override
    public void onEnable() {
        // Save default config
        saveDefaultConfig();
        
        // Initialize
        gson = new Gson();
        eventHandler = new EventHandler(this);
        
        // Register commands
        getCommand("twitchtest").setExecutor(new TestCommand(this));
        getCommand("twitchreload").setExecutor(new ReloadCommand(this));
        
        // Register event listeners for mining slowdown
        getServer().getPluginManager().registerEvents(new MobAttackListener(this), this);
        
        // Start HTTP server
        startHttpServer();
        
        getLogger().info("TwitchStreamPlugin has been enabled!");
        
        // Show configuration info
        String targetMode = getConfig().getString("target.mode", "streamer");
        String streamerName = getConfig().getString("target.streamer_username", "NOT_SET");
        getLogger().info("Target mode: " + targetMode);
        getLogger().info("Target player: " + streamerName);
        getLogger().warning("Make sure to set 'target.streamer_username' in config.yml to your Minecraft username!");
    }
    
    @Override
    public void onDisable() {
        // Stop HTTP server
        if (server != null) {
            server.stop(0);
            getLogger().info("HTTP server stopped");
        }
        
        getLogger().info("TwitchStreamPlugin has been disabled!");
    }
    
    private void startHttpServer() {
        try {
            int port = getConfig().getInt("server.port", 8080);
            String host = getConfig().getString("server.host", "0.0.0.0");
            
            server = HttpServer.create(new InetSocketAddress(host, port), 0);
            
            // Register endpoints
            server.createContext("/twitch-event", new TwitchEventHandler());
            server.createContext("/health", new HealthCheckHandler());
            
            server.setExecutor(null); // Use default executor
            server.start();
            
            getLogger().info("HTTP server started on " + host + ":" + port);
        } catch (IOException e) {
            getLogger().severe("Failed to start HTTP server: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    public EventHandler getEventHandler() {
        return eventHandler;
    }
    
    // HTTP Handler for Twitch events
    private class TwitchEventHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("POST".equals(exchange.getRequestMethod())) {
                try {
                    // Read request body
                    InputStream is = exchange.getRequestBody();
                    String body = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                    
                    if (getConfig().getBoolean("debug.log_events", true)) {
                        getLogger().info("Received event: " + body);
                    }
                    
                    // Parse JSON
                    JsonObject json = gson.fromJson(body, JsonObject.class);
                    String eventType = json.get("eventType").getAsString();
                    JsonObject data = json.getAsJsonObject("data");
                    
                    // Process event on main thread
                    Bukkit.getScheduler().runTask(TwitchStreamPlugin.this, () -> {
                        eventHandler.handleEvent(eventType, data);
                    });
                    
                    // Send response
                    String response = "{\"status\":\"success\",\"message\":\"Event processed\"}";
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(200, response.length());
                    OutputStream os = exchange.getResponseBody();
                    os.write(response.getBytes());
                    os.close();
                    
                } catch (Exception e) {
                    getLogger().warning("Error processing event: " + e.getMessage());
                    e.printStackTrace();
                    
                    String response = "{\"status\":\"error\",\"message\":\"" + e.getMessage() + "\"}";
                    exchange.sendResponseHeaders(500, response.length());
                    OutputStream os = exchange.getResponseBody();
                    os.write(response.getBytes());
                    os.close();
                }
            } else {
                // Method not allowed
                exchange.sendResponseHeaders(405, -1);
            }
        }
    }
    
    // HTTP Handler for health check
    private class HealthCheckHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String response = "{\"status\":\"ok\",\"plugin\":\"TwitchStreamPlugin\"}";
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length());
            OutputStream os = exchange.getResponseBody();
            os.write(response.getBytes());
            os.close();
        }
    }
}
