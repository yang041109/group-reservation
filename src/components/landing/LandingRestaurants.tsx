'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/landing/icons';

type Restaurant = {
  name: string;
  area: string;
  cat: string;
  cap: string;
  price: string;
  avail: number;
  rating: number;
  tint: string;
  dish: string;
  tags: string[];
  reviews: number;
};

export default function LandingRestaurants() {
  const [filter, setFilter] = useState('전체');
  const filters = ['전체', '회식 명소', '룸 있음', '와인·하이볼', '한식·고기', '비건 가능'];

  const restaurants: Restaurant[] = [
    {
      name: '고기굽는 마을',
      area: '홍대 · 합정',
      cat: '한식 · 고기',
      cap: '4~20인',
      price: '4.5만원~',
      avail: 3,
      rating: 4.8,
      tint: '#fde2ec',
      dish: '🥩',
      tags: ['룸 있음', '회식 명소', '한식·고기'],
      reviews: 1284,
    },
    {
      name: '소년식당',
      area: '강남 · 역삼',
      cat: '캐주얼 다이닝',
      cap: '6~30인',
      price: '5.8만원~',
      avail: 5,
      rating: 4.7,
      tint: '#e3f0fd',
      dish: '🍽️',
      tags: ['룸 있음', '회식 명소'],
      reviews: 892,
    },
    {
      name: '오들리 와인바',
      area: '성수 · 건대',
      cat: '와인 · 다이닝',
      cap: '4~16인',
      price: '7.2만원~',
      avail: 2,
      rating: 4.9,
      tint: '#ece5fa',
      dish: '🍷',
      tags: ['와인·하이볼', '회식 명소'],
      reviews: 567,
    },
    {
      name: '한상차림 본점',
      area: '광화문 · 종로',
      cat: '한정식',
      cap: '8~40인',
      price: '6.5만원~',
      avail: 4,
      rating: 4.6,
      tint: '#fff7c8',
      dish: '🍱',
      tags: ['룸 있음', '한식·고기'],
      reviews: 2134,
    },
    {
      name: '플레이트 No.7',
      area: '여의도 · 영등포',
      cat: '비스트로',
      cap: '10~50인',
      price: '5.2만원~',
      avail: 7,
      rating: 4.5,
      tint: '#e3f0fd',
      dish: '🥗',
      tags: ['비건 가능', '회식 명소'],
      reviews: 1023,
    },
    {
      name: '온돌집',
      area: '판교 · 분당',
      cat: '한식 · 단체전문',
      cap: '12~60인',
      price: '3.8만원~',
      avail: 1,
      rating: 4.7,
      tint: '#fde2ec',
      dish: '🍲',
      tags: ['룸 있음', '한식·고기', '회식 명소'],
      reviews: 1567,
    },
  ];

  const filtered = filter === '전체' ? restaurants : restaurants.filter((r) => r.tags.includes(filter));

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
              제휴 매장
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
            <p style={{ fontSize: 16, color: 'var(--ink-3)', margin: 0 }}>단체석 보유·룸 구비 기준으로 추려드려요.</p>
          </div>
          <Link href="/search" style={{ fontSize: 14, fontWeight: 600, color: 'var(--urr-blue-1)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            전체 보기 <Icon name="arrow" size={14} color="var(--urr-blue-1)" />
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: '9px 16px',
                borderRadius: 999,
                fontSize: 13.5,
                fontWeight: 600,
                background: filter === f ? 'var(--ink)' : 'white',
                color: filter === f ? 'white' : 'var(--ink-3)',
                border: filter === f ? '1px solid var(--ink)' : '1px solid var(--line)',
                transition: 'all 0.15s',
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }} className="rest-grid">
          {filtered.map((r, i) => (
            <RestaurantCard key={r.name} r={r} idx={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RestaurantCard({ r, idx }: { r: Restaurant; idx: number }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'white',
        borderRadius: 22,
        overflow: 'hidden',
        border: '1px solid var(--line)',
        transform: hover ? 'translateY(-4px)' : 'none',
        boxShadow: hover ? '0 24px 60px -24px rgba(15,22,35,0.18)' : '0 1px 0 rgba(15,22,35,0.02)',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          height: 180,
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${r.tint} 0%, white 100%)`,
        }}
      >
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
          <defs>
            <pattern id={`stripe-${idx}`} patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
              <rect width="14" height="14" fill="transparent" />
              <line x1="0" y1="0" x2="0" y2="14" stroke="white" strokeWidth="6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#stripe-${idx})`} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>{r.dish}</div>
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
          단체 {r.cap}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-4)', fontWeight: 500 }}>{r.area}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ink-4)' }} />
          <span style={{ fontSize: 12, color: 'var(--ink-4)', fontWeight: 500 }}>{r.cat}</span>
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.02em' }}>{r.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
            {r.tags.slice(0, 2).map((tag) => (
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
            {r.price} <span style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 500 }}>/ 1인</span>
          </div>
        </div>
      </div>
    </div>
  );
}
