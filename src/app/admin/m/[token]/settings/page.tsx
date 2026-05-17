'use client';

import Link from 'next/link';
import { useAdminStore } from '../AdminStoreContext';

export default function AdminSettingsPage() {
  const store = useAdminStore();
  const base = `/admin/m/${encodeURIComponent(store.token)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-blue-600 text-white shadow-md">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={base} className="text-white" aria-label="뒤로가기">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold">가게 설정 변경</h1>
            <span className="w-6" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md p-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-7 w-7 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-bold text-gray-900">곧 만들어드릴게요</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            가게 이름, 사진, 영업시간, 예약금, 메뉴 등의 정보를 직접 수정하실 수 있는 페이지를
            준비하고 있어요.
          </p>
          <p className="mt-3 text-xs text-gray-500">
            지금은 운영자에게 변경 사항을 전달해 주세요.
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-gray-100 bg-white p-4 text-xs text-gray-600">
          <p className="font-semibold text-gray-800">현재 가게 정보</p>
          <p className="mt-1">가게: {store.name}</p>
          <p>가게 ID: {store.id}</p>
          <p>현재 예약금 (기본): {store.depositAmount.toLocaleString()}원</p>
        </div>

        <Link
          href={base}
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          ← 메인으로
        </Link>
      </main>
    </div>
  );
}
