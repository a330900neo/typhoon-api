import { createClient } from "@libsql/client/web";

export default async function handler(req, res) {
  // 處理 CORS 跨域請求
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 初始化 Turso 連線
  const client = createClient({
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_DB_AUTH_TOKEN,
  });

  try {
    // 1. 提交預測 (POST)
    if (req.method === 'POST') {
      const body = req.body;
      await client.execute({
        sql: "INSERT INTO predictions (storm_id, start_lat, start_lng, path_json) VALUES (?, ?, ?, ?)",
        args: [body.stormId, body.startPos[0], body.startPos[1], JSON.stringify(body.predictedPath)]
      });
      return res.status(200).json({ success: true });
    }

    // 2. 獲取大眾預測 (GET)
    if (req.method === 'GET') {
      const { stormId, lat, lng } = req.query; // Vercel 自動解析 URL 參數
      const result = await client.execute({
        sql: "SELECT path_json FROM predictions WHERE storm_id = ? AND ABS(start_lat - ?) < 0.01 AND ABS(start_lng - ?) < 0.01 ORDER BY created_at DESC LIMIT 100",
        args: [stormId, parseFloat(lat), parseFloat(lng)]
      });
      const paths = result.rows.map(row => JSON.parse(row.path_json));
      return res.status(200).json({ paths });
    }

    res.status(404).send('Not Found');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
