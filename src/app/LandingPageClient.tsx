'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    router.prefetch('/search');
    void prefetchAllDataIntoCache();
  }, [router]);

  return (
    <div className="landing-root min-h-screen">
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
