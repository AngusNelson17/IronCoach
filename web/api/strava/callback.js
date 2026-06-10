// OAuth callback. Exchanges the ?code from Strava for a refresh_token
// and prints it on screen so you can copy it into Vercel as
// STRAVA_REFRESH_TOKEN. Run once; after that, /api/strava/sync handles
// everything via the stored refresh token.

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`)
  const code = url.searchParams.get('code')
  const err = url.searchParams.get('error')

  if (err) {
    res.status(400).send(`Strava OAuth error: ${err}`)
    return
  }
  if (!code) {
    res.status(400).send('Missing ?code from Strava')
    return
  }

  try {
    const r = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })
    const data = await r.json()
    if (!data.refresh_token) {
      res.status(500).send(`Token exchange failed: ${JSON.stringify(data)}`)
      return
    }
    const name = `${data.athlete?.firstname ?? ''} ${data.athlete?.lastname ?? ''}`.trim()
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(`<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,sans-serif;max-width:640px;margin:40px auto;padding:24px;background:#0f0f10;color:#f0f0f0;line-height:1.6">
  <h2 style="color:#1db896">Strava authorized for ${name || 'athlete'}</h2>
  <p>Copy this <strong>refresh token</strong> and add it as an environment variable in Vercel called <code style="background:#222;padding:2px 6px;border-radius:4px">STRAVA_REFRESH_TOKEN</code>, then redeploy:</p>
  <pre style="background:#222;border:1px solid #333;padding:14px;border-radius:8px;word-break:break-all;font-size:14px">${data.refresh_token}</pre>
  <ol style="color:#a0a0a8">
    <li>Vercel dashboard → IronCoach → Settings → Environment Variables</li>
    <li>Add <code>STRAVA_REFRESH_TOKEN</code> with the value above, for the Production environment</li>
    <li>Deployments → Redeploy the latest</li>
  </ol>
  <p style="color:#666">Then return to the dashboard and click <strong>Sync Strava</strong>.</p>
</body></html>`)
  } catch (e) {
    res.status(500).send(`Error: ${e.message}`)
  }
}
