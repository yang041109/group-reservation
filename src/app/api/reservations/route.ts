import { NextResponse } from 'next/server';
import { getStoreById, createReservation, getAllReservations, getReservationsByUser } from '@/lib/mock-data';
import { validateReservationRequest } from '@/lib/validation';
import { sendSlackNotification } from '@/lib/slack';
import type { CreateReservationRequest, CreateReservationResponse } from '@/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get('name');
  const phone = url.searchParams.get('phone');

  const reservations = name && phone
    ? getReservationsByUser(name, phone)
    : getAllReservations();

  const result = reservations.map((r) => {
    const store = getStoreById(r.storeId);
    return {
      id: r.id,
      storeId: r.storeId,
      storeName: store?.name ?? '',
      groupName: r.groupName,
      representativeName: r.representativeName,
      phone: r.phone,
      headcount: r.headcount,
      date: r.date,
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
      date: body.date!,
      time: body.time!,
      groupName: body.groupName ?? '',
      representativeName: body.representativeName ?? '',
      phone: body.phone ?? '',
      totalAmount: body.totalAmount!,
      menuItems: body.menuItems ?? [],
      storeName: store.name,
      menus: store.menus,
    });

    sendSlackNotification({
      storeName: store.name,
      headcount: reservation.headcount,
      date: reservation.date,
      time: reservation.time,
      groupName: reservation.groupName,
      representativeName: reservation.representativeName,
      phone: reservation.phone,
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
