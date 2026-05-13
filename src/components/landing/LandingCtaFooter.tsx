'use client';

import Link from 'next/link';
import { Icon, URRMark } from '@/components/landing/icons';

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
              5명부터, 전화 없이 시작하기
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
              지금 가입하고, 단톡방 예약 담당자에서 졸업하세요.
            </p>
            <div style={{ display: 'inline-flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link
                href="/search"
                className="btn btn-primary"
                style={{ height: 56, padding: '0 30px', fontSize: 16, borderRadius: 999 }}
              >
                무료로 시작하기
                <Icon name="arrow" size={16} color="white" />
              </Link>
              <Link
                href="/#faq"
                className="btn"
                style={{
                  height: 56,
                  padding: '0 28px',
                  fontSize: 16,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.08)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.18)',
                }}
              >
                매장 등록 문의
              </Link>
            </div>
            <div style={{ marginTop: 28, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>가입 무료 · 카카오로 1분 안에 시작</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ background: 'var(--bg-3)', borderTop: '1px solid var(--line)', padding: '64px 0 40px' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }} className="footer-grid">
          <div>
            <URRMark size={28} />
            <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, margin: '14px 0 20px', maxWidth: 260 }}>
              5명부터 시작하는, 가장 빠른 단체예약.
              <br />
              전화 통화 없이 자리 잡으세요.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['IG', 'YT', 'TW', 'BL'].map((s) => (
                <a
                  key={s}
                  href="#"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'white',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--ink-3)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {[
            { t: '서비스', l: ['단체예약 찾기', '실시간 좌석', '매장 메모', '참석 확인', '자동 안내'] },
            { t: '매장 파트너', l: ['매장 등록', '대시보드 안내', 'POS 연동', '제휴 문의'] },
            { t: '회사', l: ['우르르 소개', '블로그', '채용', '뉴스룸', '브랜드 자료'] },
            { t: '고객 지원', l: ['도움말 센터', '1:1 채팅', '공지사항', '이용약관', '개인정보처리방침'] },
          ].map((col) => (
            <div key={col.t}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>{col.t}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.l.map((item) => (
                  <li key={item}>
                    <a href="#" style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          style={{
            paddingTop: 28,
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 20,
          }}
          className="footer-bottom"
        >
          <div style={{ fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.7 }}>
            (주)우르르 · 대표 김단체 · 사업자등록번호 123-45-67890
            <br />
            서울특별시 성동구 왕십리로 222, 한양플라자 14F · 통신판매업신고 2026-서울성동-0142
            <br />© {year} URR Inc. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            <a href="#" style={{ color: 'var(--ink-3)' }}>
              이용약관
            </a>
            <a href="#" style={{ color: 'var(--ink-2)', fontWeight: 700 }}>
              개인정보처리방침
            </a>
            <a href="#" style={{ color: 'var(--ink-3)' }}>
              위치기반 약관
            </a>
            <a href="#" style={{ color: 'var(--ink-3)' }}>
              사업자 정보
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
