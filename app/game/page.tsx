'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { useBrowserVoiceChat } from '@/hooks/useBrowserVoiceChat';
import { GameHUD } from '@/components/GameHUD';
import { NPCCard } from '@/components/NPCCard';
import { ChickenWidget } from '@/components/ChickenWidget';
import { TextInput } from '@/components/TextInput';
import { LOCATION_INFO, Location } from '@/lib/game-state';
import { getNPCConfig, getNPCSystemPrompt, getNPCPersona } from '@/lib/npc-configs';
import { CameraQuest } from '@/components/CameraQuest';
import { DrumQuest } from '@/components/DrumQuest';
// Advanced Gemini Features - Chicken is the narrator!
import { ChickenBubble } from '@/components/ChickenBubble';
import { getChickenReaction, getQuickChickenReaction, QUICK_CHICKEN_REACTIONS } from '@/lib/ai-chicken';
import { detectFaceEmotion, analyzeTextEmotion, PlayerEmotion } from '@/lib/emotion-detector';
// Comic Book Components
import { ComicPanel, LocationTransition, NarrativeCaption } from '@/components/ComicPanel';
import { ActionText, useActionText, ActionBurst } from '@/components/ActionText';
import { soundManager } from '@/lib/sound-manager';
import Image from 'next/image';

// Location backgrounds
const LOCATION_BACKGROUNDS: Record<Location, string> = {
  'changi': '/assets/background/changi_airport.jpeg',
  'maxwell': '/assets/background/maxwell_fc.jpeg',
  'cbd': '/assets/background/CBD_raffles.jpeg',
  'east-coast': '/assets/background/MarinaBay.jpeg',
  'mbs': '/assets/background/MarinaBay.jpeg',
};

