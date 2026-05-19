'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { Icon } from '@/components/landing/icons';
import type { CachedStore } from '@/lib/use-store-data';
import { useAllData } from '@/lib/use-store-data';

const CATEGORY_EMOJI: Record<string, string> = {
  한식: '🍚',
  양식: '🍕',
  일식: '🍣',
  중식: '🥟',
  호프: '🍺',
  카페: '☕',
  분식: '🍜',
  고기: '🥩',
  치킨: '🍗',
  해산물: '🦐',
};

const TINTS = ['#fde2ec', '#e3f0fd', '#fff7c8', '#ece5fa'] as const;

function categoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] ?? '🍽️';
}

function minPerPersonWon(store: CachedStore): number {
  if (store.menus.length > 0) {
    return Math.min(...store.menus.map((m) => m.price));
  }
  return 0;
}

function formatPriceFromWon(won: number): string {
  if (won <= 0) return '가격 문의';
  const man = won / 10000;
  if (man >= 1) {
    const rounded = Math.round(man * 10) / 10;
    const s = Number.isInteger(rounded) ? String(rounded) : String(rounded);
    return `${s}만원~`;
  }
  return `${won.toLocaleString('ko-KR')}원~`;
}

function capacityLabel(store: CachedStore): string {
  const minC = store.minGroupHeadcount ?? 2;
  return `${minC}~${store.maxCapacity}인`;
}

export default function LandingRestaurants() {
  const { stores, isLoading, hasPayload } = useAllData();
  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <section id="restaurants" style={{ padding: '120px 0', background: 'var(--bg-3)' }}>
      <div className="container">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 32,
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          <div>
            <div className="pill" style={{ marginBottom: 16, background: 'white' }}>
              <span className="dot" />
              등록 매장
            </div>
            <h2
              style={{
                fontSize: 'clamp(32px, 4.4vw, 44px)',
                lineHeight: 1.15,
                fontWeight: 800,
                letterSpacing: '-0.035em',
                margin: '0 0 10px',
              }}
            >
              지금 단체석이 비어있는 곳
            </h2>
            <p style={{ fontSize: 16, color: 'var(--ink-3)', margin: 0 }}>
              DB에 등록된 매장을 모두 보여 드려요. 자리 찾기 후에는 날짜·인원에 맞게 다시 필터돼요.
            </p>
          </div>
          <Link href="/search" style={{ fontSize: 14, fontWeight: 600, color: 'var(--urr-blue-1)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            전체 보기 <Icon name="arrow" size={14} color="var(--urr-blue-1)" />
          </Link>
        </div>

        {!hasPayload && isLoading ? (
          <p style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '48px 0' }}>매장 정보를 불러오는 중이에요…</p>
        ) : stores.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '48px 0' }}>등록된 매장이 아직 없어요.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }} className="rest-grid">
            {stores.map((s, i) => (
              <RestaurantCard key={s.storeId} store={s} idx={i} hover={hoverId === s.storeId} onHover={(v) => setHoverId(v ? s.storeId : null)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RestaurantCard({
  store,
  idx,
  hover,
  onHover,
}: {
  store: CachedStore;
  idx: number;
  hover: boolean;
  onHover: (v: boolean) => void;
}) {
  const uid = useId().replace(/:/g, '');
  const tint = TINTS[idx % TINTS.length];
  const dish = categoryEmoji(store.category);
  const per = minPerPersonWon(store);
  const priceLabel = formatPriceFromWon(per);
  const tags = [store.category].filter(Boolean);

  return (
    <Link
      href={`/stores/${store.storeId}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        background: 'white',
        borderRadius: 22,
        overflow: 'hidden',
        border: '1px solid var(--line)',
        transform: hover ? 'translateY(-4px)' : 'none',
        boxShadow: hover ? '0 24px 60px -24px rgba(15,22,35,0.18)' : '0 1px 0 rgba(15,22,35,0.02)',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        display: 'block',
      }}
    >
      <div
        style={{
          height: 180,
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${tint} 0%, white 100%)`,
        }}
      >
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
          <defs>
            <pattern id={`stripe-${uid}-${idx}`} patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
              <rect width="14" height="14" fill="transparent" />
              <line x1="0" y1="0" x2="0" y2="14" stroke="white" strokeWidth="6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#stripe-${uid}-${idx})`} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>{dish}</div>
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            background: 'white',
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 700,
            color: 'var(--urr-blue-deep)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="users" size={11} color="var(--urr-blue-deep)" stroke={2} />
          단체 {capacityLabel(store)}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-4)', fontWeight: 500 }}>{store.category}</span>
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.02em' }}>{store.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 9px',
                  borderRadius: 6,
                  background: 'var(--bg-2)',
                  color: 'var(--ink-3)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 700 }} className="num">
            {priceLabel} <span style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 500 }}>/ 1인 기준</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
