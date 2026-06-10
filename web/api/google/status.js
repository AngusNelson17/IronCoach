// Quick health check for the Google Calendar integration.
// Returns { connected, ready, missing } so the Settings tab can show
// the right state without trying to actually push events.

export default function handler(req, res) {
  const cid = !!process.env.GOOGLE_CLIENT_ID
  const cs = !!process.env.GOOGLE_CLIENT_SECRET
  const rt = !!process.env.GOOGLE_REFRESH_TOKEN
  const missing = []
  if (!cid) missing.push('GOOGLE_CLIENT_ID')
  if (!cs) missing.push('GOOGLE_CLIENT_SECRET')
  if (!rt) missing.push('GOOGLE_REFRESH_TOKEN')
  res.status(200).json({
    connected: cid && cs && rt,
    oauthConfigured: cid && cs,
    hasRefreshToken: rt,
    missing,
  })
}
