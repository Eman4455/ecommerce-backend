
const pool = require('./db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(255)        NOT NULL,
      email      VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ         NOT NULL DEFAULT NOW()
    )
  `);
}

module.exports = migrate;
