// Firebase 서비스워커 — 백그라운드 푸시 수신
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDGl97GESeGpiQxis2_9heeh62kDoMkEs8",
  authDomain: "family-checkin-b78b8.firebaseapp.com",
  projectId: "family-checkin-b78b8",
  storageBucket: "family-checkin-b78b8.firebasestorage.app",
  messagingSenderId: "1056701024501",
  appId: "1:1056701024501:web:825f44fcf1b4925a561dbc",
});

const messaging = firebase.messaging();

// 백그라운드 메시지 수신 (앱이 닫혀있을 때)
messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "🔔 우리아이 안전알림", {
    body: body || "알림이 도착했어요!",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    data: { url: "https://family-checkin.vercel.app" },
  });
});

// 알림 클릭 시 앱 열기
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.openWindow("https://family-checkin.vercel.app"));
});
