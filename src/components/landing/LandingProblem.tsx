'use client';

import type { ReactNode } from 'react';
import type { IconName } from '@/components/landing/icons';
import { Icon } from '@/components/landing/icons';

export default function LandingProblem() {
  return (
    <section style={{ padding: '120px 0 100px', background: 'var(--bg-3)', position: 'relative' }}>
      <div className="container">
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}
          className="problem-grid"
        >
          <div>
            <div className="pill" style={{ background: '#fff', marginBottom: 24, color: 'var(--ink-3)' }}>
              <span className="dot" style={{ background: '#f59e0b' }} />
              왜 단체예약은 늘 이렇게 힘들까?
            </div>
            <h2
              style={{
                fontSize: 'clamp(32px, 4.4vw, 48px)',
                lineHeight: 1.15,
                fontWeight: 800,
                letterSpacing: '-0.035em',
                margin: '0 0 24px',
              }}
            >
              {'"'}12명이요? 잠시만요,
              <br />
              <span style={{ color: 'var(--ink-4)' }}>다시 전화드릴게요…{'"'}</span>
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--ink-3)', margin: '0 0 36px', maxWidth: 480 }}>
              5명만 넘어가면 단체예약은 종일 전화 돌리기. 매장은 자리 배치를 다시 그려야 하고, 우리는 영업 시간 맞춰 통화
              가능한 시간을 골라야 하죠.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { t: '평균 4.2통의 전화 돌리기', s: '매장마다 자리·룸·시간 조건이 달라서' },
                { t: '예약자 한 명에게 몰리는 부담', s: '"네가 단톡 만들고 네가 예약해"' },
                { t: '단톡에 위치·시간 다시 정리', s: '회식 당일까지 같은 안내를 또 또 또' },
              ].map((it, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      background: '#fef3c7',
                      color: '#b45309',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    !
                  </span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{it.t}</div>
                    <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>{it.s}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'relative', maxWidth: 460, marginLeft: 'auto' }}>
              <div
                style={{
                  background: 'white',
                  borderRadius: 28,
                  padding: 24,
                  boxShadow: '0 30px 80px -30px rgba(15, 22, 35, 0.25)',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-4)' }}>오후 6:42</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                    통화 중 02:47
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Bubble side="me">15일 금요일 저녁 7시, 12명 예약 가능할까요?</Bubble>
                  <Bubble side="them">아 그 시간엔… 룸이 8명짜리만 있어요</Bubble>
                  <Bubble side="me">홀에 12명 자리는 어떠세요?</Bubble>
                  <Bubble side="them" typing />
                  <Bubble side="them">잠시만요, 매니저랑 확인하고 다시 전화드릴게요</Bubble>
                </div>

                <div
                  style={{
                    marginTop: 20,
                    padding: '14px 16px',
                    background: '#fef2f2',
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Icon name="phone" size={16} color="#dc2626" />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#991b1b' }}>오늘 누적 통화: 5건 · 14분 22초</span>
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  top: -20,
                  left: -30,
                  background: 'var(--urr-yellow)',
                  color: '#5c4a00',
                  padding: '8px 14px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  transform: 'rotate(-6deg)',
                  boxShadow: '0 6px 16px -4px rgba(0,0,0,0.12)',
                }}
              >
                너만 힘듦 😩
              </div>

              <div className="deco-dot" style={{ width: 50, height: 50, background: 'var(--pastel-blue)', bottom: -20, right: -10, zIndex: -1 }} />
              <div className="deco-dot" style={{ width: 18, height: 18, background: 'var(--pastel-pink)', top: 40, right: -30 }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, margin: '90px 0 70px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)', maxWidth: 200 }} />
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              background: 'white',
              border: '1px solid var(--line)',
              borderRadius: 999,
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--ink-2)',
            }}
          >
            <Icon name="sparkle" size={14} color="var(--urr-blue-1)" />
            우르르라면, 이렇게
          </div>
          <div style={{ flex: 1, height: 1, background: 'var(--line)', maxWidth: 200 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="after-grid">
          <AfterCard
            icon="bolt"
            tint="blue"
            title="실시간 좌석으로 빠르게"
            desc="남은 인원·시간대를 확인하고, 메뉴·예약금까지 한 흐름에서 정리해요. 통화 없이 바로 컨펌."
          />
          <AfterCard
            icon="card"
            tint="yellow"
            title="예약금·최소 주문 미리 확인"
            desc="인원 조건에 맞는 예약금과 최소 주문 금액을 가게 카드에서 바로 비교할 수 있어요."
          />
          <AfterCard
            icon="search"
            tint="pink"
            title="조건에 맞는 가게만 보기"
            desc="날짜와 인원을 정하면 수용 가능한 매장만 골라 보여 드려요."
          />
        </div>
      </div>
    </section>
  );
}

function Bubble({ side, children, typing }: { side: 'me' | 'them'; children?: ReactNode; typing?: boolean }) {
  const isMe = side === 'me';
  return (
    <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '78%',
          padding: '10px 14px',
          borderRadius: 16,
          fontSize: 14.5,
          lineHeight: 1.4,
          background: isMe ? 'linear-gradient(105deg, #1e88f5, #00c2ff)' : 'var(--bg-2)',
          color: isMe ? 'white' : 'var(--ink)',
          borderBottomRightRadius: isMe ? 4 : 16,
          borderBottomLeftRadius: isMe ? 16 : 4,
        }}
      >
        {typing ? (
          <span style={{ display: 'inline-flex', gap: 4, padding: '4px 2px' }}>
            <Dot d="0s" />
            <Dot d="0.2s" />
            <Dot d="0.4s" />
          </span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function Dot({ d }: { d: string }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'var(--ink-4)',
        animation: `problem-bounce 1.2s ${d} infinite`,
      }}
    >
      <style>{`@keyframes problem-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }`}</style>
    </span>
  );
}

function AfterCard({
  icon,
  tint,
  title,
  desc,
}: {
  icon: IconName;
  tint: 'blue' | 'yellow' | 'pink';
  title: string;
  desc: string;
}) {
  const tints = {
    blue: { bg: 'var(--pastel-blue)', fg: 'var(--urr-blue-deep)' },
    yellow: { bg: 'var(--pastel-yellow)', fg: '#8a6700' },
    pink: { bg: 'var(--pastel-pink)', fg: '#a4174e' },
  };
  const t = tints[tint];
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 22,
        padding: 28,
        border: '1px solid var(--line)',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 16px 40px -16px rgba(15, 22, 35, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          background: t.bg,
          color: t.fg,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <Icon name={icon} size={22} color={t.fg} stroke={2} />
      </div>
      <h3 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{title}</h3>
      <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--ink-3)', margin: 0 }}>{desc}</p>
    </div>
  );
}
