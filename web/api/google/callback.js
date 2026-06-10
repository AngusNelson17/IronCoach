// Google OAuth callback. Exchanges ?code for refresh_token, prints it
// so you can copy into Vercel as GOOGLE_REFRESH_TOKEN, then redeploy.

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`)
  const code = url.searchParams.get('code')
  const err = url.searchParams.get('error')

  if (err) { res.status(400).send(`Google OAuth error: ${err}`); return }
  if (!code) { res.status(400).send('Missing ?code from Google'); return }

  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  const redirectUri = `${proto}://${req.headers.host}/api/google/callback`

  try {
    const params = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    const data = await r.json()
    if (!data.refresh_token) {
      res.status(500).send(`Token exchange failed: ${JSON.stringify(data)}`)
      return
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(`<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,sans-serif;max-width:640px;margin:40px auto;padding:24px;background:#0f0f10;color:#f0f0f0;line-height:1.6">
  <h2 style="color:#4a9eff">Google Calendar authorized</h2>
  <p>Copy this <strong>refresh token</strong> and add it to Vercel as <code style="background:#222;padding:2px 6px;border-radius:4px">GOOGLE_REFRESH_TOKEN</code>, then redeploy:</p>
  <pre style="background:#222;border:1px solid #333;padding:14px;border-radius:8px;word-break:break-all;font-size:14px">${data.refresh_token}</pre>
  <p style="color:#a0a0a8">Then return to the dashboard's Settings tab and use <strong>Push to Google Calendar</strong> to sync planner sessions.</p>
</body></html>`)
  } catch (e) {
    res.status(500).send(`Error: ${e.message}`)
  }
}
