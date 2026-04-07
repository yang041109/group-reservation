import { NextResponse } from 'next/server';
import { SheetsApiError } from '@/lib/sheets-api';

const SHEETS_URL = process.env.NEXT_PUBLIC_SHEETS_URL || '';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userPhone = url.searchParams.get('userPhone') ?? '';
  const userName = url.searchParams.get('userName') ?? '';
  const phoneLast4 = url.searchParams.get('phoneLast4') ?? '';

  // 이름 + 뒷4자리 조회 또는 전화번호 전체 조회
  let action = 'getReservations';
  const params: Record<string, string> = {};

  if (userName && phoneLast4) {
    params.action = 'getReservationsByNamePhone4';
    params.userName = userName;
    params.phoneLast4 = phoneLast4;
  } else if (userPhone) {
    params.action = 'getReservations';
    params.userPhone = userPhone;
  } else {
    return NextResponse.json({ error: '조회 조건을 입력해주세요.' }, { status: 400 });
  }

  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${SHEETS_URL}?${query}`, { cache: 'no-store' });
    if (!res.ok) throw new SheetsApiError(res.status, await res.text());
    const json = await res.json();
    if (json.success === false) {
      return NextResponse.json({ error: json.message }, { status: 400 });
    }
    return NextResponse.json({ reservations: json.data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: '예약 정보를 불러올 수 없습니다' }, { status: 503 });
  }
}
