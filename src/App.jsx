/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from "react";

const KAKAO_JS_KEY  = "5f465c50884bf651dbeb29410a13fc8f";
const KAKAO_REST_KEY = "c00e3ca82ed27969eb8f5ec0ba81f0c6";
const REDIRECT_URI   = "https://family-checkin.vercel.app";
const RADIUS_M = 50;

// Firebase 설정
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDGl97GESeGpiQxis2_9heeh62kDoMkEs8",
  authDomain: "family-checkin-b78b8.firebaseapp.com",
  projectId: "family-checkin-b78b8",
  storageBucket: "family-checkin-b78b8.firebasestorage.app",
  messagingSenderId: "1056701024501",
  appId: "1:1056701024501:web:825f44fcf1b4925a561dbc",
};
const FCM_VAPID_KEY = "BAV9oLIO0bZNzI0wSIK3x3ssocAHUWFGrkCz-42m0PsdoFUz4RVqad8JTmhffnzYrF3mIyIxA1bBIyszn8SiUys";
const ICONS = ["🏠","📚","🎨","⚽","🎵","🏃","🍱","🎓","🏋️","🎮","🎯","🌟","🎪","🏫","🎀","🌈"];

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const makeHome = () => ({
  id: "home", name: "집", icon: "🏠",
  buttonLabel: "집에 돌아왔어요",
  message: "{name}이(가) 집에 돌아왔어요! 🏠",
  lat: null, lng: null,
});

function loadStorage(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    const parsed = JSON.parse(v);
    return parsed;
  } catch { return fallback; }
}
function saveStorage(key, val) {
  try {
    const str = typeof val === "string" ? val : JSON.stringify(val);
    localStorage.setItem(key, str);
    // 백업 키에도 저장 (iOS PWA 대응)
    localStorage.setItem(key + "_bak", str);
  } catch {}
}
function loadStorageSafe(key, fallback) {
  try {
    const v = localStorage.getItem(key) || localStorage.getItem(key + "_bak");
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

// ─── Kakao SDK ────────────────────────────────────────────────────────────────
function useKakaoSDK() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    function init() {
      if (window.Kakao && !window.Kakao.isInitialized())
        window.Kakao.init(KAKAO_JS_KEY);
      setReady(true);
    }
    if (window.Kakao) { init(); return; }
    const s = document.createElement("script");
    s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    s.crossOrigin = "anonymous"; s.onload = init;
    document.head.appendChild(s);
  }, []);
  return ready;
}

// ─── Firebase FCM ─────────────────────────────────────────────────────────────
function loadFirebaseScripts() {
  return new Promise((resolve) => {
    if (window.firebase?.messaging) { resolve(); return; }
    const s1 = document.createElement("script");
    s1.src = "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js";
    s1.onload = () => {
      const s2 = document.createElement("script");
      s2.src = "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js";
      s2.onload = resolve;
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  });
}

async function initFCM() {
  try {
    alert("📍 STEP 1: 알림 지원 확인 중...");

    if (!("Notification" in window)) {
      alert("❌ 이 기기는 알림 미지원\niOS: 홈화면 설치 후 실행해주세요");
      return null;
    }
    if (!("serviceWorker" in navigator)) {
      alert("❌ 서비스워커 미지원\n홈화면 설치 후 실행해주세요");
      return null;
    }

    alert("📍 STEP 2: Firebase SDK 로드 중...");
    await loadFirebaseScripts();
    alert("📍 STEP 3: Firebase 초기화 중...");

    if (!window.firebase || !window.firebase.messaging) {
      alert("❌ Firebase 로드 실패. 네트워크 확인 후 다시 시도해주세요.");
      return null;
    }

    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(FIREBASE_CONFIG);
    }
    const messaging = window.firebase.messaging();
    alert("📍 STEP 4: 알림 권한 요청 중...");

    const permission = await Notification.requestPermission();
    alert("📍 권한 결과: " + permission);
    if (permission !== "granted") {
      alert("❌ 알림 권한 거부됨\n설정에서 알림을 허용해주세요");
      return null;
    }

    alert("📍 STEP 5: 서비스워커 등록 중...");
    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    await navigator.serviceWorker.ready;
    alert("📍 STEP 6: FCM 토큰 발급 중...");

    const token = await messaging.getToken({ vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: swReg });
    if (!token) {
      alert("❌ 토큰 발급 실패. 다시 시도해주세요.");
      return null;
    }

    alert("✅ 토큰 발급 성공!\n" + token.substring(0, 30) + "...");

    messaging.onMessage(payload => {
      const { title, body } = payload.notification || {};
      if (Notification.permission === "granted") {
        new Notification(title || "🔔 우리아이 안전알림", { body: body || "", icon: "/icon-192.png" });
      }
    });

    return token;
  } catch (e) {
    console.error("FCM 초기화 실패:", e.message);
    alert("❌ 실패: " + e.message);
    return null;
  }
}

// 카카오 로그인 후 URL의 code를 서버리스 함수로 토큰 교환
// state = 수신자 index (0,1,...)
function useKakaoCallback(onToken) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    const idx = parseInt(params.get("state") || "0", 10);

    if (error) { alert("카카오 로그인 오류: " + error); return; }

    if (code) {
      window.history.replaceState(null, "", window.location.pathname);
      fetch("/api/kakao-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.access_token) onToken(data.access_token, data.refresh_token, idx);
          else alert("카카오 로그인 실패: " + (data.error || "알 수 없는 오류"));
        })
        .catch(e => alert("서버 오류: " + e.message));
    }
  }, []);
}

