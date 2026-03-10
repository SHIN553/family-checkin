// Vercel serverless function — 카카오 code → access_token 교환
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://family-checkin.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "code missing" });

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: "6caa1f69ad246b54749020e1e5ff3918",  // REST API 키
    redirect_uri: "https://family-checkin.vercel.app",
    code,
  });

  try {
    const response = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: params,
    });
    const data = await response.json();
    if (data.access_token) {
      return res.status(200).json({ access_token: data.access_token });
    } else {
      return res.status(400).json({ error: data.error_description || "token error" });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
