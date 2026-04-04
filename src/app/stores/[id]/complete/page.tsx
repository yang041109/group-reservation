'use client';

import Link from 'next/link';

export default function ReservationCompletePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">🎉</div>

        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          예약이 확정되었습니다!
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          선택하신 시간에 방문해주세요
        </p>

        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-blue-500 px-8 py-3.5 text-base font-bold text-white transition hover:bg-blue-600 active:bg-blue-700"
        >
          메인 홈으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
