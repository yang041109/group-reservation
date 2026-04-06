'use client';

/** 통통한 졸라맨 SVG */
function ChubbyStickman({ size = 32, delay = 0, flip = false }: { size?: number; delay?: number; flip?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className="chubby-stickman"
      style={{ animationDelay: `${delay}s`, transform: flip ? 'scaleX(-1)' : undefined }}
    >
      {/* 머리 (통통) */}
      <circle cx="20" cy="10" r="6" fill="#60a5fa" />
      {/* 눈 */}
      <circle cx="18" cy="9" r="1" fill="white" />
      <circle cx="22" cy="9" r="1" fill="white" />
      {/* 입 (웃는) */}
      <path d="M17 12 Q20 15 23 12" stroke="white" strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* 몸통 (통통) */}
      <ellipse cx="20" cy="22" rx="6" ry="7" fill="#93c5fd" />
      {/* 왼팔 */}
      <line x1="14" y1="20" x2="8" y2="17" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
      {/* 오른팔 */}
      <line x1="26" y1="20" x2="32" y2="17" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
      {/* 왼다리 */}
      <line x1="16" y1="28" x2="13" y2="36" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
      {/* 오른다리 */}
      <line x1="24" y1="28" x2="27" y2="36" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

interface LoadingStickmenProps {
  message?: string;
}

export default function LoadingStickmen({ message = '불러오는 중...' }: LoadingStickmenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex items-end gap-1">
        <ChubbyStickman size={36} delay={0} />
        <ChubbyStickman size={42} delay={0.15} />
        <ChubbyStickman size={36} delay={0.3} flip />
      </div>
      <p className="mt-4 text-sm text-gray-500 animate-pulse">{message}</p>
    </div>
  );
}
