import { NextResponse } from 'next/server';
import { adminVerifyStore } from '@/lib/admin-mysql';

export const runtime = 'nodejs';

/**
 * 사장님 인증 (storeId + 가게 이름, MySQL store 테이블)
 */
export async function POST(request: Request) {
  try {
    let body: { storeId?: string; storeName?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: '요청 형식이 올바르지 않습니다.' },
        { status: 400 },
      );
    }
    const { storeId, storeName } = body;

    if (!storeId || !storeName) {
      return NextResponse.json(
        { success: false, message: '가게 ID와 이름을 입력해주세요.' },
        { status: 400 },
      );
    }

    const result = await adminVerifyStore(String(storeId), String(storeName));

    if (!result.ok) {
      const msg = result.message;
      const status = msg.includes('일치')
        ? 401
        : msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스')
          ? 503
          : 404;
      return NextResponse.json({ success: false, message: msg }, { status });
    }

    const depositAmount = Number(result.depositAmount);
    return NextResponse.json({
      success: true,
      store: {
        id: String(storeId).trim(),
        name: String(storeName).trim(),
        depositAmount: Number.isFinite(depositAmount) ? depositAmount : 0,
      },
    });
  } catch (e) {
    console.error('[POST /api/admin/auth] unhandled', e);
    return NextResponse.json(
      {
        success: false,
        message:
          '서버에서 예기치 않은 오류가 났습니다. 배포가 최신인지, Vercel(또는 호스팅) 함수 로그와 MYSQL_* 환경 변수·DB 연결을 확인해 주세요.',
      },
      { status: 500 },
    );
  }
}
