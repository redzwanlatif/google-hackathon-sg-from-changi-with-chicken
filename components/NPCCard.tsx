'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NPCId } from '@/lib/game-state';
import { getNPCConfig } from '@/lib/npc-configs';
import Image from 'next/image';
import { ComicSpeechBubble, ThinkingBubble } from './ComicSpeechBubble';
import { soundManager } from '@/lib/sound-manager';

// NPC emotion types
type NPCEmotion = 'default' | 'happy' | 'angry' | 'shocked' | 'talking' | 'funny';

// Character portrait assets mapping
const NPC_PORTRAITS: Record<NPCId, Partial<Record<NPCEmotion, string>>> = {
  'airport-auntie': {
    default: '/assets/characters/cleaner.png',
    talking: '/assets/characters/cleaner.png',
  },
  'auntie-mei': {
    default: '/assets/characters/auntie_mei_default.png',
    angry: '/assets/characters/auntie_mei_angry.png',
    happy: '/assets/characters/auntie_mei_happy.png',
    talking: '/assets/characters/auntie_mei_default.png',
  },
  'grab-uncle': {
    default: '/assets/characters/muthu_deafult.png',
    shocked: '/assets/characters/muthu_shocked.png',
    talking: '/assets/characters/muthu_talking.png',
    happy: '/assets/characters/grab_uncle_1.png',
  },
  'ah-beng': {
    default: '/assets/characters/nsman_default.png',
    funny: '/assets/characters/nsman_funnyface.png',
    happy: '/assets/characters/nsman_happy.png',
  },
  'jessica': {
    default: '/assets/characters/jesicca_shouting.png',
    angry: '/assets/characters/jesicca_shouting.png',
    shocked: '/assets/characters/jesicca_shocked.png',
    happy: '/assets/characters/jesicca_relieved.png',
  },
  'security-guard': {
    default: '/assets/characters/guard.png',
  },
  'marcus': {
    default: '/assets/characters/marcus.png',
    happy: '/assets/characters/marcus.png',
  },
};

// Detect emotion from transcript text
function detectEmotionFromText(text: string): NPCEmotion {
  const lowerText = text.toLowerCase();

  // Angry indicators
  if (
    lowerText.includes('aiyoh') ||
    lowerText.includes('wah lao') ||
    lowerText.includes('!') && lowerText.includes('?') ||
    lowerText.includes('angry') ||
    lowerText.includes('$50') ||
    lowerText.includes('owe')
  ) {
    return 'angry';
  }

  // Shocked indicators
  if (
    lowerText.includes('alamak') ||
    lowerText.includes('siao') ||
    lowerText.includes('what') ||
    lowerText.includes('!!')
  ) {
    return 'shocked';
  }

  // Happy indicators
  if (
    lowerText.includes('shiok') ||
    lowerText.includes('can lah') ||
    lowerText.includes('nice') ||
    lowerText.includes('good') ||
    lowerText.includes('best man') ||
    lowerText.includes('remember')
  ) {
    return 'happy';
  }

  // Funny/playful indicators
  if (
    lowerText.includes('haha') ||
    lowerText.includes('bro') ||
    lowerText.includes('funny')
  ) {
    return 'funny';
  }

  // Default to talking if there's text
  if (text.length > 0) {
    return 'talking';
  }

  return 'default';
}

interface NPCCardProps {
  npcId: NPCId;
  transcript: string;
  isThinking: boolean;
  onPortraitClick?: () => void;
}

