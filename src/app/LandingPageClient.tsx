'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/landing.css';
import LandingNav from '@/components/landing/LandingNav';
import LandingHero from '@/components/landing/LandingHero';
import LandingProblem from '@/components/landing/LandingProblem';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import LandingRestaurants from '@/components/landing/LandingRestaurants';
import LandingLiveDemo from '@/components/landing/LandingLiveDemo';
import LandingFAQ from '@/components/landing/LandingFAQ';
import { LandingCta, LandingFooter } from '@/components/landing/LandingCtaFooter';

export default function LandingPageClient() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/search');
  }, [router]);

  return (
    <div className="landing-root min-h-screen">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingProblem />
        <LandingHowItWorks />
        <LandingRestaurants />
        <LandingLiveDemo />
        <LandingFAQ />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
