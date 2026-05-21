'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DateSelector from '@/components/DateSelector';
import HeadcountSelector from '@/components/HeadcountSelector';
import { Icon, URRMark } from '@/components/landing/icons';
import { prefetchAllDataIntoCache } from '@/lib/use-store-data';

function getTodayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function LandingHero() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(() => getTodayYmd());
  const [people, setPeople] = useState(0);
  const [urrSize, setUrrSize] = useState(72);
  const [going, setGoing] = useState(false);

  const dateLabel = useMemo(() => {
    if (!selectedDate) return '날짜를 선택해 주세요';
    const d = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return selectedDate;
    const dow = ['일', '월', '화', '수', '목', '금', '토'];
    return `${dow[d.getDay()]} · ${d.getMonth() + 1}/${d.getDate()}`;
  }, [selectedDate]);

  useEffect(() => {
    const fn = () => setUrrSize(Math.min(160, Math.floor(window.innerWidth * 0.16)));
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const goSearch = async () => {
    if (!selectedDate || going) return;
    setGoing(true);
    try {
      await prefetchAllDataIntoCache();
      sessionStorage.setItem('landingPrefetchedAllData', '1');
      sessionStorage.setItem('selectedDate', selectedDate);
      sessionStorage.setItem('selectedHeadcount', String(people));
      router.push('/search');
    } catch {
      setGoing(false);
    }
  };

  return (
    <section className="landing-hero-section relative overflow-hidden pb-10 pt-[100px] sm:pb-[80px] sm:pt-[132px]">
      <div className="deco-dot" style={{ width: 60, height: 60, background: 'var(--pastel-blue)', top: 140, left: '6%' }} />
      <div className="deco-dot" style={{ width: 14, height: 14, background: 'var(--urr-yellow)', top: 220, left: '14%' }} />
      <div className="deco-dot" style={{ width: 28, height: 28, background: 'var(--pastel-yellow)', top: 380, right: '8%' }} />
      <div className="deco-dot" style={{ width: 48, height: 48, background: 'var(--pastel-pink)', bottom: 80, left: '12%' }} />
      <div className="deco-dot" style={{ width: 22, height: 22, background: 'var(--pastel-lavender)', bottom: 200, right: '18%' }} />
      <div className="deco-dot" style={{ width: 10, height: 10, background: '#43a0ff', top: 320, left: '46%', opacity: 0.5 }} />

      <div className="container relative z-[1] text-center">
        <div className="landing-hero-enter landing-hero-enter--1 pill mb-3 sm:mb-6">
          <span className="dot" />
          전화 통화 없이, 단체예약 한 번에
        </div>

        <h1
          className="landing-hero-enter landing-hero-enter--2 mx-auto mb-3 font-extrabold tracking-tight text-[var(--ink)] sm:mb-[18px]"
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
          className="landing-hero-enter landing-hero-enter--3 mx-auto mb-5 max-w-[580px] font-normal leading-relaxed text-[var(--ink-3)] sm:mb-10"
          style={{ fontSize: 'clamp(16px, 1.6vw, 19px)' }}
        >
          오늘 회식 인원과 날짜만 선택하세요.
          <br />
          지금 단체석 비어있는 매장만 우르르 찾아드립니다.
        </p>

        <div id="hero-booking" className="landing-hero-enter landing-hero-enter--4 landing-hero-booking mx-auto w-full max-w-[720px] text-left">
          <div className="hero-widget !flex !w-full !max-w-none !flex-col !gap-2.5 !p-0 !shadow-none !bg-transparent sm:!gap-4">
            <DateSelector
              selectedDate={selectedDate}
              onChange={(d) => setSelectedDate(d)}
              fullWidth
              className="w-full"
            />
            <HeadcountSelector
              maxCapacity={999}
              minCapacity={0}
              selectedHeadcount={people}
              onChange={setPeople}
              className="w-full"
            />
            <button
              type="button"
              className="btn btn-primary landing-cta-bounce w-full"
              style={{ minHeight: 56, padding: '0 24px', borderRadius: 18, fontSize: 15 }}
              onClick={() => void goSearch()}
              disabled={going || !selectedDate}
            >
              <Icon name="search" size={18} color="white" />
              {going ? '이동 중…' : '3초만에 자리 찾기'}
            </button>
          </div>
        </div>

        <div className="mt-2.5 text-[13px] text-[var(--ink-4)] sm:mt-[18px] sm:text-[13.5px]">
          날짜와 인원을 정한 뒤 버튼을 누르면 예약 가능한 가게 목록으로 이동해요. {dateLabel}{people > 0 ? ` · ${people}명` : ' · 인원 미선택'}
        </div>
      </div>
    </section>
  );
}
