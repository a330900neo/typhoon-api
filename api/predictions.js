export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { stormId, lat, lng } = req.query;
    const dbUrl = (process.env.TURSO_DB_URL || "").replace("libsql://", "https://") + "/v2/pipeline";
    const token = process.env.TURSO_DB_AUTH_TOKEN;

    const response = await fetch(dbUrl, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            type: "execute",
            stmt: {
              sql: "SELECT path_json FROM predictions WHERE storm_id = ? AND ABS(start_lat - ?) < 0.01 AND ABS(start_lng - ?) < 0.01 ORDER BY created_at DESC LIMIT 100",
              args: [
                { type: "text", value: String(stormId) },
                { type: "float", value: parseFloat(lat) },
                { type: "float", value: parseFloat(lng) }
              ]
            }
          },
          { type: "close" }
        ]
      })
    });

    const data = await response.json();
    let paths = [];
    if (data.results && data.results[0]?.response?.result?.rows) {
      paths = data.results[0].response.result.rows.map(row => JSON.parse(row[0].value));
    }

    return res.status(200).json({ paths });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
