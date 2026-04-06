import { Suspense } from 'react';
import StoreDetailPageClient from './StoreDetailPageClient';
import LoadingStickmen from '@/components/LoadingStickmen';

export default function StoreDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-4 py-8">
          <LoadingStickmen message="가게 정보를 불러오는 중..." />
        </main>
      }
    >
      <StoreDetailPageClient />
    </Suspense>
  );
}
