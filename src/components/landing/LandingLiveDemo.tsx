'use client';

import type { CSSProperties } from 'react';
import { Icon } from '@/components/landing/icons';

const featCellStyle: CSSProperties = {
  background: 'var(--bg-3)',
  borderRadius: 22,
  padding: 28,
  border: '1px solid var(--line)',
  minHeight: 160,
};

const featTitleStyle: CSSProperties = { fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px' };
const featDescStyle: CSSProperties = { fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-3)', margin: 0 };

export default function LandingLiveDemo() {
  return (
    <section style={{ padding: '120px 0', background: 'white', position: 'relative', overflow: 'hidden' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="pill" style={{ marginBottom: 16 }}>
            <span className="dot" />
            이렇게 이용해요
          </div>
          <h2
            style={{
              fontSize: 'clamp(32px, 4.4vw, 44px)',
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing: '-0.035em',
              margin: '0 0 14px',
            }}
          >
            예약에 필요한 걸 한 화면에서
          </h2>
          <p style={{ fontSize: 16, color: 'var(--ink-3)', margin: 0 }}>
            날짜·인원·시간·메뉴·예약금까지, 단체 담당자가 자주 찾는 흐름을 모았어요.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }} className="features-grid">
          <div className="feat-cell" style={featCellStyle}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'var(--pastel-lavender)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Icon name="clock" size={20} color="#6b46c1" stroke={2} />
            </div>
            <h3 style={featTitleStyle}>실시간 좌석·시간대</h3>
            <p style={featDescStyle}>예약 현황을 반영한 타임라인으로, 비어 있는 슬롯을 바로 골라요.</p>
          </div>

          <div className="feat-cell" style={featCellStyle}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'var(--pastel-pink)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Icon name="users" size={20} color="#a4174e" stroke={2} />
            </div>
            <h3 style={featTitleStyle}>인원에 맞는 가게만</h3>
            <p style={featDescStyle}>최대 수용 인원을 넘지 않는 매장만 목록에 보여 드려요.</p>
          </div>

          <div className="feat-cell" style={featCellStyle}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'var(--pastel-yellow)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Icon name="check" size={20} color="#8a6700" stroke={2.4} />
            </div>
            <h3 style={featTitleStyle}>메뉴·수량 선택</h3>
            <p style={featDescStyle}>가게별 메뉴판에서 코스와 인원 수만큼 수량을 정리할 수 있어요.</p>
          </div>

          <div className="feat-cell" style={featCellStyle}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'var(--pastel-blue)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                color: 'var(--urr-blue-deep)',
              }}
            >
              <Icon name="card" size={20} color="var(--urr-blue-deep)" stroke={2} />
            </div>
            <h3 style={featTitleStyle}>예약금·최소 주문</h3>
            <p style={featDescStyle}>인원 구간별 예약금과 최소 주문 금액을 미리 확인하고 비교해요.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
