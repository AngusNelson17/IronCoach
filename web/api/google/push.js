// Manual sync endpoint — called by the dashboard's "Sync" button.
// Validates the request, delegates to the shared reconciler.
//
// POST /api/google/push
//   body: {
//     calendarId?: "primary",
//     weekStart:  "YYYY-MM-DD",
//     events:     [{ sessionId, summary, description, start, end }, ...]
//   }

import { reconcileWeek, refreshAccessToken } from '../_lib/calendar-sync.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }

  const accessToken = await refreshAccessToken()
  if (!accessToken) {
    res.status(500).json({ error: 'Google env vars not configured. Visit /api/google/authorize first.' })
    return
  }

  try {
    const { calendarId = 'primary', weekStart, events = [] } = req.body || {}
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      res.status(400).json({ error: 'weekStart (YYYY-MM-DD) is required' })
      return
    }

    const result = await reconcileWeek({ accessToken, calendarId, weekStart, events })
    if (result.error) {
      res.status(502).json(result)
      return
    }
    res.status(200).json({ ok: true, calendarId, weekStart, ...result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
