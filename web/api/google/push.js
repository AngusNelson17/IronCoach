// Reconciling sync of IronCoach planner sessions to Google Calendar.
//
// POST /api/google/push
//   body: {
//     calendarId?: "primary",
//     weekStart:  "YYYY-MM-DD",          // Monday of the week to sync
//     events: [{
//       sessionId: "mon1",                // stable id from the planner
//       summary, description, start, end  // standard Google Calendar Event fields
//     }, ...]
//   }
//
// Behaviour:
//   1. Tags every event with extendedProperties { ironcoach: '1', sessionId, weekStart }
//   2. Lists existing events tagged for this week, matches by sessionId, and:
//        - PATCHes if the session still exists in the new payload
//        - DELETEs if no longer present
//        - POSTs a new event for any new sessionId
//   3. Sweeps up any leftover, untagged "IronCoach planner" events in the same
//      week range (handles the legacy wonky push). Untagged events outside the
//      "IronCoach planner" search are never touched.
//
// Idempotent: a second click with no changes results in zero writes.

const TAG_KEY = 'ironcoach'
const TAG_VAL = '1'

async function refreshAccessToken() {
  const { GOOGLE_CLIENT_ID: cid, GOOGLE_CLIENT_SECRET: cs, GOOGLE_REFRESH_TOKEN: rt } = process.env
  if (!cid || !cs || !rt) return null
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cid, client_secret: cs, refresh_token: rt, grant_type: 'refresh_token',
    }).toString(),
  })
  const data = await r.json()
  return data.access_token || null
}

function weekRangeIso(weekStart) {
  // weekStart is YYYY-MM-DD local; build local-midnight to +7d in ISO.
  const start = new Date(`${weekStart}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { timeMin: start.toISOString(), timeMax: end.toISOString() }
}

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
  const auth = { Authorization: `Bearer ${accessToken}` }

  try {
    const { calendarId = 'primary', weekStart, events = [] } = req.body || {}
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      res.status(400).json({ error: 'weekStart (YYYY-MM-DD) is required' })
      return
    }

    const calUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`
    const { timeMin, timeMax } = weekRangeIso(weekStart)

    // ── 1. List tagged events for this week ─────────────────────────────────
    const taggedListUrl =
      `${calUrl}/events?maxResults=250` +
      `&privateExtendedProperty=${encodeURIComponent(`${TAG_KEY}=${TAG_VAL}`)}` +
      `&privateExtendedProperty=${encodeURIComponent(`weekStart=${weekStart}`)}`
    const taggedRes = await fetch(taggedListUrl, { headers: auth })
    const taggedData = await taggedRes.json()
    if (!Array.isArray(taggedData.items)) {
      res.status(502).json({ error: 'Failed to list tagged events', detail: taggedData })
      return
    }
    const tagged = taggedData.items.map(e => ({
      id: e.id,
      sessionId: e.extendedProperties?.private?.sessionId || '',
    }))
    const taggedBySession = Object.fromEntries(tagged.map(t => [t.sessionId, t]))

    // ── 2. Reconcile each planner session ───────────────────────────────────
    const incomingIds = new Set()
    const created = [], updated = [], deleted = [], errors = []

    for (const ev of events) {
      if (!ev.sessionId) { errors.push({ stage: 'validate', detail: 'missing sessionId on event' }); continue }
      incomingIds.add(ev.sessionId)
      const body = {
        summary: ev.summary,
        description: ev.description,
        start: ev.start,
        end: ev.end,
        extendedProperties: {
          private: {
            [TAG_KEY]: TAG_VAL,
            sessionId: ev.sessionId,
            weekStart,
          },
        },
      }
      const existing = taggedBySession[ev.sessionId]
      if (existing) {
        const r = await fetch(`${calUrl}/events/${existing.id}`, {
          method: 'PATCH',
          headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (r.ok) updated.push(ev.sessionId)
        else errors.push({ stage: 'update', sessionId: ev.sessionId, status: r.status })
      } else {
        const r = await fetch(`${calUrl}/events`, {
          method: 'POST',
          headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (r.ok) created.push(ev.sessionId)
        else errors.push({ stage: 'create', sessionId: ev.sessionId, status: r.status })
      }
    }

    // ── 3. Delete tagged events whose session is gone from the planner ──────
    for (const t of tagged) {
      if (!incomingIds.has(t.sessionId)) {
        const r = await fetch(`${calUrl}/events/${t.id}`, { method: 'DELETE', headers: auth })
        if (r.ok || r.status === 410) deleted.push(t.sessionId)
        else errors.push({ stage: 'delete', sessionId: t.sessionId, status: r.status })
      }
    }

    // ── 4. Sweep up legacy untagged "IronCoach planner" events in this week ─
    let swept = 0
    const sweepListUrl =
      `${calUrl}/events?maxResults=100` +
      `&q=${encodeURIComponent('IronCoach planner')}` +
      `&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
      `&singleEvents=true`
    const sweepRes = await fetch(sweepListUrl, { headers: auth })
    const sweepData = await sweepRes.json()
    if (Array.isArray(sweepData.items)) {
      for (const e of sweepData.items) {
        const isTagged = e.extendedProperties?.private?.[TAG_KEY] === TAG_VAL
        if (isTagged) continue
        const r = await fetch(`${calUrl}/events/${e.id}`, { method: 'DELETE', headers: auth })
        if (r.ok || r.status === 410) swept++
      }
    }

    res.status(200).json({
      ok: true,
      calendarId,
      weekStart,
      created: created.length,
      updated: updated.length,
      deleted: deleted.length,
      sweptLegacy: swept,
      errors,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
