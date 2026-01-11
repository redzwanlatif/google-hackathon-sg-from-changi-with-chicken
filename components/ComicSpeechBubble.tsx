'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type BubbleType = 'speech' | 'shout' | 'thought' | 'whisper';

interface ComicSpeechBubbleProps {
  text: string;
  type?: BubbleType;
  isTyping?: boolean;
  speakerName?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  onComplete?: () => void;
}

export function ComicSpeechBubble({
  text,
  type = 'speech',
  isTyping = false,
  speakerName,
  position = 'bottom',
  className = '',
  onComplete,
}: ComicSpeechBubbleProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  // Typewriter effect
  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      return;
    }

    setIsAnimating(true);
    setDisplayedText('');

    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsAnimating(false);
        clearInterval(interval);
        onComplete?.();
      }
    }, 25);

    return () => clearInterval(interval);
  }, [text, onComplete]);

  // Tail position styles
  const tailPositions = {
    top: 'bottom-full left-8 rotate-180',
    bottom: 'top-full left-8',
    left: 'right-full top-1/2 -translate-y-1/2 rotate-90',
    right: 'left-full top-1/2 -translate-y-1/2 -rotate-90',
  };

  // Get bubble style based on type
  const getBubbleStyle = () => {
    switch (type) {
      case 'shout':
        return 'comic-shout-bubble';
      case 'thought':
        return 'comic-thought-bubble';
      case 'whisper':
        return 'comic-speech-bubble opacity-80 text-sm italic';
      default:
        return 'comic-speech-bubble';
    }
  };

  return (
    <AnimatePresence mode="wait">
      {(displayedText || isTyping) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className={`relative ${className}`}
        >
          {/* Speaker name tag */}
          {speakerName && type !== 'thought' && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="absolute -top-6 left-2 bg-comic-red text-white font-bangers text-sm px-3 py-1 border-2 border-black z-10"
              style={{ fontFamily: 'Bangers, cursive' }}
            >
              {speakerName}
            </motion.div>
          )}

          {/* Main bubble - fixed min-height to prevent layout shift during typing */}
          <div className={`${getBubbleStyle()} min-w-[200px] max-w-[350px] min-h-[60px]`}>
            {/* Shout bubble decoration */}
            {type === 'shout' && (
              <>
                <span className="absolute -top-3 -left-3 text-2xl">💥</span>
                <span className="absolute -bottom-3 -right-3 text-2xl">⚡</span>
              </>
            )}

            {/* Text content */}
            <p className="relative z-10">
              {displayedText}
              {isAnimating && (
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="inline-block w-2 h-5 bg-black ml-1 align-middle"
                />
              )}
            </p>

            {/* Singlish particles */}
            {type === 'shout' && text.toLowerCase().includes('lah') && (
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -right-8 -top-4 text-xl font-bangers text-red-500"
                style={{ fontFamily: 'Bangers, cursive', transform: 'rotate(15deg)' }}
              >
                LAH!
              </motion.span>
            )}
          </div>

          {/* Tail for regular speech bubble */}
          {type === 'speech' && (
            <div className={`absolute ${tailPositions[position]}`}>
              <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
                <path
                  d="M0 0 L24 0 L12 20 Z"
                  fill="#FFFEF2"
                  stroke="black"
                  strokeWidth="3"
                />
              </svg>
            </div>
          )}

          {/* Thought bubble dots */}
          {type === 'thought' && (
            <div className={`absolute ${tailPositions[position]} flex gap-1`}>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                className="w-4 h-4 rounded-full bg-white border-2 border-black"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                className="w-3 h-3 rounded-full bg-white border-2 border-black"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                className="w-2 h-2 rounded-full bg-white border-2 border-black"
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Fun thinking messages per NPC
const NPC_THINKING_MESSAGES: Record<string, string[]> = {
  'airport-auntie': [
    'Cleaning thoughts...',
    'Sweeping her mind...',
    'Mopping up ideas...',
    'Dusting off memories...',
    'Checking for rubbish...',
  ],
  'auntie-mei': [
    'Stirring her thoughts...',
    'Cooking up a response...',
    'Grabbing her ladle...',
    'Heating up the wok...',
    'Preparing to scold you...',
    'Counting your $50 debt...',
    'Sharpening her tongue...',
  ],
  'grab-uncle': [
    'Checking GPS...',
    'Calculating route...',
    'Adjusting rearview mirror...',
    'Thinking philosophically...',
    'Remembering old stories...',
    'Tuning the radio...',
  ],
  'ah-beng': [
    'Flexing brain muscles...',
    'Doing mental pushups...',
    'Remembering NS days...',
    'Striking a pose...',
    'Checking hair gel...',
    'Practicing cool moves...',
  ],
  'default': [
    'Thinking...',
    'Processing...',
    'Hmm...',
    'Let me think ah...',
    'Wait ah...',
  ],
};

// Thinking indicator component with fun rotating messages
export function ThinkingBubble({ speakerName, npcId }: { speakerName?: string; npcId?: string }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = NPC_THINKING_MESSAGES[npcId || 'default'] || NPC_THINKING_MESSAGES['default'];

  // Rotate messages every 1.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="comic-speech-bubble min-w-[180px] relative"
    >
      {speakerName && (
        <div
          className="absolute -top-6 left-2 bg-yellow-400 text-black font-bold text-sm px-3 py-1 border-2 border-black"
          style={{ fontFamily: 'Bangers, cursive' }}
        >
          {speakerName}
        </div>
      )}
      <div className="flex flex-col items-center justify-center py-2 px-3">
        {/* Fun message */}
        <motion.p
          key={messageIndex}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="text-sm text-gray-700 mb-2 text-center"
          style={{ fontFamily: 'Comic Neue, cursive', fontStyle: 'italic' }}
        >
          {messages[messageIndex]}
        </motion.p>
        {/* Bouncing dots */}
        <div className="flex gap-2 items-center justify-center">
          <motion.span
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            className="w-3 h-3 rounded-full bg-black"
          />
          <motion.span
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
            className="w-3 h-3 rounded-full bg-black"
          />
          <motion.span
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
            className="w-3 h-3 rounded-full bg-black"
          />
        </div>
      </div>
    </motion.div>
  );
}
