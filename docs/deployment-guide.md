# 배포 가이드

## 📦 배포 구조

이 프로젝트는 **하나의 Next.js 앱**에 **두 개의 독립적인 서비스**가 있습니다:

1. **학생용 예약 페이지** (`/` 경로)
2. **사장님용 관리 페이지** (`/admin` 경로)

→ **Vercel에 한 번만 배포**하면 두 서비스 모두 사용 가능합니다!

---

## 🚀 Vercel 배포 방법

### 1단계: GitHub에 푸시

```bash
git add .
git commit -m "Add admin management page"
git push origin main
```

### 2단계: Vercel 배포

#### 방법 A: Vercel 대시보드 (추천)
1. [vercel.com](https://vercel.com) 접속 및 로그인
2. 프로젝트 선택
3. 자동으로 새 커밋 감지 → 자동 배포 시작
4. 배포 완료 대기 (약 2-3분)

#### 방법 B: CLI로 배포
```bash
# Vercel CLI 설치 (처음 한 번만)
npm install -g vercel

# 배포
vercel --prod
```

### 3단계: 환경 변수 확인

Vercel 대시보드에서 **Settings > Environment Variables** 확인:

```
NEXT_PUBLIC_SHEETS_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

⚠️ **중요**: Apps Script URL이 변경되었다면 Vercel 환경 변수도 업데이트 필요!

---

## 🔗 배포 후 접속 URL

배포가 완료되면 두 개의 URL로 접속 가능:

### 학생용 예약 페이지
```
https://your-project.vercel.app/
```

### 사장님용 관리 페이지
```
https://your-project.vercel.app/admin
```

---

## 📋 Google Apps Script 배포

### 1단계: Apps Script 에디터 열기
1. Google Sheets 열기
2. **확장 프로그램 > Apps Script** 클릭

### 2단계: 코드 업데이트
1. `docs/apps-script.js` 파일의 전체 내용 복사
2. Apps Script 에디터에 붙여넣기 (기존 코드 덮어쓰기)
3. **저장** (Ctrl+S 또는 💾 아이콘)

### 3단계: 새 배포
1. 우측 상단 **배포 > 배포 관리** 클릭
2. 기존 배포 옆 **✏️ 편집** 클릭
3. **버전** 드롭다운에서 **새 버전** 선택
4. **배포** 버튼 클릭
5. 새 배포 URL 복사 (변경되지 않음)

### 4단계: 권한 승인 (처음 배포 시에만)
1. "권한 검토" 클릭
2. Google 계정 선택
3. "고급" → "안전하지 않은 페이지로 이동" 클릭
4. "허용" 클릭

---

## ✅ 배포 확인 체크리스트

### Google Apps Script
- [ ] `docs/apps-script.js` 코드 복사 → Apps Script 에디터에 붙여넣기
- [ ] 저장 완료
- [ ] 새 버전으로 배포 완료
- [ ] 배포 URL 확인 (변경 없음)

### Vercel
- [ ] GitHub에 푸시 완료
- [ ] Vercel 자동 배포 완료
- [ ] 환경 변수 `NEXT_PUBLIC_SHEETS_URL` 설정 확인
- [ ] 학생용 페이지 접속 테스트 (`/`)
- [ ] 사장님용 페이지 접속 테스트 (`/admin`)

### 기능 테스트
- [ ] 학생용: 가게 검색 → 예약 → 완료
- [ ] 사장님용: 로그인 → 대기 중인 예약 확인 → 수락/거절

---

## 🔧 문제 해결

### 1. "404 Not Found" 에러
- Vercel 배포가 완료되었는지 확인
- 브라우저 캐시 삭제 후 새로고침 (Ctrl+Shift+R)

### 2. "가게 정보를 불러올 수 없습니다"
- Apps Script가 새 버전으로 배포되었는지 확인
- `.env.local`과 Vercel 환경 변수의 URL이 동일한지 확인
- Apps Script URL 끝에 `/exec`가 있는지 확인

### 3. 사장님 로그인 실패
- Google Sheets의 `store` 시트에 storeId와 name이 정확히 입력되어 있는지 확인
- 대소문자, 공백 등이 정확히 일치하는지 확인

### 4. 예약 수락/거절이 안 됨
- Apps Script에 `handleUpdateReservationStatus` 함수가 있는지 확인
- 브라우저 개발자 도구(F12) → Console 탭에서 에러 확인

---

## 📱 사용자 안내

### 학생들에게 공유할 URL
```
https://your-project.vercel.app/
```

### 사장님들에게 공유할 정보
```
URL: https://your-project.vercel.app/admin
로그인 정보:
- 가게 ID: store-1 (각 가게마다 다름)
- 가게 이름: 주점A (정확히 입력)
```

---

## 🔒 보안 참고사항

현재는 간단한 인증 방식이므로:
- storeId와 name을 사장님께만 개별적으로 전달
- 정기적으로 Google Sheets 접근 권한 확인
- 필요시 Apps Script 배포 URL 재생성 가능

---

## 📞 지원

문제가 발생하면:
1. 브라우저 개발자 도구(F12) → Console 탭 확인
2. Vercel 대시보드 → 프로젝트 → Deployments → 최신 배포 → Logs 확인
3. Google Sheets → Apps Script → 실행 로그 확인
