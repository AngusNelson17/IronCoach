// Kick off Google OAuth for Calendar API access.
// Visit once after setting GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET env vars.

export default function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    res.status(500).send('GOOGLE_CLIENT_ID not set in Vercel env vars. Create an OAuth client at console.cloud.google.com first.')
    return
  }
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  const host = req.headers.host
  const redirectUri = `${proto}://${host}/api/google/callback`
  const scope = 'https://www.googleapis.com/auth/calendar.events'
  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code&access_type=offline&prompt=consent` +
    `&scope=${encodeURIComponent(scope)}`
  res.writeHead(302, { Location: url })
  res.end()
}
