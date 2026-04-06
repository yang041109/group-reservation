import { NextResponse } from 'next/server';
import { sendSlackNotification } from '@/lib/slack';
import type { CreateReservationRequest, CreateReservationResponse } from '@/types';

const SHEETS_URL = process.env.NEXT_PUBLIC_SHEETS_URL || '';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateReservationRequest;

    // 시간 범위 파싱
    let startTime = body.time;
    let endTime = body.time;
    if (body.time && body.time.includes(' - ')) {
      const [s, e] = body.time.split(' - ');
      startTime = s.trim();
      endTime = e.trim();
    }

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

    // Apps Script에 POST로 전송 (서버 사이드에서는 리다이렉트 follow 가능)
    const sheetsRes = await fetch(SHEETS_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain' },
      redirect: 'follow',
    });

    let reservationId = `RSV${Date.now()}`;
    let sheetsOk = false;

    try {
      const text = await sheetsRes.text();
      const json = JSON.parse(text);
      if (json.success && json.data?.reservationId) {
        reservationId = json.data.reservationId;
        sheetsOk = true;
      } else if (json.success === false) {
        // Sheets에서 명시적 에러 (잔여 인원 초과 등)
        return NextResponse.json(
          { error: json.message || '예약 요청이 올바르지 않습니다.' },
          { status: 400 },
        );
      }
    } catch {
      // JSON 파싱 실패 — 하지만 시트에 저장됐을 수 있음
      // 성공으로 처리 (시트에 이미 들어감)
      sheetsOk = true;
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
    }).catch(err => {
      console.error('Slack 알림 발송 오류:', err);
    });

    const response: CreateReservationResponse = {
      reservationId,
      status: 'pending',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('예약 생성 오류:', error);
    return NextResponse.json(
      { error: '예약 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
