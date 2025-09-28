// api/webhook.js
import getRawBody from 'raw-body';

// ===== LINE送信用セットアップ =====
const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message/reply';
const LINE_HEADER = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
};

// ===== OpenAI呼び出し =====
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_HEADER = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
};

// 占い用プロンプト作成
function buildPrompt({ consult, cards }) {
  return [
    {
      role: 'system',
      content:
        'あなたは優しく誠実な日本人占い師。依頼者の心情に寄り添い、カードの意味を踏まえて、根拠→解釈→具体アドバイスの順で簡潔に回答します。占いは断定ではなく可能性として伝えます。語尾は柔らかく。',
    },
    {
      role: 'user',
      content:
        `相談内容：${consult}\n` +
        `カードの内容：${cards}\n\n` +
        '出力フォーマット：\n' +
        '①カードが示す現状とテーマ（根拠を1-2行）\n' +
        '②読み解き（3-5行）\n' +
        '③具体アクション（箇条書き3つ以内）\n' +
        '④ラッキーアドバイス（1行）\n' +
        '※200〜500文字程度で。'
    }
  ];
}

// 1800文字ごとに分割（LINE長文対策）
function chunkText(text, size = 1800) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}

// 受信テキストから「相談」「カード」を抜き出す（柔らかい正規表現）
function parseConsultAndCards(text) {
  // 例: 「相談: …\nカード: …」/「相談内容… カードの内容…」などを許容
  const consultMatch =
    text.match(/(?:相談内容?|相談)\s*[:：]\s*([\s\S]*?)(?:\n|$)/i) ||
    text.match(/(?:相談内容?|相談)\s*([\s\S]*?)\s*(?:カード(?:の内容)?|カード内容?)[:：]/i);
  const cardsMatch =
    text.match(/(?:カード(?:の内容)?|カード内容?)\s*[:：]\s*([\s\S]*)/i);

  const consult = consultMatch ? (consultMatch[1] || '').trim() : '';
  const cards = cardsMatch ? (cardsMatch[1] || '').trim() : '';
  return { consult, cards };
}

export default async function handler(req, res) {
  // GET等は健康チェック
  if (req.method !== 'POST') {
    res.status(200).json({ ok: true, hint: 'POST /api/webhook only' });
    return;
  }

  // --- 受信ボディを確実に取る（raw-bodyでパース） ---
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

  try {
    const event = body?.events?.[0];
    if (event?.type === 'message' && event.message?.type === 'text') {
      const userText = event.message.text || '';

      // 「相談」と「カード」を抽出
      const { consult, cards } = parseConsultAndCards(userText);

      let replyText = '';
      if (consult && cards) {
        // OpenAIに占いを依頼
        const messages = buildPrompt({ consult, cards });
        const payload = {
          model: 'gpt-4o-mini', // コスパ良いモデル。必要なら他モデルに変更OK
          messages,
          temperature: 0.7,
        };

        const aiRes = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: OPENAI_HEADER,
          body: JSON.stringify(payload),
        });

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          console.error('[OpenAI error]', aiRes.status, errText);
          replyText =
            '占い処理でエラーが発生しました。少し時間をおいてもう一度お試しください🙏';
        } else {
          const data = await aiRes.json();
          replyText = (data?.choices?.[0]?.message?.content || '').trim();
          if (!replyText) {
            replyText =
              'うまく占い結果を生成できませんでした。入力を少し具体的にしてもう一度お願いします🙏';
          }
        }
      } else {
        // 入力ガイド
        replyText =
          '占いを行うには、次の形式で送ってください：\n\n' +
          '相談: 仕事で新しい挑戦をすべきか迷っています\n' +
          'カード: 太陽（正位置）、女教皇（逆位置）、ペンタクルの3（正位置）\n\n' +
          '※カード名・正逆/位置・枚数はわかる範囲でOKです。';
      }

      // 返信（長文は分割して送信）
      const parts = chunkText(replyText);
      for (const part of parts) {
        await fetch(LINE_MESSAGING_API, {
          method: 'POST',
          headers: LINE_HEADER,
          body: JSON.stringify({
            replyToken: event.replyToken,
            messages: [{ type: 'text', text: part }],
          }),
        });
      }
    }
  } catch (err) {
    console.error('[handle error]', err);
    // 返信ができない場合もLINEには200を返す（再送嵐を防止）
  }

  // LINEには即200（重要）
  res.status(200).end();
}

// Next.js API ルート用設定（生ボディ受け取るため）
export const config = {
  api: { bodyParser: false },
};
