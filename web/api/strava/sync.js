// Live Strava sync. Refreshes the access token using the stored refresh
// token, fetches recent activities, maps Strava's schema to the
// dashboard's expected shape, and returns the list.
//
// Required env vars (Vercel):
//   STRAVA_CLIENT_ID
//   STRAVA_CLIENT_SECRET
//   STRAVA_REFRESH_TOKEN  (obtained once via /api/strava/authorize -> /callback)

const SPORT_TO_TYPE = {
  Swim: 'Swim',
  Ride: 'Bike', VirtualRide: 'Bike', MountainBikeRide: 'Bike', GravelRide: 'Bike', EBikeRide: 'Bike',
  Run: 'Run', TrailRun: 'Run', VirtualRun: 'Run',
  WeightTraining: 'Gym', Workout: 'Gym', Crossfit: 'Gym', HIIT: 'Gym',
  Rowing: 'Row', VirtualRow: 'Row',
  Walk: 'Walk', Hike: 'Walk',
  Soccer: 'Football',
}

export default async function handler(req, res) {
  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET not set' })
    return
  }
  if (!refreshToken) {
    res.status(500).json({
      error: 'STRAVA_REFRESH_TOKEN not set. Visit /api/strava/authorize once to set it up.',
    })
    return
  }

  try {
    // 1. Refresh access token (Strava access tokens are 6h, refresh tokens are long-lived)
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      res.status(502).json({ error: 'Failed to refresh access token', detail: tokenData })
      return
    }

    // 2. Fetch recent activities (default 50, override with ?per_page=)
    const url = new URL(req.url, `https://${req.headers.host}`)
    const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '50', 10), 200)
    const actRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    )
    const activities = await actRes.json()
    if (!Array.isArray(activities)) {
      res.status(502).json({ error: 'Strava returned non-array', detail: activities })
      return
    }

    // 3. Map to dashboard's shape
    const mapped = activities.map((a) => {
      const sport = a.sport_type || a.type
      return {
        id: String(a.id),
        name: a.name,
        type: SPORT_TO_TYPE[sport] || 'Other',
        date: (a.start_date_local || a.start_date || '').slice(0, 10),
        dist: Math.round(a.distance || 0),
        mins: Math.round((a.moving_time || 0) / 60),
        cal: Math.round(a.calories || a.kilojoules || 0),
        elev: a.total_elevation_gain ? Math.round(a.total_elevation_gain) : undefined,
        src: 'strava',
      }
    })

    // Cache for 5 minutes at the edge to avoid hammering Strava's 100/15min rate limit
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
    res.status(200).json(mapped)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
