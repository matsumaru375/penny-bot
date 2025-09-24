// /api/webhook.js

import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req, res) {
  // リクエストメソッドが POST であることを確認
  if (req.method === 'POST') {
    // リクエストボディをログに出力
    console.log('[webhook] body = ', req.body);

    // LINE からのメッセージイベントの配列を取得
    const events = req.body.events;

    // イベントが存在するか確認
    if (events && events.length > 0) {
      // 最初のイベントのタイプをログに出力
      console.log('[webhook] received message type: ', events[0].type);
    } else {
      console.log('[webhook] No events in body.');
    }

    // 正常終了のレスポンスを返す
    res.status(200).send('OK');
  } else {
    // POST 以外のメソッドには 405 Method Not Allowed を返す
    res.status(405).send('Method Not Allowed');
  }
}
