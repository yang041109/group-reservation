import { NextResponse } from 'next/server';
import { getStoreById, getAllReservations, getReservationsByUser } from '@/lib/mock-data';
import { sendSlackNotification } from '@/lib/slack';
import { toBackendReservationRequest, createReservation, BackendApiError } from '@/lib/backend-api';
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
    const body = (await request.json()) as CreateReservationRequest;

    // 프론트엔드 요청 → 백엔드 DTO 변환 (새 필드 매핑)
    const backendRequest = toBackendReservationRequest(body);

    // 백엔드 API로 예약 생성 프록시 (공통 래퍼 파싱 적용)
    // 성공 응답 { success: true, data } → data 추출됨
    const backendData = await createReservation(backendRequest) as Record<string, unknown>;

    // 백엔드 응답에서 예약 ID 추출
    const reservationId = String(
      backendData?.id ?? backendData?.reservationId ?? `res-${Date.now()}`,
    );

    // 백엔드 성공 후 Slack 알림 발송 (기존대로 유지)
    const menuItems = (body.menuItems ?? []).map((item) => ({
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
    }).catch((err) => {
      console.error('Slack 알림 발송 백그라운드 오류:', err);
    });

    const response: CreateReservationResponse = {
      reservationId,
      status: 'pending',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    // 백엔드 실패 응답 { success: false, message } → message를 에러로 반환
    if (error instanceof BackendApiError) {
      if (error.statusCode >= 400 && error.statusCode < 500) {
        return NextResponse.json(
          { error: error.responseBody || '예약 요청이 올바르지 않습니다.' },
          { status: error.statusCode },
        );
      }
      // 5xx → "예약 처리 중 오류가 발생했습니다"
      return NextResponse.json(
        { error: '예약 처리 중 오류가 발생했습니다.' },
        { status: 502 },
      );
    }
    // 네트워크 오류 등 → "예약 처리 중 오류가 발생했습니다"
    return NextResponse.json(
      { error: '예약 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
