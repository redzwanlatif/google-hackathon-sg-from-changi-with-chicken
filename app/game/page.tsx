'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import { GameHUD } from '@/components/GameHUD';
import { NPCCard } from '@/components/NPCCard';
import { ChickenWidget } from '@/components/ChickenWidget';
import { TextInput } from '@/components/TextInput';
import { LOCATION_INFO } from '@/lib/game-state';
import { getNPCConfig, getNPCSystemPrompt } from '@/lib/npc-configs';

export default function GamePage() {
  const { state, startGame, updateChickenMood, travelTo, unlockMemory, triggerEnding } = useGame();
  const [showDebug, setShowDebug] = useState(false);
  const [showTravelMenu, setShowTravelMenu] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const [unlockNotification, setUnlockNotification] = useState<string | null>(null);

  // Get NPC config
  const npcConfig = state.currentNpc ? getNPCConfig(state.currentNpc) : null;
  const systemPrompt = state.currentNpc ? getNPCSystemPrompt(state.currentNpc) : '';

  // Gemini Live API
  const {
    status,
    isRecording,
    isSpeaking,
    transcript,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
  } = useGeminiLive({
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
    systemInstruction: systemPrompt,
    voice: npcConfig?.voice || 'Kore',
    onTranscript: (text) => {
      setCurrentTranscript(text);
      // Accumulate transcript for better keyword detection
      setAccumulatedTranscript(prev => {
        const newAccumulated = prev + ' ' + text;
        console.log('[GamePage] Accumulated transcript length:', newAccumulated.length);
        checkForMemoryUnlock(newAccumulated);
        return newAccumulated;
      });
    },
    onTurnComplete: () => {
      // Note: Audio might still be playing, don't reset state here
      // Reset accumulated transcript for next turn
      setAccumulatedTranscript('');
    },
  });

  // Start game on mount
  useEffect(() => {
    if (!state.gameStarted) {
      startGame();
    }
  }, [state.gameStarted, startGame]);

  // Connect to Gemini Live when NPC changes
  useEffect(() => {
    if (state.currentNpc && state.gameStarted && !state.gameOver) {
      console.log('[GamePage] Attempting to connect to Gemini Live for NPC:', state.currentNpc);
      connect();
      return () => {
        console.log('[GamePage] Disconnecting from Gemini Live');
        disconnect();
      };
    }
  }, [state.currentNpc, state.gameStarted, state.gameOver, connect, disconnect]);

  // Update transcript display
  useEffect(() => {
    if (transcript) {
      setCurrentTranscript(transcript);
    }
  }, [transcript]);

  // Use a ref to track unlocked memory IDs to prevent duplicates
  const unlockedMemoryIdsRef = useRef<Set<string>>(new Set());

  const checkForMemoryUnlock = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    const currentNpc = state.currentNpc;
    const unlockedIds = unlockedMemoryIdsRef.current;

    console.log('[Memory] Checking transcript:', lowerText.substring(0, 150));
    console.log('[Memory] Current NPC:', currentNpc, 'Already unlocked:', Array.from(unlockedIds));

    const showNotification = (text: string, location: string) => {
      setUnlockNotification(`🧠 ${text}\n🔓 ${location} unlocked!`);
      setTimeout(() => setUnlockNotification(null), 4000);
    };

    if (currentNpc === 'airport-auntie' && lowerText.includes('maxwell') && !unlockedIds.has('memory-1')) {
      console.log('[Memory] ✓ Unlocking memory-1: Maxwell!');
      unlockedIds.add('memory-1');
      unlockMemory({
        id: 'memory-1',
        text: 'Maxwell Food Centre... why does that feel important?',
        unlockedBy: 'airport-auntie',
        unlockedAt: Date.now(),
      });
      showNotification('Memory unlocked: Maxwell Food Centre', 'Maxwell Food Centre');
    }

    if (currentNpc === 'auntie-mei' && lowerText.includes('marcus') && !unlockedIds.has('memory-2')) {
      console.log('[Memory] ✓ Unlocking memory-2: Marcus!');
      unlockedIds.add('memory-2');
      unlockMemory({
        id: 'memory-2',
        text: 'Marcus... that name hits different. He\'s getting married today!',
        unlockedBy: 'auntie-mei',
        unlockedAt: Date.now(),
      });
      showNotification('Memory unlocked: Marcus is getting married!', 'CBD / Raffles Place');
    }

    if (currentNpc === 'grab-uncle' && lowerText.includes('mbs') && !unlockedIds.has('memory-3')) {
      console.log('[Memory] ✓ Unlocking memory-3: MBS!');
      unlockedIds.add('memory-3');
      unlockMemory({
        id: 'memory-3',
        text: 'MBS - Marina Bay Sands. The wedding venue!',
        unlockedBy: 'grab-uncle',
        unlockedAt: Date.now(),
      });
      showNotification('Memory unlocked: MBS is the venue!', 'East Coast Park');
    }

    if (currentNpc === 'ah-beng' && lowerText.includes('best man') && !unlockedIds.has('memory-4')) {
      console.log('[Memory] ✓ Unlocking memory-4: Best Man!');
      unlockedIds.add('memory-4');
      unlockMemory({
        id: 'memory-4',
        text: 'I\'m the BEST MAN! Marcus trusted me with everything!',
        unlockedBy: 'ah-beng',
        unlockedAt: Date.now(),
      });
      showNotification('Memory unlocked: You\'re the BEST MAN!', 'Marina Bay Sands');
    }
  }, [state.currentNpc, unlockMemory]);

  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  // Watch isSpeaking to enable button after audio finishes
  useEffect(() => {
    if (!isSpeaking && isWaitingForResponse) {
      console.log('[GamePage] Audio finished, enabling button');
      setIsWaitingForResponse(false);
    }
  }, [isSpeaking, isWaitingForResponse]);

  const handleMicClick = async () => {
    if (status !== 'connected') {
      await connect();
      return;
    }

    if (isRecording) {
      // Stop recording and wait for AI response
      stopRecording();
      setIsWaitingForResponse(true);
      updateChickenMood(1);
    } else if (!isWaitingForResponse) {
      // Start recording
      await startRecording();
    }
  };

  const handleTravel = (location: typeof state.location) => {
    if (travelTo(location)) {
      setShowTravelMenu(false);
      setCurrentTranscript('');
      setAccumulatedTranscript('');
      setIsWaitingForResponse(false);
      disconnect();
    }
  };

  // Game over screen
  if (state.gameOver) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/70 backdrop-blur-lg rounded-2xl p-8 text-center max-w-md"
        >
          <div className="text-6xl mb-4">
            {state.ending === 'perfect' && '🏆'}
            {state.ending === 'good' && '🎉'}
            {state.ending === 'okay' && '😅'}
            {state.ending === 'timeout' && '⏰'}
            {state.ending === 'chicken-lost' && '🐔💨'}
            {state.ending === 'broke' && '💸'}
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {state.ending === 'perfect' && 'Perfect Ending!'}
            {state.ending === 'good' && 'Good Ending!'}
            {state.ending === 'okay' && 'You Made It!'}
            {state.ending === 'timeout' && 'Time\'s Up!'}
            {state.ending === 'chicken-lost' && 'The Chicken Escaped!'}
            {state.ending === 'broke' && 'Out of Money!'}
          </h2>
          <p className="text-gray-300 mb-6">
            {state.ending === 'perfect' && 'The chicken delivered, memories restored, wedding saved!'}
            {state.ending === 'good' && 'You made it just in time with the chicken!'}
            {state.ending === 'okay' && 'Close call, but the blessing happened!'}
            {state.ending === 'timeout' && 'The ceremony started without the blessing...'}
            {state.ending === 'chicken-lost' && 'The ceremonial chicken is now a free-range chicken.'}
            {state.ending === 'broke' && 'Stranded with no money. The chicken judges you.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-bold"
          >
            Play Again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 max-w-2xl mx-auto">
      {/* HUD */}
      <div className="mb-4">
        <GameHUD />
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* NPC Card */}
        {state.currentNpc && (
          <NPCCard
            npcId={state.currentNpc}
            transcript={currentTranscript}
            isThinking={isRecording}
          />
        )}

        {/* Connection Status */}
        <div className={`text-sm px-3 py-1 rounded-full ${
          status === 'connected' ? 'bg-green-500/20 text-green-300' :
          status === 'connecting' ? 'bg-yellow-500/20 text-yellow-300' :
          'bg-red-500/20 text-red-300'
        }`}>
          {status === 'connected' ? '🟢 Voice Ready' :
           status === 'connecting' ? '🟡 Connecting...' :
           '🔴 Disconnected'}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm max-w-md text-center">
            {error}
            <button
              onClick={connect}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Chicken Widget */}
      <div className="fixed bottom-40 right-4 z-40">
        <ChickenWidget onChickenClick={() => updateChickenMood(3)} />
      </div>

      {/* Voice Input Area */}
      <div className="mt-auto space-y-4 pb-4">
        {/* Big Voice Button */}
        <div className="flex justify-center">
          <motion.button
            className={`
              w-32 h-32 rounded-full text-white font-bold
              flex flex-col items-center justify-center
              transition-all duration-200 shadow-2xl
              ${isRecording
                ? 'bg-red-500 scale-110 voice-recording'
                : isWaitingForResponse || isSpeaking
                  ? 'bg-purple-500 cursor-not-allowed'
                  : status === 'connected'
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-gray-500'
              }
            `}
            whileTap={{ scale: 0.95 }}
            onClick={handleMicClick}
            disabled={status === 'connecting' || isWaitingForResponse || isSpeaking}
          >
            <span className="text-5xl mb-2">
              {isRecording ? '⏹️' :
               isWaitingForResponse || isSpeaking ? '🔊' :
               '🎤'}
            </span>
            <span className="text-sm text-center">
              {isRecording ? 'Tap to Send' :
               isSpeaking ? 'Speaking...' :
               isWaitingForResponse ? 'Thinking...' :
               status === 'connected' ? 'Tap to Talk' :
               status === 'connecting' ? 'Connecting...' :
               'Tap to Connect'}
            </span>
          </motion.button>
        </div>

        {/* Instructions */}
        <p className="text-center text-gray-400 text-sm">
          Tap to start talking, tap again to send. Try speaking Singlish!
        </p>

        {/* Travel Button */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowTravelMenu(true)}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm"
          >
            🗺️ Travel to another location
          </button>
        </div>
      </div>

      {/* Travel Menu */}
      <AnimatePresence>
        {showTravelMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
            onClick={() => setShowTravelMenu(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-gray-800 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">🗺️ Travel To</h3>
              <div className="space-y-2">
                {Object.entries(LOCATION_INFO).map(([key, info]) => {
                  const locationKey = key as typeof state.location;
                  const isCurrentLocation = state.location === locationKey;
                  const isUnlocked = state.unlockedLocations.includes(locationKey);
                  const canAfford = state.money >= info.travelCost;
                  const canTravel = isUnlocked && canAfford && !isCurrentLocation;

                  return (
                    <button
                      key={key}
                      onClick={() => canTravel && handleTravel(locationKey)}
                      disabled={!canTravel}
                      className={`
                        w-full p-3 rounded-lg text-left transition-colors
                        ${isCurrentLocation
                          ? 'bg-blue-500/30 text-blue-300'
                          : !isUnlocked
                            ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                            : canAfford
                              ? 'bg-white/10 hover:bg-white/20 text-white'
                              : 'bg-white/5 text-gray-500 cursor-not-allowed'
                        }
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {!isUnlocked && <span>🔒</span>}
                            {info.name}
                          </div>
                          <div className="text-sm opacity-70">
                            {!isUnlocked
                              ? 'Talk to current NPC to unlock'
                              : info.description}
                          </div>
                        </div>
                        <div className="text-right">
                          {isCurrentLocation ? (
                            <span className="text-xs">📍 Here</span>
                          ) : !isUnlocked ? (
                            <span className="text-xs text-gray-500">Locked</span>
                          ) : (
                            <>
                              <div className="text-sm">${info.travelCost}</div>
                              <div className="text-xs opacity-70">{Math.floor(info.travelTime / 60)}min</div>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowTravelMenu(false)}
                className="mt-4 w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unlock Notification */}
      <AnimatePresence>
        {unlockNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4 rounded-xl shadow-2xl text-center whitespace-pre-line"
          >
            <div className="text-lg font-bold">{unlockNotification}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug Panel Toggle */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed top-4 right-4 z-50 bg-purple-500/50 hover:bg-purple-500 text-white text-xs px-2 py-1 rounded"
      >
        {showDebug ? 'Hide Debug' : 'Debug'}
      </button>

      {/* Debug Panel */}
      {showDebug && (
        <div className="fixed top-12 right-4 z-50 bg-black/90 text-white text-xs p-4 rounded-lg max-w-xs max-h-96 overflow-y-auto">
          <h3 className="font-bold mb-2 text-yellow-400">Game State Debug</h3>

          <div className="space-y-1 mb-3">
            <div>Time: {state.timeRemaining}s</div>
            <div>Money: ${state.money}</div>
            <div>Battery: {state.battery.toFixed(2)}%</div>
            <div>Chicken Mood: {state.chickenMood}/100</div>
            <div>Location: {state.location}</div>
            <div>NPC: {state.currentNpc || 'none'}</div>
            <div>Memories: {state.memories.length}/10</div>
            <div className="text-gray-400">
              {state.memories.map(m => m.id).join(', ') || 'none'}
            </div>
            <div>Unlocked: {state.unlockedLocations.join(', ')}</div>
          </div>

          <h4 className="font-bold mb-1 text-yellow-400">Test Actions</h4>
          <div className="flex flex-wrap gap-1 mb-3">
            <button
              onClick={() => updateChickenMood(10)}
              className="bg-green-600 px-2 py-1 rounded"
            >
              Mood +10
            </button>
            <button
              onClick={() => updateChickenMood(-10)}
              className="bg-red-600 px-2 py-1 rounded"
            >
              Mood -10
            </button>
            <button
              onClick={() => updateChickenMood(-state.chickenMood)}
              className="bg-red-800 px-2 py-1 rounded"
            >
              Kill Chicken
            </button>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            <button
              onClick={() => unlockMemory({
                id: `test-${Date.now()}`,
                text: 'Test memory',
                unlockedBy: 'airport-auntie',
                unlockedAt: Date.now(),
              })}
              className="bg-blue-600 px-2 py-1 rounded"
            >
              Add Memory
            </button>
            <button
              onClick={() => triggerEnding('perfect')}
              className="bg-yellow-600 px-2 py-1 rounded"
            >
              Win Game
            </button>
          </div>

          <h4 className="font-bold mb-1 text-yellow-400">Simulate AI Text</h4>
          <div className="flex flex-wrap gap-1 mb-3">
            <button
              onClick={() => {
                const testText = 'Aiyoh, you better go Maxwell Food Centre lah!';
                console.log('[Debug] Simulating AI text:', testText);
                setCurrentTranscript(testText);
                checkForMemoryUnlock(testText);
              }}
              className="bg-purple-600 px-2 py-1 rounded"
            >
              Say "Maxwell"
            </button>
            <button
              onClick={() => {
                const testText = 'You kept saying Marcus name last night!';
                console.log('[Debug] Simulating AI text:', testText);
                setCurrentTranscript(testText);
                checkForMemoryUnlock(testText);
              }}
              className="bg-purple-600 px-2 py-1 rounded"
            >
              Say "Marcus"
            </button>
            <button
              onClick={() => {
                const testText = 'The wedding at MBS right?';
                console.log('[Debug] Simulating AI text:', testText);
                setCurrentTranscript(testText);
                checkForMemoryUnlock(testText);
              }}
              className="bg-purple-600 px-2 py-1 rounded"
            >
              Say "MBS"
            </button>
            <button
              onClick={() => {
                const testText = 'You are the best man bro!';
                console.log('[Debug] Simulating AI text:', testText);
                setCurrentTranscript(testText);
                checkForMemoryUnlock(testText);
              }}
              className="bg-purple-600 px-2 py-1 rounded"
            >
              Say "Best Man"
            </button>
          </div>

          <h4 className="font-bold mb-1 text-yellow-400">Last Transcript</h4>
          <div className="bg-black/50 p-2 rounded text-gray-300 max-h-20 overflow-y-auto">
            {currentTranscript || 'No transcript yet'}
          </div>
        </div>
      )}
    </div>
  );
}
