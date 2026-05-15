import type { ReactNode } from 'react';

/** 검색·예약 폼용 라인 아이콘 (달력·인원) */

export function CalendarFieldIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="#2563eb" strokeWidth="1.75" />
      <path d="M8 3v3M16 3v3M3 10h18" stroke="#2563eb" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function PeopleFieldIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="#2563eb" strokeWidth="1.75" />
      <path
        d="M3.5 19.5c.8-3.2 3.2-5 5.5-5s4.7 1.8 5.5 5"
        stroke="#2563eb"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="17.5" cy="7.5" r="2.25" stroke="#2563eb" strokeWidth="1.75" />
      <path
        d="M21 17c-.4-2.2-1.8-3.5-3.5-3.5"
        stroke="#2563eb"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PinIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M12 21s6.5-5.2 6.5-11a6.5 6.5 0 1 0-13 0c0 5.8 6.5 11 6.5 11z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function FieldSectionHeader({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
        {icon}
      </span>
      <span className="text-base font-bold text-gray-900">{title}</span>
    </div>
  );
}
