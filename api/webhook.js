// api/webhook.js
import getRawBody from 'raw-body';

// --- 環境変数（どちらか入っていれば使えるよう両対応） ---
const OPENAI_API_KEY =
  process.env.LINE_TAROT_KEY || process.env.OPENAI_API_KEY;

// LINE チャネルアクセストークン（既に Vercel に登録済み）
const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// ---------- OpenAI 呼び出し ----------
async function askTarot(text) {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY / LINE_TAROT_KEY');
  }

  // ざっくり「相談」と「カード」を抜く（なければ全部を相談として扱う）
  let consult = text;
  let cards = '';
  try {
    const re = /相談[:：]\s*([\s\S]*?)(?:\n|$).*?カード[:：]\s*([\s\S]*)/i;
    const m = text.match(re);
    if (m) {
      consult = (m[1] || '').trim();
      cards = (m[2] || '').trim();
    }
  } catch {}

  const systemPrompt = `
あなたは丁寧で簡潔なタロット占い師です。
出力は日本語。絵札名はカタカナ/日本語で。難しい言い回しは避け、専門用語が出たら短く補足。
最後に「ワンポイント助言」を1行で。最大400文字程度。
`.trim();

  const userPrompt = cards
    ? `相談内容: ${consult}\nカードの内容: ${cards}\nこの結果を踏まえて占ってください。`
    : `以下の相談をタロット的観点で簡潔にアドバイスしてください。\n相談内容: ${consult}`;

  // Chat Completions（安価で十分な mini 系を使用）
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`[OpenAI] ${resp.status} ${errText}`);
  }

  const data = await resp.json();
  const textOut = data?.choices?.[0]?.message?.content?.trim() || '占い結果を作れませんでした。';
  return textOut;
}

// ---------- LINE 返信 ----------
async function lineReply(replyToken, text) {
  if (!LINE_ACCESS_TOKEN) {
    throw new Error('Missing LINE_CHANNEL_ACCESS_TOKEN');
  }
  const body = {
    replyToken,
    messages: [{ type: 'text', text }],
  };
  const r = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`[LINE reply] ${r.status} ${t}`);
  }
}

export default async function handler(req, res) {
  // 生存確認（GETなどで開いたとき用）
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, hint: 'POST /api/webhook only' });
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

  // ログ確認用
  console.log('[webhook] body =', JSON.stringify(body));

  try {
    const events = body?.events || [];
    for (const ev of events) {
      if (ev.type === 'message' && ev.message?.type === 'text') {
        const userText = ev.message.text || '';
        // 「テスト」だけなら動作確認の簡易返信
        if (/^テスト$/i.test(userText.trim())) {
          await lineReply(ev.replyToken, 'pong（接続OK）');
          continue;
        }

        // OpenAI で占い
        let result;
        try {
          result = await askTarot(userText);
        } catch (err) {
          console.error(err);
          result =
            '占い処理でエラーが発生しました。しばらくしてからもう一度お試しください🙏';
        }
        await lineReply(ev.replyToken, result);
      }
    }
  } catch (e) {
    console.error('[handle error]', e);
  }

  // LINE にはとにかく 200 を早めに返す
  res.status(200).end();
}

// 生ボディを受け取るための設定
export const config = {
  api: { bodyParser: false },
};
