export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: '請使用 POST' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const dbUrl = (process.env.TURSO_DB_URL || "").replace("libsql://", "https://") + "/v2/pipeline";
    const token = process.env.TURSO_DB_AUTH_TOKEN;

    if (!token || !dbUrl) {
      return res.status(500).json({ error: "Vercel 環境變數未設定 (TURSO_DB_URL / TURSO_DB_AUTH_TOKEN)" });
    }

    const response = await fetch(dbUrl, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            type: "execute",
            stmt: {
              sql: "INSERT INTO predictions (storm_id, start_lat, start_lng, path_json) VALUES (?, ?, ?, ?)",
              args: [
                { type: "text", value: String(body.stormId) },
                { type: "float", value: parseFloat(body.startPos[0]) },
                { type: "float", value: parseFloat(body.startPos[1]) },
                { type: "text", value: JSON.stringify(body.predictedPath) }
              ]
            }
          },
          { type: "close" }
        ]
      })
    });

    const result = await response.json();
    return res.status(200).json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
