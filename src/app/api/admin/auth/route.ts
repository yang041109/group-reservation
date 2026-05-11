import { NextResponse } from 'next/server';

const SHEETS_URL = process.env.NEXT_PUBLIC_SHEETS_URL || '';

/**
 * 사장님 인증 (storeId + name 확인)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, storeName } = body;

    if (!storeId || !storeName) {
      return NextResponse.json(
        { success: false, message: '가게 ID와 이름을 입력해주세요.' },
        { status: 400 }
      );
    }

    // Google Sheets에서 가게 정보 확인
    const res = await fetch(
      `${SHEETS_URL}?action=getStoreDetail&storeId=${encodeURIComponent(storeId)}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: '가게 정보를 확인할 수 없습니다.' },
        { status: 404 }
      );
    }

    const data = await res.json();
    
    if (!data.success) {
      return NextResponse.json(
        { success: false, message: '가게를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 가게 이름 확인
    if (data.data.store.name !== storeName) {
      return NextResponse.json(
        { success: false, message: '가게 이름이 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      store: {
        id: storeId,
        name: storeName,
        depositAmount: data.data.store.depositAmount || 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
