// Shared Google Calendar sync logic used by both /api/google/push (manual
// button) and /api/google/cron-sync (daily Vercel cron). Refreshes the
// stored OAuth refresh_token into a short-lived access_token, then
// reconciles a week's worth of tagged events against the provided payload.

const TAG_KEY = 'ironcoach'
const TAG_VAL = '1'

export async function refreshAccessToken() {
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
  const start = new Date(`${weekStart}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { timeMin: start.toISOString(), timeMax: end.toISOString() }
}

// Reconciles a week of IronCoach planner events against a Google Calendar.
//   - CREATE for sessionIds not yet on the calendar
//   - PATCH for existing tagged events still in the planner
//   - DELETE for tagged events whose session is no longer in the planner
//   - DELETE for untagged legacy "IronCoach planner" events in the same week
//
// Returns: { created, updated, deleted, sweptLegacy, errors }
export async function reconcileWeek({ accessToken, calendarId = 'primary', weekStart, events }) {
  const auth = { Authorization: `Bearer ${accessToken}` }
  const calUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`
  const { timeMin, timeMax } = weekRangeIso(weekStart)

  // 1. List tagged events for this week
  const taggedListUrl =
    `${calUrl}/events?maxResults=250` +
    `&privateExtendedProperty=${encodeURIComponent(`${TAG_KEY}=${TAG_VAL}`)}` +
    `&privateExtendedProperty=${encodeURIComponent(`weekStart=${weekStart}`)}`
  const taggedRes = await fetch(taggedListUrl, { headers: auth })
  const taggedData = await taggedRes.json()
  if (!Array.isArray(taggedData.items)) {
    return { error: 'Failed to list tagged events', detail: taggedData }
  }
  const tagged = taggedData.items.map(e => ({
    id: e.id,
    sessionId: e.extendedProperties?.private?.sessionId || '',
  }))
  const taggedBySession = Object.fromEntries(tagged.map(t => [t.sessionId, t]))

  // 2. CRUD per planner session
  const incomingIds = new Set()
  const created = [], updated = [], deleted = [], errors = []

  for (const ev of events) {
    if (!ev.sessionId) { errors.push({ stage: 'validate', detail: 'missing sessionId' }); continue }
    incomingIds.add(ev.sessionId)
    const body = {
      summary: ev.summary,
      description: ev.description,
      start: ev.start,
      end: ev.end,
      extendedProperties: {
        private: { [TAG_KEY]: TAG_VAL, sessionId: ev.sessionId, weekStart },
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

  // 3. Delete tagged events whose session disappeared from the planner
  for (const t of tagged) {
    if (!incomingIds.has(t.sessionId)) {
      const r = await fetch(`${calUrl}/events/${t.id}`, { method: 'DELETE', headers: auth })
      if (r.ok || r.status === 410) deleted.push(t.sessionId)
      else errors.push({ stage: 'delete', sessionId: t.sessionId, status: r.status })
    }
  }

  // 4. Sweep up legacy untagged "IronCoach planner" events in the same window
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
      if (e.extendedProperties?.private?.[TAG_KEY] === TAG_VAL) continue
      const r = await fetch(`${calUrl}/events/${e.id}`, { method: 'DELETE', headers: auth })
      if (r.ok || r.status === 410) swept++
    }
  }

  return {
    created: created.length,
    updated: updated.length,
    deleted: deleted.length,
    sweptLegacy: swept,
    errors,
  }
}
