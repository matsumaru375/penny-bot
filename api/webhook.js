// api/webhook.js
import getRawBody from 'raw-body';

// 追加
const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message/reply';
const LINE_HEADER = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(200).json({ ok: true, hint: 'POST /api/webhook only' });
    return;
  }

  let body = {};
  try {
    if (req.body && Object.keys(req.body).length) {
      body = req.body;
    } else {
      const raw = await getRawBody(req);
      const text = raw.toString('utf-8') || '{}';
      body = JSON.parse(text);
    }
  } catch (e) {
    console.error('[parse] error:', e);
  }

  console.log('[webhook] body =', JSON.stringify(body));

  // ▼▼▼ ここから返信処理 ▼▼▼
  try {
    const event = body.events && body.events[0];
    if (event && event.type === 'message' && event.message.type === 'text') {
      // 送られてきたテキストをそのままオウム返し
      const userText = event.message.text;

      await fetch(LINE_MESSAGING_API, {
        method: 'POST',
        headers: LINE_HEADER,
        body: JSON.stringify({
          replyToken: event.replyToken,
          messages: [
            {
              type: 'text',
              text: `受け取りました: ${userText}`,
            },
          ],
        }),
      });
    }
  } catch (err) {
    console.error('[LINE reply error]', err);
  }
  // ▲▲▲ ここまで返信処理 ▲▲▲

  res.status(200).end();
}

export const config = {
  api: { bodyParser: false },
};
