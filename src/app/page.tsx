'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSWRConfig } from 'swr';

export default function LandingPage() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const navigatedRef = useRef(false);

  useEffect(() => {
    router.prefetch('/search');

    const SHEETS_URL = process.env.NEXT_PUBLIC_SHEETS_URL || '';
    const MIN_LANDING_MS = 1200;
    const MAX_WAIT_MS = 8000;
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
      try {
        const res = await Promise.race([
          fetch(`${SHEETS_URL}?action=getAllData`, { cache: 'no-store' }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), MAX_WAIT_MS)),
        ]);

        if (!res) {
          safeNavigate();
          return;
        }
        if (!res.ok) return;
        const json = await res.json();
        if (!json?.success) return;

        // SWR 캐시 채워두기( /search 진입 시 즉시 렌더 목적 )
        await mutate('allData', json.data, { populateCache: true, revalidate: false });
        sessionStorage.setItem('landingPrefetchedAllData', '1');

        const elapsed = Date.now() - startedAt;
        const remain = Math.max(0, MIN_LANDING_MS - elapsed);
        timers.push(setTimeout(safeNavigate, remain));
      } catch {
        // 로컬 env 누락/네트워크 실패 등은 조용히 무시하고 기본 타이머 이동
        timers.push(setTimeout(safeNavigate, 3500));
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
      className="relative flex min-h-screen cursor-pointer items-center justify-center overflow-hidden bg-white"
      onClick={() => {
        if (navigatedRef.current) return;
        navigatedRef.current = true;
        router.push('/search');
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
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

        <p className="landing-hint text-sm text-gray-400">화면을 탭하여 바로 시작하기 ✨</p>
      </div>
    </div>
  );
}
