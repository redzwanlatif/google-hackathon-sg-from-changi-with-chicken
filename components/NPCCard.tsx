'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NPCId } from '@/lib/game-state';
import { getNPCConfig } from '@/lib/npc-configs';
import Image from 'next/image';

interface NPCCardProps {
  npcId: NPCId;
  transcript: string;
  isThinking: boolean;
  onPortraitClick?: () => void;
}

export function NPCCard({ npcId, transcript, isThinking, onPortraitClick }: NPCCardProps) {
  const npcConfig = getNPCConfig(npcId);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Typewriter effect for transcript
  useEffect(() => {
    if (!transcript) {
      setDisplayedText('');
      return;
    }

    setIsTyping(true);
    setDisplayedText('');

    let index = 0;
    const interval = setInterval(() => {
      if (index < transcript.length) {
        setDisplayedText(transcript.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 30); // 30ms per character

    return () => clearInterval(interval);
  }, [transcript]);

  return (
    <div className="flex flex-col items-center">
      {/* NPC Portrait */}
      <motion.div
        className="relative w-32 h-32 mb-4 cursor-pointer"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onPortraitClick}
      >
        {/* Portrait background */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-200 to-orange-300 rounded-full" />

        {/* Portrait image (placeholder until assets are generated) */}
        <div className="absolute inset-2 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden pixel-art">
          {/* TODO: Replace with actual image once assets are ready */}
          <div className="text-6xl">
            {npcId === 'airport-auntie' && '🧹'}
            {npcId === 'auntie-mei' && '🍜'}
            {npcId === 'grab-uncle' && '🚗'}
            {npcId === 'ah-beng' && '💪'}
            {npcId === 'jessica' && '📱'}
            {npcId === 'security-guard' && '🛡️'}
            {npcId === 'marcus' && '🤵'}
          </div>
        </div>

        {/* Thinking indicator */}
        <AnimatePresence>
          {isThinking && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-2"
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="text-xl"
              >
                💭
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* NPC Name */}
      <div className="text-white font-bold text-lg mb-2">{npcConfig.name}</div>

      {/* Speech Bubble */}
      <AnimatePresence mode="wait">
        {(displayedText || isThinking) && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="speech-bubble relative bg-white rounded-2xl p-4 max-w-md shadow-lg"
          >
            {/* Speech bubble tail */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-white" />

            {isThinking && !displayedText ? (
              <div className="flex gap-1">
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                >
                  •
                </motion.span>
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                >
                  •
                </motion.span>
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                >
                  •
                </motion.span>
              </div>
            ) : (
              <p className="text-gray-800 text-lg">
                {displayedText}
                {isTyping && (
                  <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    |
                  </motion.span>
                )}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
