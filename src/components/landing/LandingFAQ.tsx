'use client';

import { useState } from 'react';
import { Icon } from '@/components/landing/icons';

export default function LandingFAQ() {
  const [open, setOpen] = useState(0);
  const items = [
    {
      q: '몇 명부터 단체예약으로 분류되나요?',
      a: '5명부터 단체예약입니다. 5명 미만은 일반 예약 플랫폼을 이용해 주세요. 5~40명까지는 일반 매장, 40명 이상은 별도 단체 전문 매장이 매칭됩니다.',
    },
    {
      q: '예약하면 바로 확정되나요?',
      a: '대부분의 제휴 매장은 실시간 좌석 시스템이 연동되어 30초 안에 자동 확정됩니다. 일부 한정식·룸 전용 매장은 매장 컨펌이 필요해 평균 5분 이내 응답이 옵니다.',
    },
    {
      q: '예약 취소·변경은 어떻게 하나요?',
      a: '예약 시간 24시간 전까지는 자유롭게 변경·취소가 가능합니다. 24시간 이내 취소는 매장 정책에 따라 처리되며, 인원수 변동은 회식 당일 1시간 전까지 우르르 앱에서 직접 수정할 수 있어요.',
    },
    {
      q: '참석자에게는 어떻게 전달되나요?',
      a: '예약 링크 하나만 단톡방에 보내면, 참석자가 링크에서 일정·위치·입장 시간을 한 화면에 확인할 수 있어요. 예약 1시간 전 자동 리마인드도 발송됩니다.',
    },
    {
      q: '매장과 따로 요청사항을 전달할 수 있나요?',
      a: '예약 후 매장 채팅 기능을 통해 알러지 정보, 룸 요청, 생일·기념일 등을 미리 전달할 수 있습니다. 전화 통화 없이 매장에서 미리 준비해둬요.',
    },
    {
      q: '매장 측은 어떻게 가입하나요?',
      a: '상단 "매장 등록"을 통해 신청하시면 됩니다. 입점 수수료는 0원이며, POS 연동이 가능한 매장은 좌석 시스템 자동 연동을 지원합니다.',
    },
  ];

  return (
    <section id="faq" style={{ padding: '120px 0', background: 'white' }}>
      <div className="container" style={{ maxWidth: 900 }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="pill" style={{ marginBottom: 16 }}>
            <span className="dot" />
            자주 묻는 질문
          </div>
          <h2 style={{ fontSize: 'clamp(32px, 4.4vw, 44px)', lineHeight: 1.15, fontWeight: 800, letterSpacing: '-0.035em', margin: 0 }}>
            궁금한 점, 미리 정리했어요
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((it, i) => (
            <div
              key={it.q}
              style={{
                border: '1px solid var(--line)',
                borderRadius: 16,
                background: open === i ? 'var(--bg-3)' : 'white',
                transition: 'all 0.2s',
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(open === i ? -1 : i)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 24px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                }}
              >
                <span style={{ fontSize: 16.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.015em' }}>{it.q}</span>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: open === i ? 'var(--ink)' : 'var(--bg-2)',
                    color: open === i ? 'white' : 'var(--ink-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginLeft: 16,
                    transition: 'all 0.2s',
                    transform: open === i ? 'rotate(180deg)' : 'none',
                  }}
                >
                  <Icon name="chevronDown" size={14} color="currentColor" stroke={2.2} />
                </span>
              </button>
              {open === i && (
                <div style={{ padding: '0 24px 22px', fontSize: 14.5, lineHeight: 1.7, color: 'var(--ink-3)' }}>{it.a}</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>아직 궁금한 게 있다면? </span>
          <a href="#faq" style={{ fontSize: 14, fontWeight: 600, color: 'var(--urr-blue-1)' }}>
            1:1 채팅 상담하기 →
          </a>
        </div>
      </div>
    </section>
  );
}
