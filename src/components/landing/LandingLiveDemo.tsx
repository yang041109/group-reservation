'use client';

import type { CSSProperties } from 'react';
import { Icon } from '@/components/landing/icons';

const featCellStyle: CSSProperties = {
  background: 'var(--bg-3)',
  borderRadius: 22,
  padding: 28,
  border: '1px solid var(--line)',
  minHeight: 180,
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
            예약 그 너머
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
            예약하고 끝이 아닌 것까지
          </h2>
          <p style={{ fontSize: 16, color: 'var(--ink-3)', margin: 0 }}>단체예약 담당자가 가장 자주 하는 일들, 우르르가 같이 들어줘요.</p>
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gridTemplateRows: 'auto auto', gap: 18 }}
          className="features-grid"
        >
          <div
            style={{
              gridColumn: 'span 1',
              gridRow: 'span 2',
              background: 'var(--bg-3)',
              borderRadius: 24,
              padding: 36,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 480,
              border: '1px solid var(--line)',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="feat-big"
          >
            <div>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'var(--urr-yellow)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                }}
              >
                <Icon name="chat" size={24} color="#5c4a00" stroke={2.2} />
              </div>
              <h3 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px' }}>
                매장과 직접
                <br />
                메모로 소통
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink-3)', margin: 0, maxWidth: 360 }}>
                알러지 정보, 룸 요청, 생일 기념까지. 전화 통화 없이 채팅으로 미리 전달하면 매장에서 준비해둬요.
              </p>
            </div>
            <div
              style={{
                marginTop: 32,
                background: 'white',
                borderRadius: 16,
                padding: 18,
                boxShadow: '0 12px 30px -10px rgba(15,22,35,0.1)',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: 8,
                  borderBottom: '1px solid var(--line-2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: '#fde2ec',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#a4174e',
                    }}
                  >
                    매
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>고기굽는 마을 · 홍대점</span>
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>예약 D-2</span>
              </div>
              <div
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '80%',
                  background: 'linear-gradient(105deg, #1e88f5, #00c2ff)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: 14,
                  borderBottomRightRadius: 4,
                  fontSize: 12.5,
                  lineHeight: 1.45,
                }}
              >
                견과 알러지 1명 있어요. 생일 케이크 1개도 따로 가져갈게요 🎂
              </div>
              <div
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '80%',
                  background: 'var(--bg-2)',
                  color: 'var(--ink)',
                  padding: '8px 12px',
                  borderRadius: 14,
                  borderBottomLeftRadius: 4,
                  fontSize: 12.5,
                  lineHeight: 1.45,
                }}
              >
                네 확인했습니다! 견과류 빠진 메뉴로 따로 준비할게요 :)
              </div>
              <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
                {['👍', '🎂', '🙏'].map((e) => (
                  <span key={e} style={{ fontSize: 14, padding: '4px 8px', borderRadius: 999, background: 'var(--bg-2)' }}>
                    {e}
                  </span>
                ))}
              </div>
            </div>
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
              <Icon name="bell" size={20} color="var(--urr-blue-deep)" stroke={2} />
            </div>
            <h3 style={featTitleStyle}>참석자 자동 안내</h3>
            <p style={featDescStyle}>일정·위치·입장 시간, 단톡에 다시 올릴 필요 없어요.</p>
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
              <Icon name="pin" size={20} color="#a4174e" stroke={2} />
            </div>
            <h3 style={featTitleStyle}>룸·단체석만 골라보기</h3>
            <p style={featDescStyle}>인원수에 맞는 룸·홀 단위 좌석만 추려서 보여드려요.</p>
          </div>

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
            <h3 style={featTitleStyle}>실시간 좌석 현황</h3>
            <p style={featDescStyle}>매장에 연락하지 않아도 가능한 시간대를 바로 확인.</p>
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
            <h3 style={featTitleStyle}>단체 옵션 미리 선택</h3>
            <p style={featDescStyle}>비건·세트 메뉴·코스, 인원수만큼 카운트만 입력하면 끝.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
