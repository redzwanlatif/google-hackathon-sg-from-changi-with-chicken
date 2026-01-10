'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { useBrowserVoiceChat } from '@/hooks/useBrowserVoiceChat';
import { GameHUD } from '@/components/GameHUD';
import { NPCCard } from '@/components/NPCCard';
import { ChickenWidget } from '@/components/ChickenWidget';
import { TextInput } from '@/components/TextInput';
import { LOCATION_INFO } from '@/lib/game-state';
import { getNPCConfig, getNPCSystemPrompt, getNPCPersona } from '@/lib/npc-configs';

export default function GamePage() {
  const { state, startGame, updateChickenMood, travelTo, unlockMemory, triggerEnding } = useGame();
  const [showDebug, setShowDebug] = useState(false);
  const [showTravelMenu, setShowTravelMenu] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [unlockNotification, setUnlockNotification] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');

  // Get NPC config
  const npcConfig = state.currentNpc ? getNPCConfig(state.currentNpc) : null;
  const systemPrompt = state.currentNpc ? getNPCSystemPrompt(state.currentNpc) : '';

  // Get NPC voice and persona for Singlish accent
  const npcVoice = npcConfig?.voice || 'Kore';
  const npcPersona = state.currentNpc ? getNPCPersona(state.currentNpc) : 'auntie';

  // Browser Voice Chat (Speech Recognition + Gemini Text API + Gemini TTS with Singlish accent)
  const {
    status,
    userTranscript,
    aiTranscript,
    error,
    startListening,
    stopListening,
    stopSpeaking,
    sendText,
    resetConversation,
  } = useBrowserVoiceChat({
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
    systemInstruction: systemPrompt,
    voice: npcVoice,
    persona: npcPersona,
    onTranscript: (text) => {
      setCurrentTranscript(text);
      console.log('[GamePage] AI transcript received:', text.substring(0, 100));
      checkForMemoryUnlock(text);
    },
  });

  // Start game on mount
  useEffect(() => {
    if (!state.gameStarted) {
      startGame();
    }
  }, [state.gameStarted, startGame]);

  // Reset conversation when NPC changes
  useEffect(() => {
    if (state.currentNpc && state.gameStarted && !state.gameOver) {
      console.log('[GamePage] NPC changed to:', state.currentNpc);
      resetConversation();
      setCurrentTranscript('');
    }
  }, [state.currentNpc, state.gameStarted, state.gameOver, resetConversation]);

  // Use a ref to track unlocked memory IDs to prevent duplicates
  const unlockedMemoryIdsRef = useRef<Set<string>>(new Set());

  // Track quest completion
  const questCompleteRef = useRef<Set<string>>(new Set());

  const checkForMemoryUnlock = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    const currentNpc = state.currentNpc;
    const unlockedIds = unlockedMemoryIdsRef.current;
    const quests = questCompleteRef.current;

    console.log('[Memory] Checking transcript:', lowerText.substring(0, 150));
    console.log('[Memory] Current NPC:', currentNpc, 'Quests done:', Array.from(quests));

    const showNotification = (text: string, location: string) => {
      setUnlockNotification(`🧠 ${text}\n🔓 ${location} unlocked!`);
      setTimeout(() => setUnlockNotification(null), 4000);
    };

    // Memory 1: Airport Auntie mentions Maxwell (no quest needed - tutorial)
    if (currentNpc === 'airport-auntie' && !unlockedIds.has('memory-1')) {
      if (lowerText.includes('maxwell') || lowerText.includes('food centre') || lowerText.includes('hawker')) {
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
    }

    // Quest: Auntie Mei - Pay $50 or promise to help
    if (currentNpc === 'auntie-mei' && !quests.has('auntie-mei-quest')) {
      if (lowerText.includes('pay') || lowerText.includes('here') || lowerText.includes('fifty') ||
          lowerText.includes('$50') || lowerText.includes('sorry') || lowerText.includes('help you') ||
          lowerText.includes('favor') || lowerText.includes('okay lah') || lowerText.includes('fine')) {
        console.log('[Quest] ✓ Auntie Mei quest complete!');
        quests.add('auntie-mei-quest');
      }
    }

    // Memory 2: Auntie Mei mentions Marcus (AFTER quest done)
    if (currentNpc === 'auntie-mei' && quests.has('auntie-mei-quest') && !unlockedIds.has('memory-2')) {
      if (lowerText.includes('marcus') || lowerText.includes('wedding') || lowerText.includes('groom') ||
          lowerText.includes('friend') || lowerText.includes('last night')) {
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
    }

    // Quest: Grab Uncle - Give 5 star review
    if (currentNpc === 'grab-uncle' && !quests.has('grab-uncle-quest')) {
      if (lowerText.includes('5 star') || lowerText.includes('five star') || lowerText.includes('review') ||
          lowerText.includes('rating') || lowerText.includes('good driver') || lowerText.includes('best driver')) {
        console.log('[Quest] ✓ Grab Uncle quest complete!');
        quests.add('grab-uncle-quest');
      }
    }

    // Memory 3: Grab Uncle mentions MBS (AFTER quest done)
    if (currentNpc === 'grab-uncle' && quests.has('grab-uncle-quest') && !unlockedIds.has('memory-3')) {
      if (lowerText.includes('mbs') || lowerText.includes('marina bay') || lowerText.includes('ceremony') ||
          lowerText.includes('6pm') || lowerText.includes('wedding venue') || lowerText.includes('sands')) {
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
    }

    // Quest: Ah Beng - Answer Singlish quiz correctly
    if (currentNpc === 'ah-beng' && !quests.has('ah-beng-quest')) {
      if (lowerText.includes('can lah') || lowerText.includes('shiok') || lowerText.includes('alamak') ||
          lowerText.includes('correct') || lowerText.includes('you pass') || lowerText.includes('not bad')) {
        console.log('[Quest] ✓ Ah Beng quest complete!');
        quests.add('ah-beng-quest');
      }
    }

    // Memory 4: Ah Beng mentions best man (AFTER quest done)
    if (currentNpc === 'ah-beng' && quests.has('ah-beng-quest') && !unlockedIds.has('memory-4')) {
      if (lowerText.includes('best man') || lowerText.includes('bestman') || lowerText.includes('bachelor') ||
          lowerText.includes('bbq') || lowerText.includes('party') || lowerText.includes('groomsman')) {
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
    }
  }, [state.currentNpc, unlockMemory]);

  // Handle mic button click based on current status
  const handleMicClick = () => {
    if (status === 'listening') {
      // Stop listening (speech recognition will auto-process)
      stopListening();
    } else if (status === 'speaking') {
      // Stop speaking
      stopSpeaking();
    } else if (status === 'idle') {
      // Start listening
      startListening();
      updateChickenMood(1); // Reward for talking
    }
    // If processing, do nothing (wait for AI)
  };

  // Handle text input submit
  const handleTextSubmit = async () => {
    if (textInput.trim() && status === 'idle') {
      await sendText(textInput);
      setTextInput('');
      updateChickenMood(1);
    }
  };

  const handleTravel = (location: typeof state.location) => {
    if (travelTo(location)) {
      setShowTravelMenu(false);
      setCurrentTranscript('');
      resetConversation();
      stopSpeaking();
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
            isThinking={status === 'processing'}
          />
        )}

        {/* Status Display */}
        <div className={`text-sm px-3 py-1 rounded-full ${
          status === 'idle' ? 'bg-green-500/20 text-green-300' :
          status === 'listening' ? 'bg-red-500/20 text-red-300' :
          status === 'processing' ? 'bg-yellow-500/20 text-yellow-300' :
          'bg-purple-500/20 text-purple-300'
        }`}>
          {status === 'idle' ? '🟢 Ready to Talk' :
           status === 'listening' ? '🔴 Listening...' :
           status === 'processing' ? '🟡 Thinking...' :
           '🔊 Speaking...'}
        </div>

        {/* User transcript (what they said) */}
        {userTranscript && status === 'listening' && (
          <div className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg text-sm max-w-md text-center">
            "{userTranscript}"
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm max-w-md text-center">
            {error}
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
              ${status === 'listening'
                ? 'bg-red-500 scale-110 voice-recording'
                : status === 'processing'
                  ? 'bg-yellow-500 cursor-not-allowed'
                  : status === 'speaking'
                    ? 'bg-purple-500'
                    : 'bg-blue-500 hover:bg-blue-600'
              }
            `}
            whileTap={{ scale: 0.95 }}
            onClick={handleMicClick}
            disabled={status === 'processing'}
          >
            <span className="text-5xl mb-2">
              {status === 'listening' ? '🎙️' :
               status === 'processing' ? '🤔' :
               status === 'speaking' ? '🔊' :
               '🎤'}
            </span>
            <span className="text-sm text-center">
              {status === 'listening' ? 'Listening...' :
               status === 'processing' ? 'Thinking...' :
               status === 'speaking' ? 'Tap to Stop' :
               'Tap to Talk'}
            </span>
          </motion.button>
        </div>

        {/* Text Input Fallback */}
        <div className="flex gap-2 max-w-md mx-auto">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
            placeholder="Or type here..."
            className="flex-1 bg-white/10 text-white px-4 py-2 rounded-full text-sm placeholder-gray-400"
            disabled={status !== 'idle'}
          />
          <button
            onClick={handleTextSubmit}
            disabled={status !== 'idle' || !textInput.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white px-4 py-2 rounded-full text-sm"
          >
            Send
          </button>
        </div>

        {/* Instructions */}
        <p className="text-center text-gray-400 text-sm">
          Tap mic to talk, or type your message. Speak naturally!
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
