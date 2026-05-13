'use client';

import { Icon } from '@/components/landing/icons';
import { scrollToLandingId } from '@/components/landing/landing-scroll';

export function LandingCta() {
  return (
    <section id="pricing" style={{ padding: '80px 0 100px', background: 'white' }}>
      <div className="container">
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 32,
            background: '#0f1623',
            padding: '88px 64px',
            textAlign: 'center',
          }}
          className="cta-band"
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 360,
              fontWeight: 800,
              letterSpacing: '-0.06em',
              color: 'transparent',
              background: 'linear-gradient(105deg, rgba(30,136,245,0.18), rgba(0,194,255,0.18))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            URR
          </div>
          <div className="deco-dot" style={{ width: 60, height: 60, background: 'rgba(255, 216, 61, 0.15)', top: 40, left: '15%' }} />
          <div className="deco-dot" style={{ width: 22, height: 22, background: 'rgba(255, 216, 61, 0.4)', top: 80, left: '22%' }} />
          <div className="deco-dot" style={{ width: 90, height: 90, background: 'rgba(30, 136, 245, 0.18)', bottom: 30, right: '12%' }} />
          <div className="deco-dot" style={{ width: 14, height: 14, background: 'rgba(0, 194, 255, 0.7)', bottom: 100, right: '22%' }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: 12.5,
                fontWeight: 600,
                marginBottom: 24,
              }}
            >
              <Icon name="sparkle" size={13} color="var(--urr-yellow)" />
              날짜·인원만 정하고 시작하기
            </div>
            <h2
              style={{
                fontSize: 'clamp(36px, 5.5vw, 64px)',
                lineHeight: 1.1,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: 'white',
                margin: '0 0 18px',
              }}
            >
              다음 회식, 전화 한 통 없이.
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.7)', margin: '0 0 40px', lineHeight: 1.6 }}>
              달력에서 날짜를 고르고 인원을 맞춘 뒤, 자리 찾기로 가게 목록을 펼쳐 보세요.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ height: 56, padding: '0 30px', fontSize: 16, borderRadius: 999, display: 'inline-flex' }}
              onClick={() => scrollToLandingId('hero-booking')}
            >
              예약하러 가기
              <Icon name="arrow" size={16} color="white" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return <footer style={{ background: 'var(--bg-3)', borderTop: '1px solid var(--line)' }} />;
}
