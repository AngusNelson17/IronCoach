// Push planner sessions to Google Calendar.
// POST /api/google/push  body: { calendarId, events: [{summary, start, end, description}] }
//
// Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return }
  const { GOOGLE_CLIENT_ID: cid, GOOGLE_CLIENT_SECRET: cs, GOOGLE_REFRESH_TOKEN: rt } = process.env
  if (!cid || !cs || !rt) {
    res.status(500).json({ error: 'Google env vars not configured. Visit /api/google/authorize first.' })
    return
  }
  try {
    // 1. Refresh access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cid, client_secret: cs, refresh_token: rt, grant_type: 'refresh_token',
      }).toString(),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      res.status(502).json({ error: 'Failed to refresh access token', detail: tokenData })
      return
    }

    // 2. Push events
    const { calendarId = 'primary', events = [] } = req.body || {}
    const results = []
    for (const ev of events) {
      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: ev.summary,
            description: ev.description || '',
            start: ev.start,   // { dateTime: ISO, timeZone } or { date: YYYY-MM-DD }
            end: ev.end,
          }),
        }
      )
      const data = await r.json()
      results.push({ ok: r.ok, id: data.id, status: data.status, error: data.error })
    }
    res.status(200).json({ created: results.filter(r => r.ok).length, results })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
