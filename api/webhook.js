// api/webhook.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    // POST以外はそのままOKレスポンス
    res.status(200).json({ message: 'LINE bot is running.' });
    return;
  }

  // LINEから送られてきたイベントを確認するだけ
  res.status(200).json({ message: 'Webhook received successfully.' });
}
