'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { prefetchAllDataIntoCache } from '@/lib/use-store-data';
import '@/styles/landing.css';
import LandingNav from '@/components/landing/LandingNav';
import LandingHero from '@/components/landing/LandingHero';
import LandingProblem from '@/components/landing/LandingProblem';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import LandingRestaurants from '@/components/landing/LandingRestaurants';
import LandingLiveDemo from '@/components/landing/LandingLiveDemo';
import LandingFAQ from '@/components/landing/LandingFAQ';
import { LandingCta, LandingFooter } from '@/components/landing/LandingCtaFooter';
import LandingReveal from '@/components/landing/LandingReveal';

export default function LandingPageClient() {
  const router = useRouter();
  const [showPromoPopup, setShowPromoPopup] = useState(true);

  useEffect(() => {
    router.prefetch('/search');
    void prefetchAllDataIntoCache();
  }, [router]);

  return (
    <div className="landing-root min-h-screen w-full max-w-full overflow-x-clip">
      {showPromoPopup ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="우르르 프로모션 안내"
        >
          <div className="relative w-full max-w-md">
            <button
              type="button"
              onClick={() => setShowPromoPopup(false)}
              className="absolute right-2 top-2 z-10 rounded-full bg-black/60 px-2 py-1 text-xs font-semibold text-white transition hover:bg-black/70"
              aria-label="팝업 닫기"
            >
              X
            </button>
            <Image
              src="/images/landing-promo-popup.png"
              alt="우르르 단체 예약 안내 프로모션"
              width={720}
              height={1024}
              priority
              unoptimized
              className="h-auto w-full rounded-xl shadow-2xl"
            />
          </div>
        </div>
      ) : null}
      <LandingNav />
      <main>
        <LandingHero />
        <LandingReveal variant="slide-right" delay={0}>
          <LandingProblem />
        </LandingReveal>
        <LandingReveal variant="tilt" delay={60}>
          <LandingHowItWorks />
        </LandingReveal>
        <LandingReveal variant="blur" delay={40}>
          <LandingRestaurants />
        </LandingReveal>
        <LandingReveal variant="slide-left" delay={80}>
          <LandingLiveDemo />
        </LandingReveal>
        <LandingReveal variant="scale" delay={50}>
          <LandingFAQ />
        </LandingReveal>
        <LandingReveal variant="blur" delay={100}>
          <LandingCta />
        </LandingReveal>
      </main>
      <LandingFooter />
    </div>
  );
}
