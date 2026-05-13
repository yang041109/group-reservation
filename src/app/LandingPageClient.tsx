'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LandingSearchWidget from '@/components/LandingSearchWidget';

export default function LandingPageClient() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/search');
  }, [router]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* 상단 앵커 */}
      <header className="absolute right-4 top-4 z-10 sm:right-8 sm:top-6">
        <Link
          href="/#faq"
          className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm ring-1 ring-gray-200/80 backdrop-blur hover:bg-gray-50"
        >
          FAQ
        </Link>
      </header>

      <main>
        {/* 히어로 */}
        <section className="relative overflow-hidden px-4 pb-10 pt-16 sm:pb-16 sm:pt-24">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-landing-float absolute left-[8%] top-[18%] h-16 w-16 rounded-full bg-[#0095F6]/10" />
            <div
              className="animate-landing-float absolute right-[12%] top-[28%] h-10 w-10 rounded-full bg-amber-300/25"
              style={{ animationDelay: '0.4s' }}
            />
            <div
              className="animate-landing-float absolute bottom-[22%] left-[15%] h-12 w-12 rounded-full bg-pink-300/20"
              style={{ animationDelay: '0.8s' }}
            />
          </div>

          <div className="relative mx-auto max-w-4xl text-center">
            <p className="mb-3 text-sm font-medium tracking-wide text-[#0095F6] sm:text-base">
              전화 없이 끝내는 단체예약
            </p>
            <div className="relative mx-auto inline-block">
              <h1
                className="select-none text-[3.25rem] font-black tracking-tight sm:text-[5.5rem] md:text-[6.5rem]"
                style={{
                  WebkitTextStroke: '2px #e5e7eb',
                  color: 'transparent',
                }}
              >
                URR
              </h1>
              <h1
                className="landing-title-gradient absolute inset-0 select-none text-[3.25rem] font-black tracking-tight sm:text-[5.5rem] md:text-[6.5rem]"
                style={{
                  background: 'linear-gradient(105deg, #0095F6, #00c2ff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                URR
              </h1>
            </div>
          </div>
        </section>

        {/* 소개 + 검색 위젯 */}
        <section className="mx-auto max-w-3xl px-4 pb-16 sm:pb-20">
          <div className="mb-10 text-center">
            <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">우르르가 바꾸는 단체 예약</h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-gray-600 sm:text-base">
              여러 통화와 메모장 정리는 그만 두세요. 날짜와 인원만 정하면 예약 가능한 가게를 한눈에 보여 드리고,
              메뉴·예약금·시간까지 이어서 선택할 수 있습니다. 사장님은 전용 링크로 예약을 수락·입금 확인까지
              처리할 수 있어요.
            </p>
          </div>

          <LandingSearchWidget />

          <p className="mt-4 text-center text-xs text-gray-400">
            날짜를 바꾸려면 위에서 <span className="font-medium text-gray-500">언제</span>를 눌러 달력을 펼치세요.
          </p>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-8 border-t border-gray-100 bg-[#f8fafc] px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center text-2xl font-bold text-gray-900">자주 묻는 질문</h2>
            <p className="mt-2 text-center text-sm text-gray-500">우르르(URR) 이용 시 궁금한 점을 정리했습니다.</p>

            <ul className="mt-10 space-y-3">
              <FaqItem
                q="우르르는 어떤 서비스인가요?"
                a="단체 모임을 위한 가게 예약을 온라인으로 진행하는 플랫폼입니다. 날짜·인원을 정한 뒤 가게를 고르고, 메뉴와 예약금까지 한 흐름에서 처리할 수 있습니다."
              />
              <FaqItem
                q="예약은 어떻게 하나요?"
                a="첫 화면에서 날짜와 인원을 선택한 뒤 ‘자리 찾기’를 누르면 예약 가능한 가게 목록이 나옵니다. 가게를 고른 다음 시간과 메뉴를 선택하고 예약을 확정하면 됩니다."
              />
              <FaqItem
                q="전화로도 예약할 수 있나요?"
                a="우르르는 웹에서 직접 예약하는 흐름을 기준으로 합니다. 가게마다 문의 전화가 있다면 해당 가게 안내를 참고해 주세요."
              />
              <FaqItem
                q="예약금은 왜 있나요?"
                a="일부 가게는 예약 확정을 위해 예약금을 받습니다. 인원에 따라 금액이 달라질 수 있으며, 가게 상세와 전역 관리 설정에 따라 표시됩니다."
              />
              <FaqItem
                q="사장님은 어디서 예약을 받나요?"
                a="가게마다 발급된 사장님 전용 링크에서 대기 예약을 확인하고 수락·입금 확인 등을 할 수 있습니다."
              />
            </ul>
          </div>
        </section>

        <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} 우르르 (URR)
        </footer>
      </main>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <li className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <details className="group">
        <summary className="cursor-pointer list-none font-semibold text-gray-900 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-start justify-between gap-3">
            <span>{q}</span>
            <span className="shrink-0 text-[#0095F6] transition group-open:rotate-180">▼</span>
          </span>
        </summary>
        <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-600">{a}</p>
      </details>
    </li>
  );
}
