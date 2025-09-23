// api/webhook.js
export default async function handler(req, res) {
  // VercelはNode.js環境なのでreq.methodなどがそのまま使えます

  // LINEの署名確認は省略版（必要なら追加可能）
  if (req.method !== 'POST') {
    // POST以外はそのままOKを返す
    res.status(200).json({ message: 'LINE bot is running.' });
    return;
  }

  // 受け取ったイベント一覧
  const events = req.body.events || [];

  // OpenAI APIキー
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  // OpenAIのエンドポイント
  const OPENAI_URL = 'https://api.openai.com/v1/responses';

  // 返信用の関数
  async function replyMessage(replyToken, text) {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text }]
      })
    });
  }

  // 占いと音楽提案のsystemメッセージ
  const TAROT_SYSTEM = `あなたはスナックペニーのタロット占い師です。ウェイト版を基準に日本語でやさしく占い結果を説明してください。`;
  const MUSIC_SYSTEM = `あなたはスナックペニーのカラオケ曲アドバイザーです。指定条件からおすすめ曲3つと理由を日本語で提案してください。`;

  // OpenAIへ問い合わせ
  async function askOpenAI(system, userText) {
    const r = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: [
          { role: 'system', content: system },
          { role: 'user', content: userText }
        ]
      })
    });
    const j = await r.json();
    return j.output_text || '回答を取得できませんでした。';
  }

  // 受信イベントを順番に処理
  for (const ev of events) {
    if (ev.type === 'message' && ev.message.type === 'text') {
      const text = ev.message.text.trim();
      let answer = '';
      if (text.startsWith('占い')) {
        answer = await askOpenAI(TAROT_SYSTEM, text.replace(/^占い\s*/, ''));
      } else if (text.startsWith('音楽')) {
        answer = await askOpenAI(MUSIC_SYSTEM, text.replace(/^音楽\s*/, ''));
      } else {
        answer = '使い方:\n占い 相談:内容 カード:女帝 正位置\n音楽 条件:昭和歌謡 女性';
      }
      await replyMessage(ev.replyToken, answer);
    }
  }

  // LINEへ「受け取りました」と返す（HTTP 200）
  res.status(200).json({ status: 'ok' });
}
