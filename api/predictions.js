import { createClient } from "@libsql/client/web";

export default async function handler(req, res) {
  // CORS 設定
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') return res.status(405).json({ error: '請使用 GET 方法' });

  const client = createClient({
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_DB_AUTH_TOKEN,
  });

  try {
    const { stormId, lat, lng } = req.query;
    const result = await client.execute({
      sql: "SELECT path_json FROM predictions WHERE storm_id = ? AND ABS(start_lat - ?) < 0.01 AND ABS(start_lng - ?) < 0.01 ORDER BY created_at DESC LIMIT 100",
      args: [stormId, parseFloat(lat), parseFloat(lng)]
    });
    const paths = result.rows.map(row => JSON.parse(row.path_json));
    return res.status(200).json({ paths });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
