import getRawBody from 'raw-body';

export default async function handler(req, res) {
  // GETなどの時は簡易レスポンス
  if (req.method !== 'POST') {
    res.status(200).json({ ok: true, hint: 'POST /api/webhook only' });
    return;
  }

  let body = {};
  try {
    // 既にパース済みの場合
    if (req.body && Object.keys(req.body).length) {
      body = req.body;
    } else {
      // 生ボディを取得
      const raw = await getRawBody(req);
      const text = raw.toString('utf-8') || '{}';
      body = JSON.parse(text);
    }
  } catch (e) {
    console.error('[parse] error:', e);
  }

  // 受け取った内容をログ出力
  console.log('[webhook] body =', JSON.stringify(body));

  // LINEからのイベント処理
  for (const ev of body.events || []) {
    if (ev.type === 'message' && ev.message.type === 'text') {
      const userText = ev.message.text.trim();
      let replyText = '';

      try {
        // -----------------------------
        // ChatGPT へ占い依頼
        // -----------------------------
        const systemText = `
あなたは思いやりに満ちた占い師『ペニー』です。
相手の不安や気持ちに寄り添い、温かく、やわらかい敬語で話します。
否定せず、まず感情を受け止めてから提案します。命令口調・断定口調は避けます。
専門用語はかんたんに言い換え、たとえ話を少しだけ使って安心感を与えます。
結論だけでなく「なぜそう読めるか」を短く添えます。
最後は一言の励ましで締めます。必要ならハートや✨など絵文字を少し使用する。

出力形式：
1) 共感のひとこと（1〜2文）
2) リーディング（カードごとに短く）
3) 今できる小さな一歩（箇条書き2〜3個）
4) しめの一言（やさしく）
        `;

        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemText },
              { role: 'user', content: `相談内容とカード:\n${userText}` },
            ],
            temperature: 0.8,   // 少し温かみを出す
            top_p: 0.9,
          }),
        });

        const data = await resp.json();
        console.log('[openai response]', data);

        if (data.choices?.[0]?.message?.content) {
          replyText = data.choices[0].message.content.trim();
        } else {
          replyText = '占い処理でエラーが発生しました。少し時間をおいてもう一度お試しください🙏';
        }

      } catch (err) {
        console.error('[openai error]', err);
        replyText = '占い処理でエラーが発生しました。少し時間をおいてもう一度お試しください🙏';
      }

      // LINEへ返信
      await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          replyToken: ev.replyToken,
          messages: [{ type: 'text', text: replyText }],
        }),
      });
    }
  }

  // LINEには200を返す
  res.status(200).end();
}

// Next.js設定：生ボディ受取のため
export const config = {
  api: { bodyParser: false },
};
