require('dotenv').config();
const { Pool } = require('pg');


const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'ecommerce_test',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '1234',
});

module.exports = pool;
