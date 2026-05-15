'use client';

import { useState } from 'react';
import { Icon } from '@/components/landing/icons';

export default function LandingFAQ() {
  const [open, setOpen] = useState(0);
  const items = [
    {
      q: '몇 명부터 단체예약으로 분류되나요?',
      a: '가게마다 단체로 받는 최소·최대 인원이 다릅니다. 자리 찾기에서 인원을 정하면 수용 가능한 매장만 보여 드리고, 각 가게 카드에 예약 가능 인원 범위가 표시돼요.',
    },
    {
      q: '예약하면 바로 확정되나요?',
      a: '매장·예약 설정에 따라 다릅니다. 실시간 좌석이 연동된 매장은 가능한 시간대를 곧바로 고를 수 있고, 사장님 확인이 필요한 경우에는 요청 후 승인 흐름으로 진행돼요.',
    },
    {
      q: '예약 취소·변경은 어떻게 하나요?',
      a: '예약 시간 24시간 전까지는 자유롭게 변경·취소가 가능합니다. 24시간 이내 취소는 매장 정책에 따라 처리되며, 인원수 변동은 가게 상세·예약 화면 안내에 따라 수정할 수 있어요.',
    },
    {
      q: '참석자에게 일정을 어떻게 알려주나요?',
      a: '우르르에서 예약이 확정되면 일정·위치 정보를 확인할 수 있어요. 참석자에게는 별도 자동 알림 기능은 제공하지 않으니, 필요하면 단톡 등으로 직접 공유해 주세요.',
    },
    {
      q: '메뉴와 예약금은 어디서 보나요?',
      a: '가게 상세 페이지에서 메뉴·수량을 고르고, 인원에 따른 예약금·최소 주문 금액을 같은 화면에서 확인할 수 있어요.',
    },
    {
      q: '데이터는 어디서 오나요?',
      a: '등록된 매장·메뉴·예약 정보는 서비스 DB에서 불러와 목록과 상세에 반영됩니다.',
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
      </div>
    </section>
  );
}
