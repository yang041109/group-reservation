'use client';

import { useRouter } from 'next/navigation';
import ReservationConfirmLoadingOverlay from '@/components/ReservationConfirmLoadingOverlay';

export default function LoadingDemoPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <ReservationConfirmLoadingOverlay />

      {/* 오버레이 아래에만 보이는 최소 컨트롤 (개발용) */}
      <div className="fixed left-4 bottom-4 z-[60] flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md bg-black/70 px-3 py-2 text-sm font-semibold text-white hover:bg-black/80"
        >
          뒤로
        </button>
        <button
          type="button"
          onClick={() => router.push('/search')}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          /search로
        </button>
      </div>
    </div>
  );
}

