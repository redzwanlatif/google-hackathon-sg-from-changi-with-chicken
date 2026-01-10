'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChickenReaction {
  sound: string;
  thought: string;
  action: string;
}

interface ChickenBubbleProps {
  reaction: ChickenReaction | null;
  chickenMood: number;
  onDismiss?: () => void;
}

export function ChickenBubble({
  reaction,
  chickenMood,
  onDismiss
}: ChickenBubbleProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (reaction) {
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [reaction, onDismiss]);

  // Get chicken emoji based on mood
  const getChickenEmoji = () => {
    if (chickenMood > 80) return '🐔';
    if (chickenMood > 60) return '🐓';
    if (chickenMood > 40) return '🐥';
    if (chickenMood > 20) return '😰';
    return '💨'; // escaping!
  };

  return (
    <AnimatePresence>
      {isVisible && reaction && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          className="fixed bottom-[480px] right-4 z-30 max-w-xs"
        >
          {/* Speech bubble */}
          <div className="relative">
            {/* Bubble content */}
            <div className="bg-amber-100 border-2 border-amber-400 rounded-2xl rounded-br-none p-3 shadow-lg">
              {/* Sound effect */}
              <div className="text-lg font-bold text-amber-700 mb-1">
                {reaction.sound}
              </div>

              {/* Thought */}
              <p className="text-sm text-amber-800 italic mb-2">
                {reaction.thought}
              </p>

              {/* Action */}
              <div className="text-xs text-amber-600 flex items-center gap-1">
                <span>*{reaction.action}*</span>
              </div>
            </div>

            {/* Tail pointing to chicken */}
            <div className="absolute -bottom-2 right-32 w-4 h-4 bg-amber-100 border-b-2 border-r-2 border-amber-400 transform rotate-45" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact chicken sound indicator
 */
export function ChickenSoundIndicator({ sound }: { sound: string | null }) {
  const [visible, setVisible] = useState(false);
  const [displaySound, setDisplaySound] = useState('');

  useEffect(() => {
    if (sound) {
      setDisplaySound(sound);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [sound]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed bottom-20 right-4 z-30"
        >
          <div className="bg-amber-400 text-amber-900 font-bold px-3 py-1 rounded-full text-sm shadow-lg">
            🐔 {displaySound}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
