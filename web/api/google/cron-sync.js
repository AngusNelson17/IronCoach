// Daily Vercel cron — keeps the current week's planner mirrored to Google
// Calendar without any manual click. Scheduled in vercel.json.
//
// GET /api/google/cron-sync
//
// Behaviour:
//   1. Computes "today" in APP_TIMEZONE (defaults to Australia/Melbourne)
//   2. Anchors to that week's Monday
//   3. Builds events from DEFAULT_PLANNER and reconciles via shared lib
//
// Vercel cron requests are authenticated implicitly (only reachable from
// Vercel's internal scheduler), so no extra secret check needed for a
// personal dashboard. If you ever expose this externally, gate it on a
// shared CRON_SECRET header.

import { reconcileWeek, refreshAccessToken } from '../_lib/calendar-sync.js'
import {
  DEFAULT_PLANNER,
  APP_TIMEZONE,
  todayInTz,
  weekStartOfDate,
  plannerToCalendarEvents,
} from '../../src/data/planner.js'

export default async function handler(req, res) {
  const accessToken = await refreshAccessToken()
  if (!accessToken) {
    res.status(500).json({ error: 'Google env vars not configured. Visit /api/google/authorize first.' })
    return
  }

  try {
    const today = todayInTz(APP_TIMEZONE)
    const weekStart = weekStartOfDate(today)
    const events = plannerToCalendarEvents(DEFAULT_PLANNER, weekStart, APP_TIMEZONE)

    const result = await reconcileWeek({
      accessToken,
      calendarId: 'primary',
      weekStart,
      events,
    })

    if (result.error) {
      res.status(502).json(result)
      return
    }
    res.status(200).json({
      ok: true,
      ranAt: new Date().toISOString(),
      timeZone: APP_TIMEZONE,
      today,
      weekStart,
      ...result,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
