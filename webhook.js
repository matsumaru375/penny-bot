// api/webhook.js
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  console.log('[hit] method=', req.method, 'time=', new Date().toISOString());

  if (req.method !== 'POST') {
    console.log('[hit] GET check');
    return res.status(200).json({ ok: true, tip: 'Use POST from LINE' });
  }

  try {
    const raw = await readJson(req);
    console.log('=== LINE Webhook Request ===');
    console.log(JSON.stringify(raw));
    console.log('=============================');

    const events = raw?.events || [];
    for (const ev of events) {
      if (ev.type === 'message') {
        console.log('[msg] got message:', ev.message?.text);
        const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        const resp = await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            replyToken: ev.replyToken,
            messages: [{ type: 'text', text: 'pong' }],
          }),
        });
        console.log('[reply] status=', resp.status, 'text=', await resp.text());
      }
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[error]', e);
    return res.status(200).json({ ok: false, error: String(e) });
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