export function NPCCard({ npcId, transcript, isThinking, onPortraitClick }: NPCCardProps) {
  const npcConfig = getNPCConfig(npcId);
  const [currentEmotion, setCurrentEmotion] = useState<NPCEmotion>('default');
  const [showPortraitPop, setShowPortraitPop] = useState(false);

  // Detect emotion from transcript
  useEffect(() => {
    if (transcript) {
      const emotion = detectEmotionFromText(transcript);
      setCurrentEmotion(emotion);

      // Pop effect on emotion change
      setShowPortraitPop(true);
      setTimeout(() => setShowPortraitPop(false), 300);
    } else {
      setCurrentEmotion('default');
    }
  }, [transcript]);

  // Get current portrait based on emotion
  const currentPortrait = useMemo(() => {
    const portraits = NPC_PORTRAITS[npcId];
    return portraits[currentEmotion] || portraits.default || portraits.talking;
  }, [npcId, currentEmotion]);

  // Portrait frame color based on emotion
  const emotionFrameColor = {
    default: 'from-yellow-400 to-orange-400',
    happy: 'from-green-400 to-emerald-400',
    angry: 'from-red-500 to-red-600',
    shocked: 'from-purple-400 to-pink-400',
    talking: 'from-blue-400 to-cyan-400',
    funny: 'from-pink-400 to-yellow-400',
  }[currentEmotion];

  // Portrait effect class
  const emotionEffectClass = {
    default: '',
    happy: 'portrait-happy',
    angry: 'portrait-angry',
    shocked: 'portrait-shocked',
    talking: '',
    funny: 'portrait-happy',
  }[currentEmotion];

  // Determine speech bubble type
  const bubbleType = currentEmotion === 'angry' || currentEmotion === 'shocked'
    ? 'shout'
    : 'speech';

  return (
    <div className="flex flex-col items-center gap-6">
      {/* NPC Portrait - Comic Style */}
      <motion.div
        className={`
          relative w-56 h-56 cursor-pointer
          comic-portrait rounded-lg overflow-hidden
          bg-gradient-to-br ${emotionFrameColor}
          ${emotionEffectClass}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onPortraitClick}
        animate={showPortraitPop ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {/* Portrait image */}
        {currentPortrait ? (
          <Image
            src={currentPortrait}
            alt={npcConfig.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          // Fallback emoji
          <div className="absolute inset-0 flex items-center justify-center text-6xl bg-gray-200">
            {npcId === 'airport-auntie' && '🧹'}
            {npcId === 'auntie-mei' && '🍜'}
            {npcId === 'grab-uncle' && '🚗'}
            {npcId === 'ah-beng' && '💪'}
            {npcId === 'jessica' && '📱'}
            {npcId === 'security-guard' && '🛡️'}
            {npcId === 'marcus' && '🤵'}
          </div>
        )}

        {/* Comic frame overlay */}
        <div className="absolute inset-0 pointer-events-none comic-portrait-frame" />

        {/* Emotion indicator badge */}
        <AnimatePresence>
          {currentEmotion !== 'default' && currentEmotion !== 'talking' && (
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 30 }}
              className="absolute -top-2 -right-2 w-10 h-10 bg-white border-3 border-black rounded-full flex items-center justify-center text-xl shadow-lg z-10"
            >
              {currentEmotion === 'happy' && '😊'}
              {currentEmotion === 'angry' && '😠'}
              {currentEmotion === 'shocked' && '😱'}
              {currentEmotion === 'funny' && '🤪'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thinking indicator */}
        <AnimatePresence>
          {isThinking && !transcript && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute -bottom-2 -right-2 bg-yellow-400 rounded-full p-2 border-2 border-black"
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="text-xl block"
              >
                💭
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speed lines for angry emotion */}
        {currentEmotion === 'angry' && (
          <div className="absolute inset-0 impact-lines pointer-events-none opacity-30" />
        )}
      </motion.div>

      {/* NPC Name Banner */}
      <motion.div
        className="relative px-8 py-3 bg-[#E23636] text-white border-3 border-black shadow-[4px_4px_0px_#1a1a1a] text-xl"
        style={{ fontFamily: 'Bangers, cursive', letterSpacing: '1px' }}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {npcConfig.name.toUpperCase()}
        {/* Decorative corners */}
        <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 border-2 border-black" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 border-2 border-black" />
      </motion.div>

      {/* Speech Bubble */}
      <AnimatePresence mode="wait">
        {isThinking && !transcript ? (
          <ThinkingBubble key="thinking" />
        ) : transcript ? (
          <ComicSpeechBubble
            key="speech"
            text={transcript}
            type={bubbleType}
            speakerName={npcConfig.name.split(' ')[0]}
            position="top"
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
