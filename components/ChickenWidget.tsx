'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { getChickenMoodLabel } from '@/lib/game-state';
import { soundManager } from '@/lib/sound-manager';
import Image from 'next/image';

// Chicken mood portraits mapping
const CHICKEN_PORTRAITS = {
  happy: '/assets/characters/chicken_happy.jpeg',
  neutral: '/assets/characters/chicken_aware.jpeg',
  upset: '/assets/characters/chicken_sideye.jpeg',
  furious: '/assets/characters/chicken_angry.jpeg',
  sad: '/assets/characters/chicken_sad.jpeg',
  exhausted: '/assets/characters/chicken_exhausted.jpeg',
};

// Chicken sounds based on mood
const CHICKEN_SOUNDS = {
  happy: ['BAWK!', 'Coo~', '❤️'],
  neutral: ['Bok bok...', '...', '🐔'],
  upset: ['SQUAWK!', 'Hmph!', '😤'],
  furious: ['BAWK BAWK BAWK!!!', '💢💢💢', '🔥'],
};

interface ChickenWidgetProps {
  onChickenClick?: () => void;
}

export function ChickenWidget({ onChickenClick }: ChickenWidgetProps) {
  const { state, updateChickenMood, nameChicken } = useGame();
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [showReaction, setShowReaction] = useState(false);
  const [reactionText, setReactionText] = useState('');
  const [isPetting, setIsPetting] = useState(false);

  const moodLabel = getChickenMoodLabel(state.chickenMood);

  // Get the appropriate portrait based on mood
  const currentPortrait = useMemo(() => {
    if (state.chickenMood >= 70) return CHICKEN_PORTRAITS.happy;
    if (state.chickenMood >= 50) return CHICKEN_PORTRAITS.neutral;
    if (state.chickenMood >= 30) return CHICKEN_PORTRAITS.upset;
    if (state.chickenMood >= 15) return CHICKEN_PORTRAITS.sad;
    return CHICKEN_PORTRAITS.furious;
  }, [state.chickenMood]);

  // Mood colors for comic styling
  const moodColors = {
    happy: {
      bg: 'from-green-400 to-emerald-500',
      border: 'border-green-600',
      shadow: 'shadow-[4px_4px_0px_#166534]',
    },
    neutral: {
      bg: 'from-yellow-400 to-orange-400',
      border: 'border-yellow-600',
      shadow: 'shadow-[4px_4px_0px_#ca8a04]',
    },
    upset: {
      bg: 'from-orange-400 to-red-400',
      border: 'border-orange-600',
      shadow: 'shadow-[4px_4px_0px_#c2410c]',
    },
    furious: {
      bg: 'from-red-500 to-red-700',
      border: 'border-red-800',
      shadow: 'shadow-[4px_4px_0px_#7f1d1d]',
    },
  };

  const currentMoodStyle = moodColors[moodLabel];

  const handleChickenClick = useCallback(() => {
    if (!state.chickenName) {
      setShowNameInput(true);
      return;
    }

    // Pet the chicken
    setIsPetting(true);
    updateChickenMood(5);
    soundManager.playChickenSound(state.chickenMood);

    // Show reaction
    const sounds = CHICKEN_SOUNDS[moodLabel];
    setReactionText(sounds[Math.floor(Math.random() * sounds.length)]);
    setShowReaction(true);

    setTimeout(() => {
      setIsPetting(false);
      setShowReaction(false);
    }, 1000);

    onChickenClick?.();
  }, [state.chickenName, state.chickenMood, moodLabel, updateChickenMood, onChickenClick]);

  const handleNameSubmit = () => {
    if (nameValue.trim()) {
      nameChicken(nameValue.trim());
      setShowNameInput(false);
      setNameValue('');
      soundManager.playSuccess();
    }
  };

  // Chicken animation based on mood
  const chickenAnimation = useMemo(() => {
    switch (moodLabel) {
      case 'happy':
        return {
          y: [0, -8, 0],
          rotate: [0, 5, -5, 0],
          transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.5 },
        };
      case 'neutral':
        return {
          y: [0, -3, 0],
          transition: { duration: 2, repeat: Infinity },
        };
      case 'upset':
        return {
          x: [-2, 2, -2],
          transition: { duration: 0.3, repeat: Infinity },
        };
      case 'furious':
        return {
          x: [-4, 4, -4],
          rotate: [-8, 8, -8],
          scale: [1, 1.05, 1],
          transition: { duration: 0.15, repeat: Infinity },
        };
      default:
        return {};
    }
  }, [moodLabel]);

  return (
    <div className="relative">
      {/* Main Chicken Container - Comic Panel Style */}
      <motion.div
        className={`
          relative w-64 cursor-pointer
          comic-panel bg-gradient-to-br ${currentMoodStyle.bg}
          border-4 ${currentMoodStyle.border} ${currentMoodStyle.shadow}
          rounded-xl overflow-visible
        `}
        whileHover={{ scale: 1.05, rotate: 2 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleChickenClick}
        animate={isPetting ? { scale: [1, 1.1, 1] } : {}}
      >
        {/* Chicken Portrait */}
        <motion.div
          className="relative w-full aspect-[4/3] overflow-hidden rounded-t-lg"
          animate={chickenAnimation}
        >
          <Image
            src={currentPortrait}
            alt={state.chickenName || 'Ceremonial Chicken'}
            fill
            className="object-cover"
          />

          {/* Halftone overlay for comic effect */}
          <div className="absolute inset-0 benday-dots pointer-events-none" />

          {/* Mood-based overlay effects */}
          {moodLabel === 'furious' && (
            <div className="absolute inset-0 bg-red-500/20 animate-pulse" />
          )}
          {moodLabel === 'happy' && (
            <motion.div
              className="absolute inset-0"
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                background: 'radial-gradient(circle, rgba(255,255,0,0.3) 0%, transparent 70%)',
              }}
            />
          )}
        </motion.div>

        {/* Info Section */}
        <div className="p-2 bg-white/90 border-t-3 border-black">
          {/* Chicken Name */}
          <div
            className="text-center font-bold text-sm text-black truncate"
            style={{ fontFamily: 'Bangers, cursive' }}
          >
            {state.chickenName || 'THE CHICKEN'}
          </div>

          {/* Mood Label */}
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-sm">
              {moodLabel === 'happy' && '😊'}
              {moodLabel === 'neutral' && '😐'}
              {moodLabel === 'upset' && '😤'}
              {moodLabel === 'furious' && '🔥'}
            </span>
            <span
              className="text-xs uppercase font-bold"
              style={{ fontFamily: 'Comic Neue, cursive' }}
            >
              {moodLabel}
            </span>
          </div>

          {/* Mood Bar - Comic Style */}
          <div className="mt-2 h-3 bg-black rounded-sm overflow-hidden border-2 border-black">
            <motion.div
              className={`h-full ${
                moodLabel === 'happy' ? 'bg-green-400' :
                moodLabel === 'neutral' ? 'bg-yellow-400' :
                moodLabel === 'upset' ? 'bg-orange-400' :
                'bg-red-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${state.chickenMood}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Ben-Day dots overlay */}
        <div className="absolute inset-0 benday-dots-light pointer-events-none rounded-xl" />
      </motion.div>

      {/* Ceremonial Ribbon - Comic Badge */}
      <motion.div
        className="absolute -top-3 -right-3 z-10"
        animate={{ rotate: [10, 15, 10] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div
          className="bg-red-500 text-white text-xs px-3 py-1 border-2 border-black shadow-[2px_2px_0px_#1a1a1a] transform rotate-12"
          style={{ fontFamily: 'Bangers, cursive' }}
        >
          CEREMONIAL!
        </div>
      </motion.div>

      {/* Reaction Speech Bubble */}
      <AnimatePresence>
        {showReaction && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.5 }}
            className="absolute -top-16 left-1/2 -translate-x-1/2 z-20"
          >
            <div
              className={`
                px-4 py-2 rounded-lg border-3 border-black
                ${moodLabel === 'furious' ? 'bg-red-400 comic-shout-bubble' : 'bg-white comic-speech-bubble'}
                whitespace-nowrap
              `}
              style={{ fontFamily: 'Bangers, cursive', fontSize: '1.2rem' }}
            >
              {reactionText}
            </div>
            {/* Speech bubble tail */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-black" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pet Hearts Effect */}
      <AnimatePresence>
        {isPetting && moodLabel !== 'furious' && (
          <>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-2xl pointer-events-none"
                initial={{
                  opacity: 1,
                  x: 16 + Math.random() * 32,
                  y: 0,
                }}
                animate={{
                  opacity: 0,
                  y: -50,
                  x: 16 + Math.random() * 64 - 16,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
              >
                {moodLabel === 'happy' ? '❤️' : '💛'}
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Name Input Modal - Comic Style */}
      <AnimatePresence>
        {showNameInput && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/80 rounded-xl" />
            <div className="relative z-10 p-4 text-center">
              <div
                className="text-white text-lg mb-3"
                style={{ fontFamily: 'Bangers, cursive' }}
              >
                NAME YOUR CHICKEN!
              </div>
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                placeholder="Enter name..."
                className="w-full px-3 py-2 rounded border-3 border-black text-black text-center font-bold mb-2"
                style={{ fontFamily: 'Comic Neue, cursive' }}
                autoFocus
              />
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleNameSubmit}
                  className="comic-button text-sm py-1 px-3"
                >
                  NAME IT!
                </button>
                <button
                  onClick={() => setShowNameInput(false)}
                  className="comic-button comic-button-blue text-sm py-1 px-3"
                >
                  SKIP
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning indicator when mood is low */}
      {state.chickenMood < 30 && (
        <motion.div
          className="absolute -bottom-2 -left-2 z-10"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          <div
            className="bg-red-500 text-white text-xs px-2 py-1 rounded border-2 border-black"
            style={{ fontFamily: 'Bangers, cursive' }}
          >
            ⚠️ DANGER!
          </div>
        </motion.div>
      )}
    </div>
  );
}
