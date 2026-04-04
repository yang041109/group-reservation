import { Suspense } from 'react';
import StoreDetailPageClient from './StoreDetailPageClient';

export default function StoreDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-center text-gray-500">불러오는 중...</p>
        </main>
      }
    >
      <StoreDetailPageClient />
    </Suspense>
  );
}
