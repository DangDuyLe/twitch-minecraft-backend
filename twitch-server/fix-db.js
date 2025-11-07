require('dotenv').config();
const { Client } = require('pg');

async function fixDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'twitch_minecraft',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Fix minecraft server URL to 8081 (plugin port)
    const result = await client.query(
      "UPDATE users SET minecraft_server_url = 'http://localhost:8081'"
    );
    
    console.log(`✅ Updated ${result.rowCount} user(s) with correct Minecraft server URL (port 8081)`);

    // Show current users
    const users = await client.query('SELECT user_id, username, minecraft_server_url FROM users');
    console.log('\n📋 Current users:');
    users.rows.forEach(user => {
      console.log(`  - ${user.username}: ${user.minecraft_server_url}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

fixDatabase();
