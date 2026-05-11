import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { ADMIN_MANAGE_SECRET_HEADER } from '@/lib/admin-manage-constants';

/** 운영에서 비밀키를 켤 때 최소 길이 (미만이면 인증 비활성과 동일하게 취급) */
const MIN_SECRET_LEN = 12;

function bufEq(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * 전역 관리 API 보호.
 * - `ADMIN_MANAGE_SECRET` 미설정·짧으면: MVP 모드 — 인증 없이 통과
 * - 설정되어 있으면: 헤더 `x-admin-manage-secret` 가 일치해야 통과
 */
export function requireAdminManageAuth(request: Request): NextResponse | null {
  const expected = process.env.ADMIN_MANAGE_SECRET?.trim();
  if (!expected || expected.length < MIN_SECRET_LEN) {
    return null;
  }
  const sent = request.headers.get(ADMIN_MANAGE_SECRET_HEADER)?.trim() ?? '';
  if (!sent || !bufEq(sent, expected)) {
    return NextResponse.json({ success: false, message: '관리자 인증에 실패했습니다.' }, { status: 401 });
  }
  return null;
}
