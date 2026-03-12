// Vercel serverless function — 카카오 메시지 전송 (CORS 우회)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch {}
  }

  const { token, text } = body || {};
  if (!token || !text) {
    return res.status(400).json({ error: "token or text missing" });
  }

  try {
    const response = await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: new URLSearchParams({
        template_object: JSON.stringify({
          object_type: "text",
          text,
          link: {
            web_url: "https://family-checkin.vercel.app",
            mobile_web_url: "https://family-checkin.vercel.app",
          },
        }),
      }),
    });

    const data = await response.json();
    console.log("kakao send response:", JSON.stringify(data));

    if (data.result_code === 0) {
      return res.status(200).json({ ok: true });
    } else {
      return res.status(400).json({ error: data.msg || data.code || "send error", data });
    }
  } catch (e) {
    console.error("fetch error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