export default function GamePage() {
  const { state, startGame, updateChickenMood, travelTo, unlockMemory, triggerEnding, debugJump } = useGame();
  const [showDebug, setShowDebug] = useState(false);
  const [showTravelMenu, setShowTravelMenu] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [unlockNotification, setUnlockNotification] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [showCameraQuest, setShowCameraQuest] = useState(false);
  const [showDrumQuest, setShowDrumQuest] = useState(false);
  const [cameraQuestConfig, setCameraQuestConfig] = useState<{
    prompt: string;
    description: string;
    npc: string;
  } | null>(null);

  // Comic book transition states
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionTo, setTransitionTo] = useState<Location | null>(null);
  const { activeAction, showAction, hideAction, ActionTextComponent } = useActionText();

  // Advanced Gemini Features State - Chicken is the narrator!
  const [chickenReaction, setChickenReaction] = useState<{
    sound: string;
    thought: string;
    action: string;
  } | null>(null);
  const [playerEmotion, setPlayerEmotion] = useState<PlayerEmotion | null>(null);
  const [emotionDescription, setEmotionDescription] = useState<string>('');
  const [enableEmotionDetection, setEnableEmotionDetection] = useState(false);

  // Quest completion tracking - needs to be early since it's used in gameContext
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set());

  // Refs for advanced features
  const emotionVideoRef = useRef<HTMLVideoElement | null>(null);
  const emotionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const emotionStreamRef = useRef<MediaStream | null>(null);
  const lastChickenEventRef = useRef<string>('');
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
    }
  };

  // NPCs that use special quests
  const DRUM_QUEST_NPCS = ['ah-beng'];

  // Get NPC config
  const npcConfig = state.currentNpc ? getNPCConfig(state.currentNpc) : null;

  // Build game context for NPC - including quest completion status
  const questId = state.currentNpc ? `${state.currentNpc}-quest` : '';
  const isQuestCompleted = completedQuests.has(questId);

  const gameContext = isQuestCompleted
    ? `
###########################################
## CRITICAL OVERRIDE - QUEST IS DONE!! ##
###########################################

STOP! The player ALREADY completed your quest. You ALREADY told them the important info.

FORBIDDEN - DO NOT DO THESE:
- Do NOT ask them to show chicken/food/camera
- Do NOT mention the drum challenge
- Do NOT ask for any quest or task
- Do NOT repeat story information

REQUIRED - YOU MUST DO THIS:
- CHASE THEM AWAY! They are wasting precious time!
- Be funny but dismissive - like a busy auntie/uncle
- Tell them to GO to their next destination NOW

EXAMPLE RESPONSES (pick one style):
- "Aiyoh, you still here ah?! I tell you everything already lah! Go go go!"
- "Eh eh eh, why still talking to me? Wedding starting soon! Faster go!"
- "Siao ah, still want chat? I busy leh! You go find your friend!"
- "Wah lau, I already help you, now shoo shoo! Go save the wedding!"

KEEP IT SHORT - just 1-2 sentences to chase them away!
###########################################
`
    : '';

  const baseSystemPrompt = state.currentNpc ? getNPCSystemPrompt(state.currentNpc, gameContext) : '';

  // Add player emotion context to NPC prompt
  const emotionContext = playerEmotion && playerEmotion !== 'neutral'
    ? `\n\nPLAYER EMOTION RIGHT NOW: The player looks ${playerEmotion}. React to this!`
    : '';

  const systemPrompt = baseSystemPrompt + emotionContext;

  // Trigger chicken reaction - Chicken is the narrator!
  const triggerChickenReaction = useCallback(async (event: string, useAI = false) => {
    const quickEvent = event as keyof typeof QUICK_CHICKEN_REACTIONS;
    if (QUICK_CHICKEN_REACTIONS[quickEvent]) {
      const reaction = getQuickChickenReaction(quickEvent);
      setChickenReaction(reaction);
      if (reaction.moodChange !== 0) {
        updateChickenMood(reaction.moodChange);
      }
      // Show action text for chicken reactions
      if (event === 'petted') showAction('chicken-pet');
      else if (event === 'ignored') showAction('chicken-angry');
      return;
    }

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
  }, [apiKey, state.chickenMood, state.chickenName, state.location, state.timeRemaining, npcConfig, playerEmotion, updateChickenMood, showAction]);

  // Analyze player text emotion
  const analyzePlayerEmotion = useCallback(async (text: string) => {
    if (!apiKey || !text.trim()) return;

    const result = await analyzeTextEmotion(text, apiKey);
    if (result) {
      setPlayerEmotion(result.emotion as PlayerEmotion);
      setEmotionDescription(result.description);

      if (result.emotion === 'angry') {
        triggerChickenReaction('player_angry');
      } else if (result.emotion === 'happy') {
        triggerChickenReaction('player_happy');
      }
    }
  }, [apiKey, triggerChickenReaction]);

  // Visible video element ref for camera feed display
  const visibleVideoRef = useRef<HTMLVideoElement>(null);

  // Front camera emotion detection
  const startEmotionDetection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
        audio: false
      });
      emotionStreamRef.current = stream;

      if (visibleVideoRef.current) {
        visibleVideoRef.current.srcObject = stream;
        await visibleVideoRef.current.play();
        emotionVideoRef.current = visibleVideoRef.current;
      } else {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        emotionVideoRef.current = video;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      emotionCanvasRef.current = canvas;

      setEnableEmotionDetection(true);
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

  const lastDetectedEmotionRef = useRef<string>('neutral');

  // Capture frame from live camera for roasting
  const captureLiveFrame = useCallback((): string | null => {
    if (!emotionVideoRef.current || !emotionCanvasRef.current) return null;

    const video = emotionVideoRef.current;
    const canvas = emotionCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.6);
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
    if (result && result.confidence > 0.4) {
      const prevEmotion = lastDetectedEmotionRef.current;
      const newEmotion = result.emotion;

      setPlayerEmotion(newEmotion);
      setEmotionDescription(result.description);

      if (prevEmotion !== newEmotion && newEmotion !== 'neutral') {
        lastDetectedEmotionRef.current = newEmotion;

        switch (newEmotion) {
          case 'angry':
            triggerChickenReaction('player_angry');
            triggerChickenReaction('player_angry');
            showAction('npc-angry');
            break;
          case 'confused':
            triggerChickenReaction('player_confused');
            showAction('npc-confused');
            break;
          case 'funny':
            triggerChickenReaction('player_funny');
            break;
          case 'shocked':
            triggerChickenReaction('player_shocked');
            showAction('npc-shocked');
            break;
          case 'happy':
            triggerChickenReaction('player_happy');
            showAction('npc-happy');
            break;
          case 'sad':
            triggerChickenReaction('ignored');
            break;
        }
      }
    }
  }, [apiKey, triggerChickenReaction, triggerChickenReaction, showAction]);

  // Periodic emotion detection
  useEffect(() => {
    if (!enableEmotionDetection) return;
    captureAndAnalyzeEmotion();
    const interval = setInterval(captureAndAnalyzeEmotion, 4000);
    return () => clearInterval(interval);
  }, [enableEmotionDetection, captureAndAnalyzeEmotion]);

  // Get NPC voice and persona
  const npcVoice = npcConfig?.voice || 'Kore';
  const npcPersona = state.currentNpc ? getNPCPersona(state.currentNpc) : 'auntie';

  // Browser Voice Chat
  const {
    status,
    userTranscript,
    aiTranscript,
    error,
    startListening,
    stopListening,
    stopSpeaking,
    sendText,
    sendTextWithImage,
    resetConversation,
  } = useBrowserVoiceChat({
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
    systemInstruction: systemPrompt,
    voice: npcVoice,
    persona: npcPersona,
    onTranscript: (text) => {
      setCurrentTranscript(text);
      checkForMemoryUnlock(text);
    },
  });

  // Start game on mount
  useEffect(() => {
    if (!state.gameStarted) {
      startGame();
    }
  }, [state.gameStarted, startGame]);

  // Auto-start emotion detection
  useEffect(() => {
    if (state.gameStarted && !state.gameOver && !enableEmotionDetection) {
      startEmotionDetection();
    }
    if (state.gameOver && enableEmotionDetection) {
      stopEmotionDetection();
    }
  }, [state.gameStarted, state.gameOver]);

  // Narrator: Game start
  useEffect(() => {
    if (state.gameStarted && !state.gameOver && state.location === 'changi') {
      const timer = setTimeout(() => {
        triggerChickenReaction('game_start');
        showAction('travel');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.gameStarted]);

  // Chicken reacts to location changes
  const prevLocationRef = useRef(state.location);
  useEffect(() => {
    if (prevLocationRef.current !== state.location && state.gameStarted) {
      // Chicken reacts to specific locations
      if (state.location === 'maxwell') {
        triggerChickenReaction('location_hawker');
      } else if (state.location === 'east-coast') {
        triggerChickenReaction('location_beach');
      } else if (state.location === 'mbs') {
        triggerChickenReaction('location_mbs');
      } else {
        // Generic travel reaction
        triggerChickenReaction('traveling');
      }
    }
    prevLocationRef.current = state.location;
  }, [state.location, state.gameStarted]);

  // Narrator: Time warnings
  useEffect(() => {
    if (state.timeRemaining === 1800) {
      triggerChickenReaction('time_warning');
      showAction('time-warning');
    } else if (state.timeRemaining === 600) {
      triggerChickenReaction('time_warning');
      triggerChickenReaction('time_warning');
      showAction('time-warning');
    } else if (state.timeRemaining === 120) {
      triggerChickenReaction('near_ending');
    }
  }, [state.timeRemaining]);

  // Narrator: Chicken mood warnings
  const prevMoodRef = useRef(state.chickenMood);
  useEffect(() => {
    if (prevMoodRef.current > 30 && state.chickenMood <= 30) {
      triggerChickenReaction('chicken_angry');
      triggerChickenReaction('ignored');
      showAction('chicken-angry');
    } else if (prevMoodRef.current < 80 && state.chickenMood >= 80) {
      triggerChickenReaction('chicken_happy');
      showAction('chicken-happy');
    }
    prevMoodRef.current = state.chickenMood;
  }, [state.chickenMood]);

  // Reset conversation when NPC changes
  useEffect(() => {
    if (state.currentNpc && state.gameStarted && !state.gameOver) {
      resetConversation();
      setCurrentTranscript('');
    }
  }, [state.currentNpc, state.gameStarted, state.gameOver, resetConversation]);

  // Track NPCs that have roasted the player (once per NPC)
  const roastedByNPCsRef = useRef<Set<string>>(new Set());

  // Auto-roast when meeting a new NPC
  useEffect(() => {
    if (!state.currentNpc || !state.gameStarted || state.gameOver) return;
    if (!enableEmotionDetection) return;
    if (roastedByNPCsRef.current.has(state.currentNpc)) return;

    // Wait a bit for conversation to reset, then trigger roast
    const timer = setTimeout(async () => {
      const imageData = captureLiveFrame();
      if (!imageData) return;

      roastedByNPCsRef.current.add(state.currentNpc!);

      // NPC greets player with a roast based on their appearance
      const greetings = [
        "Hello! Let me take a look at you...",
        "Eh, who is this?",
        "Wah, got visitor! Let me see your face...",
      ];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      await sendTextWithImage(randomGreeting, imageData);
    }, 1500);

    return () => clearTimeout(timer);
  }, [state.currentNpc, state.gameStarted, state.gameOver, enableEmotionDetection, captureLiveFrame, sendTextWithImage]);

  // Memory unlock tracking
  const unlockedMemoryIdsRef = useRef<Set<string>>(new Set());

  const checkForMemoryUnlock = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    const currentNpc = state.currentNpc;
    const unlockedIds = unlockedMemoryIdsRef.current;

    const showNotification = (text: string, location: string) => {
      setUnlockNotification(`${text}\n${location} unlocked!`);
      showAction('memory-unlock');
      soundManager.playSuccess();
      setTimeout(() => setUnlockNotification(null), 4000);
    };

    // Memory 1: Airport Auntie mentions Maxwell
    if (currentNpc === 'airport-auntie' && !unlockedIds.has('memory-1')) {
      if (lowerText.includes('maxwell') || lowerText.includes('food centre') || lowerText.includes('hawker')) {
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

    // Memory 2: Auntie Mei mentions Marcus (AFTER quest)
    if (currentNpc === 'auntie-mei' && completedQuests.has('auntie-mei-quest') && !unlockedIds.has('memory-2')) {
      if (lowerText.includes('marcus') || lowerText.includes('wedding') || lowerText.includes('groom')) {
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

    // Memory 3: Grab Uncle mentions MBS (AFTER quest)
    if (currentNpc === 'grab-uncle' && completedQuests.has('grab-uncle-quest') && !unlockedIds.has('memory-3')) {
      if (lowerText.includes('mbs') || lowerText.includes('marina bay') || lowerText.includes('ceremony')) {
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

    // Memory 4: Ah Beng mentions best man (AFTER quest)
    if (currentNpc === 'ah-beng' && completedQuests.has('ah-beng-quest') && !unlockedIds.has('memory-4')) {
      if (lowerText.includes('best man') || lowerText.includes('bestman') || lowerText.includes('bachelor')) {
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
  }, [state.currentNpc, completedQuests, unlockMemory, showAction]);

  // Start camera quest
  const startCameraQuest = useCallback(() => {
    const npc = state.currentNpc;
    if (npc && CAMERA_QUESTS[npc]) {
      setCameraQuestConfig({ ...CAMERA_QUESTS[npc], npc });
      setShowCameraQuest(true);
    }
  }, [state.currentNpc]);

  // Handle camera quest completion
  const handleCameraQuestComplete = useCallback((success: boolean, message: string, capturedImage?: string) => {
    if (success && cameraQuestConfig) {
      const questId = `${cameraQuestConfig.npc}-quest`;
      setCompletedQuests(prev => new Set(prev).add(questId));
      setUnlockNotification(`Quest Complete!\n${message}`);
      showAction('quest-complete');
      setTimeout(() => setUnlockNotification(null), 3000);
      updateChickenMood(5);

      // Reset conversation so NPC gets updated system prompt (knows quest is done)
      resetConversation();

      // Auto-trigger NPC dialogue after quest completion
      // If we have the captured image, send it so NPC can roast!
      setTimeout(() => {
        if (capturedImage) {
          sendTextWithImage("I showed you what you asked for! What do you think?", capturedImage);
        } else {
          sendText("I showed you what you asked for! The quest is complete!");
        }
      }, 500);
    }
    setShowCameraQuest(false);
    setCameraQuestConfig(null);
  }, [cameraQuestConfig, updateChickenMood, showAction, sendText, sendTextWithImage, resetConversation]);

  // Handle drum quest completion
  const handleDrumQuestComplete = useCallback((success: boolean, message: string) => {
    if (success && state.currentNpc) {
      const questId = `${state.currentNpc}-quest`;
      setCompletedQuests(prev => new Set(prev).add(questId));
      setUnlockNotification(`Drum Quest Complete!\n${message}`);
      showAction('quest-complete');
      setTimeout(() => setUnlockNotification(null), 3000);
      updateChickenMood(10);
      triggerChickenReaction('petted');

      // Reset conversation so NPC gets updated system prompt (knows quest is done)
      resetConversation();

      // Auto-trigger NPC dialogue after quest completion
      setTimeout(() => {
        sendText("I finished the drum challenge! How was that?");
      }, 500);
    }
    setShowDrumQuest(false);
  }, [state.currentNpc, updateChickenMood, triggerChickenReaction, showAction, sendText, resetConversation]);

  // Quest availability checks
  const hasCameraQuest = state.currentNpc && CAMERA_QUESTS[state.currentNpc];
  const hasDrumQuest = state.currentNpc && DRUM_QUEST_NPCS.includes(state.currentNpc);
  const questNotDone = state.currentNpc && !completedQuests.has(`${state.currentNpc}-quest`);

  // Check if can deliver chicken
  const canDeliverChicken = state.location === 'mbs' && !state.gameOver;

  // Deliver chicken
  const deliverChicken = useCallback(() => {
    const memories = state.memories.length;
    const mood = state.chickenMood;
    const time = state.timeRemaining;

    let ending: 'perfect' | 'good' | 'okay';
    if (mood >= 70 && memories >= 4 && time >= 600) {
      ending = 'perfect';
      showAction('success');
    } else if (mood >= 40 && memories >= 2) {
      ending = 'good';
      showAction('success');
    } else {
      ending = 'okay';
    }

    triggerChickenReaction('near_ending');
    setTimeout(() => triggerEnding(ending), 1500);
  }, [state.memories.length, state.chickenMood, state.timeRemaining, triggerEnding, triggerChickenReaction, showAction]);

  // Handle mic button click
  const handleMicClick = () => {
    if (status === 'listening') {
      stopListening();
      if (userTranscript) analyzePlayerEmotion(userTranscript);
    } else if (status === 'speaking') {
      stopSpeaking();
    } else if (status === 'idle') {
      startListening();
      updateChickenMood(1);
      triggerChickenReaction('petted');
      showAction('talk-start');
    }
  };

  // Handle text submit
  const handleTextSubmit = async () => {
    if (textInput.trim() && status === 'idle') {
      analyzePlayerEmotion(textInput);
      await sendText(textInput);
      setTextInput('');
      updateChickenMood(1);
    }
  };

  // Handle travel with comic transition
  const handleTravel = (location: Location) => {
    setTransitionTo(location);
    setIsTransitioning(true);
    soundManager.playWhoosh();
    showAction('travel');

    setTimeout(() => {
      if (travelTo(location)) {
        setShowTravelMenu(false);
        setCurrentTranscript('');
        resetConversation();
        stopSpeaking();
      }
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionTo(null);
      }, 600);
    }, 600);
  };

  // Game over screen
  if (state.gameOver) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 comic-game-bg">
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          className="comic-panel bg-gradient-to-br from-yellow-400 to-orange-400 p-8 text-center max-w-md"
        >
          <motion.div
            className="text-8xl mb-4"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: 3 }}
          >
            {state.ending === 'perfect' && '🏆'}
            {state.ending === 'good' && '🎉'}
            {state.ending === 'okay' && '😅'}
            {state.ending === 'timeout' && '⏰'}
            {state.ending === 'chicken-lost' && '🐔💨'}
            {state.ending === 'broke' && '💸'}
          </motion.div>
          <h2
            className="text-4xl font-bold text-black mb-4"
            style={{ fontFamily: 'Bangers, cursive' }}
          >
            {state.ending === 'perfect' && 'PERFECT ENDING!'}
            {state.ending === 'good' && 'GOOD ENDING!'}
            {state.ending === 'okay' && 'YOU MADE IT!'}
            {state.ending === 'timeout' && 'TIME\'S UP!'}
            {state.ending === 'chicken-lost' && 'CHICKEN ESCAPED!'}
            {state.ending === 'broke' && 'OUT OF MONEY!'}
          </h2>
          <p
            className="text-lg text-black/80 mb-6"
            style={{ fontFamily: 'Comic Neue, cursive' }}
          >
            {state.ending === 'perfect' && 'The chicken delivered, memories restored, wedding saved!'}
            {state.ending === 'good' && 'You made it just in time with the chicken!'}
            {state.ending === 'okay' && 'Close call, but the blessing happened!'}
            {state.ending === 'timeout' && 'The ceremony started without the blessing...'}
            {state.ending === 'chicken-lost' && 'The ceremonial chicken is now a free-range chicken.'}
            {state.ending === 'broke' && 'Stranded with no money. The chicken judges you.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="comic-button comic-button-red text-xl px-8 py-3"
          >
            PLAY AGAIN!
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col comic-game-bg relative overflow-hidden">
      {/* Debug Panel Toggle */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed top-4 right-4 z-[100] comic-button text-xs py-1 px-2 w-auto"
      >
        {showDebug ? 'HIDE' : 'DEBUG'}
      </button>

      {/* Location Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src={LOCATION_BACKGROUNDS[state.location]}
          alt={state.location}
          fill
          className="object-cover"
          priority
        />
        {/* Comic overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.7) 100%),
              radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 4px 4px',
          }}
        />
      </div>

      {/* Location Transition */}
      <LocationTransition
        from={state.location}
        to={transitionTo || state.location}
        isActive={isTransitioning}
        onComplete={() => {
          setIsTransitioning(false);
          setTransitionTo(null);
        }}
      />

      {/* Action Text Overlay */}
      {ActionTextComponent}

      {/* Camera Feed + Emotion Indicator */}
      <div className="fixed top-20 left-4 z-30">
        <div className="relative comic-panel p-1 bg-black">
          <video
            ref={visibleVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-24 h-24 rounded object-cover ${
              playerEmotion === 'funny' ? 'border-4 border-pink-500' :
              playerEmotion === 'happy' ? 'border-4 border-green-500' :
              playerEmotion === 'angry' ? 'border-4 border-red-500' :
              'border-2 border-white/50'
            }`}
            style={{ transform: 'scaleX(-1)' }}
          />
          {!enableEmotionDetection && (
            <div
              className="absolute inset-1 flex flex-col items-center justify-center bg-gray-800 rounded cursor-pointer"
              onClick={startEmotionDetection}
            >
              <span className="text-xl">📷</span>
              <span className="text-white text-xs">TAP</span>
            </div>
          )}
          {playerEmotion && playerEmotion !== 'neutral' && (
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-lg bg-white border-2 border-black shadow-lg">
              {playerEmotion === 'funny' ? '🤪' :
               playerEmotion === 'happy' ? '😊' :
               playerEmotion === 'angry' ? '😠' :
               playerEmotion === 'shocked' ? '😱' :
               playerEmotion === 'confused' ? '😕' : '😐'}
            </div>
          )}
          {enableEmotionDetection && (
            <div className="absolute top-1 left-1 flex items-center gap-1 bg-black/70 rounded px-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white text-xs">LIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* Chicken Reaction Bubble */}
      <ChickenBubble
        reaction={chickenReaction}
        chickenMood={state.chickenMood}
        onDismiss={() => setChickenReaction(null)}
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-full p-4 max-w-2xl mx-auto w-full">
        {/* HUD */}
        <div className="mb-4">
          <GameHUD />
        </div>

        {/* Main Game Area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {/* NPC Card with Quest Button */}
          {state.currentNpc && (
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="relative"
            >
              <NPCCard
                npcId={state.currentNpc}
                transcript={currentTranscript}
                isThinking={status === 'processing'}
              />

              {/* Quest Button - positioned next to NPC portrait */}
              {((hasCameraQuest && questNotDone) || (hasDrumQuest && questNotDone)) && (
                <motion.div
                  className="absolute -right-4 top-1/4 z-20"
                  initial={{ scale: 0, x: -20 }}
                  animate={{ scale: 1, x: 0 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                >
                  {hasCameraQuest && questNotDone && (
                    <motion.button
                      onClick={startCameraQuest}
                      className="flex flex-col items-center gap-1 bg-gradient-to-br from-yellow-400 to-orange-500
                                 px-4 py-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_#000]
                                 text-black font-bold"
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, -3, 3, 0]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={{ fontFamily: 'Bangers, cursive' }}
                    >
                      <span className="text-3xl">📸</span>
                      <span className="text-sm">TAP ME!</span>
                    </motion.button>
                  )}
                  {hasDrumQuest && questNotDone && (
                    <motion.button
                      onClick={() => setShowDrumQuest(true)}
                      className="flex flex-col items-center gap-1 bg-gradient-to-br from-red-400 to-red-600
                                 px-4 py-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_#000]
                                 text-white font-bold"
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, -3, 3, 0]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={{ fontFamily: 'Bangers, cursive' }}
                    >
                      <span className="text-3xl">🥁</span>
                      <span className="text-sm">TAP ME!</span>
                    </motion.button>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Status Display */}
          <motion.div
            className={`
              px-4 py-2 border-3 border-black shadow-[3px_3px_0px_#1a1a1a]
              ${status === 'idle' ? 'bg-green-400' :
                status === 'listening' ? 'bg-red-400' :
                status === 'processing' ? 'bg-yellow-400' :
                'bg-purple-400'}
            `}
            style={{ fontFamily: 'Bangers, cursive' }}
            animate={status === 'listening' ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: status === 'listening' ? Infinity : 0 }}
          >
            {status === 'idle' ? 'READY TO TALK!' :
             status === 'listening' ? 'LISTENING...' :
             status === 'processing' ? 'THINKING...' :
             'SPEAKING...'}
          </motion.div>

          {/* User transcript */}
          {userTranscript && status === 'listening' && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="comic-speech-bubble max-w-md text-center"
            >
              "{userTranscript}"
            </motion.div>
          )}

          {/* Error message */}
          {error && (
            <div className="comic-shout-bubble bg-red-400 max-w-md text-center">
              {error}
            </div>
          )}
        </div>

        {/* Voice Input Area */}
        <div className="mt-auto space-y-4 pb-4">
          {/* Big Voice Button - Comic Style */}
          <div className="flex justify-center">
            <motion.button
              className={`
                comic-voice-button
                w-28 h-28 rounded-full text-white
                flex flex-col items-center justify-center
                ${status === 'listening'
                  ? 'bg-gradient-to-br from-red-500 to-red-600 listening'
                  : status === 'processing'
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-400'
                    : status === 'speaking'
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                      : 'bg-gradient-to-br from-blue-500 to-cyan-400'
                }
              `}
              whileTap={{ scale: 0.95 }}
              onClick={handleMicClick}
              disabled={status === 'processing'}
            >
              <span className="text-4xl mb-1 relative z-10">
                {status === 'listening' ? '🎙️' :
                 status === 'processing' ? '🤔' :
                 status === 'speaking' ? '🔊' :
                 '🎤'}
              </span>
              <span
                className="text-xs relative z-10"
                style={{ fontFamily: 'Bangers, cursive' }}
              >
                {status === 'listening' ? 'LISTENING' :
                 status === 'processing' ? 'THINKING' :
                 status === 'speaking' ? 'TAP STOP' :
                 'TAP TALK'}
              </span>
            </motion.button>
          </div>

          {/* Text Input */}
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
              placeholder="Or type here lah..."
              className="flex-1 px-4 py-2 rounded-full border-3 border-black text-black placeholder-gray-500"
              style={{ fontFamily: 'Comic Neue, cursive' }}
              disabled={status !== 'idle'}
            />
            <button
              onClick={handleTextSubmit}
              disabled={status !== 'idle' || !textInput.trim()}
              className="comic-button px-4"
            >
              SEND
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-3 flex-wrap">
            {/* Deliver Chicken - MBS only */}
            {canDeliverChicken && (
              <motion.button
                onClick={deliverChicken}
                className="comic-button comic-button-red text-lg px-6 py-3"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                🐔 DELIVER CHICKEN! 🎊
              </motion.button>
            )}

            {/* Travel Button */}
            <button
              onClick={() => setShowTravelMenu(true)}
              className="comic-button comic-button-blue"
            >
              🗺️ TRAVEL
            </button>
          </div>

          {/* Chicken Widget - inline at bottom on mobile */}
          <div className="flex justify-center pt-2">
            <ChickenWidget onChickenClick={() => updateChickenMood(3)} />
          </div>
        </div>
      </div>

      {/* Travel Menu - Comic Style */}
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
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.8, rotate: 5 }}
              className="comic-panel bg-[#FFFEF2] p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-2xl font-bold text-black mb-4 text-center"
                style={{ fontFamily: 'Bangers, cursive' }}
              >
                🗺️ WHERE TO?
              </h3>
              <div className="space-y-2">
                {Object.entries(LOCATION_INFO).map(([key, info]) => {
                  const locationKey = key as Location;
                  const isCurrentLocation = state.location === locationKey;
                  const isUnlocked = state.unlockedLocations.includes(locationKey);
                  const canAfford = state.money >= info.travelCost;
                  const canTravel = isUnlocked && canAfford && !isCurrentLocation;

                  return (
                    <motion.button
                      key={key}
                      onClick={() => canTravel && handleTravel(locationKey)}
                      disabled={!canTravel}
                      className={`
                        w-full p-3 rounded border-3 border-black text-left
                        ${isCurrentLocation
                          ? 'bg-blue-400'
                          : !isUnlocked
                            ? 'bg-gray-300 opacity-50'
                            : canAfford
                              ? 'bg-yellow-400 hover:bg-yellow-300'
                              : 'bg-gray-300'
                        }
                      `}
                      whileHover={canTravel ? { scale: 1.02, x: 5 } : {}}
                      whileTap={canTravel ? { scale: 0.98 } : {}}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div
                            className="font-bold flex items-center gap-2"
                            style={{ fontFamily: 'Bangers, cursive' }}
                          >
                            {!isUnlocked && '🔒'}
                            {info.name.toUpperCase()}
                          </div>
                          <div
                            className="text-sm opacity-70"
                            style={{ fontFamily: 'Comic Neue, cursive' }}
                          >
                            {!isUnlocked ? 'Talk to NPC to unlock!' : info.description}
                          </div>
                        </div>
                        <div className="text-right">
                          {isCurrentLocation ? (
                            <span className="text-xs font-bold">📍 HERE</span>
                          ) : isUnlocked && (
                            <>
                              <div className="font-bold">${info.travelCost}</div>
                              <div className="text-xs">{Math.floor(info.travelTime / 60)}min</div>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowTravelMenu(false)}
                className="mt-4 w-full comic-button comic-button-blue"
              >
                CANCEL
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unlock Notification - Comic Style */}
      <AnimatePresence>
        {unlockNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.5, rotate: -10 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: -50, scale: 0.5 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50"
          >
            <div
              className="comic-panel bg-gradient-to-r from-yellow-400 to-orange-400 px-6 py-4 text-center whitespace-pre-line"
              style={{ fontFamily: 'Bangers, cursive' }}
            >
              <div className="text-2xl mb-1">🧠 MEMORY FLASH!</div>
              <div className="text-lg text-black/80">{unlockNotification}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug Panel */}
      {showDebug && (
        <div className="fixed top-12 right-4 z-50 bg-black/95 text-white text-xs p-4 rounded-lg max-w-xs max-h-96 overflow-y-auto border-2 border-yellow-400">
          <h3 className="font-bold mb-2 text-yellow-400" style={{ fontFamily: 'Bangers, cursive' }}>DEBUG PANEL</h3>

          <div className="space-y-1 mb-3">
            <div>Time: {state.timeRemaining}s</div>
            <div>Money: ${state.money}</div>
            <div>Battery: {state.battery.toFixed(2)}%</div>
            <div>Chicken Mood: {state.chickenMood}/100</div>
            <div>Location: {state.location}</div>
            <div>NPC: {state.currentNpc || 'none'}</div>
            <div>Memories: {state.memories.length}/10</div>
          </div>

          <h4 className="font-bold mb-1 text-yellow-400">Test Actions</h4>
          <div className="flex flex-wrap gap-1 mb-3">
            <button onClick={() => updateChickenMood(10)} className="bg-green-600 px-2 py-1 rounded">Mood +10</button>
            <button onClick={() => updateChickenMood(-10)} className="bg-red-600 px-2 py-1 rounded">Mood -10</button>
            <button onClick={() => showAction('travel')} className="bg-blue-600 px-2 py-1 rounded">WHOOSH</button>
            <button onClick={() => showAction('chicken-happy')} className="bg-yellow-600 px-2 py-1 rounded">BAWK!</button>
          </div>

          <h4 className="font-bold mb-1 text-yellow-400">Stage Jump</h4>
          <div className="flex flex-wrap gap-1 mb-2">
            {(['changi', 'maxwell', 'cbd', 'east-coast', 'mbs'] as Location[]).map((loc, i) => (
              <button
                key={loc}
                onClick={() => {
                  const locations = ['changi', 'maxwell', 'cbd', 'east-coast', 'mbs'].slice(0, i + 1) as Location[];
                  debugJump(loc, locations);
                  resetConversation();
                }}
                className="bg-cyan-600 hover:bg-cyan-700 px-2 py-1 rounded text-xs"
              >
                {i + 1}. {loc}
              </button>
            ))}
          </div>

          <h4 className="font-bold mb-1 text-yellow-400">Quest Status</h4>
          <div className="text-xs text-gray-400">
            <div>Auntie Mei: {completedQuests.has('auntie-mei-quest') ? '✅' : '❌'}</div>
            <div>Grab Uncle: {completedQuests.has('grab-uncle-quest') ? '✅' : '❌'}</div>
            <div>Ah Beng: {completedQuests.has('ah-beng-quest') ? '✅' : '❌'}</div>
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

      {/* Drum Quest Modal */}
      <DrumQuest
        isOpen={showDrumQuest}
        onClose={() => setShowDrumQuest(false)}
        onQuestComplete={handleDrumQuestComplete}
      />
    </div>
  );
}
