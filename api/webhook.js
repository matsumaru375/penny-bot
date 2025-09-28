// api/webhook.js
import getRawBody from 'raw-body';

export default async function handler(req, res) {
  // 生存確認（GETなどで開いたとき用）
  if (req.method !== 'POST') {
    res.status(200).json({ ok: true, hint: 'POST /api/webhook only' });
    return;
  }

  let body = {};
  try {
    // 既にパース済みならそれを使う（環境により Vercel/Next が先にパースすることがある）
    if (req.body && Object.keys(req.body).length) {
      body = req.body;
    } else {
      // 生ボディから読み取り（環境差を吸収）
      const raw = await getRawBody(req);
      const text = raw.toString('utf-8') || '{}';
      body = JSON.parse(text);
    }
  } catch (e) {
    console.error('[parse] error:', e);
  }

  // 受け取った生の内容をログに出す（今回のゴール）
  console.log('[webhook] body =', JSON.stringify(body));

  // LINE には即 200 を返す（返信はまだしない）
  res.status(200).end();
}

// Next.js API ルート用の設定（生ボディを受け取るため）
export const config = {
  api: { bodyParser: false },
};