async function sendKakaoMessage(token, text) {
  const res = await fetch("/api/kakao-send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, text }),
  });
  const d = await res.json();
  if (!res.ok || !d.ok) throw new Error(d.error || `kakao_${res.status}`);
}

// 토큰 만료 시 refresh_token으로 자동 갱신
async function refreshKakaoToken(refreshToken) {
  const res = await fetch("/api/kakao-refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const d = await res.json();
  if (!res.ok || !d.access_token) throw new Error("refresh_failed");
  return d; // { access_token, refresh_token }
}

// ─── Splash ───────────────────────────────────────────────────────────────────
function Splash({ onDone }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const ts = [setTimeout(()=>setStep(1),700), setTimeout(()=>setStep(2),1600), setTimeout(()=>setStep(3),3000), setTimeout(onDone,4500)];
    return () => ts.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = (n) => ({ opacity: step>=n?1:0, transform: step>=n?"translateY(0)":"translateY(14px)", transition:"opacity .55s ease, transform .55s ease" });

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"linear-gradient(145deg,#ff6b35,#f7341a 28%,#ec4899 64%,#a855f7)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Noto Sans KR',sans-serif", opacity:step===3?0:1, transition:step===3?"opacity 1s ease":"none" }}>
      <div style={{ position:"absolute", width:300, height:300, borderRadius:"50%", background:"rgba(255,255,255,.06)", top:-50, right:-70 }}/>
      <div style={{ position:"absolute", width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,.06)", bottom:100, left:-50 }}/>
      <div style={{ fontSize:82, marginBottom:18, ...visible(0), filter:"drop-shadow(0 8px 24px rgba(0,0,0,.25))", animation:"sBounce .65s cubic-bezier(.36,.07,.19,.97)" }}>🏠</div>
      <div style={{ fontSize:30, fontWeight:900, color:"#fff", letterSpacing:-.5, textAlign:"center", textShadow:"0 2px 12px rgba(0,0,0,.2)", ...visible(0) }}>우리 아이 안전알림</div>
      <div style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,.85)", marginTop:7, ...visible(1) }}>Family Check-In 🔔</div>
      <div style={{ marginTop:36, display:"flex", flexDirection:"column", alignItems:"center", gap:9, ...visible(2) }}>
        {["💬 카카오톡 실시간 알림","📍 GPS 위치 인증","🔐 안전한 암호 보호"].map((t,i)=>(
          <div key={i} style={{ background:"rgba(255,255,255,.18)", backdropFilter:"blur(8px)", borderRadius:24, padding:"8px 20px", fontSize:13, fontWeight:700, color:"#fff", border:"1px solid rgba(255,255,255,.25)" }}>{t}</div>
        ))}
      </div>
      <div style={{ position:"absolute", bottom:56, left:"50%", transform:"translateX(-50%)", width:110 }}>
        <div style={{ height:3, background:"rgba(255,255,255,.2)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", background:"#fff", borderRadius:3, animation:"loadBar 3.9s ease forwards" }}/>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(()=>{ const t=setTimeout(onDone,3800); return ()=>clearTimeout(t); // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  return (
    <div style={{ position:"fixed", bottom:34, left:"50%", transform:"translateX(-50%)", background:type==="error"?"#ef4444":type==="warn"?"#f59e0b":"#22c55e", color:"#fff", padding:"13px 22px", borderRadius:16, fontSize:14, fontWeight:700, boxShadow:"0 8px 28px rgba(0,0,0,.22)", zIndex:8000, animation:"toastUp .25s ease", maxWidth:"88vw", textAlign:"center", fontFamily:"'Noto Sans KR',sans-serif", lineHeight:1.6 }}>{msg}</div>
  );
}

