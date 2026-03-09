# 우리 아이 안전알림 — 배포 가이드

## ✅ 준비물
- GitHub 계정 (무료) → github.com
- Vercel 계정 (무료) → vercel.com
- 카카오 개발자 계정 (무료) → developers.kakao.com

---

## STEP 1 — 카카오 앱 키 발급 (5분)

1. https://developers.kakao.com 접속 → 로그인
2. **내 애플리케이션** → **애플리케이션 추가하기**
3. 앱 이름: `우리아이안전알림` 입력 후 저장
4. **앱 키** 탭 → **JavaScript 키** 복사해두기
5. 좌측 메뉴 **카카오 로그인** → **활성화 설정 ON**
6. **동의항목** → `talk_message` → **필수 동의** 설정
7. ⚠️ Redirect URI는 Vercel 배포 후 추가 (STEP 4에서)

---

## STEP 2 — 앱 키 코드에 입력

`src/App.jsx` 파일을 열어서 **맨 윗줄** 수정:

```js
// 변경 전
const KAKAO_JS_KEY = "YOUR_KAKAO_JS_KEY";

// 변경 후 (본인 키로 교체)
const KAKAO_JS_KEY = "abc123def456...";  // 발급받은 JavaScript 키
```

---

## STEP 3 — GitHub에 업로드 (3분)

1. https://github.com 접속 → **New repository**
2. 이름: `family-checkin` → **Create repository**
3. 이 폴더 전체를 업로드:
   - 화면에서 **uploading an existing file** 클릭
   - 폴더 안 파일 전체 드래그 앤 드롭
   - **Commit changes** 클릭

---

## STEP 4 — Vercel 배포 (2분)

1. https://vercel.com 접속 → **GitHub으로 로그인**
2. **Add New Project** → GitHub의 `family-checkin` 선택
3. 설정 변경 없이 **Deploy** 클릭
4. 배포 완료 후 URL 확인 (예: `https://family-checkin-abc.vercel.app`)

### Vercel URL을 카카오 앱에 등록
5. 카카오 개발자 → 내 앱 → **카카오 로그인** → **Redirect URI 추가**
6. `https://family-checkin-abc.vercel.app` 입력 후 저장
7. **플랫폼** → **Web** → 사이트 도메인에도 동일 URL 추가

---

## STEP 5 — 폰에 앱으로 설치

### 📱 iPhone (Safari)
1. Safari에서 배포된 URL 열기
2. 하단 **공유 버튼(□↑)** 탭
3. **홈 화면에 추가** 탭
4. 이름 확인 후 **추가**

### 🤖 Android (Chrome)
1. Chrome에서 배포된 URL 열기
2. 주소창 오른쪽 **⋮ 메뉴** 탭
3. **홈 화면에 추가** 또는 **앱 설치** 탭
4. **설치** 확인

---

## STEP 6 — 앱 초기 설정

1. 설치된 앱 실행
2. ⚙️ 설정 탭
3. **아이 이름** 입력 후 저장
4. **카카오톡 로그인** (엄마 폰에서!)
5. **장소 관리** → 집 편집 → **현재 위치 등록** (집에서)
6. 학원 등 추가 장소는 해당 장소에서 위치 등록

---

## 💡 사용 흐름

```
엄마 폰에서 카카오 로그인 → URL을 아이 폰으로 공유 → 아이가 홈화면에 설치
→ 아이가 집/학원 도착 시 버튼 누름 → 엄마 카카오톡으로 알림 자동 수신!
```

---

## ❓ 문제 해결

| 증상 | 해결 |
|------|------|
| GPS 작동 안 함 | 브라우저 위치 권한 허용 (주소창 🔒 클릭) |
| 카카오 로그인 실패 | Redirect URI, 도메인 설정 재확인 |
| 버튼이 항상 비활성 | 설정에서 해당 장소 위치 등록 필요 |
| 앱 아이콘 안 보임 | Safari/Chrome 최신 버전 업데이트 |
