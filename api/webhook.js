// api/webhook.js
// Snack Penny 占い＆音楽 bot
// 相談内容とカードを送ると、やさしい言葉で占い結果をお返しします。

import getRawBody from 'raw-body';

export default async function handler(req, res) {
  // LINEからのリクエストだけを処理
  if (req.method !== 'POST') {
    res.status(200).json({ ok: true, hint: 'POST /api/webhook only' });
    return;
  }

  const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const OPENAI_API_KEY    = process.env.line_tarot_key;

  let body = {};
  try {
    // 既にパース済みならそのまま使う
    if (req.body && Object.keys(req.body).length) {
      body = req.body;
    } else {
      // そうでなければ raw-body で読み取る
      const raw  = await getRawBody(req);
      const text = raw.toString('utf-8') || '{}';
      body = JSON.parse(text);
    }
  } catch (e) {
    console.error('[parse] error:', e);
    return res.status(200).end();
  }

  console.log('[webhook] body =', JSON.stringify(body));

  // 受信したイベントを処理
  for (const ev of body.events || []) {
    if (ev.type === 'message' && ev.message.type === 'text') {
      const userText = ev.message.text.trim();
      let replyText  = '';

      try {
        // ChatGPT へやさしい占い依頼
        const prompt = 
        `あなたは思いやりに満ちた占い師『ペニー』です。
以下の相談内容とカードをもとに、相手の不安や気持ちに寄り添い、温かく、やわらかい敬語で話します。
否定せず、まず感情を受け止めてから提案します。命令口調・断定口調は避けます。
専門用語はかんたんに言い換え、たとえ話を少しだけ使って安心感を与えます。
結論だけでなく『なぜそう読めるか』を短く添えます。
最後は一言の励ましで締めます。必要ならハートや✨など絵文字を少し（多用しない）。
出力形式：
1) 共感のひとこと（1〜2文）
2) リーディング（カードごとに短く）
3) 今できる小さな一歩（箇条書き2〜3個）
4) しめの一言（やさしく）

相談内容とカード: ${userText}`;

        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'あなたは心優しいタロット占い師です。' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.8,
          }),
        });

        const data = await resp.json();
        if (data?.choices?.[0]?.message?.content) {
          replyText = data.choices[0].message.content;
        } else {
          replyText = '占い処理でエラーが発生しました。少し時間をおいてお試しください🙏';
        }
      } catch (e) {
        console.error('[openai] error:', e);
        replyText = '占い処理でエラーが発生しました。少し時間をおいてお試しください🙏';
      }

      // LINEへ返信
      await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          replyToken: ev.replyToken,
          messages: [{ type: 'text', text: replyText }],
        }),
      });
    }
  }

  res.status(200).end();
}

// Next.js API ルート用設定
export const config = {
  api: { bodyParser: false },
};
