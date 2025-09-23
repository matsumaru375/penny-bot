// api/webhook.js — LINE返信だけの超ミニマム版（デバッグ用）

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(200).json({ ok: true, tip: 'Use POST from LINE' });
    }

    // Vercelの環境変数からトークン取得（スペル要一致）
    const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    // 受信ボディの取得（環境差吸収）
    const body = req.body && Object.keys(req.body).length ? req.body
               : (await readJson(req).catch(() => ({})));

    console.log('[webhook] body =', JSON.stringify(body));

    const events = body?.events || [];
    for (const ev of events) {
      if (ev.type === 'message') {
        // 何が来ても “pong” と返す
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
        console.log('[reply] status=', resp.status, 'body=', text);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[webhook] error:', e);
    return res.status(200).json({ ok: false, error: String(e) });
  }
}

// 生ボディしか来ない環境向けの簡易reader
async function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}
