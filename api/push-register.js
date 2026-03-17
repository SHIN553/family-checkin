// FCM 토큰을 서버에 저장 (가족 코드로 관리)
const tokens = {}; // 메모리 저장 (Vercel은 serverless라 재시작시 초기화됨)
// 실제로는 Vercel KV나 외부 DB 필요하지만, 지금은 클라이언트 공유 방식 사용

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  return res.status(200).json({ ok: true });
}
