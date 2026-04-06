import { NextResponse } from 'next/server';
import { getStoreDetailFromSheets, SheetsApiError } from '@/lib/sheets-api';
import { getStaticStore } from '@/lib/store-data';
import type { TimeSlot } from '@/types';

// Sheets에서 해당 날짜의 예약 현황을 가져와 슬롯별 잔여 인원 반환
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const date = url.searchParams.get('date') ?? '';

  const store = getStaticStore(id);
  if (!store) {
    return NextResponse.json({ error: '가게를 찾을 수 없습니다.' }, { status: 404 });
  }

  try {
    const data = await getStoreDetailFromSheets(id, date) as { slots?: TimeSlot[] };
    return NextResponse.json({ slots: data.slots ?? [] });
  } catch (error) {
    // Sheets 실패 시 기본값 (전부 여유) 반환
    const defaultSlots: TimeSlot[] = [];
    for (let h = 11; h <= 20; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        defaultSlots.push({
          slotId: `slot-${time.replace(':', '')}`,
          timeBlock: time,
          isAvailable: true,
          maxPeople: store.maxCapacity,
          currentHeadcount: 0,
        });
      }
    }
    return NextResponse.json({ slots: defaultSlots });
  }
}
