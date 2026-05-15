import { NextResponse } from 'next/server';
import { formatMysqlUserError, getPool, isMysqlConfigured } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * 어드민/DB 진단 (비밀번호 미포함). 브라우저에서 GET으로 확인.
 * https://hyu-urr.com/api/admin/health
 */
export async function GET() {
  const mysqlEnvConfigured = isMysqlConfigured();

  if (!mysqlEnvConfigured) {
    return NextResponse.json(
      {
        ok: false,
        mysqlEnvConfigured: false,
        hint: 'MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE 중 하나 이상이 비어 있습니다. 서버 프로세스 환경 변수를 확인하세요.',
      },
      { status: 503 },
    );
  }

  try {
    const pool = getPool();
    await pool.query('SELECT 1 AS ok');
    return NextResponse.json({
      ok: true,
      mysqlEnvConfigured: true,
      ping: 'ok',
      buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? 'unknown',
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        mysqlEnvConfigured: true,
        ping: 'fail',
        message: formatMysqlUserError(e),
      },
      { status: 503 },
    );
  }
}
