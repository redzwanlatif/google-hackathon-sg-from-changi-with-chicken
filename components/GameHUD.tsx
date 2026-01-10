'use client';

import { useGame } from '@/contexts/GameContext';
import { formatTime, getChickenMoodLabel, LOCATION_INFO } from '@/lib/game-state';
import { motion } from 'framer-motion';

export function GameHUD() {
  const { state } = useGame();

  const isTimeCritical = state.timeRemaining < 600; // Less than 10 minutes
  const isBatteryLow = state.battery < 10;
  const isChickenUpset = state.chickenMood < 30;

  const chickenMoodLabel = getChickenMoodLabel(state.chickenMood);
  const chickenEmoji = {
    happy: '😊',
    neutral: '😐',
    upset: '😟',
    furious: '😠',
  }[chickenMoodLabel];

  return (
    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
      {/* Timer */}
      <div className={`flex items-center gap-2 mb-3 ${isTimeCritical ? 'timer-urgent' : ''}`}>
        <span className="text-2xl">⏱️</span>
        <div className="flex-1">
          <div className="text-xs text-gray-400">TIME REMAINING</div>
          <div className={`text-2xl font-mono font-bold ${isTimeCritical ? 'text-red-500' : 'text-white'}`}>
            {formatTime(state.timeRemaining)}
          </div>
        </div>
      </div>

      {/* Resources Row */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Money */}
        <div className="bg-white/10 rounded p-2">
          <div className="flex items-center gap-1">
            <span>💰</span>
            <span className="text-sm font-bold">${state.money.toFixed(2)}</span>
          </div>
          <div className="text-xs text-gray-400">Money</div>
        </div>

        {/* Battery */}
        <div className={`bg-white/10 rounded p-2 ${isBatteryLow ? 'animate-pulse' : ''}`}>
          <div className="flex items-center gap-1">
            <span>{isBatteryLow ? '🪫' : '📱'}</span>
            <span className={`text-sm font-bold ${isBatteryLow ? 'text-red-400' : ''}`}>
              {Math.floor(state.battery)}%
            </span>
          </div>
          <div className="text-xs text-gray-400">Battery</div>
        </div>

        {/* Chicken Mood */}
        <div className={`bg-white/10 rounded p-2 ${isChickenUpset ? 'animate-pulse' : ''}`}>
          <div className="flex items-center gap-1">
            <span>{chickenEmoji}</span>
            <span className={`text-sm font-bold ${isChickenUpset ? 'text-red-400' : ''}`}>
              {chickenMoodLabel}
            </span>
          </div>
          <div className="text-xs text-gray-400">Chicken</div>
        </div>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 bg-white/10 rounded p-2 mb-3">
        <span className="text-xl">📍</span>
        <div>
          <div className="text-sm font-bold">{LOCATION_INFO[state.location].name}</div>
          <div className="text-xs text-gray-400">{LOCATION_INFO[state.location].description}</div>
        </div>
      </div>

      {/* Memories */}
      <div className="flex items-center gap-2">
        <span>🧠</span>
        <div className="flex-1">
          <div className="text-xs text-gray-400">MEMORIES</div>
          <div className="flex gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={i}
                className={`w-3 h-3 rounded-sm ${
                  i < state.memories.length
                    ? 'bg-yellow-400'
                    : 'bg-gray-600'
                }`}
                initial={i < state.memories.length ? { scale: 0 } : {}}
                animate={i < state.memories.length ? { scale: 1 } : {}}
              />
            ))}
          </div>
        </div>
        <span className="text-sm font-bold">{state.memories.length}/10</span>
      </div>
    </div>
  );
}
