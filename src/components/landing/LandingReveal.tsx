'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type RevealVariant = 'fade-up' | 'tilt' | 'scale';

export default function LandingReveal({
  children,
  className = '',
  variant = 'fade-up',
}: {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
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
      { threshold: 0.06, rootMargin: '0px 0px -10% 0px' },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  const variantClass =
    variant === 'tilt' ? 'landing-reveal--tilt' : variant === 'scale' ? 'landing-reveal--scale' : '';

  return (
    <div ref={ref} className={`landing-reveal ${variantClass} ${visible ? 'landing-reveal--visible' : ''} ${className}`}>
      {children}
    </div>
  );
}
