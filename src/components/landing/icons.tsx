'use client';

import type { ReactNode } from 'react';

export type IconName =
  | 'calendar'
  | 'users'
  | 'pin'
  | 'clock'
  | 'phone'
  | 'search'
  | 'check'
  | 'sparkle'
  | 'arrow'
  | 'chevronDown'
  | 'bolt'
  | 'shield'
  | 'card'
  | 'bell'
  | 'split'
  | 'star'
  | 'plus'
  | 'minus'
  | 'menu'
  | 'chat';

export function Icon({
  name,
  size = 20,
  color = 'currentColor',
  stroke = 1.7,
}: {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
}) {
  const s = size;
  const c = color;
  const sw = stroke;
  const paths: Record<IconName, ReactNode> = {
    calendar: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="2.5" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </g>
    ),
    users: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M2.5 20c.6-3.4 3.4-5.4 6.5-5.4s5.9 2 6.5 5.4" />
        <circle cx="17" cy="7" r="2.5" />
        <path d="M21.5 17.5c-.5-2.5-2.3-4-4.5-4" />
      </g>
    ),
    pin: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.5" />
      </g>
    ),
    clock: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </g>
    ),
    phone: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" />
      </g>
    ),
    search: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.5-4.5" />
      </g>
    ),
    check: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l5 5L20 7" />
      </g>
    ),
    sparkle: (
      <g fill={c}>
        <path d="M12 2l1.6 4.6L18 8l-4.4 1.4L12 14l-1.6-4.6L6 8l4.4-1.4z" />
      </g>
    ),
    arrow: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 5l7 7-7 7" />
      </g>
    ),
    chevronDown: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </g>
    ),
    bolt: <g fill={c}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></g>,
    shield: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9.5-4.5-1-8-4.5-8-9.5V6z" />
        <path d="M9 12l2 2 4-4" />
      </g>
    ),
    card: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="M3 10h18M7 15h3" />
      </g>
    ),
    bell: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </g>
    ),
    split: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3v6a4 4 0 0 0 4 4h4a4 4 0 0 1 4 4v4M14 17l4 4 4-4" />
      </g>
    ),
    star: (
      <g fill={c}>
        <path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7-6.3-3.6L5.7 21l1.5-7L2 9.3l7-.8z" />
      </g>
    ),
    plus: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </g>
    ),
    minus: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
      </g>
    ),
    menu: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </g>
    ),
    chat: (
      <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12c0 4.5-4 8-9 8a10 10 0 0 1-3.5-.6L4 21l1.2-3.5A7.4 7.4 0 0 1 3 12c0-4.5 4-8 9-8s9 3.5 9 8z" />
      </g>
    ),
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
      {paths[name]}
    </svg>
  );
}

export function URRMark({ size = 28, dotColor = '#FFD83D' }: { size?: number; dotColor?: string }) {
  return (
    <span
      className="inline-flex items-baseline font-extrabold tracking-tight"
      style={{ fontSize: size, lineHeight: 1, letterSpacing: '-0.04em' }}
    >
      <span className="urr-mark">U</span>
      <span
        className="inline-block shrink-0 rounded-full"
        style={{
          width: size * 0.16,
          height: size * 0.16,
          background: dotColor,
          marginLeft: -size * 0.55,
          marginRight: size * 0.4,
          alignSelf: 'flex-start',
          marginTop: size * 0.05,
        }}
      />
      <span className="urr-mark" style={{ marginLeft: -size * 0.04 }}>
        RR
      </span>
    </span>
  );
}
