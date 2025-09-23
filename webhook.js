// api/webhook.js  — まずは「必ずログ→pong返信」だけに絞る

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(200).json({ ok: true, tip: 'Use POST from LINE' });
    }

    // --- 受信ボディ取得（JSON / 生ボディ 両対応）---
    const body = await readLineBody(req);
    console.log('[webhook] body =', JSON.stringify(body));

    const events = body?.events || [];
    const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    for (const ev of events) {
      // textでもimageでも何でもとにかく返す
      if (ev.replyToken) {
        const payload = {
          replyToken: ev.replyToken,
          messages: [{ type: 'text', text: 'pong' }],
        };

        const resp = await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
          },
          body: JSON.stringify(payload),
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

async function readLineBody(req) {
  // すでにJSONならそのまま
  if (req.body && Object.keys(req.body).length) return req.body;
  // 生ボディの場合に備えたフォールバック
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
