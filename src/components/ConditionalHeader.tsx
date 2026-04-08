'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';

/** 랜딩(/)에서는 헤더 숨김 */
export default function ConditionalHeader() {
  const pathname = usePathname();
  if (pathname === '/') return null;
  return <Header />;
}
