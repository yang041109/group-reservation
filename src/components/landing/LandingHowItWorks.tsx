'use client';

import { useEffect, useState } from 'react';
import { Icon, URRMark } from '@/components/landing/icons';

export default function LandingHowItWorks() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % 3), 4500);
    return () => clearInterval(t);
  }, []);

  const steps = [
    {
      tag: '01',
      title: '인원 · 시간만 알려주세요',
      desc: '12명, 금요일 7시. 조건만 입력하면 우르르가 가능한 매장만 추려줘요.',
      visual: <Step1Visual />,
    },
    {
      tag: '02',
      title: '실시간 좌석 보고 한 번에 확정',
      desc: '룸 / 홀 / 단체석 단위로 남은 자리를 바로 확인. 매장에 따로 전화할 필요 없어요.',
      visual: <Step2Visual />,
    },
    {
      tag: '03',
      title: '단톡에 링크 하나 보내면 끝',
      desc: '참석자가 링크만 킬 하면 일정·위치·입장 시간이 한 화면에. 매번 단톡에 다시 올릴 필요 없어요.',
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

            <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>{steps[active].visual}</div>
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
        { l: '시간', v: '저녁 7:00 ~ 9:30' },
        { l: '지역', v: '홍대 · 합정' },
        { l: '키워드', v: '룸 있음 · 회식' },
      ].map((it, i) => (
        <div
          key={i}
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
        <span style={{ fontSize: 14, fontWeight: 600 }}>매칭 결과</span>
        <span className="num" style={{ fontSize: 22, fontWeight: 800 }}>
          34곳
        </span>
      </div>
      <style>{`@keyframes how-slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

function Step2Visual() {
  const tables = [
    { x: 6, y: 6, w: 22, h: 18, seats: 4, status: 'taken' as const },
    { x: 32, y: 6, w: 22, h: 18, seats: 4, status: 'taken' as const },
    { x: 58, y: 6, w: 36, h: 18, seats: 8, status: 'avail' as const },
    { x: 6, y: 30, w: 30, h: 22, seats: 6, status: 'avail' as const },
    { x: 40, y: 30, w: 54, h: 22, seats: 12, status: 'highlight' as const },
    { x: 6, y: 58, w: 88, h: 18, seats: 10, status: 'taken' as const },
  ];
  return (
    <div style={{ maxWidth: 460, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink-4)', fontWeight: 600 }}>고기굽는 마을 · 홍대점</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>금 · 5/15 · 19:00</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '4px 10px', borderRadius: 999 }}>
          1곳 매칭
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          background: 'white',
          borderRadius: 18,
          height: 240,
          padding: 12,
          boxShadow: '0 12px 30px -10px rgba(15, 22, 35, 0.1)',
        }}
      >
        <div style={{ position: 'absolute', inset: 12, border: '2px dashed var(--line)', borderRadius: 12 }} />
        {tables.map((tb, i) => {
          const colors = {
            taken: { bg: '#f1f3f8', fg: 'var(--ink-4)', border: 'transparent' },
            avail: { bg: 'white', fg: 'var(--ink-2)', border: 'var(--line)' },
            highlight: { bg: 'linear-gradient(105deg, #1e88f5, #00c2ff)', fg: 'white', border: 'transparent' },
          };
          const c = colors[tb.status];
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${tb.x}%`,
                top: `${tb.y}%`,
                width: `${tb.w}%`,
                height: `${tb.h}%`,
                background: c.bg,
                border: `1.5px solid ${c.border}`,
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: c.fg,
                fontWeight: 700,
                fontSize: 12,
                animation: tb.status === 'highlight' ? 'how-pulse2 2s infinite' : 'none',
              }}
            >
              <span className="num" style={{ fontSize: 14 }}>
                {tb.seats}석
              </span>
              <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.8 }}>
                {tb.status === 'taken' ? '예약완료' : tb.status === 'highlight' ? '우리 자리!' : '비어있음'}
              </span>
            </div>
          );
        })}
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
          <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>홀 안쪽 단체석 · 12인용</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>2시간 30분 보장 · 룸 대여 가능</div>
        </div>
        <button type="button" className="btn btn-primary" style={{ height: 40, padding: '0 18px', fontSize: 13 }}>
          예약 확정
        </button>
      </div>
      <style>{`@keyframes how-pulse2 { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }`}</style>
    </div>
  );
}

function Step3Visual() {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 16, boxShadow: '0 12px 30px -10px rgba(15,22,35,0.1)' }}>
        <div style={{ fontSize: 12, color: 'var(--ink-4)', textAlign: 'center', marginBottom: 12, fontWeight: 600 }}>
          OO 학회 · 5월 회식 💬
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fde2ec', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 4 }}>예약담당 · 지원</div>
            <div
              style={{
                background: 'var(--bg-2)',
                padding: 12,
                borderRadius: 14,
                borderTopLeftRadius: 4,
                fontSize: 13.5,
              }}
            >
              예약 완료했어요! 아래 링크에서 참석 여부 표시 부탁드려요 🙏
            </div>
            <div style={{ marginTop: 8, background: 'white', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 14px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <URRMark size={14} />
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}>urr.kr/r/8K2X</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>고기굽는 마을 · 홍대점</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>금 5/15 · 저녁 7:00 · 12명 예약석</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="pin" size={11} color="var(--ink-4)" stroke={2} />
                  서울 마포구 어울마루 21 · 2층
                </div>
              </div>
              <div style={{ height: 6, background: 'linear-gradient(90deg, #1e88f5, #00c2ff)' }} />
              <div style={{ padding: 12, background: 'var(--bg-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {['#fde2ec', '#e3f0fd', '#fff7c8', '#ece5fa'].map((col, j) => (
                    <div
                      key={j}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: col,
                        border: '2px solid white',
                        marginLeft: j ? -7 : 0,
                      }}
                    />
                  ))}
                  <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>+8 참석</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--urr-blue-1)' }}>일정 확인 →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <span style={{ fontSize: 11, padding: '4px 10px', background: 'var(--pastel-yellow)', borderRadius: 999, color: '#8a6700', fontWeight: 700 }}>
          ✓ 11/12 참석 확정
        </span>
        <span style={{ fontSize: 11, padding: '4px 10px', background: '#dcfce7', borderRadius: 999, color: '#15803d', fontWeight: 700 }}>
          자동 리마인드
        </span>
      </div>
    </div>
  );
}
