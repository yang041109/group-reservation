'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { URRMark } from '@/components/landing/icons';
import { scrollToLandingId } from '@/components/landing/landing-scroll';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: '서비스 소개', id: 'how' as const },
    { label: '제휴 매장', id: 'restaurants' as const },
    { label: '요금 안내', id: 'pricing' as const },
    { label: '고객센터', id: 'faq' as const },
  ];

  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 transition-all duration-200"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.78)' : 'transparent',
        backdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
      }}
    >
      <div className="container flex h-[68px] items-center gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <URRMark size={26} />
          <span className="ml-0.5 border-l border-[var(--line)] pl-2.5 text-[13px] font-medium text-[var(--ink-4)]">
            단체예약
          </span>
        </Link>
        <nav className="landing-nav-links ml-auto hidden flex-wrap items-center justify-end gap-1 min-[881px]:flex">
          {links.map((l) => (
            <button
              key={l.id}
              type="button"
              className="rounded-lg px-3.5 py-2 text-[14.5px] font-medium text-[var(--ink-2)] hover:bg-[var(--bg-2)]"
              onClick={() => scrollToLandingId(l.id)}
            >
              {l.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
