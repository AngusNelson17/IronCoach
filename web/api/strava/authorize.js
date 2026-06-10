// One-time OAuth kickoff. Visit this URL once after deploying with
// STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET env vars set. Strava will
// redirect to /api/strava/callback which prints the refresh token.

export default function handler(req, res) {
  const clientId = process.env.STRAVA_CLIENT_ID
  if (!clientId) {
    res.status(500).send('STRAVA_CLIENT_ID not set in Vercel env vars')
    return
  }
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  const host = req.headers.host
  const redirectUri = `${proto}://${host}/api/strava/callback`
  const scope = 'read,activity:read_all,profile:read_all'
  const url =
    `https://www.strava.com/oauth/authorize?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code&approval_prompt=auto&scope=${scope}`
  res.writeHead(302, { Location: url })
  res.end()
}
