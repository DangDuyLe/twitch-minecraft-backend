const { Pool } = require('pg');
const crypto = require('crypto');

class PostgresDatabase {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'twitch_minecraft',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  async initialize() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          user_id UUID PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          api_key VARCHAR(255) UNIQUE NOT NULL,
          eventsub_secret VARCHAR(255) NOT NULL,
          twitch_client_id VARCHAR(255) NOT NULL,
          twitch_client_secret VARCHAR(255) NOT NULL,
          minecraft_server_url VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT TRUE,
          twitch_access_token TEXT,
          twitch_token_expiry BIGINT,
          twitch_refresh_token TEXT,
          twitch_user_access_token TEXT,
          twitch_user_token_expiry BIGINT,
          twitch_user_refresh_token TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);

        CREATE TABLE IF NOT EXISTS sessions (
          session_token VARCHAR(255) PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
          created_at BIGINT NOT NULL,
          expires_at BIGINT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      `);

      console.log('✅ PostgreSQL database initialized');
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      throw error;
    }
  }

  // User management
  async createUser(username, password, twitchClientId, twitchClientSecret, minecraftServerUrl) {
    const userId = crypto.randomUUID();
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const apiKey = crypto.randomBytes(32).toString('hex');
    const eventSubSecret = crypto.randomBytes(32).toString('hex');

    await this.pool.query(
      `INSERT INTO users (
        user_id, username, password_hash, api_key, eventsub_secret,
        twitch_client_id, twitch_client_secret, minecraft_server_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, username, passwordHash, apiKey, eventSubSecret, twitchClientId, twitchClientSecret, minecraftServerUrl]
    );

    return { userId, apiKey, eventSubSecret };
  }

  async getUserById(userId) {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      userId: row.user_id,
      username: row.username,
      passwordHash: row.password_hash,
      apiKey: row.api_key,
      eventSubSecret: row.eventsub_secret,
      twitchClientId: row.twitch_client_id,
      twitchClientSecret: row.twitch_client_secret,
      minecraftServerUrl: row.minecraft_server_url,
      createdAt: row.created_at,
      isActive: row.is_active,
      twitchAccessToken: row.twitch_access_token,
      twitchTokenExpiry: row.twitch_token_expiry,
      twitchRefreshToken: row.twitch_refresh_token,
      twitchUserAccessToken: row.twitch_user_access_token,
      twitchUserTokenExpiry: row.twitch_user_token_expiry,
      twitchUserRefreshToken: row.twitch_user_refresh_token
    };
  }

  async getUserByUsername(username) {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) return null;
    return this.getUserById(result.rows[0].user_id);
  }

  async getUserByApiKey(apiKey) {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE api_key = $1',
      [apiKey]
    );
    
    if (result.rows.length === 0) return null;
    return this.getUserById(result.rows[0].user_id);
  }

  async updateUser(userId, updates) {
    const allowedFields = ['minecraft_server_url', 'twitch_client_id', 'twitch_client_secret'];
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        fields.push(`${dbKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) return false;

    values.push(userId);
    await this.pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = $${paramIndex}`,
      values
    );

    return true;
  }

  async verifyPassword(username, password) {
    const user = await this.getUserByUsername(username);
    if (!user) return null;

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (passwordHash === user.passwordHash) {
      return user;
    }
    return null;
  }

  // Session management
  async createSession(userId) {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const createdAt = Date.now();
    const expiresAt = createdAt + (24 * 60 * 60 * 1000); // 24 hours

    await this.pool.query(
      'INSERT INTO sessions (session_token, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)',
      [sessionToken, userId, createdAt, expiresAt]
    );

    return sessionToken;
  }

  async getSession(token) {
    const result = await this.pool.query(
      'SELECT * FROM sessions WHERE session_token = $1',
      [token]
    );

    if (result.rows.length === 0) return null;

    const session = result.rows[0];
    
    if (Date.now() > session.expires_at) {
      await this.deleteSession(token);
      return null;
    }

    return {
      userId: session.user_id,
      token: session.session_token,
      createdAt: session.created_at,
      expiresAt: session.expires_at
    };
  }

  async deleteSession(token) {
    await this.pool.query('DELETE FROM sessions WHERE session_token = $1', [token]);
    return true;
  }

  // Twitch token management
  async updateTwitchToken(userId, accessToken, expiresIn, refreshToken = null) {
    const tokenExpiry = Date.now() + (expiresIn * 1000);
    
    await this.pool.query(
      'UPDATE users SET twitch_access_token = $1, twitch_token_expiry = $2, twitch_refresh_token = $3 WHERE user_id = $4',
      [accessToken, tokenExpiry, refreshToken, userId]
    );

    return true;
  }

  async getTwitchToken(userId) {
    const user = await this.getUserById(userId);
    if (!user) return null;

    if (user.twitchTokenExpiry && Date.now() > user.twitchTokenExpiry) {
      return null;
    }

    return user.twitchAccessToken;
  }

  // User access token management
  async updateUserAccessToken(userId, accessToken, expiresIn, refreshToken = null) {
    const tokenExpiry = Date.now() + (expiresIn * 1000);
    
    await this.pool.query(
      'UPDATE users SET twitch_user_access_token = $1, twitch_user_token_expiry = $2, twitch_user_refresh_token = $3 WHERE user_id = $4',
      [accessToken, tokenExpiry, refreshToken, userId]
    );

    return true;
  }

  async getUserAccessToken(userId) {
    const user = await this.getUserById(userId);
    if (!user) return null;

    if (user.twitchUserTokenExpiry && Date.now() > user.twitchUserTokenExpiry) {
      return null;
    }

    return user.twitchUserAccessToken;
  }

  // Cleanup expired sessions
  async cleanupExpiredSessions() {
    await this.pool.query('DELETE FROM sessions WHERE expires_at < $1', [Date.now()]);
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = new PostgresDatabase();
