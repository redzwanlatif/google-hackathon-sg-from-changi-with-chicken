'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NarratorBannerProps {
  message: string | null;
  onDismiss?: () => void;
  autoHideDelay?: number;
}

export function NarratorBanner({
  message,
  onDismiss,
  autoHideDelay = 5000
}: NarratorBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);

      // Auto-hide after delay
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [message, autoHideDelay, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && message && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-40 p-4 pointer-events-none"
        >
          <div
            className="max-w-lg mx-auto bg-gradient-to-r from-purple-900/95 via-indigo-900/95 to-purple-900/95
                       backdrop-blur-sm rounded-xl border border-purple-500/30 shadow-2xl shadow-purple-500/20
                       pointer-events-auto cursor-pointer"
            onClick={() => {
              setIsVisible(false);
              onDismiss?.();
            }}
          >
            {/* Narrator Icon */}
            <div className="flex items-start gap-3 p-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600/50 flex items-center justify-center">
                <span className="text-xl">🎭</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs text-purple-300 font-medium mb-1">
                  NARRATOR
                </div>
                <p className="text-white text-sm leading-relaxed italic">
                  &ldquo;{message}&rdquo;
                </p>
              </div>
            </div>

            {/* Subtle progress bar for auto-dismiss */}
            <motion.div
              className="h-0.5 bg-purple-400/50 rounded-b-xl"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: autoHideDelay / 1000, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact narrator for in-game events
 */
export function NarratorToast({ message }: { message: string | null }) {
  const [visible, setVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState('');

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="fixed bottom-32 left-4 right-4 z-30"
        >
          <div className="max-w-sm mx-auto bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2
                          border border-purple-500/30 text-center">
            <p className="text-purple-200 text-sm italic">&ldquo;{displayMessage}&rdquo;</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
