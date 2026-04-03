'use client';

import Link from 'next/link';
import NotificationBadge from './NotificationBadge';

/** 달리는 졸라맨 SVG */
function RunningStickman({ delay, size = 18 }: { delay: number; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="running-stickman"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* 머리 */}
      <circle cx="12" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
      {/* 몸통 */}
      <line x1="12" y1="6.5" x2="12" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* 왼팔 (뒤로) */}
      <line x1="12" y1="9" x2="8" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* 오른팔 (앞으로) */}
      <line x1="12" y1="9" x2="16" y2="11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* 왼다리 (앞으로) */}
      <line x1="12" y1="14" x2="8" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* 오른다리 (뒤로) */}
      <line x1="12" y1="14" x2="16" y2="19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** 가게 아이콘 SVG */
function StoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-sky-400">
      {/* 지붕 */}
      <path d="M3 10L12 3L21 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* 벽 */}
      <rect x="5" y="10" width="14" height="11" rx="1" stroke="currentColor" strokeWidth="1.8" fill="none" />
      {/* 문 */}
      <rect x="10" y="15" width="4" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
      {/* 간판 */}
      <line x1="5" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-indigo-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* 로고 + 졸라맨 애니메이션 */}
        <Link href="/" className="flex items-center gap-1.5 group">
          <span className="text-lg font-bold text-white tracking-tight">
            우르르
          </span>
          {/* 졸라맨들이 가게로 달려가는 애니메이션 */}
          <div className="flex items-end gap-0 ml-1 text-sky-300 overflow-hidden">
            <RunningStickman delay={0} size={16} />
            <RunningStickman delay={0.15} size={14} />
            <RunningStickman delay={0.3} size={16} />
            <span className="ml-0.5 mb-px"><StoreIcon /></span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/reservations"
            className="text-sm text-sky-200 hover:text-white transition"
          >
            내 예약
          </Link>
          <NotificationBadge />
        </div>
      </div>
    </header>
  );
}
