'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { URRMark } from '@/components/landing/icons';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: '서비스 소개', href: '/#how' },
    { label: '제휴 매장', href: '/#restaurants' },
    { label: '요금 안내', href: '/#pricing' },
    { label: '고객센터', href: '/#faq' },
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
      <div className="container flex h-[68px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <URRMark size={26} />
          <span
            className="ml-0.5 border-l border-[var(--line)] pl-2.5 text-[13px] font-medium text-[var(--ink-4)]"
          >
            단체예약
          </span>
        </Link>
        <nav className="landing-nav-links hidden items-center gap-1 min-[881px]:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3.5 py-2 text-[14.5px] font-medium text-[var(--ink-2)] hover:bg-[var(--bg-2)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/#faq"
            className="btn btn-ghost hidden h-10 px-3.5 text-sm sm:inline-flex"
          >
            매장 등록
          </Link>
          <Link href="/search" className="btn btn-primary h-10 px-[18px] text-sm">
            로그인
          </Link>
        </div>
      </div>
    </header>
  );
}
