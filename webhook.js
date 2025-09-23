// api/webhook.js

export const config = {
  api: { bodyParser: false },   // ★LINE署名のため必須
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(200).json({ ok: true, tip: 'Use POST from LINE' });
    }

    const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    // 生ボディを読む
    const body = await readJson(req);
    console.log('=== LINE Webhook Request ===');
    console.log(JSON.stringify(body, null, 2));
    console.log('=============================');

    const events = body?.events || [];
    for (const ev of events) {
      if (ev.type === 'message') {
        const replyPayload = {
          replyToken: ev.replyToken,
          messages: [{ type: 'text', text: 'pong' }],
        };

        const resp = await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
          },
          body: JSON.stringify(replyPayload),
        });

        const text = await resp.text();
        console.log('[reply] status =', resp.status, 'body =', text);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[webhook] error:', e);
    return res.status(200).json({ ok: false, error: String(e) });
  }
}

async function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
