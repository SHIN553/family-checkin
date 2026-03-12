// Vercel serverless function — 카카오 code → access_token 교환
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  // body 파싱 (Vercel에서 자동 파싱 안 될 경우 대비)
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch {}
  }

  const code = body?.code;
  if (!code) {
    console.error("code missing, body:", JSON.stringify(body));
    return res.status(400).json({ error: "code missing" });
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: "c00e3ca82ed27969eb8f5ec0ba81f0c6",
    redirect_uri: "https://family-checkin.vercel.app",
    code,
    client_secret: "JAO62ZrmCbzfq021Vhc9oD1GDbvcuMwo",
  });

  try {
    const response = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: params.toString(),
    });
    const data = await response.json();
    console.log("kakao token response:", JSON.stringify(data));
    console.log("used client_id:", "6caa1f69ad246b54749020e1e5ff3918");
    console.log("used redirect_uri:", "https://family-checkin.vercel.app");
    console.log("code length:", code.length);
    if (data.access_token) {
      return res.status(200).json({ access_token: data.access_token });
    } else {
      return res.status(400).json({ error: data.error_description || data.error || "token error" });
    }
  } catch (e) {
    console.error("fetch error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
