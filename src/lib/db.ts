import mysql from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var -- Next.js dev HMR에서 풀 재생성 방지
  var mysqlPool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const database = process.env.MYSQL_DATABASE;
  if (!host || !user || !database) {
    throw new Error('MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE 환경 변수가 필요합니다.');
  }

  const sslMode = process.env.MYSQL_SSL;
  const useSsl =
    sslMode === 'true' || sslMode === '1'
      ? { rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined;

  return mysql.createPool({
    host,
    port: Number(process.env.MYSQL_PORT || '3306'),
    user,
    password: process.env.MYSQL_PASSWORD ?? '',
    database,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || '10'),
    enableKeepAlive: true,
    connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT_MS || '15000'),
    timezone: 'Z',
    ...(useSsl ? { ssl: useSsl } : {}),
  });
}

/** 배포·로그용: MySQL 연결 오류를 사용자에게 보여줄 짧은 한글 메시지로 */
export function formatMysqlUserError(err: unknown): string {
  const e = err as NodeJS.ErrnoException & { code?: string; errno?: number };
  const code = e?.code;
  if (code === 'ECONNREFUSED') {
    return 'DB 서버에 연결할 수 없습니다. MYSQL_HOST·포트(3306), MySQL bind-address·방화벽을 확인하세요.';
  }
  if (code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
    return 'DB 주소를 찾지 못했거나 시간이 초과되었습니다. MYSQL_HOST를 확인하세요.';
  }
  if (code === 'ER_ACCESS_DENIED_ERROR' || e?.errno === 1045) {
    return 'DB 로그인이 거부되었습니다. MYSQL_USER·MYSQL_PASSWORD를 확인하세요.';
  }
  if (code === 'ER_BAD_DB_ERROR' || e?.errno === 1049) {
    return '데이터베이스 이름이 없습니다. MYSQL_DATABASE를 확인하세요.';
  }
  if (typeof e?.message === 'string' && e.message.includes('MYSQL_HOST')) {
    return e.message;
  }
  return '데이터베이스 연결에 실패했습니다. Vercel 등 배포 환경의 MYSQL_* 변수와 DB 접속 허용(공인 IP)을 확인하세요.';
}

export function getPool(): mysql.Pool {
  if (!globalThis.mysqlPool) {
    globalThis.mysqlPool = createPool();
  }
  return globalThis.mysqlPool;
}

export function isMysqlConfigured(): boolean {
  return Boolean(process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE);
}
