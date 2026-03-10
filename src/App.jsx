/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from "react";

const KAKAO_JS_KEY  = "5f465c50884bf651dbeb29410a13fc8f";  // JavaScript 키 (SDK 초기화)
const KAKAO_REST_KEY = "c00e3ca82ed27969eb8f5ec0ba81f0c6"; // REST API 키 (로그인 URL)
const REDIRECT_URI   = "https://family-checkin.vercel.app";
const RADIUS_M = 200;
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
  lat: null, lng: null, authMode: "none", password: "",
});

function loadStorage(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function saveStorage(key, val) {
  try { localStorage.setItem(key, typeof val === "string" ? val : JSON.stringify(val)); } catch {}
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

// 카카오 로그인 후 URL의 code를 서버리스 함수로 토큰 교환
function useKakaoCallback(onToken) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      // URL에서 code 즉시 제거 (재사용 방지)
      window.history.replaceState(null, "", window.location.pathname);
      // 서버리스 함수로 토큰 교환
      fetch("/api/kakao-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.access_token) onToken(data.access_token);
          else alert("카카오 로그인 실패: " + (data.error || "알 수 없는 오류"));
        })
        .catch(() => alert("카카오 로그인 중 오류가 발생했어요."));
    }
  }, []);
}

async function sendKakaoMessage(token, text) {
  const res = await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8", Authorization: `Bearer ${token}` },
    body: new URLSearchParams({ template_object: JSON.stringify({ object_type:"text", text, link:{ web_url:"https://developers.kakao.com", mobile_web_url:"https://developers.kakao.com" } }) }),
  });
  if (!res.ok) throw new Error(`kakao_${res.status}`);
  const d = await res.json();
  if (d.result_code !== 0) throw new Error(`kakao_rc_${d.result_code}`);
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
        buttonLabel: name ? `${name}에서 돌아왔어요` : "도착했어요",
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

        {/* 인증 방식 */}
        <div style={{ marginBottom:24 }}>
          <label style={S.lbl}>인증 방식</label>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            {[{m:"none",ic:"🔓",lb:"없음",dc:"바로 전송"},{m:"password",ic:"🔐",lb:"암호",dc:"글자 입력"}].map(({m,ic,lb,dc})=>(
              <button key={m} type="button" onClick={()=>upd("authMode",m)} style={{ flex:1, padding:"13px 8px", borderRadius:14, border:"none", background:d.authMode===m?"linear-gradient(135deg,#f97316,#ec4899)":"#f3f4f6", color:d.authMode===m?"#fff":"#6b7280", cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif", boxShadow:d.authMode===m?"0 4px 14px rgba(249,115,22,.3)":"none", transition:"all .15s" }}>
                <div style={{ fontSize:20, marginBottom:3 }}>{ic}</div>
                <div style={{ fontSize:13, fontWeight:800 }}>{lb}</div>
                <div style={{ fontSize:10, opacity:.8, marginTop:2 }}>{dc}</div>
              </button>
            ))}
          </div>
          {d.authMode==="password" && (
            <div style={{ background:"#fff7ed", borderRadius:12, padding:"14px 15px", border:"1px solid #fed7aa" }}>
              <label style={{ ...S.lbl, color:"#f97316" }}>암호</label>
              <input
                style={{ ...S.inp, background:"#fffbf5" }}
                value={d.password}
                onChange={e => upd("password", e.target.value)}
                placeholder="예: 다람쥐"
              />
            </div>
          )}
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
function SettingsSheet({ childName, locations, kakaoToken, onSaveChild, onKakaoLogin, onKakaoLogout, onUpdateLocations, onClose }) {
  const [editName, setEditName] = useState(childName);
  const [editingLoc, setEditingLoc] = useState(null);
  const [isNewLoc, setIsNewLoc] = useState(false);
  // 카카오 로그인은 페이지 이동 방식 — 로딩 상태 불필요

  const S = {
    lbl: { fontSize:11, fontWeight:800, color:"#9ca3af", letterSpacing:1.2, textTransform:"uppercase", display:"block", marginBottom:8 },
    inp: { width:"100%", padding:"14px 15px", borderRadius:13, border:"1.5px solid #e5e7eb", fontSize:16, fontFamily:"'Noto Sans KR',sans-serif", outline:"none", color:"#1f2937", background:"#fff", boxSizing:"border-box", WebkitAppearance:"none" },
    sectionBox: { background:"#fff", borderRadius:16, padding:"18px", border:"1.5px solid #e5e7eb", marginBottom:10 },
  };

  function loginKakao() {
    if (!window.Kakao || !window.Kakao.isInitialized()) {
      alert("카카오 SDK 로딩 중이에요. 잠시 후 다시 눌러주세요.");
      return;
    }
    window.Kakao.Auth.authorize({
      redirectUri: REDIRECT_URI,
      scope: "talk_message",
    });
  }

  function openNewLoc() {
    setEditingLoc({ id:`loc_${Date.now()}`, name:"", icon:"📍", buttonLabel:"도착했어요", message:"", lat:null, lng:null, authMode:"none", password:"" });
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

          {/* 카카오 */}
          <div style={{ marginBottom:28 }}>
            <label style={S.lbl}>💬 카카오톡 알림 연결</label>
            <div style={S.sectionBox}>
              {kakaoToken ? (
                <>
                  <div style={{ background:"#f0fdf4", borderRadius:11, padding:"12px 14px", fontSize:13, fontWeight:700, color:"#16a34a", marginBottom:10 }}>
                    ✅ 카카오 연결 완료 — 알림 전송 가능
                  </div>
                  <button type="button" onClick={onKakaoLogout} style={{ width:"100%", padding:"11px 0", borderRadius:11, border:"1.5px solid #fca5a5", background:"#fff", color:"#ef4444", fontSize:13, fontWeight:700, cursor:"pointer" }}>로그아웃</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={loginKakao} style={{ width:"100%", padding:"15px 0", borderRadius:13, border:"none", background:"#FAE100", color:"#3A1D1D", fontSize:16, fontWeight:900, cursor:"pointer", fontFamily:"'Noto Sans KR',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                    <span style={{ fontSize:20 }}>💬</span>카카오톡으로 로그인
                  </button>
                  <div style={{ fontSize:11, color:"#9ca3af", marginTop:10, lineHeight:1.7, textAlign:"center" }}>
                    엄마 폰에서 로그인 → 아이가 버튼 누르면 카카오톡 자동 알림!
                  </div>
                </>
              )}
            </div>
            <div style={{ background:"#fffbeb", borderRadius:12, padding:"12px 14px", border:"1px solid #fde68a" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#92400e", marginBottom:4 }}>💡 연동 방법</div>
              <div style={{ fontSize:11, color:"#78350f", lineHeight:1.8 }}>
                1. <strong>엄마 폰</strong>에서 이 앱 열고 카카오 로그인<br/>
                2. 아이 폰으로 앱 URL 공유<br/>
                3. 아이가 버튼 누르면 → 엄마 카카오로 알림!
              </div>
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
                      버튼: "{loc.buttonLabel}" &nbsp;·&nbsp; {loc.authMode==="password"?"🔐 암호":"🔓 없음"} &nbsp;·&nbsp; {loc.lat?"📍 위치등록":"⚠️ 위치없음"}
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
  const [locations,  setLocations]  = useState(() => loadStorage("fci_locs", [makeHome()]));
  const [kakaoToken, setKakaoToken] = useState(() => localStorage.getItem("fci_token") || null);

  // 카카오 로그인 후 URL에서 토큰 자동 수신
  useKakaoCallback(token => {
    setKakaoToken(token);
    localStorage.setItem("fci_token", token);
    // 로그인 성공 후 스플래시 스킵
    setSplashDone(true);
  });

  // UI 상태
  const [activeTab,     setActiveTab]     = useState(0);
  const [showSettings,  setShowSettings]  = useState(false);
  const [userPos,       setUserPos]       = useState(null);
  const [pw,            setPw]            = useState("");
  const [pwVisible,     setPwVisible]     = useState(false);
  const [sending,       setSending]       = useState(false);
  const [toast,         setToast]         = useState(null);
  const [logs,          setLogs]          = useState([]);

  // persist
  useEffect(() => { localStorage.setItem("fci_child", childName); }, [childName]);
  useEffect(() => { saveStorage("fci_locs", locations); }, [locations]);
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

  async function handleCheckin() {
    if (!locOk) {
      showToast(gpsNotSet ? "📍 설정에서 위치를 먼저 등록해주세요!" : `📍 ${loc.name} 근처에 있어야 해요!`, "error");
      return;
    }
    if (loc.authMode === "password" && pw.trim() !== loc.password) {
      showToast("🔐 암호가 틀렸어요!", "error"); return;
    }
    if (!kakaoToken) { showToast("⚠️ 설정에서 카카오 로그인을 먼저 해주세요!", "warn"); return; }

    setSending(true);
    const timeStr = new Date().toLocaleString("ko-KR", { month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" });
    const msgText = `${loc.icon} ${fillName(loc.message)}\n📅 ${timeStr}\n📍 ${loc.name}`;
    try {
      await sendKakaoMessage(kakaoToken, msgText);
      showToast(`✅ 카카오톡 전송 완료!\n${fillName(loc.message)}`);
      const time = new Date().toLocaleString("ko-KR", { month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" });
      setLogs(p => [{ icon:loc.icon, msg:fillName(loc.message), time }, ...p.slice(0,4)]);
      setPw("");
    } catch (e) {
      if (e.message?.includes("401") || e.message?.includes("kakao_4")) {
        setKakaoToken(null); showToast("❌ 카카오 토큰 만료. 설정에서 다시 로그인해주세요.", "error");
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

          {/* 암호 입력 */}
          {loc?.authMode === "password" && (
            <div style={{ width:"100%", position:"relative" }}>
              <input
                type={pwVisible?"text":"password"}
                placeholder="🔐 암호 입력..."
                value={pw}
                onChange={e => setPw(e.target.value)}
                onKeyDown={e => e.key==="Enter" && handleCheckin()}
                style={{ width:"100%", padding:"15px 52px 15px 18px", borderRadius:16, border:"2px solid rgba(0,0,0,.09)", fontSize:17, fontFamily:"'Noto Sans KR',sans-serif", background:"rgba(255,255,255,.9)", outline:"none", color:"#1f2937", boxSizing:"border-box", WebkitAppearance:"none" }}
              />
              <button type="button" onClick={()=>setPwVisible(v=>!v)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:18, opacity:.45 }}>
                {pwVisible?"🙈":"👁️"}
              </button>
            </div>
          )}

          {/* 메인 버튼 — 탭에 따라 텍스트/크기 즉시 변경 */}
          <button
            type="button"
            onClick={handleCheckin}
            disabled={sending || !locOk}
            key={`btn-${loc?.id}`}
            style={{
              width:"100%", padding:"26px 16px", borderRadius:24, border:"none",
              background: sending ? "#9ca3af" : locOk ? "linear-gradient(135deg,#f97316 0%,#ec4899 100%)" : "linear-gradient(135deg,#d1d5db,#b0b0b0)",
              color:"#fff", fontSize:btnFontSize, fontWeight:900,
              fontFamily:"'Noto Sans KR',sans-serif",
              cursor: locOk && !sending ? "pointer" : "not-allowed",
              animation: locOk && !sending ? "glow 2.5s ease-in-out infinite" : "none",
              transition:"background .25s, font-size .2s",
              letterSpacing: btnFontSize > 24 ? 2 : 1,
              lineHeight: 1.2,
            }}
          >
            {sending ? "전송 중..." : loc?.buttonLabel}
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
          kakaoToken={kakaoToken}
          onSaveChild={name => { setChildName(name); showToast(`✅ "${name}" 저장!`); }}
          onKakaoLogin={token => { setKakaoToken(token); showToast("✅ 카카오 연결 완료!"); }}
          onKakaoLogout={() => { setKakaoToken(null); showToast("카카오 로그아웃", "warn"); }}
          onUpdateLocations={locs => { setLocations(locs); if (activeTab>=locs.length) setActiveTab(locs.length-1); }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
    </>
  );
}
