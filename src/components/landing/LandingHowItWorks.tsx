'use client';

import { useEffect, useState } from 'react';
import LandingTimeSlotBar from '@/components/landing/LandingTimeSlotBar';

export default function LandingHowItWorks() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % 3), 4500);
    return () => clearInterval(t);
  }, []);

  const steps = [
    {
      tag: '01',
      title: '날짜·인원만 정하기',
      desc: '달력에서 날짜를 고르고 인원만 입력하면, 등록된 매장 목록으로 바로 이동해요.',
      visual: <Step1Visual />,
    },
    {
      tag: '02',
      title: '시간대·좌석 여유 확인',
      desc: '가게별 타임라인으로 비어 있는 시간을 보고, 전화 없이 다음 단계로 넘어가요.',
      visual: <Step2Visual />,
    },
    {
      tag: '03',
      title: '메뉴·예약금까지 한 번에',
      desc: '가게 상세에서 코스·수량을 고르고, 인원 기준 예약금과 최소 주문을 바로 확인해요.',
      visual: <Step3Visual />,
    },
  ];

  return (
    <section id="how" style={{ padding: '120px 0', background: 'white', position: 'relative' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="pill" style={{ marginBottom: 18 }}>
            <span className="dot" />
            How it works
          </div>
          <h2
            style={{
              fontSize: 'clamp(32px, 4.4vw, 48px)',
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing: '-0.035em',
              margin: '0 0 14px',
            }}
          >
            세 단계면 단체예약 끝
          </h2>
          <p style={{ fontSize: 17, color: 'var(--ink-3)', margin: 0 }}>예약 담당자가 혼자 짊어지던 일들, 우르르가 다 정리해드려요.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.3fr', gap: 64, alignItems: 'center' }} className="how-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {steps.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                style={{
                  display: 'flex',
                  gap: 22,
                  padding: '24px 24px',
                  borderRadius: 20,
                  textAlign: 'left',
                  background: active === i ? 'var(--bg-3)' : 'transparent',
                  border: active === i ? '1px solid var(--line)' : '1px solid transparent',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
              >
                <span
                  className="num"
                  style={{
                    flexShrink: 0,
                    fontSize: 36,
                    fontWeight: 800,
                    color: active === i ? 'var(--urr-blue-1)' : 'var(--ink-4)',
                    opacity: active === i ? 1 : 0.4,
                    lineHeight: 1,
                    letterSpacing: '-0.04em',
                    transition: 'all 0.25s',
                  }}
                >
                  {s.tag}
                </span>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{s.title}</h3>
                  <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-3)', margin: 0 }}>{s.desc}</p>
                </div>
                {active === i && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 3,
                      background: 'linear-gradient(180deg, #1e88f5, #00c2ff)',
                      borderRadius: '0 4px 4px 0',
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          <div
            style={{
              position: 'relative',
              background: 'linear-gradient(150deg, #f4f9ff 0%, #fefbf0 100%)',
              borderRadius: 28,
              padding: 36,
              minHeight: 480,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '1px solid var(--line)',
            }}
          >
            <div className="deco-dot" style={{ width: 80, height: 80, background: 'var(--pastel-blue)', top: -20, right: -20, opacity: 0.7 }} />
            <div className="deco-dot" style={{ width: 24, height: 24, background: 'var(--urr-yellow)', bottom: 40, left: 40, opacity: 0.8 }} />
            <div className="deco-dot" style={{ width: 14, height: 14, background: 'var(--pastel-pink)', top: 60, left: 60 }} />

            <div key={active} className="landing-how-visual" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
              {steps[active].visual}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Step1Visual() {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[
        { l: '인원', v: '12명' },
        { l: '날짜', v: '금 · 5월 15일' },
        { l: '달력', v: '날짜 탭으로 선택' },
        { l: '다음', v: '자리 찾기 → 가게 목록' },
      ].map((it, i) => (
        <div
          key={it.l}
          style={{
            background: 'white',
            borderRadius: 14,
            padding: '14px 18px',
            boxShadow: '0 4px 14px -6px rgba(15, 22, 35, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: `how-slideIn 0.4s ${i * 0.08}s both`,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-4)' }}>{it.l}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{it.v}</span>
        </div>
      ))}
      <div
        style={{
          marginTop: 8,
          padding: 14,
          background: 'linear-gradient(105deg, #1e88f5, #00c2ff)',
          borderRadius: 14,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600 }}>가게 목록</span>
        <span className="num" style={{ fontSize: 22, fontWeight: 800 }}>
          이동
        </span>
      </div>
      <style>{`@keyframes how-slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

function Step2Visual() {
  return (
        <div style={{ maxWidth: 460, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
          <div style={{ fontSize: 13, color: 'var(--ink-4)', fontWeight: 600 }}>고기굽는 마을 · 홍대점</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>금 · 5/15 · 12명 기준</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '4px 10px', borderRadius: 999 }}>
          타임슬롯
        </span>
      </div>
      <div
        style={{
          background: 'white',
          borderRadius: 18,
          padding: 16,
          boxShadow: '0 12px 30px -10px rgba(15, 22, 35, 0.1)',
          border: '1px solid var(--line)',
        }}
      >
        <LandingTimeSlotBar startHour={17} endHour={20} />
      </div>
            <div
        style={{
          marginTop: 14,
          padding: '14px 18px',
          background: 'white',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px -4px rgba(15,22,35,0.08)',
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>선택</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>19:00 · 12명</div>
        </div>
        <button type="button" className="btn btn-primary" style={{ height: 40, padding: '0 18px', fontSize: 13 }}>
          메뉴·예약금
        </button>
      </div>
    </div>
  );
}

function Step3Visual() {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 18, boxShadow: '0 12px 30px -10px rgba(15,22,35,0.1)', border: '1px solid var(--line)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-4)', marginBottom: 12 }}>가게 상세 · 주문 요약</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: 'var(--ink-3)' }}>단체 코스 A × 12</span>
            <span className="num" style={{ fontWeight: 700 }}>
              540,000원
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: 'var(--ink-3)' }}>음료 세트 × 12</span>
            <span className="num" style={{ fontWeight: 700 }}>
              120,000원
            </span>
          </div>
          <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ fontWeight: 700 }}>예약금 (12명)</span>
            <span className="num" style={{ fontWeight: 800, color: 'var(--urr-blue-1)' }}>
              60,000원
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.5 }}>
            최소 주문 금액은 인원 규칙에 따라 가게마다 다르게 표시돼요.
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary w-full"
          style={{ height: 44, fontSize: 14, borderRadius: 12, marginTop: 16 }}
        >
          예약 진행하기
        </button>
      </div>
    </div>
  );
}
