import { Suspense } from 'react';
import StoreDetailPageClient from './StoreDetailPageClient';
import UrrLoading from '@/components/UrrLoading';

export default function StoreDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-4 py-8">
          <UrrLoading message="가게 정보를 불러오는 중..." />
        </main>
      }
    >
      <StoreDetailPageClient />
    </Suspense>
  );
}
