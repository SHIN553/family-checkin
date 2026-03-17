// Vercel serverless — Firebase FCM 웹푸시 전송
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const serviceAccount = {
  projectId: "family-checkin-b78b8",
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC/qKgaz1WotSbp\nsUFH+paClP6IzUmHywiwM4IhYtd2c16KlWzRQWdaDHqJ++qumyeCuYfvw7UAzSzm\nzg3e46wrJaEcJvGXRz+O5SzbhnYp8+AdlSFgvaHL0tOkvBS+pN/AdErSswXsTgZN\nxges4iO8iMCSOpsZIBxJYN3qDuz7c+6ya/20GR9V5a70OhuRsfNvyz7qHwIUMWs0\nxvmCL1lRq9ws0xHfaJ2p7nmUXLGkW6PJB9uAqq0ma6haWhX1p0uU0MQRV2qQQF9N\nsfobyzTQyV9j8s9lwJpfUti7YMnwb2OWNpCtLzc1GxPxjcogrlheHCUfh2pviAWx\n0/pjV9yXAgMBAAECggEAIps3+1tLmsJW6+RrJq2LJrnzec0jhUb2YyZxzUh1Ijiz\nre9MLj6ShFJzf93CYtO2HycT8gmS8bmabXRwUbonWMUbIaOwhMHDKrCb2GmfhXS5\nF25ZkAe9ormHKJwjXMcVdcEpz4CuxZvTDJEAysksbbr9lonJfpBrOx6oAz69sKtO\nZp8VZEuo9eMIy3JXSoJtYO6gMyTI4/VmMXLU93MvQgXBqSXq+eugJfq3Xn0Wq6ra\nj4jeqyjkUlK+nglF4o5zdc6RvKiy7lcd5ZfyUy362P/If2mCrOrZxgG3VESaDniP\n8Z4rn1/FE0FLo8h5qUxAHhU1FTyIVGZV7gMF22RoIQKBgQDzzNfv/Byvdjt5V9Da\nFRW9a5FSa8jze394nn5qgBch4AXG3PUPv0bto6LhNjpF8YCGRDi8OuK4wLy+E0Sq\nUZLmf8co9Gc2uywVHNmMdACaLaQs5l9HS4HNCJRQ028y+ZMv0539I/Dxtd9QpD8K\nOYwZaihC/hFRssKhHlgz2UWhtwKBgQDJP923IhurlMUTBPlGkujcZFgDXXbilrLU\nz9P3eycCZ6oitIa0ISKmF7EJtkUuqj7JZjtLyy7Hcu6uYRbqNh7BxrDwqGOjCdpn\nfSOr4aeJGpH4dFavf6mfyufSbEb94lPQzfvLC/SGIyoBCtNMnK8ae4MPoI48+ZcO\nv53qgcIcIQKBgEwKkzuF/gh4Lxqs2jZ7Jxm6qEv11GqlFWAwxys+onhtYD/jgQgV\nV/Ec/duSx2AzcCvwsWV8VGTdsMD0T5Fz+gasyhirClpWzOwU4IHfWKS+IZvjiso4\n8dZam7AOEnvqvg7HyVpAUJGDcZC8efEde+YdZ0tl5U7/G5eXWFlrpj1HAoGBAI/x\nUUj6aWYpC2hWJ2GWFF4Gm3kUscLR3OkgGVEq0bUDpooaKzrNdHXt/h+fMg51kGEG\n8SR+GGBp0VQCd5xfx1H8JnSLTHDBzGg29nuq8+S5j2xw8cum+REk1PkJnyFab26q\n1gzd6TDEF/gU4Rsr+oZrj0tvIC12q9fNsEqaMtdhAoGARIMhF8j1kV5WqN4pVTR2\nhuKohhSH6BrSXhWxY0TeQkbqYCDIF5uyWWAYrjLFJPM2TY/SOuN0uyDxacrTThbG\nC0j1CZ2uwA/0LyXrTYWEKxJtIXk6beaL4avk0huG9sxOj38STICwjoBFl63+vc76\nlvs/TFZF7vmJ6ws1sDsYCSc=\n-----END PRIVATE KEY-----\n",
  clientEmail: "firebase-adminsdk-fbsvc@family-checkin-b78b8.iam.gserviceaccount.com",
};

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch {} }

  const { fcmTokens, title, body: msgBody } = body || {};
  if (!fcmTokens || !fcmTokens.length) return res.status(400).json({ error: "fcmTokens missing" });

  try {
    const results = await Promise.allSettled(
      fcmTokens.map(token =>
        getMessaging().send({
          token,
          notification: { title: title || "🔔 우리아이 안전알림", body: msgBody || "알림이 도착했어요!" },
          webpush: {
            notification: {
              title: title || "🔔 우리아이 안전알림",
              body: msgBody || "알림이 도착했어요!",
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              vibrate: [200, 100, 200],
            },
            fcmOptions: { link: "https://family-checkin.vercel.app" },
          },
        })
      )
    );
    const succeeded = results.filter(r => r.status === "fulfilled").length;
    console.log(`FCM 전송: ${succeeded}/${fcmTokens.length} 성공`);
    return res.status(200).json({ ok: true, succeeded });
  } catch (e) {
    console.error("FCM error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
