/**
 * Integration tests for POST /users
 *
 * Requirements:
 *  - A real PostgreSQL instance must be reachable (configured via env vars).
 *  - No mocking — every assertion hits the actual database.
 *  - Test data is cleaned up after each test.
 */

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');
const migrate = require('../src/migrate');

// Emails inserted during tests — collected so we can delete them afterwards.
const insertedEmails = [];

beforeAll(async () => {
  // Ensure the schema exists before any test runs.
  await migrate();
});

afterEach(async () => {
  // Remove only the rows created by this test suite.
  if (insertedEmails.length > 0) {
    await pool.query(
      `DELETE FROM users WHERE email = ANY($1::text[])`,
      [insertedEmails]
    );
    insertedEmails.length = 0;
  }
});

afterAll(async () => {
  // Release the connection pool so Jest can exit cleanly.
  await pool.end();
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Wraps supertest POST /users and tracks the email for cleanup.
 */
async function registerUser(payload) {
  if (payload && payload.email) {
    insertedEmails.push(payload.email);
  }
  return request(app).post('/users').send(payload).set('Content-Type', 'application/json');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /users', () => {
  it('creates a new user and returns 201 with the user object', async () => {
    const payload = { name: 'Alice Smith', email: 'alice@example.com' };

    const response = await registerUser(payload);

    // HTTP response assertions
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: payload.name,
      email: payload.email,
    });
    expect(response.body.id).toBeDefined();
    expect(response.body.created_at).toBeDefined();

    // Database persistence assertion — query the DB directly
    const { rows } = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [payload.email]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe(payload.name);
    expect(rows[0].email).toBe(payload.email);
    expect(rows[0].id).toBe(response.body.id);
  });

  it('returns 400 when name is missing', async () => {
    const response = await request(app)
      .post('/users')
      .send({ email: 'noname@example.com' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/name/i);
  });

  it('returns 400 when email is missing', async () => {
    const response = await request(app)
      .post('/users')
      .send({ name: 'Bob' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/email/i);
  });

  it('returns 409 when the email is already registered', async () => {
    const payload = { name: 'Carol', email: 'carol@example.com' };

    // First registration — should succeed
    const first = await registerUser(payload);
    expect(first.status).toBe(201);

    // Second registration with the same email — should conflict
    const second = await request(app)
      .post('/users')
      .send(payload)
      .set('Content-Type', 'application/json');

    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already registered/i);
  });

  it('does not persist a user when validation fails', async () => {
    const email = 'ghost@example.com';

    await request(app)
      .post('/users')
      .send({ email }) // missing name
      .set('Content-Type', 'application/json');

    const { rows } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    expect(rows).toHaveLength(0);
  });
});
