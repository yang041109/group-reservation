import { NextResponse } from 'next/server';
import { insertReservationValidated, ReservationDbError } from '@/lib/mysql-data';
import { sendSlackNotification } from '@/lib/slack';
import type { CreateReservationRequest, CreateReservationResponse } from '@/types';

export async function POST(request: Request) {
  let body: CreateReservationRequest;
  try {
    body = (await request.json()) as CreateReservationRequest;
  } catch {
    return NextResponse.json({ error: '요청 데이터를 읽을 수 없습니다.' }, { status: 400 });
  }

  if (!body.storeId || !body.date || !body.time) {
    return NextResponse.json({ error: '필수 정보(가게, 날짜, 시간)가 누락되었습니다.' }, { status: 400 });
  }

  // 시간 범위 파싱
  let startTime = body.time;
  let endTime = body.time;
  if (body.time && body.time.includes(' - ')) {
    const [s, e] = body.time.split(' - ');
    startTime = s.trim();
    endTime = e.trim();
  }

  const reservationId = `RSV${Date.now()}`;

  try {
    await insertReservationValidated(
      {
        storeId: body.storeId,
        zoneId: body.zoneId,
        userName: body.representativeName,
        groupName: body.groupName,
        userPhone: body.phone,
        userNote: body.userNote || '',
        headcount: body.headcount,
        date: body.date,
        startTime,
        endTime,
        selectedMenus: body.menuItems.map((item) => ({
          menuId: item.menuId,
          quantity: item.quantity,
        })),
        totalAmount: body.totalAmount,
      },
      reservationId,
    );
  } catch (error) {
    if (error instanceof ReservationDbError) {
      return NextResponse.json(
        { error: error.responseBody },
        { status: error.statusCode >= 500 ? 503 : error.statusCode },
      );
    }
    throw error;
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

  const response: CreateReservationResponse = { reservationId, status: 'PENDING' };
  return NextResponse.json(response, { status: 201 });
}
