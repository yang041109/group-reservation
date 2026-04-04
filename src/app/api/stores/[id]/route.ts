import { NextResponse } from 'next/server';
import { normalizeSlotHour } from '@/lib/slot-hour-range';
import { getStoreDetailFromSheets, SheetsApiError } from '@/lib/sheets-api';

export const dynamic = 'force-dynamic';

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const date = url.searchParams.get('date') ?? '';

  try {
    const raw = (await getStoreDetailFromSheets(id, date)) as Record<string, unknown>;
    const store = raw.store;
    const data =
      store && typeof store === 'object' && !Array.isArray(store)
        ? (() => {
            const s = store as Record<string, unknown>;
            const ssh = normalizeSlotHour(s.slotStartHour);
            const seh = normalizeSlotHour(s.slotEndHour);
            const { slotStartHour: _a, slotEndHour: _b, ...rest } = s;
            return {
              ...raw,
              store: {
                ...rest,
                ...(ssh !== undefined ? { slotStartHour: ssh } : {}),
                ...(seh !== undefined ? { slotEndHour: seh } : {}),
              },
            };
          })()
        : raw;
    return NextResponse.json(data, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof SheetsApiError) {
      return NextResponse.json(
        { error: error.responseBody || '가게 정보를 불러올 수 없습니다' },
        { status: error.statusCode, headers: NO_STORE },
      );
    }
    return NextResponse.json(
      { error: '가게 정보를 불러올 수 없습니다' },
      { status: 503, headers: NO_STORE },
    );
  }
}
