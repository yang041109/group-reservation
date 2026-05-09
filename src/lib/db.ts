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

  return mysql.createPool({
    host,
    port: Number(process.env.MYSQL_PORT || '3306'),
    user,
    password: process.env.MYSQL_PASSWORD ?? '',
    database,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || '10'),
    enableKeepAlive: true,
    timezone: 'Z',
  });
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
