const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Connection pool settings tuned for Railway's free tier
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Log pool errors but don't crash — Railway will handle restarts if needed
pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err.message);
});

const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

/**
 * Resolve the migrations directory.
 * Supports three layouts:
 *   1. Railway/standalone: MIGRATIONS_DIR env var (absolute path)
 *   2. api-service deployed with its own db/ folder: <api-service>/db/migrations
 *   3. Local monorepo: <repo-root>/db/migrations (original layout)
 */
function getMigrationsDir() {
  if (process.env.MIGRATIONS_DIR) return process.env.MIGRATIONS_DIR;
  // When Railway sets Root Directory = api-service, __dirname = /app/src/config
  const localPath = path.join(__dirname, '..', '..', 'db', 'migrations');
  if (fs.existsSync(localPath)) return localPath;
  // Local monorepo fallback: go up one more level to repo root
  return path.join(__dirname, '..', '..', '..', 'db', 'migrations');
}

// Run migrations
const migrate = async () => {
  const migrationsDir = getMigrationsDir();
  console.log(`📂 Migrations directory: ${migrationsDir}`);
  const files = fs.readdirSync(migrationsDir).sort();

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        ran_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    for (const file of files) {
      if (!file.endsWith('.sql')) continue;
      const { rows } = await client.query('SELECT id FROM migrations WHERE filename = $1', [file]);
      if (rows.length > 0) {
        console.log(`  ✓ Already ran: ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
      console.log(`  ✓ Migrated: ${file}`);
    }
    console.log('✅ All migrations complete');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { query, getClient, pool, migrate };
