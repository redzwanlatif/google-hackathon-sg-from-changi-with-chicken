'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerEmotion } from '@/lib/emotion-detector';

interface EmotionIndicatorProps {
  emotion: PlayerEmotion | null;
  description?: string;
  showCamera?: boolean;
}

const EMOTION_CONFIG: Record<PlayerEmotion, { emoji: string; color: string; label: string }> = {
  happy: { emoji: '😊', color: 'bg-green-500', label: 'Happy' },
  angry: { emoji: '😠', color: 'bg-red-500', label: 'Angry' },
  sad: { emoji: '😢', color: 'bg-blue-500', label: 'Sad' },
  confused: { emoji: '😕', color: 'bg-yellow-500', label: 'Blur' },
  neutral: { emoji: '😐', color: 'bg-gray-500', label: 'Neutral' },
  stressed: { emoji: '😰', color: 'bg-orange-500', label: 'Stressed' },
  funny: { emoji: '🤪', color: 'bg-pink-500', label: 'Silly' },
  shocked: { emoji: '😱', color: 'bg-purple-500', label: 'Shocked' },
};

export function EmotionIndicator({
  emotion,
  description,
  showCamera = false
}: EmotionIndicatorProps) {
  const [showDescription, setShowDescription] = useState(false);

  useEffect(() => {
    if (description) {
      setShowDescription(true);
      const timer = setTimeout(() => setShowDescription(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [description]);

  if (!emotion) return null;

  const config = EMOTION_CONFIG[emotion];

  return (
    <div className="fixed top-20 right-4 z-30">
      {/* Main emotion badge */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`${config.color} rounded-full px-3 py-1.5 flex items-center gap-2 shadow-lg`}
      >
        {showCamera && (
          <span className="text-xs opacity-70">📷</span>
        )}
        <span className="text-xl">{config.emoji}</span>
        <span className="text-white text-sm font-medium">{config.label}</span>
      </motion.div>

      {/* Description tooltip */}
      <AnimatePresence>
        {showDescription && description && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 max-w-xs"
          >
            <div className="bg-black/80 text-white text-xs px-3 py-2 rounded-lg">
              {description}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact emotion badge for HUD
 */
export function EmotionBadge({ emotion }: { emotion: PlayerEmotion | null }) {
  if (!emotion) return null;

  const config = EMOTION_CONFIG[emotion];

  return (
    <motion.div
      key={emotion}
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      className={`${config.color} rounded-full w-8 h-8 flex items-center justify-center`}
    >
      <span className="text-lg">{config.emoji}</span>
    </motion.div>
  );
}
