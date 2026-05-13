'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, URRMark } from '@/components/landing/icons';
import { prefetchAllDataIntoCache } from '@/lib/use-store-data';

const AREAS = ['홍대·합정', '강남·역삼', '여의도·영등포', '성수·건대', '광화문·종로', '판교·분당'] as const;
const TIMES = ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'] as const;

function buildDateOptions(count: number): { ymd: string; label: string }[] {
  const out: { ymd: string; label: string }[] = [];
  const d0 = new Date();
  d0.setHours(12, 0, 0, 0);
  const dow = ['일', '월', '화', '수', '목', '금', '토'];
  for (let i = 0; i < count; i++) {
    const d = new Date(d0);
    d.setDate(d0.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const ymd = `${y}-${m}-${day}`;
    const label = `${dow[d.getDay()]} · ${d.getMonth() + 1}/${d.getDate()}`;
    out.push({ ymd, label });
  }
  return out;
}

const DATE_OPTIONS = buildDateOptions(14);

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: 0,
  border: 'none',
  background: 'transparent',
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--ink)',
  outline: 'none',
};

export default function LandingHero() {
  const router = useRouter();
  const [people, setPeople] = useState(8);
  const [area, setArea] = useState<string>(AREAS[0]);
  const [time, setTime] = useState<string>(TIMES[3]);
  const [dateYmd, setDateYmd] = useState(DATE_OPTIONS[0]?.ymd ?? '');
  const [urrSize, setUrrSize] = useState(72);
  const [going, setGoing] = useState(false);

  const dateLabelByYmd = useMemo(() => {
    const m = new Map(DATE_OPTIONS.map((o) => [o.ymd, o.label]));
    return (ymd: string) => m.get(ymd) ?? ymd;
  }, []);

  useEffect(() => {
    const fn = () => setUrrSize(Math.min(160, Math.floor(window.innerWidth * 0.16)));
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const goSearch = async () => {
    if (!dateYmd || going) return;
    setGoing(true);
    try {
      await prefetchAllDataIntoCache();
      sessionStorage.setItem('landingPrefetchedAllData', '1');
      sessionStorage.setItem('selectedDate', dateYmd);
      sessionStorage.setItem('selectedHeadcount', String(people));
      sessionStorage.setItem('landingArea', area);
      sessionStorage.setItem('landingTime', time);
      router.push('/search');
    } catch {
      setGoing(false);
    }
  };

  const stepBtn: CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'var(--bg-2)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--ink-2)',
    border: 'none',
    cursor: 'pointer',
  };

  return (
    <section className="relative overflow-hidden pb-20 pt-[132px] sm:pb-[80px]">
      <div className="deco-dot" style={{ width: 60, height: 60, background: 'var(--pastel-blue)', top: 140, left: '6%' }} />
      <div className="deco-dot" style={{ width: 14, height: 14, background: 'var(--urr-yellow)', top: 220, left: '14%' }} />
      <div className="deco-dot" style={{ width: 28, height: 28, background: 'var(--pastel-yellow)', top: 380, right: '8%' }} />
      <div className="deco-dot" style={{ width: 48, height: 48, background: 'var(--pastel-pink)', bottom: 80, left: '12%' }} />
      <div className="deco-dot" style={{ width: 22, height: 22, background: 'var(--pastel-lavender)', bottom: 200, right: '18%' }} />
      <div className="deco-dot" style={{ width: 10, height: 10, background: '#43a0ff', top: 320, left: '46%', opacity: 0.5 }} />

      <div className="container relative z-[1] text-center">
        <div className="pill mb-6">
          <span className="dot" />
          전화 통화 없이, 단체예약 한 번에
        </div>

        <h1
          className="mx-auto mb-[18px] font-extrabold tracking-tight text-[var(--ink)]"
          style={{ fontSize: 'clamp(48px, 8vw, 96px)', lineHeight: 1.02, letterSpacing: '-0.045em' }}
        >
          <span className="flex flex-wrap items-baseline justify-center gap-2">
            <URRMark size={urrSize} />
            <span>몰리는 순간,</span>
          </span>
          <span className="mt-1 block">
            예약은{' '}
            <span className="relative inline-block">
              우르르
              <svg
                viewBox="0 0 200 14"
                preserveAspectRatio="none"
                className="absolute bottom-[-8px] left-0 right-0 h-3.5 w-full"
                aria-hidden
              >
                <path
                  d="M2 9 Q 50 1, 100 7 T 198 5"
                  stroke="url(#urr-hero-underline)"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="urr-hero-underline" x1="0" x2="1">
                    <stop offset="0" stopColor="#1e88f5" />
                    <stop offset="1" stopColor="#00c2ff" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            .
          </span>
        </h1>

        <p
          className="mx-auto mb-10 max-w-[580px] font-normal leading-relaxed text-[var(--ink-3)]"
          style={{ fontSize: 'clamp(16px, 1.6vw, 19px)' }}
        >
          10명 이상 단체 회식, 동아리 모임까지.
          <br />
          매장에 전화 돌릴 필요 없이, 우르르에서 한 번에 자리 잡으세요.
        </p>

        <div className="hero-widget">
          <WidgetField icon="pin" label="어디서">
            <select value={area} onChange={(e) => setArea(e.target.value)} style={fieldStyle}>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </WidgetField>
          <WidgetField icon="calendar" label="언제">
            <select value={dateYmd} onChange={(e) => setDateYmd(e.target.value)} style={fieldStyle}>
              {DATE_OPTIONS.map((o) => (
                <option key={o.ymd} value={o.ymd}>
                  {o.label}
                </option>
              ))}
            </select>
          </WidgetField>
          <WidgetField icon="clock" label="몇 시">
            <select value={time} onChange={(e) => setTime(e.target.value)} style={fieldStyle}>
              {TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </WidgetField>
          <WidgetField icon="users" label="몇 명">
            <div className="flex h-8 items-center gap-2">
              <button type="button" onClick={() => setPeople(Math.max(2, people - 1))} style={stepBtn} aria-label="인원 줄이기">
                <Icon name="minus" size={14} />
              </button>
              <span className="num min-w-[38px] text-center text-base font-semibold">{people}명</span>
              <button type="button" onClick={() => setPeople(Math.min(40, people + 1))} style={stepBtn} aria-label="인원 늘리기">
                <Icon name="plus" size={14} />
              </button>
            </div>
          </WidgetField>
          <button
            type="button"
            className="btn btn-primary"
            style={{ height: 'auto', minHeight: 72, padding: '0 24px', borderRadius: 18, fontSize: 15 }}
            onClick={() => void goSearch()}
            disabled={going}
          >
            <Icon name="search" size={18} color="white" />
            {going ? '이동 중…' : '자리 찾기'}
          </button>
        </div>

        <div className="mt-[18px] text-[13.5px] text-[var(--ink-4)]">
          입력만 해두면 가능한 매장만 추려서 보여드려요. ({dateLabelByYmd(dateYmd)} · {people}명)
        </div>
      </div>
    </section>
  );
}

function WidgetField({
  icon,
  label,
  children,
}: {
  icon: 'pin' | 'calendar' | 'clock' | 'users';
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="hero-widget-field cursor-pointer text-left">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-4)]">
        <Icon name={icon} size={13} color="var(--ink-4)" stroke={1.8} />
        {label}
      </div>
      {children}
    </div>
  );
}
