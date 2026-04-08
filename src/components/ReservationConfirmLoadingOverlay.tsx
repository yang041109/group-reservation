'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

function GlassSphere({
  delay,
  color,
  index,
  letterPositions,
}: {
  delay: number;
  color: string;
  index: number;
  letterPositions: { x: number; y: number }[];
}) {
  const BALL_SIZE = 55;

  const ballConfigs = [{ jumpHeight: 60, duration: 3.5, squash: 0.7, stretch: 1.3 }];
  const config = ballConfigs[index];

  const [uPos, r1Pos, r2Pos] = letterPositions;
  const landingY = uPos.y - BALL_SIZE / 2;

  const uX = uPos.x - BALL_SIZE / 2;
  const r1X = r1Pos.x - BALL_SIZE / 2;
  const r2X = r2Pos.x - BALL_SIZE / 2;

  const variants = {
    animate: {
      x: [
        uX - 62,
        uX,
        uX + (r1X - uX) * 0.5,
        r1X,
        r1X + (r2X - r1X) * 0.5,
        r2X,
        r2X + 62,
        r2X + 120,
      ],
      y: [
        landingY - config.jumpHeight * 1.2,
        landingY,
        landingY - config.jumpHeight,
        landingY,
        landingY - config.jumpHeight * 0.9,
        landingY,
        landingY - config.jumpHeight * 0.7,
        landingY - config.jumpHeight * 1.2,
      ],
      scaleY: [1, config.squash, config.stretch, config.squash, config.stretch, config.squash, config.stretch, 1],
      scaleX: [1, 1 / config.squash, 0.85, 1 / config.squash, 0.85, 1 / config.squash, 0.85, 1],
      opacity: [0, 1, 1, 1, 1, 1, 1, 0],
    },
  };

  return (
    <motion.div
      className="pointer-events-none absolute rounded-full"
      style={{
        width: BALL_SIZE,
        height: BALL_SIZE,
        background: `radial-gradient(circle at 35% 35%, ${color}ff, ${color}95)`,
        boxShadow: `0 10px 30px ${color}60, inset -4px -4px 8px rgba(0,0,0,0.15), inset 5px 5px 10px rgba(255,255,255,0.7)`,
        border: '2.5px solid rgba(255,255,255,0.6)',
        originX: 0.5,
        originY: 0.5,
      }}
      variants={variants}
      animate="animate"
      transition={{
        duration: config.duration,
        delay,
        repeat: Infinity,
        repeatDelay: 0.5,
        times: [0, 0.18, 0.32, 0.5, 0.64, 0.82, 0.92, 1],
        ease: [0.68, 0, 0.32, 1],
      }}
    />
  );
}

function SteppableLetter({
  children,
  letterIndex,
  onPositionUpdate,
}: {
  children: string;
  letterIndex: number;
  onPositionUpdate: (index: number, x: number, y: number) => void;
}) {
  const letterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      if (!letterRef.current) return;
      const rect = letterRef.current.getBoundingClientRect();
      onPositionUpdate(letterIndex, rect.left + rect.width / 2, rect.top);
    };

    const timer = setTimeout(updatePosition, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ballDelays = [0];
  const durations = [3.5];
  const landingTimeInAnimation = [0.18, 0.5, 0.82][letterIndex];

  const stepTimings = ballDelays.map((delay, i) => delay + durations[i] * landingTimeInAnimation);
  const maxCycle = Math.max(...durations.map((d, i) => ballDelays[i] + d)) + 0.5;

  const scaleYFrames: number[] = [];
  const timeFrames: number[] = [];

  const sortedSteps = [...stepTimings].sort((a, b) => a - b);

  let currentTime = 0;
  scaleYFrames.push(1);
  timeFrames.push(0);

  sortedSteps.forEach((stepTime) => {
    const normalizedTime = stepTime / maxCycle;

    if (normalizedTime > currentTime) {
      timeFrames.push(Math.max(normalizedTime - 0.001, currentTime + 0.001));
      scaleYFrames.push(1);
    }

    timeFrames.push(normalizedTime);
    scaleYFrames.push(1);

    const squashMid = normalizedTime + 0.025;
    timeFrames.push(Math.min(squashMid, 0.99));
    scaleYFrames.push(0.82);

    const squashFull = normalizedTime + 0.05;
    timeFrames.push(Math.min(squashFull, 0.99));
    scaleYFrames.push(0.65);

    const holdTime = normalizedTime + 0.1;
    timeFrames.push(Math.min(holdTime, 0.99));
    scaleYFrames.push(0.65);

    const bounceStart = normalizedTime + 0.13;
    timeFrames.push(Math.min(bounceStart, 0.99));
    scaleYFrames.push(0.88);

    const bounceTime = normalizedTime + 0.16;
    timeFrames.push(Math.min(bounceTime, 0.99));
    scaleYFrames.push(1.1);

    const finalTime = normalizedTime + 0.2;
    timeFrames.push(Math.min(finalTime, 0.99));
    scaleYFrames.push(1);

    currentTime = finalTime;
  });

  if (timeFrames[timeFrames.length - 1] < 1) {
    timeFrames.push(1);
    scaleYFrames.push(1);
  }

  return (
    <motion.span
      ref={letterRef}
      className="inline-block"
      style={{
        color: '#001F3F',
        transformOrigin: 'bottom center',
      }}
      animate={{ scaleY: scaleYFrames }}
      transition={{
        duration: maxCycle,
        repeat: Infinity,
        times: timeFrames,
        ease: [0.34, 1.56, 0.64, 1],
      }}
    >
      {children}
    </motion.span>
  );
}

function BlinkingDots() {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 0.2, 0.4].map((delay, i) => (
        <motion.span
          key={i}
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1.5, delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}

export default function ReservationConfirmLoadingOverlay() {
  const [letterPositions, setLetterPositions] = useState<{ x: number; y: number }[]>([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);

  const handlePositionUpdate = useCallback((index: number, x: number, y: number) => {
    setLetterPositions((prev) => {
      const next = [...prev];
      next[index] = { x, y };
      return next;
    });
  }, []);

  const spheres = [{ color: '#a8e6cf', delay: 0 }];
  const allPositionsReady = letterPositions.every((pos) => pos.x !== 0 && pos.y !== 0);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative flex h-full w-full flex-col items-center justify-center">
        <div className="relative" style={{ height: 120 }}>
          <h1 className="flex gap-6 text-7xl font-black">
            <SteppableLetter letterIndex={0} onPositionUpdate={handlePositionUpdate}>
              U
            </SteppableLetter>
            <SteppableLetter letterIndex={1} onPositionUpdate={handlePositionUpdate}>
              R
            </SteppableLetter>
            <SteppableLetter letterIndex={2} onPositionUpdate={handlePositionUpdate}>
              R
            </SteppableLetter>
          </h1>

          {allPositionsReady && (
            <div className="pointer-events-none fixed inset-0 overflow-visible" style={{ zIndex: 10 }}>
              {spheres.map((sphere, i) => (
                <GlassSphere
                  key={i}
                  color={sphere.color}
                  delay={sphere.delay}
                  index={i}
                  letterPositions={letterPositions}
                />
              ))}
            </div>
          )}
        </div>

        <p className="mt-10 text-base text-gray-500">
          우리 팀원들 우르르 모여드는 중<BlinkingDots />
        </p>
      </div>
    </motion.div>
  );
}

