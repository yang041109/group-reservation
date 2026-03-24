import { NextResponse } from 'next/server';
import type { SyncNotionResponse } from '@/types';

// Mock: 노션 동기화는 현재 비활성화 (DB 없음)
// Firebase 연동 시 이 라우트를 재구현하세요.
export async function POST() {
  const response: SyncNotionResponse = {
    syncedStores: 0,
    errors: ['현재 mock 모드입니다. 데이터베이스가 연결되지 않았습니다.'],
    lastSyncedAt: new Date(),
  };

  return NextResponse.json(response);
}