// ─── 모달 래퍼 — 입력 포커스 보호 ───────────────────────────────────────────
// onClose 는 X버튼 / 저장 / 삭제로만 닫힘. 배경 클릭으로 안 닫힘.
function Modal({ children, zIndex = 1500 }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.52)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex }}>
      <div style={{ background:"#f8fafc", borderRadius:"26px 26px 0 0", width:"100%", maxWidth:480, maxHeight:"93vh", overflowY:"auto", fontFamily:"'Noto Sans KR',sans-serif" }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── 장소 편집 시트 ───────────────────────────────────────────────────────────
function LocationSheet({ loc, onSave, onDelete, onClose, isNew }) {
  const [d, setD] = useState({ ...loc });
  const [gpsLoading, setGpsLoading] = useState(false);

  const upd = useCallback((k, v) => setD(p => ({ ...p, [k]: v })), []);

  // 장소 이름 바뀔 때 버튼/메시지 자동 생성 (isNew 일 때만)
  function handleNameChange(name) {
    setD(p => ({
      ...p,
      name,
      ...(isNew ? {
        buttonLabel: name ? `${name} 도착했어요` : "도착했어요",
        message:     name ? `{name}이(가) ${name}에 도착했어요! 📍` : "{name}이(가) 도착했어요!",
      } : {}),
    }));
  }

  function captureGPS() {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      p => { upd("lat", p.coords.latitude); upd("lng", p.coords.longitude); setGpsLoading(false); },
      () => { alert("GPS 권한을 허용해 주세요!\n브라우저 주소창 🔒 → 위치 → 허용"); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  function handleSave() {
    if (!d.name.trim()) { alert('장소 이름을 입력해주세요!'); return; }
    if (!d.buttonLabel.trim()) { alert('버튼 텍스트를 입력해주세요!'); return; }
    onSave({ ...d });
    onClose();
  }

  const S = {
    lbl: { fontSize:11, fontWeight:800, color:"#9ca3af", letterSpacing:1.2, textTransform:"uppercase", display:"block", marginBottom:7 },
    inp: { width:"100%", padding:"14px 15px", borderRadius:13, border:"1.5px solid #e5e7eb", fontSize:16, fontFamily:"'Noto Sans KR',sans-serif", outline:"none", color:"#1f2937", background:"#fff", boxSizing:"border-box", WebkitAppearance:"none" },
  };

  return (
    <Modal zIndex={2000}>
      <div style={{ padding:"24px 22px 52px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div style={{ fontSize:18, fontWeight:900, color:"#1f2937" }}>{isNew ? "📍 새 장소 추가" : "✏️ 장소 편집"}</div>
          <button onClick={onClose} style={{ background:"#f3f4f6", border:"none", borderRadius:20, width:34, height:34, fontSize:15, cursor:"pointer" }}>✕</button>
        </div>

        {/* 아이콘 */}
        <div style={{ marginBottom:20 }}>
          <span style={S.lbl}>아이콘</span>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {ICONS.map(ic=>(
              <button key={ic} type="button" onClick={()=>upd("icon",ic)} style={{ fontSize:22, padding:"7px 10px", borderRadius:10, border:"none", background:d.icon===ic?"#fff7ed":"#f3f4f6", outline:d.icon===ic?"2.5px solid #f97316":"2.5px solid transparent", cursor:"pointer" }}>{ic}</button>
            ))}
          </div>
        </div>

        {/* 장소 이름 */}
        <div style={{ marginBottom:16 }}>
          <label style={S.lbl}>장소 이름</label>
          <input
            style={S.inp}
            value={d.name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="예: 수학학원, 태권도, 피아노학원"
          />
        </div>

        {/* 버튼 텍스트 */}
        <div style={{ marginBottom:16 }}>
          <label style={S.lbl}>버튼 텍스트</label>
          <input
            style={S.inp}
            value={d.buttonLabel}
            onChange={e => upd("buttonLabel", e.target.value)}
            placeholder="예: 집에 돌아왔어요, 학원 끝났어요"
          />
          <div style={{ fontSize:11, color:"#9ca3af", marginTop:5 }}>메인 화면에 크게 표시되는 버튼 글자예요</div>
        </div>

        {/* 알림 메시지 */}
        <div style={{ marginBottom:16 }}>
          <label style={S.lbl}>카카오톡 알림 메시지</label>
          <input
            style={S.inp}
            value={d.message}
            onChange={e => upd("message", e.target.value)}
            placeholder="예: {name}이(가) 수학학원에 도착했어요! 📍"
          />
          <div style={{ fontSize:11, color:"#9ca3af", marginTop:5 }}>* {"{name}"} 은 아이 이름으로 자동 교체돼요</div>
        </div>

        {/* GPS */}
        <div style={{ marginBottom:16 }}>
          <label style={S.lbl}>위치 (GPS)</label>
          <div style={{ display:"flex", gap:10, alignItems:"center", background:"#fff", borderRadius:13, border:"1.5px solid #e5e7eb", padding:"10px 14px" }}>
            <div style={{ flex:1, fontSize:13, fontWeight:600, color:d.lat?"#22c55e":"#9ca3af" }}>
              {d.lat ? `📍 ${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}` : "위치 미등록"}
            </div>
            <button type="button" onClick={captureGPS} disabled={gpsLoading} style={{ padding:"9px 14px", borderRadius:9, border:"none", background:d.lat?"#f0fdf4":"linear-gradient(135deg,#f97316,#ec4899)", color:d.lat?"#16a34a":"#fff", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
              {gpsLoading ? "측정 중..." : d.lat ? "다시 등록" : "현재 위치 등록"}
            </button>
          </div>
          <div style={{ fontSize:11, color:"#9ca3af", marginTop:5 }}>※ GPS 위치는 나중에 해당 장소에서 등록해도 돼요. 등록 후 {RADIUS_M}m 이내에서 버튼 활성화!</div>
        </div>



        {/* 저장 / 삭제 */}
        <div style={{ display:"flex", gap:10 }}>
          {!isNew && loc.id!=="home" && (
            <button type="button" onClick={()=>{ onDelete(loc.id); onClose(); }} style={{ flex:1, padding:"15px 0", borderRadius:13, border:"2px solid #fca5a5", background:"#fff", color:"#ef4444", fontWeight:700, fontSize:15, cursor:"pointer" }}>삭제</button>
          )}
          <button type="button" onClick={handleSave} style={{ flex:2, padding:"15px 0", borderRadius:13, border:"none", background:"linear-gradient(135deg,#f97316,#ec4899)", color:"#fff", fontWeight:900, fontSize:15, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif" }}>저장</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── 설정 시트 ────────────────────────────────────────────────────────────────
// 토큰 붙여넣기 입력 컴포넌트
function PushTokenInput({ onAdd }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ display:"flex", gap:6 }}>
      <input
        style={{ flex:1, padding:"10px 12px", borderRadius:10, border:"1.5px solid #e5e7eb", fontSize:12, fontFamily:"'Noto Sans KR',sans-serif", outline:"none" }}
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder="복사한 토큰 붙여넣기"
      />
      <button type="button"
        onClick={() => { if(val.trim().length > 20){ onAdd(val.trim()); setVal(""); } else alert("올바른 토큰을 붙여넣어주세요"); }}
        style={{ padding:"10px 14px", borderRadius:10, border:"none", background:"#f97316", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
        추가
      </button>
    </div>
  );
}

function SettingsSheet({ childName, locations, recipients, myFcmToken, pushTargets, onSaveChild, onUpdateRecipients, onRegisterPush, onAddPushTarget, onRemovePushTarget, onUpdateLocations, onClose }) {
  const [editName, setEditName] = useState(childName);
  const [editingLoc, setEditingLoc] = useState(null);
  const [isNewLoc, setIsNewLoc] = useState(false);
  // 카카오 로그인은 페이지 이동 방식 — 로딩 상태 불필요

  const S = {
    lbl: { fontSize:11, fontWeight:800, color:"#9ca3af", letterSpacing:1.2, textTransform:"uppercase", display:"block", marginBottom:8 },
    inp: { width:"100%", padding:"14px 15px", borderRadius:13, border:"1.5px solid #e5e7eb", fontSize:16, fontFamily:"'Noto Sans KR',sans-serif", outline:"none", color:"#1f2937", background:"#fff", boxSizing:"border-box", WebkitAppearance:"none" },
    sectionBox: { background:"#fff", borderRadius:16, padding:"18px", border:"1.5px solid #e5e7eb", marginBottom:10 },
  };

  function loginKakao(idx) {
    const url = "https://kauth.kakao.com/oauth/authorize" +
      "?response_type=code" +
      "&client_id=" + KAKAO_REST_KEY +
      "&redirect_uri=" + encodeURIComponent(REDIRECT_URI) +
      "&scope=talk_message" +
      "&state=" + idx +
      "&prompt=login"; // 매번 계정선택 창 표시
    window.location.href = url;
  }

  function openNewLoc() {
    setEditingLoc({ id:`loc_${Date.now()}`, name:"", icon:"📍", buttonLabel:"도착했어요", message:"", lat:null, lng:null });
    setIsNewLoc(true);
  }

  return (
    <>
      <Modal zIndex={1500}>
        <div style={{ padding:"24px 22px 56px" }}>
          {/* 헤더 */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
            <div style={{ fontSize:19, fontWeight:900, color:"#1f2937" }}>⚙️ 설정</div>
            <button type="button" onClick={onClose} style={{ background:"#e5e7eb", border:"none", borderRadius:20, width:34, height:34, fontSize:15, cursor:"pointer" }}>✕</button>
          </div>

          {/* 아이 이름 */}
          <div style={{ marginBottom:28 }}>
            <label style={S.lbl}>👦 아이 이름</label>
            <div style={S.sectionBox}>
              <input
                style={S.inp}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="예: 민준, 지유"
                autoComplete="off"
              />
              <button type="button" onClick={()=>{ if(!editName.trim()){alert("이름을 입력해주세요!"); return;} onSaveChild(editName.trim()); }} style={{ width:"100%", marginTop:10, padding:"13px 0", borderRadius:11, border:"none", background:"linear-gradient(135deg,#f97316,#ec4899)", color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif" }}>
                이름 저장
              </button>
              <div style={{ fontSize:11, color:"#9ca3af", marginTop:8, textAlign:"center" }}>
                카카오 알림에서 {"{name}"} 자리에 표시돼요
              </div>
            </div>
          </div>

          {/* 카카오 수신자 관리 */}
          <div style={{ marginBottom:28 }}>
            <label style={S.lbl}>💬 카카오톡 알림 수신자</label>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {recipients.map((r, idx) => (
                <div key={idx} style={S.sectionBox}>
                  {/* 라벨 편집 */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                    <input
                      style={{ ...S.inp, flex:1, fontSize:14, padding:"10px 12px" }}
                      value={r.label}
                      onChange={e => {
                        const next = recipients.map((x,i) => i===idx ? {...x, label:e.target.value} : x);
                        onUpdateRecipients(next);
                      }}
                      placeholder="이름 (예: 엄마, 아빠)"
                    />
                    {idx > 0 && (
                      <button type="button" onClick={() => onUpdateRecipients(recipients.filter((_,i)=>i!==idx))}
                        style={{ padding:"10px 14px", borderRadius:10, border:"1.5px solid #fca5a5", background:"#fff", color:"#ef4444", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
                        삭제
                      </button>
                    )}
                  </div>
                  {/* 연결 상태 */}
                  {r.token ? (
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <div style={{ flex:1, background:"#f0fdf4", borderRadius:10, padding:"10px 12px", fontSize:12, fontWeight:700, color:"#16a34a" }}>
                        ✅ 카카오 연결 완료
                      </div>
                      <button type="button"
                        onClick={() => onUpdateRecipients(recipients.map((x,i)=>i===idx?{...x,token:null}:x))}
                        style={{ padding:"10px 14px", borderRadius:10, border:"1.5px solid #fca5a5", background:"#fff", color:"#ef4444", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                        재로그인
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={()=>loginKakao(idx)}
                      style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", background:"#FAE100", color:"#3A1D1D", fontSize:15, fontWeight:900, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      <span style={{ fontSize:18 }}>💬</span>{r.label} 카카오로 로그인
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* 수신자 추가 버튼 (최대 2명) */}
            {recipients.length < 2 && (
              <button type="button"
                onClick={() => onUpdateRecipients([...recipients, { label:"아빠", token:null }])}
                style={{ width:"100%", marginTop:10, padding:"13px 0", borderRadius:12, border:"2px dashed #d1d5db", background:"#f9fafb", color:"#6b7280", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                + 수신자 추가 (최대 2명)
              </button>
            )}
            <div style={{ fontSize:11, color:"#9ca3af", marginTop:8, lineHeight:1.7, textAlign:"center" }}>
              로그인 시 매번 계정 선택창이 표시돼요
            </div>
          </div>

          {/* 웹 푸시 알림 */}
          <div style={{ marginBottom:28 }}>
            <label style={S.lbl}>🔔 폰 푸시알림 설정</label>

            {/* STEP 1: 엄마/아빠 폰에서 — 내 토큰 등록 */}
            <div style={{ ...S.sectionBox, marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:800, color:"#6366f1", marginBottom:10 }}>
                📱 STEP 1 — 엄마/아빠 폰에서 실행
              </div>
              {myFcmToken ? (
                <>
                  <div style={{ background:"#f0fdf4", borderRadius:10, padding:"10px 12px", fontSize:12, fontWeight:700, color:"#16a34a", marginBottom:8 }}>
                    ✅ 이 기기 토큰 등록 완료
                  </div>
                  <div style={{ fontSize:11, color:"#6b7280", marginBottom:8, wordBreak:"break-all", background:"#f9fafb", borderRadius:8, padding:"8px 10px" }}>
                    {myFcmToken.substring(0,40)}...
                  </div>
                  <button type="button"
                    onClick={() => { navigator.clipboard.writeText(myFcmToken); alert("✅ 토큰 복사 완료! 아이 폰에 붙여넣으세요"); }}
                    style={{ width:"100%", padding:"11px 0", borderRadius:10, border:"none", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    📋 내 토큰 복사하기
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={onRegisterPush}
                    style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"none", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:14, fontWeight:900, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    <span>🔔</span>이 기기 푸시알림 등록
                  </button>
                  <div style={{ fontSize:11, color:"#9ca3af", marginTop:6, textAlign:"center", lineHeight:1.6 }}>
                    엄마·아빠 폰 각각에서 눌러주세요
                  </div>
                </>
              )}
            </div>

            {/* STEP 2: 아이 폰에서 — 수신자 토큰 추가 */}
            <div style={S.sectionBox}>
              <div style={{ fontSize:12, fontWeight:800, color:"#f97316", marginBottom:10 }}>
                👦 STEP 2 — 아이 폰에서 실행
              </div>
              <div style={{ fontSize:11, color:"#6b7280", marginBottom:10, lineHeight:1.6 }}>
                엄마/아빠가 복사한 토큰을 아래에 붙여넣으세요
              </div>
              {pushTargets.map((t, i) => (
                <div key={i} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6 }}>
                  <div style={{ flex:1, fontSize:11, background:"#f0fdf4", borderRadius:8, padding:"8px 10px", color:"#16a34a", fontWeight:700, wordBreak:"break-all" }}>
                    ✅ 수신자 {i+1} 등록됨
                  </div>
                  <button type="button" onClick={() => onRemovePushTarget(i)}
                    style={{ padding:"8px 10px", borderRadius:8, border:"1.5px solid #fca5a5", background:"#fff", color:"#ef4444", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                    삭제
                  </button>
                </div>
              ))}
              <PushTokenInput onAdd={onAddPushTarget} />
            </div>
          </div>

          {/* 장소 관리 */}
          <div>
            <label style={S.lbl}>📍 장소 관리</label>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {locations.map(loc=>(
                <div key={loc.id} onClick={()=>{ setEditingLoc(loc); setIsNewLoc(false); }} style={{ background:"#fff", borderRadius:14, padding:"14px 16px", border:"1.5px solid #e5e7eb", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
                  <span style={{ fontSize:26 }}>{loc.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:"#1f2937" }}>{loc.name}</div>
                    <div style={{ fontSize:12, color:"#9ca3af", marginTop:2 }}>
                      버튼: "{loc.buttonLabel}" &nbsp;·&nbsp; {loc.lat?"📍 위치등록":"⚠️ 위치없음"}
                    </div>
                  </div>
                  <div style={{ fontSize:13, color:"#9ca3af" }}>편집 ›</div>
                </div>
              ))}
            </div>
            <button type="button" onClick={openNewLoc} style={{ width:"100%", marginTop:10, padding:"14px 0", borderRadius:14, border:"2px dashed #d1d5db", background:"transparent", color:"#6b7280", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif" }}>
              + 장소 추가 (학원, 학교 등)
            </button>
          </div>
        </div>
      </Modal>

      {/* 장소 편집 시트 (중첩) */}
      {editingLoc && (
        <LocationSheet
          loc={editingLoc} isNew={isNewLoc}
          onSave={saved => {
            if (isNewLoc) onUpdateLocations([...locations, saved]);
            else onUpdateLocations(locations.map(l => l.id===saved.id ? saved : l));
            setEditingLoc(null);
          }}
          onDelete={id => { onUpdateLocations(locations.filter(l=>l.id!==id)); setEditingLoc(null); }}
          onClose={() => setEditingLoc(null)}
        />
      )}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function App() {
  useKakaoSDK();
  const [splashDone, setSplashDone] = useState(false);

  // 영구 상태
  const [childName,  setChildName]  = useState(() => localStorage.getItem("fci_child") || "");
  const [locations,  setLocations]  = useState(() => loadStorageSafe("fci_locs", [makeHome()]));
  // recipients: [{label:"엄마", token:null}, {label:"아빠", token:null}]
  const [recipients, setRecipients] = useState(() => {
    const saved = loadStorageSafe("fci_recipients", null);
    if (saved) return saved;
    // 기존 토큰 마이그레이션
    const t1 = localStorage.getItem("fci_token");
    const t2 = localStorage.getItem("fci_token2");
    return [
      { label: "엄마", token: t1 || null },
      ...(t2 ? [{ label: "아빠", token: t2 }] : []),
    ];
  });

  // 하위 호환용 (handleCheckin에서 사용)
  const kakaoToken  = recipients[0]?.token || null;
  const kakaoToken2 = recipients[1]?.token || null;

  // 카카오 로그인 후 URL에서 토큰 자동 수신
  useKakaoCallback((token, refreshToken, idx) => {
    setRecipients(prev => {
      const next = [...prev];
      if (next[idx]) next[idx] = { ...next[idx], token, refreshToken: refreshToken || next[idx].refreshToken };
      return next;
    });
    setSplashDone(true);
  });

  // UI 상태
  const [activeTab,     setActiveTab]     = useState(0);
  const [showSettings,  setShowSettings]  = useState(false);
  const [userPos,       setUserPos]       = useState(null);

  const [sending,       setSending]       = useState(false);
  const [toast,         setToast]         = useState(null);
  const [logs,          setLogs]          = useState([]);
  const [lastSentAt,    setLastSentAt]    = useState(null);
  // pushTargets: 엄마/아빠 폰에서 등록한 FCM 토큰 (수신자)
  const [pushTargets,   setPushTargets]   = useState(() => loadStorageSafe("fci_push_targets", []));
  // myFcmToken: 현재 기기의 FCM 토큰 (이 기기가 수신자일 때)
  const [myFcmToken,    setMyFcmToken]    = useState(() => localStorage.getItem("fci_my_fcm") || null);
  const COOLDOWN_SEC = 60;

  // persist
  useEffect(() => { localStorage.setItem("fci_child", childName); }, [childName]);
  useEffect(() => { saveStorage("fci_locs", locations); }, [locations]);
  useEffect(() => { saveStorage("fci_recipients", recipients); }, [recipients]);
  useEffect(() => { saveStorage("fci_push_targets", pushTargets); }, [pushTargets]);
  useEffect(() => { if (myFcmToken) localStorage.setItem("fci_my_fcm", myFcmToken); }, [myFcmToken]);
  useEffect(() => { if (kakaoToken) localStorage.setItem("fci_token", kakaoToken); else localStorage.removeItem("fci_token"); }, [kakaoToken]);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      p => setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  }, []);

  const showToast = (msg, type="success") => setToast({ msg, type });

  // 탭 범위 보정
  const tabIdx = Math.min(activeTab, Math.max(0, locations.length - 1));
  const loc    = locations[tabIdx];

  // GPS 계산
  const gpsNotSet = !loc?.lat;
  const dist      = userPos && !gpsNotSet ? calcDistance(userPos.lat, userPos.lng, loc.lat, loc.lng) : null;
  const isNear    = dist !== null && dist <= RADIUS_M;
  const locOk     = !gpsNotSet && isNear;   // 위치 미등록 → 항상 비활성

  const gpsColor  = !userPos ? "#9ca3af" : gpsNotSet ? "#f59e0b" : isNear ? "#22c55e" : "#ef4444";
  const gpsLabel  = !userPos   ? "GPS 확인 중..."
    : gpsNotSet                ? `📍 ${loc?.name || ""} — 설정에서 위치를 등록해주세요`
    : isNear                   ? `📍 ${Math.round(dist)}m — ${loc?.name} 범위 내 ✓`
                               : `📍 ${Math.round(dist)}m — ${loc?.name} 범위 밖 (${RADIUS_M}m 이내 필요)`;

  function fillName(t) { return t.replace(/\{name\}/g, childName || "아이"); }

  // 쿨다운 남은 초
  const [coolRemain, setCoolRemain] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastSentAt) {
        const remain = COOLDOWN_SEC - Math.floor((Date.now() - lastSentAt) / 1000);
        setCoolRemain(remain > 0 ? remain : 0);
      } else setCoolRemain(0);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSentAt]);

  async function handleCheckin() {
    if (!locOk) {
      showToast(gpsNotSet ? "📍 설정에서 위치를 먼저 등록해주세요!" : `📍 ${loc.name} 근처에 있어야 해요!`, "error");
      return;
    }

    // 쿨다운 체크
    if (lastSentAt) {
      const elapsed = Math.floor((Date.now() - lastSentAt) / 1000);
      if (elapsed < COOLDOWN_SEC) {
        showToast(`⏳ ${COOLDOWN_SEC - elapsed}초 후 다시 누를 수 있어요!`, "warn");
        return;
      }
    }

    const connected = recipients.filter(r => r.token);
    if (connected.length === 0) { showToast("⚠️ 설정에서 카카오 로그인을 먼저 해주세요!", "warn"); return; }

    setSending(true);
    const timeStr = new Date().toLocaleString("ko-KR", { month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" });
    const msgText = `🔔 우리아이 안전알림\n\n${loc.icon} ${fillName(loc.message)}\n\n📅 ${timeStr}\n📍 ${loc.name}`;
    try {
      // 토큰 만료 시 자동 갱신 후 전송
      let currentRecipients = [...recipients];
      // FCM 웹푸시 — 엄마/아빠 폰으로 전송
      if (pushTargets.length > 0) {
        fetch("/api/push-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fcmTokens: pushTargets,
            title: "🔔 우리아이 안전알림",
            body: fillName(loc.message),
          }),
        }).catch(() => {});
      }

      await Promise.all(connected.map(async (r, _) => {
        const rIdx = currentRecipients.findIndex(x => x === r);
        try {
          await sendKakaoMessage(r.token, msgText);
        } catch (e) {
          // 401 토큰 만료 → refresh 시도
          if ((e.message?.includes("401") || e.message?.includes("invalid_token")) && r.refreshToken) {
            try {
              const refreshed = await refreshKakaoToken(r.refreshToken);
              currentRecipients[rIdx] = { ...r, token: refreshed.access_token, refreshToken: refreshed.refresh_token || r.refreshToken };
              await sendKakaoMessage(refreshed.access_token, msgText);
            } catch {
              currentRecipients[rIdx] = { ...r, token: null };
              throw new Error("token_expired_" + rIdx);
            }
          } else throw e;
        }
      }));
      // 갱신된 recipients 저장
      setRecipients(currentRecipients);
      setLastSentAt(Date.now());
      showToast(`✅ ${connected.length}명에게 전송 완료!\n${fillName(loc.message)}`);
      const time = new Date().toLocaleString("ko-KR", { month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" });
      setLogs(p => [{ icon:loc.icon, msg:fillName(loc.message), time }, ...p.slice(0,4)]);
    } catch (e) {
      if (e.message?.startsWith("token_expired")) {
        showToast("❌ 토큰 만료. 설정에서 다시 로그인해주세요.", "error");
      } else {
        showToast("❌ 전송 실패. 네트워크를 확인해주세요.", "error");
      }
    }
    setSending(false);
  }

  // 버튼 텍스트 크기 (길면 작게)
  const btnFontSize = (loc?.buttonLabel?.length || 0) > 10 ? 20 : (loc?.buttonLabel?.length || 0) > 7 ? 24 : 30;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { overscroll-behavior:none; background:#fff7ed; }
        input, textarea { -webkit-user-select:text !important; user-select:text !important; }
        @keyframes toastUp { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes glow { 0%,100%{box-shadow:0 8px 32px rgba(249,115,22,.4)} 50%{box-shadow:0 8px 52px rgba(249,115,22,.7)} }
        @keyframes sBounce { 0%{transform:scale(.3) translateY(20px);opacity:0} 60%{transform:scale(1.12) translateY(-6px);opacity:1} 80%{transform:scale(.95)} 100%{transform:scale(1)} }
        @keyframes loadBar { from{width:0} to{width:100%} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {!splashDone && <Splash onDone={() => setSplashDone(true)} />}

      <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#fff7ed 0%,#fce7f3 55%,#ede9fe 100%)", fontFamily:"'Noto Sans KR',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", opacity:splashDone?1:0, transition:"opacity .6s ease" }}>

        {/* 헤더 */}
        <div style={{ width:"100%", maxWidth:420, padding:"50px 22px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#f97316", letterSpacing:2, textTransform:"uppercase" }}>Family Check-In</div>
            <div style={{ fontSize:24, fontWeight:900, color:"#1f2937", marginTop:4, lineHeight:1.2 }}>
              {childName ? `${childName}의 안전알림 🔔` : "우리 아이 안전알림 🔔"}
            </div>
          </div>
          <button type="button" onClick={()=>setShowSettings(true)} style={{ background:"rgba(255,255,255,.85)", border:"1px solid rgba(255,255,255,.95)", borderRadius:14, padding:"10px 14px", fontSize:18, cursor:"pointer", boxShadow:"0 2px 10px rgba(0,0,0,.07)", marginTop:4 }}>⚙️</button>
        </div>

        {/* 상태 바 */}
        <div style={{ width:"100%", maxWidth:420, padding:"12px 22px 0", display:"flex", flexDirection:"column", gap:7 }}>
          <div style={{ background:kakaoToken?"rgba(240,253,244,.9)":"rgba(255,251,235,.9)", backdropFilter:"blur(8px)", borderRadius:12, padding:"10px 14px", border:`1px solid ${kakaoToken?"#bbf7d0":"#fde68a"}`, fontSize:12, fontWeight:700, color:kakaoToken?"#16a34a":"#92400e" }}>
            {kakaoToken ? "💬 카카오톡 연결됨 — 알림 전송 가능" : "⚠️ 카카오 로그인 필요 — 우측 상단 ⚙️ 설정을 눌러주세요"}
          </div>
          <div style={{ background:"rgba(255,255,255,.65)", backdropFilter:"blur(10px)", borderRadius:12, padding:"10px 14px", border:"1px solid rgba(255,255,255,.85)", fontSize:12, fontWeight:600, color:gpsColor }}>
            {gpsLabel}
          </div>
        </div>

        {/* 탭 */}
        {locations.length > 1 && (
          <div style={{ width:"100%", maxWidth:420, padding:"16px 22px 0" }}>
            <div style={{ display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none", WebkitOverflowScrolling:"touch" }}>
              {locations.map((l,i) => (
                <button key={l.id} type="button" onClick={()=>{ setActiveTab(i); setPw(""); }} style={{ padding:"9px 18px", borderRadius:20, border:"none", whiteSpace:"nowrap", background:tabIdx===i?"linear-gradient(135deg,#f97316,#ec4899)":"rgba(255,255,255,.85)", color:tabIdx===i?"#fff":"#374151", fontWeight:tabIdx===i?800:600, fontSize:14, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif", boxShadow:tabIdx===i?"0 4px 14px rgba(249,115,22,.3)":"none", transition:"all .18s", flexShrink:0 }}>
                  {l.icon} {l.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 메인 카드 */}
        <div style={{ flex:1, width:"100%", maxWidth:420, padding:"28px 22px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}>

          {/* 아이콘 + 장소명 — 탭에 따라 즉시 변경 */}
          <div style={{ textAlign:"center", animation:"fadeIn .3s ease" }} key={loc?.id}>
            <div style={{ fontSize:64, marginBottom:8, filter:locOk?"none":"grayscale(50%)", transition:"filter .3s" }}>{loc?.icon}</div>
            <div style={{ fontSize:15, fontWeight:700, color:"#6b7280" }}>{loc?.name}</div>
          </div>



          {/* 메인 버튼 — 탭에 따라 텍스트/크기 즉시 변경 */}
          <button
            type="button"
            onClick={handleCheckin}
            disabled={sending || !locOk || coolRemain > 0}
            key={`btn-${loc?.id}`}
            style={{
              width:"100%", padding:"26px 16px", borderRadius:24, border:"none",
              background: sending ? "#9ca3af" : coolRemain > 0 ? "linear-gradient(135deg,#6b7280,#9ca3af)" : locOk ? "linear-gradient(135deg,#f97316 0%,#ec4899 100%)" : "linear-gradient(135deg,#d1d5db,#b0b0b0)",
              color:"#fff", fontSize:btnFontSize, fontWeight:900,
              fontFamily:"'Noto Sans KR',sans-serif",
              cursor: locOk && !sending && coolRemain === 0 ? "pointer" : "not-allowed",
              animation: locOk && !sending && coolRemain === 0 ? "glow 2.5s ease-in-out infinite" : "none",
              transition:"background .25s, font-size .2s",
              letterSpacing: btnFontSize > 24 ? 2 : 1,
              lineHeight: 1.2,
            }}
          >
            {sending ? "전송 중..." : coolRemain > 0 ? `⏳ ${coolRemain}초 후 전송 가능` : loc?.buttonLabel}
          </button>

          {/* 비활성 안내 */}
          {!locOk && (
            <div style={{ fontSize:12, color:gpsNotSet?"#f59e0b":"#9ca3af", textAlign:"center", lineHeight:1.7, fontWeight:600 }}>
              {gpsNotSet
                ? `⚙️ 설정 → ${loc?.name} → 현재 위치 등록을 해주세요`
                : `${loc?.name} 반경 ${RADIUS_M}m 이내에 있어야 버튼이 활성화돼요`}
            </div>
          )}
        </div>

        {/* 로그 */}
        {logs.length > 0 && (
          <div style={{ width:"100%", maxWidth:420, padding:"0 22px 44px" }}>
            <div style={{ background:"rgba(255,255,255,.6)", backdropFilter:"blur(10px)", borderRadius:18, padding:"16px 18px", border:"1px solid rgba(255,255,255,.9)" }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#9ca3af", letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>최근 전송 기록</div>
              {logs.map((l,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:i<logs.length-1?"1px solid rgba(0,0,0,.05)":"none" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{l.icon} {l.msg}</div>
                  <div style={{ fontSize:11, color:"#9ca3af", whiteSpace:"nowrap", marginLeft:10 }}>{l.time}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showSettings && (
        <SettingsSheet
          childName={childName}
          locations={locations}
          recipients={recipients}
          myFcmToken={myFcmToken}
          pushTargets={pushTargets}
          onSaveChild={name => { setChildName(name); showToast(`✅ "${name}" 저장!`); }}
          onUpdateRecipients={next => { setRecipients(next); }}
          onRegisterPush={async () => {
            const token = await initFCM();
            if (token) {
              setMyFcmToken(token);
              showToast("✅ 이 기기 푸시 등록 완료! 토큰을 복사해서 아이 폰에 추가하세요.");
            } else {
              showToast("❌ 알림 권한을 허용해주세요 (iOS: 홈화면 설치 후 시도)", "error");
            }
          }}
          onAddPushTarget={token => { setPushTargets(prev => [...prev, token]); showToast("✅ 수신자 추가 완료!"); }}
          onRemovePushTarget={idx => setPushTargets(prev => prev.filter((_,i)=>i!==idx))}
          onUpdateLocations={locs => { setLocations(locs); if (activeTab>=locs.length) setActiveTab(locs.length-1); }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
    </>
  );
}
