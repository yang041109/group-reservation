'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export type RevealVariant = 'fade-up' | 'tilt' | 'scale' | 'slide-left' | 'slide-right' | 'blur';

export default function LandingReveal({
  children,
  className = '',
  variant = 'fade-up',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          ob.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  const variantClass = {
    tilt: 'landing-reveal--tilt',
    scale: 'landing-reveal--scale',
    'slide-left': 'landing-reveal--slide-left',
    'slide-right': 'landing-reveal--slide-right',
    blur: 'landing-reveal--blur',
    'fade-up': '',
  }[variant];

  return (
    <div
      ref={ref}
      className={`landing-reveal overflow-x-clip ${variantClass} ${visible ? 'landing-reveal--visible' : ''} ${className}`}
      style={{ ['--reveal-delay' as string]: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function LandingStagger({
  children,
  className = '',
  stepMs = 90,
}: {
  children: ReactNode;
  className?: string;
  stepMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          ob.disconnect();
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px -8% 0px' },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`landing-stagger ${visible ? 'landing-stagger--visible' : ''} ${className}`}
      style={{ ['--stagger-step' as string]: `${stepMs}ms` }}
    >
      {children}
    </div>
  );
}
