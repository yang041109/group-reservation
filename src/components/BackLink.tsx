'use client';

import { useRouter } from 'next/navigation';

type BackLinkProps = {
  fallbackHref?: string;
  label?: string;
  className?: string;
};

export default function BackLink({
  fallbackHref = '/search',
  label = '뒤로',
  className = '',
}: BackLinkProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className={`mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 ${className}`}
    >
      <span aria-hidden>←</span>
      {label}
    </button>
  );
}
