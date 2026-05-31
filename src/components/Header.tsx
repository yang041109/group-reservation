'use client';

import { useState } from 'react';
import Link from 'next/link';
import MyReservationsModal from '@/components/MyReservationsModal';
import { trackEvent } from '@/lib/analytics';
import { KAKAO_INQUIRY_OPEN_CHAT_URL, openKakaoInquiryChat } from '@/lib/kakao-open-chat';

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
      <circle cx="12" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <line x1="12" y1="6.5" x2="12" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="9" x2="8" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="9" x2="16" y2="11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="14" x2="8" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="14" x2="16" y2="19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-sky-400">
      <path d="M3 10L12 3L21 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="5" y="10" width="14" height="11" rx="1" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <rect x="10" y="15" width="4" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
      <line x1="5" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function Header() {
  const [reservationsOpen, setReservationsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full max-w-full overflow-x-clip border-b border-blue-400/30 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/search" className="group flex items-center gap-1.5">
          <span className="text-lg font-bold tracking-tight text-white">우르르</span>
          <div className="ml-1 flex items-end gap-0 overflow-hidden text-blue-200">
            <RunningStickman delay={0} size={16} />
            <RunningStickman delay={0.15} size={14} />
            <RunningStickman delay={0.3} size={16} />
            <span className="mb-px ml-0.5">
              <StoreIcon />
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <a
            href={KAKAO_INQUIRY_OPEN_CHAT_URL}
            onClick={(e) => {
              e.preventDefault();
              trackEvent('clicked_inquiry', { source: 'header' });
              openKakaoInquiryChat();
            }}
            className="text-sm text-white/90 transition hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="카카오톡 오픈채팅으로 문의하기"
          >
            문의하기
          </a>
          <button
            type="button"
            onClick={() => {
              trackEvent('clicked_my_reservations', { source: 'header' });
              setReservationsOpen(true);
            }}
            className="text-sm text-white/90 transition hover:text-white"
          >
            내 예약
          </button>
        </div>
      </div>
      <MyReservationsModal open={reservationsOpen} onClose={() => setReservationsOpen(false)} />
    </header>
  );
}
