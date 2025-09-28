import getRawBody from 'raw-body';

export const config = {
  api: {
    bodyParser: false, // LINEの署名検証や生ボディ利用のため
  },
};

export default async function handler(req, res) {
  // 署名検証などが不要な場合はPOSTのみ許可
  if (req.method !== 'POST') {
    res.status(200).json({ ok: true, hint: 'POST /api/webhook only' });
    return;
  }

  // --- 生ボディを取得 ---
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
    res.status(400).end();
    return;
  }

  console.log('[webhook] body =', JSON.stringify(body));

  // --- LINEメッセージを処理 ---
  for (const ev of body.events || []) {
    if (ev.type === 'message' && ev.message.type === 'text') {
      const userText = ev.message.text.trim();
      let replyText = '';

      try {
        // ---------- ChatGPT への依頼 ----------
        const systemText = `
あなたは思いやりに満ちた占い師『ペニー』です。
占い結果の最後には必ず『ペニーからの小さなアドバイスです🍷』と入れて、親しみを感じる締めくくりにしてください。
相手の不安に寄り添い、温かくやわらかい敬語で話します。
- 否定せず、まず気持ちを受け止める → 共感の一言から始めます。
- 命令・断定は避け、「〜かもしれません」「〜してみましょう」などの提案調にします。
- 専門用語はやさしく言い換え、必要なら短いたとえ話を1つまで。
- 「なぜそう読めるか」をカードの象意に触れつつ短く添えます。
- 各セクションに1つ程度の絵文字（😊✨💕など）を使い、温かさを出します（多用しない）。
- 出力構成：
  1) 共感のひとこと（1〜2文＋絵文字）
  2) リーディング（カードごとに短く＋根拠）
  3) 今できる小さな一歩（• 箇条書き2〜3個、提案調）
  4) しめの一言（前向きに1文＋絵文字）
        `.trim();

        // few-shot のお手本
        const exampleUser = `
相談：元彼と復縁したいです。相手の気持ちと私ができることを知りたい。
カード：過去=カップの6（正）、現在=恋人（逆）、未来=ペンタクルの2（正）
        `.trim();

        const exampleAssistant = `
1) ペニーからのひとこと  
大切な思い出があるからこそ、今の揺れも自然なことですね。まずはその気持ちを大事にしながら、少しずつ進めていきましょう 😊

2) リーディング  
・過去：カップの6（正）  
  懐かしさと温かい記憶。関係の土台は優しさに根ざしています。  
・現在：恋人（逆）  
  迷いや噛み合わない選択。今はお互いの歩幅を整える時期。  
・未来：ペンタクルの2（正）  
  小さな調整を重ねれば、無理なくバランスを取り戻せます。

3) 今できる小さな一歩  
• 相手を責めない近況メッセージを短く送る  
• 返事を急がず、落ち着いたトーンを保つ  
• 会えたら楽しかった記憶を一つだけ共有する

4) しめの一言  
あわてず丁寧に歩けば、関係はもう一度やさしく動き出します。あなたの思いやりはきっと届きます✨
        `.trim();

        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.9,
            top_p: 0.95,
            presence_penalty: 0.6,
            messages: [
              { role: 'system', content: systemText },
              { role: 'user', content: exampleUser },
              { role: 'assistant', content: exampleAssistant },
              { role: 'user', content: `相談内容とカード:\n${userText}` },
            ],
          }),
        });

        const data = await resp.json();
        if (!resp.ok || !data.choices?.[0]?.message?.content) {
          throw new Error(JSON.stringify(data));
        }
        replyText = data.choices[0].message.content;
        // ---------- ここまで ChatGPT ----------

      } catch (e) {
        console.error('[openai error]', e);
        replyText = '占い処理でエラーが発生しました。少し時間をおいてもう一度お試しください🙏';
      }

      // LINEに返信
      try {
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
      } catch (e) {
        console.error('[line reply error]', e);
      }
    }
  }

  res.status(200).end();
}
