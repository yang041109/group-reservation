'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';

/** 랜딩(/)과 admin 페이지에서는 헤더 숨김 */
export default function ConditionalHeader() {
  const pathname = usePathname();
  
  // 랜딩 페이지 또는 admin 페이지에서는 헤더 숨김
  if (pathname === '/' || pathname.startsWith('/admin')) {
    return null;
  }
  
  return <Header />;
}
