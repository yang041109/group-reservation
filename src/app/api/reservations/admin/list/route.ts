import { NextResponse } from 'next/server';
import { getAdminReservationList, fromBackendReservation, BackendApiError } from '@/lib/backend-api';
import { getStoreById } from '@/lib/mock-data';

export async function GET() {
  try {
    const backendReservations = await getAdminReservationList();

    const reservations = backendReservations.map((reservation) => {
      const store = getStoreById(reservation.storeId);
      return fromBackendReservation(reservation, store?.name);
    });

    return NextResponse.json({ reservations });
  } catch (error) {
    if (error instanceof BackendApiError) {
      return NextResponse.json(
        { error: '예약 목록을 불러올 수 없습니다' },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: '예약 목록을 불러올 수 없습니다' },
      { status: 503 },
    );
  }
}
