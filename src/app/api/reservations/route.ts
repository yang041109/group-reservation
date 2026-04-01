import { NextResponse } from 'next/server';
import { getStoreById, createReservation, getAllReservations } from '@/lib/mock-data';
import { validateReservationRequest } from '@/lib/validation';
import { sendSlackNotification } from '@/lib/slack';
import type { CreateReservationRequest, CreateReservationResponse } from '@/types';

export async function GET() {
  const reservations = getAllReservations();

  const result = reservations.map((r) => {
    const store = getStoreById(r.storeId);
    return {
      id: r.id,
      storeName: store?.name ?? '',
      headcount: r.headcount,
      time: r.time,
      totalAmount: r.totalAmount,
      status: r.status,
      adminNote: r.adminNote,
      menuItems: r.menuItems,
      createdAt: r.createdAt,
    };
  });

  return NextResponse.json({ reservations: result });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CreateReservationRequest>;

    const store = body.storeId ? getStoreById(body.storeId) : null;

    if (!store) {
      return NextResponse.json(
        { error: '가게를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    const validation = validateReservationRequest(
      body,
      { maxCapacity: store.maxCapacity },
      store.availableTimes,
      store.minOrderRules,
    );

    if (!validation.valid) {
      return NextResponse.json(
        { errors: validation.errors },
        { status: 400 },
      );
    }

    const reservation = createReservation({
      storeId: store.id,
      headcount: body.headcount!,
      time: body.time!,
      totalAmount: body.totalAmount!,
      menuItems: body.menuItems ?? [],
      storeName: store.name,
      menus: store.menus,
    });

    sendSlackNotification({
      storeName: store.name,
      headcount: reservation.headcount,
      time: reservation.time,
      menuItems: reservation.menuItems.map((rm) => ({
        name: rm.name,
        quantity: rm.quantity,
        price: rm.priceAtTime,
      })),
      totalAmount: reservation.totalAmount,
      minOrderAmount: body.minOrderAmount ?? 0,
      reservationId: reservation.id,
    }).catch((err) => {
      console.error('Slack 알림 발송 백그라운드 오류:', err);
    });

    const response: CreateReservationResponse = {
      reservationId: reservation.id,
      status: 'pending',
    };

    return NextResponse.json(response, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: '예약 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
