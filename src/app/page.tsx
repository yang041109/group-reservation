'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSWRConfig } from 'swr';

export default function LandingPage() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const navigatedRef = useRef(false);
  const [isDataReady, setIsDataReady] = useState(false);

  useEffect(() => {
    router.prefetch('/search');

    const SHEETS_URL = process.env.NEXT_PUBLIC_SHEETS_URL || '';
    const MIN_LANDING_MS = 1200;
    const MAX_WAIT_MS = 15000;
    const startedAt = Date.now();
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    const safeNavigate = () => {
      if (cancelled) return;
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      router.push('/search');
    };

    const prefetchAndGo = async () => {
      if (!SHEETS_URL) {
        timers.push(setTimeout(safeNavigate, 3500));
        return;
      }

      // 최대 대기 시간을 넘기면 안전하게 검색 페이지로 이동
      timers.push(setTimeout(safeNavigate, MAX_WAIT_MS));

      try {
        const res = await fetch(`${SHEETS_URL}?action=getAllData`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (!json?.success) return;

        // SWR 캐시 채워두기( /search 진입 시 즉시 렌더 목적 )
        await mutate('allData', json.data, { populateCache: true, revalidate: false });
        sessionStorage.setItem('landingPrefetchedAllData', '1');
        setIsDataReady(true);

        const elapsed = Date.now() - startedAt;
        const remain = Math.max(0, MIN_LANDING_MS - elapsed);
        timers.push(setTimeout(safeNavigate, remain));
      } catch {
        // 실패 시에도 최대 대기 타이머가 이동을 보장
      }
    };

    void prefetchAndGo();

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
  }, [router, mutate]);

  return (
    <div
      className={`relative flex min-h-screen items-center justify-center overflow-hidden bg-white ${
        isDataReady ? 'cursor-pointer' : 'cursor-wait'
      }`}
      onClick={() => {
        if (!isDataReady) return;
        if (navigatedRef.current) return;
        navigatedRef.current = true;
        router.push('/search');
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (!isDataReady) return;
          if (navigatedRef.current) return;
          navigatedRef.current = true;
          router.push('/search');
        }
      }}
    >
      <div className="animate-landing-float absolute top-20 left-10 sm:left-20" style={{ animationDelay: '0s' }}>
        <div className="h-12 w-12 rounded-full bg-[#0095F6]/10" />
      </div>
      <div className="animate-landing-float absolute top-40 right-8 sm:right-32" style={{ animationDelay: '0.5s' }}>
        <div className="h-8 w-8 rounded-full bg-yellow-300/20" />
      </div>
      <div className="animate-landing-float absolute bottom-32 left-8 sm:left-40" style={{ animationDelay: '1s' }}>
        <div className="h-10 w-10 rounded-full bg-pink-300/20" />
      </div>
      <div className="animate-landing-float absolute bottom-20 right-10 sm:right-20" style={{ animationDelay: '1.5s' }}>
        <div className="h-6 w-6 rounded-full bg-purple-300/20" />
      </div>

      <div className="relative space-y-8 text-center">
        <div className="relative">
          <h1
            className="select-none text-[4.5rem] font-black tracking-wider sm:text-[8rem] md:text-[12rem]"
            style={{
              WebkitTextStroke: '3px #e5e7eb',
              color: 'transparent',
            }}
          >
            URR
          </h1>
          <h1
            className="landing-title-gradient absolute inset-0 select-none overflow-hidden text-[4.5rem] font-black tracking-wider sm:text-[8rem] md:text-[12rem]"
            style={{
              background: 'linear-gradient(to right, #0095F6, #00d4ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            URR
          </h1>
          <div className="landing-sparkle-wrap absolute inset-0 overflow-hidden">
            <div className="animate-landing-twinkle absolute top-1/4 left-1/4 h-2 w-2 rounded-full bg-yellow-300" />
            <div
              className="animate-landing-twinkle absolute top-1/3 right-1/3 h-3 w-3 rounded-full bg-pink-300"
              style={{ animationDelay: '0.2s' }}
            />
            <div
              className="animate-landing-twinkle absolute bottom-1/3 left-1/3 h-2 w-2 rounded-full bg-purple-300"
              style={{ animationDelay: '0.4s' }}
            />
          </div>
        </div>

        <p className="landing-hint text-sm text-gray-400">
          {isDataReady ? '화면을 탭하여 바로 시작하기 ✨' : '가게 정보를 불러오는 중...'}
        </p>
      </div>
    </div>
  );
}
