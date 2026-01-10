'use client';

import { useGame } from '@/contexts/GameContext';
import { formatTime, getChickenMoodLabel, LOCATION_INFO } from '@/lib/game-state';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// Item icons mapping
const ITEM_ICONS = {
  money: '/assets/items/money.png',
  phone: '/assets/items/phone.png',
  ring: '/assets/items/ring.png',
};

export function GameHUD() {
  const { state } = useGame();

  const isTimeCritical = state.timeRemaining < 600; // Less than 10 minutes
  const isTimeWarning = state.timeRemaining < 1800; // Less than 30 minutes
  const isBatteryLow = state.battery < 10;
  const isChickenUpset = state.chickenMood < 30;

  const chickenMoodLabel = getChickenMoodLabel(state.chickenMood);

  return (
    <div className="space-y-3">
      {/* Top Row: Timer and Location */}
      <div className="flex gap-3">
        {/* Timer - Comic Style */}
        <motion.div
          className={`
            flex-1 relative overflow-hidden
            border-4 border-black
            ${isTimeCritical
              ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-[4px_4px_0px_#7f1d1d]'
              : isTimeWarning
                ? 'bg-gradient-to-r from-orange-400 to-yellow-400 shadow-[4px_4px_0px_#c2410c]'
                : 'bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[4px_4px_0px_#1e40af]'
            }
          `}
          animate={isTimeCritical ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.5, repeat: isTimeCritical ? Infinity : 0 }}
        >
          {/* Header bar */}
          <div className="bg-black/30 px-3 py-1 border-b-2 border-black">
            <span
              className="text-white text-xs font-bold tracking-wider"
              style={{ fontFamily: 'Bangers, cursive' }}
            >
              TIME REMAINING
            </span>
          </div>

          {/* Timer value */}
          <div className="px-3 py-2 flex items-center gap-2">
            <span className="text-2xl">⏱️</span>
            <span
              className={`text-3xl font-bold ${isTimeCritical ? 'text-white animate-pulse' : 'text-white'}`}
              style={{ fontFamily: 'Bangers, cursive', letterSpacing: '2px' }}
            >
              {formatTime(state.timeRemaining)}
            </span>
          </div>

          {/* Speed lines overlay for urgency */}
          {isTimeCritical && (
            <div className="absolute inset-0 speed-lines opacity-30 pointer-events-none" />
          )}

          {/* Ben-Day dots */}
          <div className="absolute inset-0 benday-dots-light pointer-events-none" />
        </motion.div>

        {/* Location Badge */}
        <div
          className="relative bg-[#FFE135] border-4 border-black shadow-[4px_4px_0px_#1a1a1a] px-4 flex items-center"
        >
          <div className="text-center">
            <div className="text-2xl">📍</div>
            <div
              className="text-xs font-bold text-black leading-tight max-w-[80px]"
              style={{ fontFamily: 'Bangers, cursive' }}
            >
              {LOCATION_INFO[state.location].name.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Resource Row */}
      <div className="flex gap-2">
        {/* Money Box */}
        <motion.div
          className="flex-1 comic-hud-box"
          whileHover={{ scale: 1.02 }}
        >
          <div className="absolute top-0 left-0 right-0 h-6 bg-green-500 border-b-2 border-black flex items-center px-2">
            <span
              className="text-white text-xs font-bold"
              style={{ fontFamily: 'Bangers, cursive' }}
            >
              CASH
            </span>
          </div>
          <div className="pt-8 pb-2 px-3 flex items-center gap-2">
            <div className="relative w-8 h-8">
              <Image
                src={ITEM_ICONS.money}
                alt="Money"
                fill
                className="object-contain"
              />
            </div>
            <span
              className="text-2xl font-bold text-black"
              style={{ fontFamily: 'Bangers, cursive' }}
            >
              ${state.money.toFixed(0)}
            </span>
          </div>
        </motion.div>

        {/* Battery Box */}
        <motion.div
          className={`flex-1 comic-hud-box ${isBatteryLow ? 'animate-pulse' : ''}`}
          whileHover={{ scale: 1.02 }}
        >
          <div
            className={`absolute top-0 left-0 right-0 h-6 ${isBatteryLow ? 'bg-red-500' : 'bg-blue-500'} border-b-2 border-black flex items-center px-2`}
          >
            <span
              className="text-white text-xs font-bold"
              style={{ fontFamily: 'Bangers, cursive' }}
            >
              BATTERY
            </span>
          </div>
          <div className="pt-8 pb-2 px-3 flex items-center gap-2">
            <div className="relative w-8 h-8">
              <Image
                src={ITEM_ICONS.phone}
                alt="Phone"
                fill
                className="object-contain"
              />
            </div>
            <span
              className={`text-2xl font-bold ${isBatteryLow ? 'text-red-600' : 'text-black'}`}
              style={{ fontFamily: 'Bangers, cursive' }}
            >
              {Math.floor(state.battery)}%
            </span>
          </div>

          {/* Battery bar */}
          <div className="mx-3 mb-2 h-2 bg-gray-300 rounded-sm border border-black overflow-hidden">
            <motion.div
              className={`h-full ${isBatteryLow ? 'bg-red-500' : 'bg-green-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${state.battery}%` }}
            />
          </div>
        </motion.div>

        {/* Chicken Status Box */}
        <motion.div
          className={`flex-1 comic-hud-box ${isChickenUpset ? 'animate-pulse' : ''}`}
          whileHover={{ scale: 1.02 }}
        >
          <div
            className={`absolute top-0 left-0 right-0 h-6 border-b-2 border-black flex items-center px-2 ${
              chickenMoodLabel === 'happy' ? 'bg-green-500' :
              chickenMoodLabel === 'neutral' ? 'bg-yellow-500' :
              chickenMoodLabel === 'upset' ? 'bg-orange-500' :
              'bg-red-500'
            }`}
          >
            <span
              className="text-white text-xs font-bold"
              style={{ fontFamily: 'Bangers, cursive' }}
            >
              CHICKEN
            </span>
          </div>
          <div className="pt-8 pb-2 px-3 flex items-center gap-2">
            <span className="text-2xl">
              {chickenMoodLabel === 'happy' && '😊'}
              {chickenMoodLabel === 'neutral' && '😐'}
              {chickenMoodLabel === 'upset' && '😤'}
              {chickenMoodLabel === 'furious' && '🔥'}
            </span>
            <span
              className={`text-lg font-bold uppercase ${isChickenUpset ? 'text-red-600' : 'text-black'}`}
              style={{ fontFamily: 'Bangers, cursive' }}
            >
              {chickenMoodLabel}
            </span>
          </div>

          {/* Mood bar */}
          <div className="mx-3 mb-2 h-2 bg-gray-300 rounded-sm border border-black overflow-hidden">
            <motion.div
              className={`h-full ${
                chickenMoodLabel === 'happy' ? 'bg-green-500' :
                chickenMoodLabel === 'neutral' ? 'bg-yellow-500' :
                chickenMoodLabel === 'upset' ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${state.chickenMood}%` }}
            />
          </div>
        </motion.div>
      </div>

      {/* Memory Progress - Comic Style */}
      <div className="comic-hud-box">
        <div className="absolute top-0 left-0 right-0 h-6 bg-purple-600 border-b-2 border-black flex items-center justify-between px-2">
          <span
            className="text-white text-xs font-bold"
            style={{ fontFamily: 'Bangers, cursive' }}
          >
            MEMORIES RECOVERED
          </span>
          <span
            className="text-white text-xs font-bold"
            style={{ fontFamily: 'Bangers, cursive' }}
          >
            {state.memories.length}/10
          </span>
        </div>
        <div className="pt-8 pb-3 px-3">
          <div className="flex gap-1 justify-center">
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={i}
                className={`
                  w-6 h-6 rounded border-2 border-black
                  flex items-center justify-center
                  ${i < state.memories.length
                    ? 'bg-gradient-to-br from-purple-400 to-pink-500 shadow-[2px_2px_0px_#1a1a1a]'
                    : 'bg-gray-300'
                  }
                `}
                initial={i < state.memories.length ? { scale: 0, rotate: -180 } : {}}
                animate={i < state.memories.length ? { scale: 1, rotate: 0 } : {}}
                transition={{ type: 'spring', damping: 10 }}
              >
                {i < state.memories.length ? (
                  <span className="text-xs">🧠</span>
                ) : (
                  <span className="text-xs text-gray-500">?</span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Memory hint */}
          {state.memories.length < 4 && (
            <motion.div
              className="mt-2 text-center text-xs text-gray-600"
              style={{ fontFamily: 'Comic Neue, cursive' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Talk to NPCs to recover your memories!
            </motion.div>
          )}
        </div>
      </div>

      {/* Critical Warning Overlay */}
      <AnimatePresence>
        {(isTimeCritical || isChickenUpset) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`
              absolute -top-2 left-1/2 -translate-x-1/2
              px-4 py-1 border-3 border-black rounded
              ${isChickenUpset ? 'bg-orange-500' : 'bg-red-500'}
            `}
            style={{ fontFamily: 'Bangers, cursive' }}
          >
            <motion.span
              className="text-white text-sm"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              {isChickenUpset ? '⚠️ CHICKEN UPSET!' : '⏰ HURRY UP!'}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
