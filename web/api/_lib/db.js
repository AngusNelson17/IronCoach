// Postgres helper. Uses the connection string Vercel auto-injects when
// you provision a Postgres database in the Storage tab (Neon, Supabase,
// etc. all set DATABASE_URL or POSTGRES_URL). If neither is set, hasDb()
// returns false and the API endpoints respond 503 so the frontend can
// fall back to localStorage.

import postgres from 'postgres'

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  null

export const hasDb = () => !!connectionString

// Lazy singleton — Vercel cold-starts share this if warm
let _sql = null
export function sql(strings, ...values) {
  if (!connectionString) throw new Error('No DATABASE_URL / POSTGRES_URL configured')
  if (!_sql) _sql = postgres(connectionString, { prepare: false, max: 1, ssl: 'require' })
  return _sql(strings, ...values)
}

let _initialised = false
export async function ensureTables() {
  if (_initialised) return
  await sql`
    CREATE TABLE IF NOT EXISTS diary_entries (
      date          DATE PRIMARY KEY,
      mood          INT,
      sleep_hours   NUMERIC(3,1),
      rpe           INT,
      body_check    TEXT,
      fuel          TEXT,
      reflection    TEXT,
      injury_flag   BOOLEAN DEFAULT FALSE,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS planner_state (
      week_start  DATE NOT NULL,
      session_id  TEXT NOT NULL,
      done        BOOLEAN DEFAULT FALSE,
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (week_start, session_id)
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS manual_logs (
      id          TEXT PRIMARY KEY,
      date        DATE NOT NULL,
      type        TEXT NOT NULL,
      name        TEXT,
      mins        INT,
      dist        INT,
      notes       TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
  _initialised = true
}
