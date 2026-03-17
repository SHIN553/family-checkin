// Vercel serverless — 카카오 refresh_token으로 access_token 자동 갱신
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch {} }

  const { refresh_token } = body || {};
  if (!refresh_token) return res.status(400).json({ error: "refresh_token missing" });

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: "c00e3ca82ed27969eb8f5ec0ba81f0c6",
    client_secret: "JAO62ZrmCbzfq021Vhc9oD1GDbvcuMwo",
    refresh_token,
  });

  try {
    const response = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: params.toString(),
    });
    const data = await response.json();
    console.log("kakao refresh response:", JSON.stringify(data));
    if (data.access_token) {
      return res.status(200).json({
        access_token: data.access_token,
        refresh_token: data.refresh_token || refresh_token, // 새 refresh_token 없으면 기존 유지
      });
    } else {
      return res.status(400).json({ error: data.error_description || data.error || "refresh error" });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
