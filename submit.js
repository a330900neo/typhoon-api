import { createClient } from "@libsql/client/web";

export default async function handler(req, res) {
  // CORS 設定
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: '請使用 POST 方法' });

  const client = createClient({
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_DB_AUTH_TOKEN,
  });

  try {
    const body = req.body;
    await client.execute({
      sql: "INSERT INTO predictions (storm_id, start_lat, start_lng, path_json) VALUES (?, ?, ?, ?)",
      args: [body.stormId, body.startPos[0], body.startPos[1], JSON.stringify(body.predictedPath)]
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
