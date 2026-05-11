import type { Metadata } from 'next';
import ManagePageClient from './ManagePageClient';

export const metadata: Metadata = {
  title: '전역 관리 · 우르르',
  description: '가게·메뉴·사장님 토큰·예약 조회',
};

export default function AdminManagePage() {
  return <ManagePageClient />;
}
