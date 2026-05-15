#!/usr/bin/env bash
# 서버에서 실행: pull·빌드·실행 경로가 맞는지 확인
set -euo pipefail

ROOT="${1:-$(pwd)}"
cd "$ROOT"

echo "== git =="
git rev-parse --short HEAD 2>/dev/null || echo "(not a git repo)"
git log -1 --oneline 2>/dev/null || true

echo ""
echo "== 소스 (search/page.tsx) =="
if grep -q 'search-booking-filters' src/app/search/page.tsx 2>/dev/null; then
  echo "OK: search-booking-filters (세로 배치 코드)"
elif grep -q 'md:grid-cols-2' src/app/search/page.tsx 2>/dev/null; then
  echo "OLD: md:grid-cols-2 — git pull 필요"
else
  echo "WARN: search 레이아웃 클래스를 찾지 못함"
fi

echo ""
echo "== 빌드 산출물 (.next/server/app/search.html) =="
if [ -f .next/server/app/search.html ]; then
  if grep -q 'search-booking-filters' .next/server/app/search.html; then
    echo "OK: 빌드에 search-booking-filters 포함"
  elif grep -q 'md:grid-cols-2' .next/server/app/search.html; then
    echo "OLD: 빌드가 예전 버전 — npm run build 필요"
  else
    echo "WARN: search.html에서 레이아웃 클래스 미확인"
  fi
else
  echo "MISSING: .next 없음 — npm run build 필요"
fi

echo ""
echo "== pm2 (설치된 경우) =="
if command -v pm2 >/dev/null 2>&1; then
  pm2 list 2>/dev/null || true
  echo "pm2 describe <앱이름> 으로 exec cwd / script 확인"
else
  echo "pm2 없음"
fi
