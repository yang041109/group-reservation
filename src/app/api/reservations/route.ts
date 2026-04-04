import { NextResponse } from 'next/server';
import { createReservationInSheets, SheetsApiError } from '@/lib/sheets-api';
import { sendSlackNotification } from '@/lib/slack';
import type { CreateReservationRequest, CreateReservationResponse } from '@/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateReservationRequest;

    // 시간 범위 파싱 (프론트에서 "18:00 - 19:30" 형태로 올 수 있음)
    let startTime = body.time;
    let endTime = body.time;
    if (body.time && body.time.includes(' - ')) {
      const [s, e] = body.time.split(' - ');
      startTime = s.trim();
      endTime = e.trim();
    }

    const sheetsData = await createReservationInSheets({
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
    }) as Record<string, unknown>;

    const reservationId = String(sheetsData?.reservationId ?? `res-${Date.now()}`);

    // Slack 알림 (백그라운드)
    const menuItems = (body.menuItems ?? []).map(item => ({
      name: item.name ?? '',
      quantity: item.quantity,
      price: item.price ?? 0,
    }));

    sendSlackNotification({
      storeName: body.storeName ?? '',
      headcount: body.headcount,
      date: body.date ?? '',
      time: body.time ?? '',
      groupName: body.groupName ?? '',
      representativeName: body.representativeName ?? '',
      phone: body.phone ?? '',
      menuItems,
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
    if (error instanceof SheetsApiError) {
      return NextResponse.json(
        { error: error.responseBody || '예약 요청이 올바르지 않습니다.' },
        { status: error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 502 },
      );
    }
    return NextResponse.json(
      { error: '예약 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
