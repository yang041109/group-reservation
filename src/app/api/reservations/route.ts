import { NextResponse } from 'next/server';
import { sendSlackNotification } from '@/lib/slack';
import type { CreateReservationRequest, CreateReservationResponse } from '@/types';

const SHEETS_URL = process.env.NEXT_PUBLIC_SHEETS_URL || '';

export async function POST(request: Request) {
  const body = (await request.json()) as CreateReservationRequest;

  // 시간 범위 파싱
  let startTime = body.time;
  let endTime = body.time;
  if (body.time && body.time.includes(' - ')) {
    const [s, e] = body.time.split(' - ');
    startTime = s.trim();
    endTime = e.trim();
  }

  const reservationId = `RSV${Date.now()}`;

  // Apps Script에 예약 저장 시도 (실패해도 성공으로 처리)
  if (SHEETS_URL) {
    const payload = {
      action: 'createReservation',
      data: {
        storeId: body.storeId,
        userName: body.representativeName,
        groupName: body.groupName,
        userPhone: body.phone,
        userNote: '',
        headcount: body.headcount,
        date: body.date,
        startTime,
        endTime,
        selectedMenus: body.menuItems.map(item => ({
          menuId: item.menuId,
          quantity: item.quantity,
        })),
        totalAmount: body.totalAmount,
      },
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const sheetsRes = await fetch(SHEETS_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain' },
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      try {
        const text = await sheetsRes.text();
        const json = JSON.parse(text);
        if (json.success === false && json.message) {
          // Sheets에서 명시적 거부 (잔여 인원 초과 등)만 에러 처리
          return NextResponse.json({ error: json.message }, { status: 400 });
        }
      } catch {
        // 응답 파싱 실패 — 시트에 저장됐을 수 있으므로 무시
      }
    } catch {
      // fetch 자체 실패 (타임아웃, 네트워크 등) — 무시하고 성공 처리
      console.error('Sheets 저장 요청 실패 (무시하고 진행)');
    }
  }

  // Slack 알림 (백그라운드)
  sendSlackNotification({
    storeName: body.storeName ?? '',
    headcount: body.headcount,
    date: body.date ?? '',
    time: body.time ?? '',
    groupName: body.groupName ?? '',
    representativeName: body.representativeName ?? '',
    phone: body.phone ?? '',
    menuItems: (body.menuItems ?? []).map(item => ({
      name: item.name ?? '',
      quantity: item.quantity,
      price: item.price ?? 0,
    })),
    totalAmount: body.totalAmount ?? 0,
    minOrderAmount: body.minOrderAmount ?? 0,
    reservationId,
  }).catch(() => {});

  const response: CreateReservationResponse = { reservationId, status: 'pending' };
  return NextResponse.json(response, { status: 201 });
}
