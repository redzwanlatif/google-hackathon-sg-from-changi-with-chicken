'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useEffect, useState } from 'react';
import { soundManager } from '@/lib/sound-manager';
import Image from 'next/image';
import { Location } from '@/lib/game-state';

// Background images for each location
const LOCATION_BACKGROUNDS: Record<Location, string> = {
  'changi': '/assets/background/changi_airport.jpeg',
  'maxwell': '/assets/background/maxwell_fc.jpeg',
  'cbd': '/assets/background/CBD_raffles.jpeg',
  'east-coast': '/assets/background/MarinaBay.jpeg', // Using Marina Bay for East Coast
  'mbs': '/assets/background/MarinaBay.jpeg',
};

interface ComicPanelProps {
  children: ReactNode;
  location?: Location;
  variant?: 'default' | 'action' | 'dramatic' | 'calm';
  className?: string;
  withBenDay?: boolean;
  withSpeedLines?: boolean;
  entering?: boolean;
}

export function ComicPanel({
  children,
  location,
  variant = 'default',
  className = '',
  withBenDay = true,
  withSpeedLines = false,
  entering = false,
}: ComicPanelProps) {
  const [isTransitioning, setIsTransitioning] = useState(entering);

  useEffect(() => {
    if (entering) {
      soundManager.playWhoosh();
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 600);
      return () => clearTimeout(timer);
    }
  }, [entering, location]);

  const variantStyles = {
    default: 'border-4 border-black',
    action: 'border-[6px] border-black shadow-[8px_8px_0px_#E23636]',
    dramatic: 'border-[6px] border-black shadow-[8px_8px_0px_#1a1a1a]',
    calm: 'border-3 border-black/70',
  };

  return (
    <motion.div
      className={`
        relative overflow-hidden
        ${variantStyles[variant]}
        ${withBenDay ? 'benday-dots' : ''}
        ${withSpeedLines ? 'speed-lines' : ''}
        ${className}
      `}
      initial={entering ? { x: '-100%', rotate: -5 } : false}
      animate={{ x: 0, rotate: 0 }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 150,
      }}
    >
      {/* Background image */}
      {location && (
        <div className="absolute inset-0 z-0">
          <Image
            src={LOCATION_BACKGROUNDS[location]}
            alt={location}
            fill
            className="object-cover"
            priority
          />
          {/* Halftone overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.6) 100%),
                radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)
              `,
              backgroundSize: '100% 100%, 4px 4px',
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Transition wipe effect */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="absolute inset-0 z-50 bg-[#FFE135]"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Location transition component
export function LocationTransition({
  from,
  to,
  isActive,
  onComplete,
}: {
  from: Location;
  to: Location;
  isActive: boolean;
  onComplete: () => void;
}) {
  useEffect(() => {
    if (isActive) {
      soundManager.playWhoosh();
    }
  }, [isActive]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={() => {
            if (!isActive) onComplete();
          }}
        >
          {/* Comic wipe panels */}
          <motion.div
            className="absolute inset-0 flex"
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="flex-1 bg-[#FFE135] border-r-4 border-black"
                variants={{
                  hidden: { y: '-100%' },
                  visible: {
                    y: '0%',
                    transition: { delay: i * 0.08, duration: 0.3 },
                  },
                  exit: {
                    y: '100%',
                    transition: { delay: i * 0.05, duration: 0.3 },
                  },
                }}
              />
            ))}
          </motion.div>

          {/* Travel text */}
          <motion.div
            className="relative z-10 text-center"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 20 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            <div
              className="text-6xl font-bold text-black mb-4"
              style={{ fontFamily: 'Bangers, cursive' }}
            >
              WHOOSH!
            </div>
            <div
              className="text-2xl text-black/80"
              style={{ fontFamily: 'Comic Neue, cursive' }}
            >
              Traveling to...
            </div>
            <motion.div
              className="text-4xl font-bold text-[#E23636] mt-2"
              style={{ fontFamily: 'Bangers, cursive' }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {to.toUpperCase().replace('-', ' ')}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Panel with dramatic corner decorations
export function DramaticPanel({
  children,
  title,
  className = '',
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {/* Corner decorations */}
      <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-black" />
      <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-black" />
      <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-black" />
      <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-black" />

      {/* Title banner */}
      {title && (
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#E23636] text-white px-4 py-1 border-2 border-black z-10 whitespace-nowrap"
          style={{ fontFamily: 'Bangers, cursive' }}
        >
          {title}
        </div>
      )}

      {/* Content */}
      <div className="comic-panel p-4">{children}</div>
    </div>
  );
}

// Narrative caption box (yellow box with narrator text)
export function NarrativeCaption({
  children,
  position = 'top',
}: {
  children: ReactNode;
  position?: 'top' | 'bottom';
}) {
  return (
    <motion.div
      className={`
        absolute ${position === 'top' ? 'top-4' : 'bottom-4'} left-4 right-4
        narrative-box z-20
      `}
      initial={{ y: position === 'top' ? -50 : 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: position === 'top' ? -50 : 50, opacity: 0 }}
    >
      {children}
    </motion.div>
  );
}
