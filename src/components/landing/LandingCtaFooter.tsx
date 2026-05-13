'use client';

import Link from 'next/link';
import { Icon } from '@/components/landing/icons';

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
            <Link
              href="/search"
              className="btn btn-primary"
              style={{ height: 56, padding: '0 30px', fontSize: 16, borderRadius: 999, display: 'inline-flex' }}
            >
              가게 보러 가기
              <Icon name="arrow" size={16} color="white" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer style={{ background: 'var(--bg-3)', borderTop: '1px solid var(--line)', padding: '40px 0 32px' }}>
      <div className="container">
        <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.75, margin: 0, maxWidth: 720 }}>
          본 페이지는 한양대학교 산업공학과 과제·연구 목적으로 제작되었습니다. 팀 구성은 송유현, 양민주, 임하연, 유현아이며, 단체 예약
          흐름을 웹으로 정리한 데모 서비스입니다.
        </p>
        <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 16, marginBottom: 0 }}>
          © {new Date().getFullYear()} 우르르(URR) 데모
        </p>
      </div>
    </footer>
  );
}
