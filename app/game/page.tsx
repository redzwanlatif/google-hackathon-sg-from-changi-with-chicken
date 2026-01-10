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
import { CameraQuest } from '@/components/CameraQuest';
// Advanced Gemini Features
import { NarratorBanner, NarratorToast } from '@/components/NarratorBanner';
import { ChickenBubble } from '@/components/ChickenBubble';
import { EmotionIndicator } from '@/components/EmotionIndicator';
import { generateNarration, getQuickNarration, NarratorEvent } from '@/lib/narrator';
import { getChickenReaction, getQuickChickenReaction, QUICK_CHICKEN_REACTIONS } from '@/lib/ai-chicken';
import { detectFaceEmotion, analyzeTextEmotion, PlayerEmotion } from '@/lib/emotion-detector';

export default function GamePage() {
  const { state, startGame, updateChickenMood, travelTo, unlockMemory, triggerEnding, debugJump } = useGame();
  const [showDebug, setShowDebug] = useState(false);
  const [showTravelMenu, setShowTravelMenu] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [unlockNotification, setUnlockNotification] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [showCameraQuest, setShowCameraQuest] = useState(false);
  const [cameraQuestConfig, setCameraQuestConfig] = useState<{
    prompt: string;
    description: string;
    npc: string;
  } | null>(null);

  // Advanced Gemini Features State
  const [narratorMessage, setNarratorMessage] = useState<string | null>(null);
  const [chickenReaction, setChickenReaction] = useState<{
    sound: string;
    thought: string;
    action: string;
  } | null>(null);
  const [playerEmotion, setPlayerEmotion] = useState<PlayerEmotion | null>(null);
  const [emotionDescription, setEmotionDescription] = useState<string>('');
  const [enableEmotionDetection, setEnableEmotionDetection] = useState(false);

  // Refs for advanced features
  const emotionVideoRef = useRef<HTMLVideoElement | null>(null);
  const emotionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const emotionStreamRef = useRef<MediaStream | null>(null);
  const lastNarratorEventRef = useRef<string>('');
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

  // Camera quest configurations per NPC
  const CAMERA_QUESTS: Record<string, { prompt: string; description: string }> = {
    'auntie-mei': {
      prompt: 'Show a chicken or any bird. The player needs to prove they still have the ceremonial chicken.',
      description: 'Show Auntie Mei the chicken to prove you still have it!'
    },
    'grab-uncle': {
      prompt: 'Show any Singaporean food (chicken rice, laksa, char kway teow, nasi lemak, kopi, etc) or a drink.',
      description: 'Show Uncle some local food - he\'s hungry!'
    },
    'ah-beng': {
      prompt: 'Show something red or lucky (red item, angpao, red clothing, etc) - for the wedding blessing.',
      description: 'Show something RED for good luck at the wedding!'
    }
  };

  // Get NPC config
  const npcConfig = state.currentNpc ? getNPCConfig(state.currentNpc) : null;
  const systemPrompt = state.currentNpc ? getNPCSystemPrompt(state.currentNpc) : '';

  // Trigger narrator for events
  const triggerNarrator = useCallback(async (event: NarratorEvent, extraContext?: string) => {
    // Don't repeat the same event
    const eventKey = `${event}-${extraContext || ''}`;
    if (lastNarratorEventRef.current === eventKey) return;
    lastNarratorEventRef.current = eventKey;

    // Try quick narration first (no API call)
    const quickEvent = event as keyof typeof QUICK_CHICKEN_REACTIONS;
    const quickNarration = getQuickNarration(quickEvent as 'game_start' | 'chicken_escape_warning' | 'time_30min' | 'time_10min' | 'memory_unlock');
    if (quickNarration) {
      setNarratorMessage(quickNarration);
      return;
    }

    // Use API for dynamic narration
    if (apiKey) {
      const narration = await generateNarration({
        event,
        location: LOCATION_INFO[state.location]?.name,
        npc: npcConfig?.name,
        timeRemaining: state.timeRemaining,
        chickenMood: state.chickenMood,
        memoriesCount: state.memories.length,
        playerEmotion: playerEmotion || undefined,
        extraContext
      }, apiKey);

      if (narration) {
        setNarratorMessage(narration);
      }
    }
  }, [apiKey, state.location, state.timeRemaining, state.chickenMood, state.memories.length, npcConfig, playerEmotion]);

  // Trigger chicken reaction
  const triggerChickenReaction = useCallback(async (event: string, useAI = false) => {
    // Try quick reaction first
    const quickEvent = event as keyof typeof QUICK_CHICKEN_REACTIONS;
    if (QUICK_CHICKEN_REACTIONS[quickEvent]) {
      const reaction = getQuickChickenReaction(quickEvent);
      setChickenReaction(reaction);
      if (reaction.moodChange !== 0) {
        updateChickenMood(reaction.moodChange);
      }
      return;
    }

    // Use AI for complex reactions
    if (useAI && apiKey) {
      const reaction = await getChickenReaction({
        mood: state.chickenMood,
        chickenName: state.chickenName || 'the chicken',
        location: LOCATION_INFO[state.location]?.name || state.location,
        playerEmotion: playerEmotion || undefined,
        lastPlayerAction: event,
        timeRemaining: state.timeRemaining,
        npcName: npcConfig?.name
      }, event, apiKey);

      if (reaction) {
        setChickenReaction(reaction);
        if (reaction.moodChange !== 0) {
          updateChickenMood(reaction.moodChange);
        }
      }
    }
  }, [apiKey, state.chickenMood, state.chickenName, state.location, state.timeRemaining, npcConfig, playerEmotion, updateChickenMood]);

  // Analyze player text emotion
  const analyzePlayerEmotion = useCallback(async (text: string) => {
    if (!apiKey || !text.trim()) return;

    const result = await analyzeTextEmotion(text, apiKey);
    if (result) {
      setPlayerEmotion(result.emotion as PlayerEmotion);
      setEmotionDescription(result.description);

      // Chicken reacts to player emotion
      if (result.emotion === 'angry') {
        triggerChickenReaction('player_angry');
      } else if (result.emotion === 'happy') {
        triggerChickenReaction('player_happy');
      }
    }
  }, [apiKey, triggerChickenReaction]);

  // Front camera emotion detection
  const startEmotionDetection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
        audio: false
      });
      emotionStreamRef.current = stream;

      // Create hidden video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      emotionVideoRef.current = video;

      // Create canvas for capturing
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      emotionCanvasRef.current = canvas;

      setEnableEmotionDetection(true);
      console.log('[Emotion] Front camera started');
    } catch (err) {
      console.error('[Emotion] Camera error:', err);
    }
  }, []);

  const stopEmotionDetection = useCallback(() => {
    if (emotionStreamRef.current) {
      emotionStreamRef.current.getTracks().forEach(track => track.stop());
      emotionStreamRef.current = null;
    }
    emotionVideoRef.current = null;
    emotionCanvasRef.current = null;
    setEnableEmotionDetection(false);
  }, []);

  const captureAndAnalyzeEmotion = useCallback(async () => {
    if (!emotionVideoRef.current || !emotionCanvasRef.current || !apiKey) return;

    const video = emotionVideoRef.current;
    const canvas = emotionCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.5);

    const result = await detectFaceEmotion(imageData, apiKey);
    if (result && result.confidence > 0.5) {
      setPlayerEmotion(result.emotion);
      setEmotionDescription(result.description);

      // React to extreme emotions
      if (result.emotion === 'angry') {
        triggerNarrator('player_angry');
        triggerChickenReaction('player_angry');
      } else if (result.emotion === 'confused') {
        triggerNarrator('player_confused');
      }
    }
  }, [apiKey, triggerNarrator, triggerChickenReaction]);

  // Periodic emotion detection (every 10 seconds)
  useEffect(() => {
    if (!enableEmotionDetection) return;

    const interval = setInterval(() => {
      captureAndAnalyzeEmotion();
    }, 10000);

    return () => clearInterval(interval);
  }, [enableEmotionDetection, captureAndAnalyzeEmotion]);

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

  // Narrator: Game start
  useEffect(() => {
    if (state.gameStarted && !state.gameOver && state.location === 'changi') {
      // Small delay for dramatic effect
      const timer = setTimeout(() => {
        triggerNarrator('game_start');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.gameStarted]);

  // Narrator: Location changes
  const prevLocationRef = useRef(state.location);
  useEffect(() => {
    if (prevLocationRef.current !== state.location && state.gameStarted) {
      triggerNarrator('location_change', `Arrived at ${LOCATION_INFO[state.location]?.name}`);

      // Chicken reacts to certain locations
      if (state.location === 'maxwell') {
        triggerChickenReaction('location_hawker');
      } else if (state.location === 'east-coast') {
        triggerChickenReaction('location_beach');
      } else if (state.location === 'mbs') {
        triggerChickenReaction('location_mbs');
      } else {
        triggerChickenReaction('traveling');
      }
    }
    prevLocationRef.current = state.location;
  }, [state.location, state.gameStarted]);

  // Narrator: Time warnings
  useEffect(() => {
    if (state.timeRemaining === 1800) { // 30 min
      triggerNarrator('time_warning');
    } else if (state.timeRemaining === 600) { // 10 min
      triggerNarrator('time_warning');
      triggerChickenReaction('time_warning');
    } else if (state.timeRemaining === 120) { // 2 min
      triggerNarrator('near_ending');
    }
  }, [state.timeRemaining]);

  // Narrator: Chicken mood warnings
  const prevMoodRef = useRef(state.chickenMood);
  useEffect(() => {
    if (prevMoodRef.current > 30 && state.chickenMood <= 30) {
      triggerNarrator('chicken_angry');
      triggerChickenReaction('ignored');
    } else if (prevMoodRef.current < 80 && state.chickenMood >= 80) {
      triggerNarrator('chicken_happy');
    }
    prevMoodRef.current = state.chickenMood;
  }, [state.chickenMood]);

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

    // Memory 2: Auntie Mei mentions Marcus (AFTER camera quest done)
    // Camera quest must be completed first - check if quest is in questCompleteRef
    if (currentNpc === 'auntie-mei' && quests.has('auntie-mei-quest') && !unlockedIds.has('memory-2')) {
      if (lowerText.includes('marcus') || lowerText.includes('wedding') || lowerText.includes('groom') ||
          lowerText.includes('friend') || lowerText.includes('last night') || lowerText.includes('believe')) {
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

    // Memory 3: Grab Uncle mentions MBS (AFTER camera quest done)
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

    // Memory 4: Ah Beng mentions best man (AFTER camera quest done)
    if (currentNpc === 'ah-beng' && quests.has('ah-beng-quest') && !unlockedIds.has('memory-4')) {
      if (lowerText.includes('best man') || lowerText.includes('bestman') || lowerText.includes('bachelor') ||
          lowerText.includes('mbs') || lowerText.includes('marina bay') || lowerText.includes('wedding')) {
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

  // Start camera quest for current NPC
  const startCameraQuest = useCallback(() => {
    const npc = state.currentNpc;
    if (npc && CAMERA_QUESTS[npc]) {
      setCameraQuestConfig({
        ...CAMERA_QUESTS[npc],
        npc
      });
      setShowCameraQuest(true);
    }
  }, [state.currentNpc]);

  // Handle camera quest completion
  const handleCameraQuestComplete = useCallback((success: boolean, message: string) => {
    if (success && cameraQuestConfig) {
      const quests = questCompleteRef.current;
      const questId = `${cameraQuestConfig.npc}-quest`;

      console.log('[CameraQuest] ✓ Completed:', questId);
      quests.add(questId);

      // Show notification
      setUnlockNotification(`📸 Quest Complete!\n${message}`);
      setTimeout(() => setUnlockNotification(null), 3000);

      // Reward: boost chicken mood
      updateChickenMood(5);
    }

    setShowCameraQuest(false);
    setCameraQuestConfig(null);
  }, [cameraQuestConfig, updateChickenMood]);

  // Check if current NPC has a camera quest available
  const hasCameraQuest = state.currentNpc && CAMERA_QUESTS[state.currentNpc];
  const questNotDone = state.currentNpc && !questCompleteRef.current.has(`${state.currentNpc}-quest`);

  // Check if player can deliver the chicken (at MBS)
  const canDeliverChicken = state.location === 'mbs' && !state.gameOver;

  // Deliver chicken and determine ending
  const deliverChicken = useCallback(() => {
    const memories = state.memories.length;
    const mood = state.chickenMood;
    const time = state.timeRemaining;

    // Determine ending based on performance
    let ending: 'perfect' | 'good' | 'okay';

    if (mood >= 70 && memories >= 4 && time >= 600) {
      // High mood, most memories, plenty of time
      ending = 'perfect';
    } else if (mood >= 40 && memories >= 2) {
      // Decent mood, some memories
      ending = 'good';
    } else {
      // Barely made it
      ending = 'okay';
    }

    // Trigger narrator for the ending
    triggerNarrator('near_ending', `Delivering chicken with ${mood}% mood!`);

    // Small delay for dramatic effect, then trigger ending
    setTimeout(() => {
      triggerEnding(ending);
    }, 1500);
  }, [state.memories.length, state.chickenMood, state.timeRemaining, triggerEnding, triggerNarrator]);

  // Handle mic button click based on current status
  const handleMicClick = () => {
    if (status === 'listening') {
      // Stop listening (speech recognition will auto-process)
      stopListening();
      // Analyze emotion from what they said
      if (userTranscript) {
        analyzePlayerEmotion(userTranscript);
      }
    } else if (status === 'speaking') {
      // Stop speaking
      stopSpeaking();
    } else if (status === 'idle') {
      // Start listening
      startListening();
      updateChickenMood(1); // Reward for talking
      triggerChickenReaction('petted'); // Chicken likes attention
    }
    // If processing, do nothing (wait for AI)
  };

  // Handle text input submit
  const handleTextSubmit = async () => {
    if (textInput.trim() && status === 'idle') {
      // Analyze player's text emotion
      analyzePlayerEmotion(textInput);

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
      {/* Narrator Banner */}
      <NarratorBanner
        message={narratorMessage}
        onDismiss={() => setNarratorMessage(null)}
        autoHideDelay={5000}
      />

      {/* Player Emotion Indicator */}
      <EmotionIndicator
        emotion={playerEmotion}
        description={emotionDescription}
        showCamera={enableEmotionDetection}
      />

      {/* Chicken Reaction Bubble */}
      <ChickenBubble
        reaction={chickenReaction}
        chickenMood={state.chickenMood}
        onDismiss={() => setChickenReaction(null)}
      />

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

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 flex-wrap">
          {/* DELIVER CHICKEN - Only at MBS! */}
          {canDeliverChicken && (
            <button
              onClick={deliverChicken}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-3 rounded-full font-bold text-lg shadow-lg animate-pulse"
            >
              🐔 DELIVER THE CHICKEN! 🎊
            </button>
          )}

          {/* Camera Quest Button - only show if NPC has quest and not done */}
          {hasCameraQuest && questNotDone && (
            <button
              onClick={startCameraQuest}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full text-sm animate-pulse"
            >
              📸 Camera Quest
            </button>
          )}

          {/* Travel Button */}
          <button
            onClick={() => setShowTravelMenu(true)}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm"
          >
            🗺️ Travel
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

          <h4 className="font-bold mb-1 text-yellow-400 mt-3">Camera Quest</h4>
          <button
            onClick={startCameraQuest}
            disabled={!hasCameraQuest}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 px-2 py-1 rounded w-full"
          >
            Test Camera Quest
          </button>

          <h4 className="font-bold mb-1 text-yellow-400 mt-3">🎮 Stage Jump</h4>
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              onClick={() => {
                debugJump('changi', ['changi']);
                questCompleteRef.current.clear();
                unlockedMemoryIdsRef.current.clear();
                resetConversation();
              }}
              className="bg-cyan-600 hover:bg-cyan-700 px-2 py-1 rounded text-xs"
            >
              1. Changi
            </button>
            <button
              onClick={() => {
                debugJump('maxwell', ['changi', 'maxwell']);
                questCompleteRef.current.clear();
                unlockedMemoryIdsRef.current.add('memory-1');
                resetConversation();
              }}
              className="bg-cyan-600 hover:bg-cyan-700 px-2 py-1 rounded text-xs"
            >
              2. Maxwell
            </button>
            <button
              onClick={() => {
                debugJump('cbd', ['changi', 'maxwell', 'cbd']);
                questCompleteRef.current.add('auntie-mei-quest');
                unlockedMemoryIdsRef.current.add('memory-1');
                unlockedMemoryIdsRef.current.add('memory-2');
                resetConversation();
              }}
              className="bg-cyan-600 hover:bg-cyan-700 px-2 py-1 rounded text-xs"
            >
              3. CBD
            </button>
            <button
              onClick={() => {
                debugJump('east-coast', ['changi', 'maxwell', 'cbd', 'east-coast']);
                questCompleteRef.current.add('auntie-mei-quest');
                questCompleteRef.current.add('grab-uncle-quest');
                unlockedMemoryIdsRef.current.add('memory-1');
                unlockedMemoryIdsRef.current.add('memory-2');
                unlockedMemoryIdsRef.current.add('memory-3');
                resetConversation();
              }}
              className="bg-cyan-600 hover:bg-cyan-700 px-2 py-1 rounded text-xs"
            >
              4. East Coast
            </button>
            <button
              onClick={() => {
                debugJump('mbs', ['changi', 'maxwell', 'cbd', 'east-coast', 'mbs']);
                questCompleteRef.current.add('auntie-mei-quest');
                questCompleteRef.current.add('grab-uncle-quest');
                questCompleteRef.current.add('ah-beng-quest');
                unlockedMemoryIdsRef.current.add('memory-1');
                unlockedMemoryIdsRef.current.add('memory-2');
                unlockedMemoryIdsRef.current.add('memory-3');
                unlockedMemoryIdsRef.current.add('memory-4');
                resetConversation();
              }}
              className="bg-cyan-600 hover:bg-cyan-700 px-2 py-1 rounded text-xs"
            >
              5. MBS
            </button>
          </div>
          <p className="text-gray-500 text-xs">Jumps to stage with all prerequisites done</p>

          <h4 className="font-bold mb-1 text-yellow-400 mt-3">Quest Status</h4>
          <div className="text-xs text-gray-400">
            <div>Auntie Mei: {questCompleteRef.current.has('auntie-mei-quest') ? '✅' : '❌'}</div>
            <div>Grab Uncle: {questCompleteRef.current.has('grab-uncle-quest') ? '✅' : '❌'}</div>
            <div>Ah Beng: {questCompleteRef.current.has('ah-beng-quest') ? '✅' : '❌'}</div>
          </div>
          <button
            onClick={() => {
              if (state.currentNpc) {
                questCompleteRef.current.add(`${state.currentNpc}-quest`);
                setUnlockNotification('Quest marked complete!');
                setTimeout(() => setUnlockNotification(null), 2000);
              }
            }}
            className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded w-full mt-1 text-xs"
          >
            ✅ Complete Current Quest
          </button>

          <h4 className="font-bold mb-1 text-yellow-400 mt-3">🎭 Advanced Features</h4>

          {/* Narrator Test */}
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              onClick={() => triggerNarrator('game_start')}
              className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs"
            >
              Narrator: Start
            </button>
            <button
              onClick={() => triggerNarrator('time_warning')}
              className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs"
            >
              Narrator: Time
            </button>
            <button
              onClick={() => triggerNarrator('chicken_angry')}
              className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs"
            >
              Narrator: Angry
            </button>
          </div>

          {/* Chicken Reactions Test */}
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              onClick={() => triggerChickenReaction('petted')}
              className="bg-amber-600 hover:bg-amber-700 px-2 py-1 rounded text-xs"
            >
              🐔 Pet
            </button>
            <button
              onClick={() => triggerChickenReaction('ignored')}
              className="bg-amber-600 hover:bg-amber-700 px-2 py-1 rounded text-xs"
            >
              🐔 Ignore
            </button>
            <button
              onClick={() => triggerChickenReaction('location_hawker')}
              className="bg-amber-600 hover:bg-amber-700 px-2 py-1 rounded text-xs"
            >
              🐔 Hawker
            </button>
            <button
              onClick={() => triggerChickenReaction('Player is flirting with the NPC', true)}
              className="bg-amber-600 hover:bg-amber-700 px-2 py-1 rounded text-xs"
            >
              🐔 AI React
            </button>
          </div>

          {/* Emotion Detection */}
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              onClick={() => enableEmotionDetection ? stopEmotionDetection() : startEmotionDetection()}
              className={`${enableEmotionDetection ? 'bg-red-600' : 'bg-green-600'} hover:opacity-80 px-2 py-1 rounded text-xs`}
            >
              📷 {enableEmotionDetection ? 'Stop' : 'Start'} Face Cam
            </button>
            <button
              onClick={() => setPlayerEmotion('happy')}
              className="bg-green-600 px-2 py-1 rounded text-xs"
            >
              😊
            </button>
            <button
              onClick={() => setPlayerEmotion('angry')}
              className="bg-red-600 px-2 py-1 rounded text-xs"
            >
              😠
            </button>
            <button
              onClick={() => setPlayerEmotion('confused')}
              className="bg-yellow-600 px-2 py-1 rounded text-xs"
            >
              😕
            </button>
          </div>

          <div className="text-xs text-gray-400 mt-1">
            <div>Current Emotion: {playerEmotion || 'none'}</div>
            <div>Face Cam: {enableEmotionDetection ? '🟢 On' : '⚫ Off'}</div>
          </div>
        </div>
      )}

      {/* Camera Quest Modal */}
      {cameraQuestConfig && (
        <CameraQuest
          isOpen={showCameraQuest}
          onClose={() => {
            setShowCameraQuest(false);
            setCameraQuestConfig(null);
          }}
          questPrompt={cameraQuestConfig.prompt}
          questDescription={cameraQuestConfig.description}
          onQuestComplete={handleCameraQuestComplete}
        />
      )}
    </div>
  );
}
