'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundManager } from '@/lib/sound-manager';

// Predefined action texts for different events
export const ACTION_TEXTS = {
  // Chicken actions
  'chicken-happy': ['BAWK!', 'CLUCK!', '❤️'],
  'chicken-angry': ['SQUAWK!', 'BAWK BAWK!', '💢'],
  'chicken-pet': ['PURRRR~', 'CUKOO!', '✨'],
  'chicken-escape': ['FREEDOM!', 'FLAP FLAP!', '💨'],

  // Player actions
  'talk-start': ['...', '💬', '🎤'],
  'talk-end': ['!', '💭', '✓'],
  'travel': ['WHOOSH!', 'ZOOM!', '🚀'],
  'memory-unlock': ['FLASH!', '💡', '🧠'],

  // NPC reactions
  'npc-angry': ['AIYOH!', 'WAH LAO!', '😤'],
  'npc-happy': ['SHIOK!', 'CAN LAH!', '😊'],
  'npc-shocked': ['ALAMAK!', 'SIAO!', '😱'],
  'npc-confused': ['HUH?', 'BLUR...', '😕'],

  // Game events
  'quest-complete': ['DING!', 'NICE!', '⭐'],
  'time-warning': ['TICK TOCK!', 'HURRY!', '⏰'],
  'success': ['PERFECT!', 'SHIOK AH!', '🎉'],
  'failure': ['SIAN...', 'GG', '💀'],
} as const;

export type ActionTextType = keyof typeof ACTION_TEXTS;

interface ActionTextProps {
  type: ActionTextType;
  show: boolean;
  onComplete?: () => void;
  position?: { x: number; y: number } | 'center' | 'random';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'yellow' | 'red' | 'cyan' | 'white';
  withSound?: boolean;
}

export function ActionText({
  type,
  show,
  onComplete,
  position = 'center',
  size = 'lg',
  color = 'yellow',
  withSound = true,
}: ActionTextProps) {
  const [text, setText] = useState('');
  const [pos, setPos] = useState({ x: 50, y: 50 });

  // Pick random text from the category
  useEffect(() => {
    if (show) {
      const texts = ACTION_TEXTS[type];
      setText(texts[Math.floor(Math.random() * texts.length)]);

      // Calculate position
      if (position === 'random') {
        setPos({
          x: 20 + Math.random() * 60,
          y: 20 + Math.random() * 60,
        });
      } else if (position === 'center') {
        setPos({ x: 50, y: 50 });
      } else {
        setPos({ x: position.x, y: position.y });
      }

      // Play sound effect
      if (withSound) {
        if (type.includes('chicken')) {
          soundManager.playChickenSound(type === 'chicken-happy' || type === 'chicken-pet' ? 80 : 20);
        } else if (type === 'travel') {
          soundManager.playWhoosh();
        } else if (type === 'quest-complete' || type === 'success' || type === 'memory-unlock') {
          soundManager.playSuccess();
        } else if (type === 'failure') {
          soundManager.playFailure();
        }
      }

      // Auto-dismiss after animation
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [show, type, position, withSound, onComplete]);

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
    xl: 'text-8xl',
  };

  const colorClasses = {
    yellow: 'action-text',
    red: 'action-text-red',
    cyan: 'action-text-cyan',
    white: 'action-text text-white',
  };

  return (
    <AnimatePresence>
      {show && text && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`absolute ${sizeClasses[size]} ${colorClasses[color]}`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            initial={{
              scale: 0,
              rotate: -20,
              opacity: 0,
            }}
            animate={{
              scale: [0, 1.5, 1],
              rotate: [-20, 10, -5],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 1.2,
              times: [0, 0.2, 0.4, 1],
              ease: 'easeOut',
            }}
          >
            {/* Starburst background */}
            <div className="absolute inset-0 -z-10 starburst opacity-50" />

            {/* Main text */}
            <span className="relative z-10 whitespace-nowrap">{text}</span>

            {/* Speed lines */}
            <motion.div
              className="absolute inset-0 -z-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 0.6 }}
            >
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute bg-black"
                  style={{
                    width: '200%',
                    height: '2px',
                    left: '50%',
                    top: '50%',
                    transformOrigin: 'left center',
                    transform: `rotate(${i * 45}deg)`,
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: [0, 1, 0] }}
                  transition={{ duration: 0.4, delay: i * 0.02 }}
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for managing action text display
export function useActionText() {
  const [activeAction, setActiveAction] = useState<{
    type: ActionTextType;
    id: number;
  } | null>(null);

  const showAction = useCallback((type: ActionTextType) => {
    setActiveAction({ type, id: Date.now() });
  }, []);

  const hideAction = useCallback(() => {
    setActiveAction(null);
  }, []);

  return {
    activeAction,
    showAction,
    hideAction,
    ActionTextComponent: activeAction ? (
      <ActionText
        key={activeAction.id}
        type={activeAction.type}
        show={true}
        onComplete={hideAction}
        position="random"
      />
    ) : null,
  };
}

// Floating Singlish particle effect
export function SinglishParticle({
  text,
  x,
  y,
}: {
  text: string;
  x: number;
  y: number;
}) {
  return (
    <motion.div
      className="singlish-particle fixed pointer-events-none z-40"
      style={{ left: x, top: y }}
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -60, scale: 1.3 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
    >
      {text}
    </motion.div>
  );
}

// Multi-action text burst (for big moments)
export function ActionBurst({
  texts,
  show,
  onComplete,
}: {
  texts: string[];
  show: boolean;
  onComplete?: () => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={onComplete}
        >
          {texts.map((text, i) => (
            <motion.div
              key={i}
              className="absolute action-text text-4xl"
              style={{
                left: `${30 + (i % 3) * 20}%`,
                top: `${30 + Math.floor(i / 3) * 20}%`,
              }}
              initial={{ scale: 0, rotate: -30 + Math.random() * 60 }}
              animate={{
                scale: [0, 1.2, 1],
                rotate: [-30 + Math.random() * 60, 10, -5],
              }}
              transition={{
                delay: i * 0.1,
                duration: 0.5,
                ease: 'backOut',
              }}
            >
              {text}
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
