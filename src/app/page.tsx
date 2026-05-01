'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { prefetchAllDataIntoCache } from '@/lib/use-store-data';

export default function LandingPage() {
  const router = useRouter();
  const navigatedRef = useRef(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  useEffect(() => {
    router.prefetch('/search');

    const SHEETS_URL = process.env.NEXT_PUBLIC_SHEETS_URL || '';
    let cancelled = false;

    const prefetchAndGo = async () => {
      if (!SHEETS_URL) {
        setLoadingError(true);
        return;
      }

      try {
        await prefetchAllDataIntoCache();
        sessionStorage.setItem('landingPrefetchedAllData', '1');
        if (!cancelled) setIsDataReady(true);
      } catch {
        if (!cancelled) setLoadingError(true);
      }
    };

    void prefetchAndGo();

    return () => {
      cancelled = true;
    };
  }, [router]);

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
          {isDataReady
            ? '화면을 탭하여 바로 시작하기 ✨'
            : loadingError
              ? '데이터를 불러오지 못했습니다. 잠시 후 새로고침 해주세요.'
              : '가게 정보를 불러오는 중...'}
        </p>
      </div>
    </div>
  );
}
