'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { getChickenMoodLabel } from '@/lib/game-state';

interface ChickenWidgetProps {
  onChickenClick?: () => void;
}

export function ChickenWidget({ onChickenClick }: ChickenWidgetProps) {
  const { state, updateChickenMood, nameChicken } = useGame();
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameValue, setNameValue] = useState('');

  const moodLabel = getChickenMoodLabel(state.chickenMood);

  const moodEmoji = {
    happy: '😊',
    neutral: '😐',
    upset: '😟',
    furious: '😠',
  }[moodLabel];

  const moodColor = {
    happy: 'from-green-400 to-green-600',
    neutral: 'from-yellow-400 to-yellow-600',
    upset: 'from-orange-400 to-orange-600',
    furious: 'from-red-400 to-red-600',
  }[moodLabel];

  const handleChickenClick = () => {
    if (!state.chickenName) {
      setShowNameInput(true);
    } else {
      // Pet the chicken
      updateChickenMood(5);
      onChickenClick?.();
    }
  };

  const handleNameSubmit = () => {
    if (nameValue.trim()) {
      nameChicken(nameValue.trim());
      setShowNameInput(false);
      setNameValue('');
    }
  };

  // Get chicken animation based on mood
  const chickenAnimation = {
    happy: {
      y: [0, -10, 0],
      rotate: [0, 5, -5, 0],
      transition: { duration: 0.5, repeat: Infinity, repeatDelay: 1 },
    },
    neutral: {
      y: [0, -3, 0],
      transition: { duration: 2, repeat: Infinity },
    },
    upset: {
      x: [-2, 2, -2],
      transition: { duration: 0.3, repeat: Infinity },
    },
    furious: {
      x: [-5, 5, -5],
      rotate: [-10, 10, -10],
      transition: { duration: 0.2, repeat: Infinity },
    },
  }[moodLabel];

  return (
    <div className="relative">
      {/* Chicken Container */}
      <motion.div
        className={`
          bg-gradient-to-br ${moodColor}
          rounded-2xl p-4 cursor-pointer
          border-4 border-white/30
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleChickenClick}
      >
        {/* Chicken Sprite */}
        <motion.div
          className="text-6xl text-center pixel-art"
          animate={chickenAnimation}
        >
          🐔
        </motion.div>

        {/* Chicken Name */}
        <div className="text-center mt-2">
          <div className="text-white font-bold text-sm">
            {state.chickenName || 'The Chicken'}
          </div>
          <div className="text-white/70 text-xs flex items-center justify-center gap-1">
            <span>{moodEmoji}</span>
            <span className="capitalize">{moodLabel}</span>
          </div>
        </div>

        {/* Mood Bar */}
        <div className="mt-2 bg-black/30 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${state.chickenMood}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>

      {/* Ribbon */}
      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full transform rotate-12">
        🎀 Ceremonial
      </div>

      {/* Name Input Modal */}
      <AnimatePresence>
        {showNameInput && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 bg-black/80 rounded-2xl flex flex-col items-center justify-center p-4"
          >
            <div className="text-white text-sm mb-2">Name your chicken!</div>
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              placeholder="Enter name..."
              className="bg-white/20 text-white px-3 py-2 rounded-lg text-sm w-full mb-2 placeholder-white/50"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleNameSubmit}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm"
              >
                Name
              </button>
              <button
                onClick={() => setShowNameInput(false)}
                className="bg-gray-500 text-white px-3 py-1 rounded text-sm"
              >
                Skip
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speech bubble when clicked */}
      <AnimatePresence>
        {state.chickenName && (
          <motion.div
            key="pet-feedback"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-white px-2 py-1 rounded-full shadow whitespace-nowrap"
          >
            {moodLabel === 'happy' && '❤️ Bawk!'}
            {moodLabel === 'neutral' && '🐣 Cluck'}
            {moodLabel === 'upset' && '😤 BAWK!'}
            {moodLabel === 'furious' && '💢 SQUAWK!!!'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
