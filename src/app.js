const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

/**
 * POST /users
 * Register a new user.
 *
 * Request body:
 *   { "name": string, "email": string }
 *
 * Responses:
 *   201 – user created, returns the new user object
 *   400 – missing required fields
 *   409 – email already registered
 *   500 – internal server error
 */
app.post('/users', async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (name, email)
       VALUES ($1, $2)
       RETURNING id, name, email, created_at`,
      [name, email]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    // PostgreSQL unique-violation error code
    if (err.code === '23505') {
      return res.status(409).json({ error: 'email already registered' });
    }
    console.error('POST /users error:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = app;
