const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function createFileStore(file, initialState) {
  return {
    kind: 'json-local',
    persistent: false,
    async init() {
      const directory = path.dirname(file);
      if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
      if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(initialState(), null, 2));
    },
    async read() {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    },
    async write(value) {
      const temporary = `${file}.tmp`;
      fs.writeFileSync(temporary, JSON.stringify(value, null, 2));
      fs.renameSync(temporary, file);
    },
    async health() {
      return true;
    }
  };
}

function createPostgresStore(connectionString, initialState) {
  const local = /(?:localhost|127\.0\.0\.1)/i.test(connectionString);
  const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'false' || local ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
  let writeQueue = Promise.resolve();

  return {
    kind: 'postgresql',
    persistent: true,
    async init() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS bastreet_state (
          id smallint PRIMARY KEY CHECK (id = 1),
          data jsonb NOT NULL,
          revision bigint NOT NULL DEFAULT 0,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(
        'INSERT INTO bastreet_state (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING',
        [JSON.stringify(initialState())]
      );
    },
    async read() {
      const result = await pool.query('SELECT data FROM bastreet_state WHERE id = 1');
      if (!result.rows[0]) throw new Error('Estado principal do BASTREET não encontrado.');
      return result.rows[0].data;
    },
    async write(value) {
      const serialized = JSON.stringify(value);
      writeQueue = writeQueue.catch(() => undefined).then(() => pool.query(
        'UPDATE bastreet_state SET data = $1::jsonb, revision = revision + 1, updated_at = now() WHERE id = 1',
        [serialized]
      ));
      await writeQueue;
    },
    async health() {
      await pool.query('SELECT 1');
      return true;
    }
  };
}

function createStore({ connectionString, file, initialState }) {
  return connectionString
    ? createPostgresStore(connectionString, initialState)
    : createFileStore(file, initialState);
}

module.exports = { createStore };
