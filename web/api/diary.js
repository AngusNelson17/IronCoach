// Diary CRUD. Falls back to 503 if no DB is configured yet, so the
// frontend can keep using localStorage until you wire up Vercel Postgres.
//
// GET  /api/diary                     -> all entries
// GET  /api/diary?date=YYYY-MM-DD     -> one entry
// PUT  /api/diary  body: { date, mood, sleep, rpe, body, fuel, reflection, injury }

import { sql, hasDb, ensureTables } from './_lib/db.js'

export default async function handler(req, res) {
  if (!hasDb()) {
    res.status(503).json({ error: 'No database connected. Provision Vercel Postgres in the Storage tab to enable.' })
    return
  }
  try {
    await ensureTables()
    const url = new URL(req.url, `https://${req.headers.host}`)

    if (req.method === 'GET') {
      const date = url.searchParams.get('date')
      if (date) {
        const rows = await sql`SELECT * FROM diary_entries WHERE date = ${date}`
        res.status(200).json(rows[0] || null)
        return
      }
      const rows = await sql`SELECT * FROM diary_entries ORDER BY date DESC LIMIT 365`
      res.status(200).json(rows)
      return
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const b = req.body || {}
      if (!b.date) { res.status(400).json({ error: 'date required' }); return }
      await sql`
        INSERT INTO diary_entries (date, mood, sleep_hours, rpe, body_check, fuel, reflection, injury_flag, updated_at)
        VALUES (${b.date}, ${b.mood ?? null}, ${b.sleep ?? null}, ${b.rpe ?? null}, ${b.body ?? null}, ${b.fuel ?? null}, ${b.reflection ?? null}, ${b.injury ?? false}, NOW())
        ON CONFLICT (date) DO UPDATE SET
          mood = EXCLUDED.mood,
          sleep_hours = EXCLUDED.sleep_hours,
          rpe = EXCLUDED.rpe,
          body_check = EXCLUDED.body_check,
          fuel = EXCLUDED.fuel,
          reflection = EXCLUDED.reflection,
          injury_flag = EXCLUDED.injury_flag,
          updated_at = NOW()
      `
      res.status(200).json({ ok: true })
      return
    }

    if (req.method === 'DELETE') {
      const date = url.searchParams.get('date')
      if (!date) { res.status(400).json({ error: 'date required' }); return }
      await sql`DELETE FROM diary_entries WHERE date = ${date}`
      res.status(200).json({ ok: true })
      return
    }

    res.status(405).json({ error: 'method not allowed' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
