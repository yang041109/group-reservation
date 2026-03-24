'use client';

import Link from 'next/link';
import NotificationBadge from './NotificationBadge';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-gray-900">
          우르르
        </Link>
        <NotificationBadge />
      </div>
    </header>
  );
}
