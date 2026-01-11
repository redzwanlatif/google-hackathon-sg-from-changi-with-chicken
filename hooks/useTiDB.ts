'use client';

import { useCallback, useEffect, useRef } from 'react';
import { tidb, PlayerEventType } from '@/lib/tidb';
import { GameState, Location, NPCId } from '@/lib/game-state';

// Hook for TiDB integration in the game
export function useTiDB(gameState: GameState) {
  const sessionInitialized = useRef(false);
  const lastLocation = useRef<Location | null>(null);

  // Initialize session when game starts
  useEffect(() => {
    if (gameState.gameStarted && !sessionInitialized.current) {
      initSession();
    }
  }, [gameState.gameStarted]);

  // Track location changes
  useEffect(() => {
    if (gameState.location !== lastLocation.current && sessionInitialized.current) {
      trackEvent('travel', {
        from: lastLocation.current,
        to: gameState.location
      }, gameState.location);
      lastLocation.current = gameState.location;
    }
  }, [gameState.location]);

  // End session when game ends
  useEffect(() => {
    if (gameState.gameOver && sessionInitialized.current) {
      endSession(gameState);
    }
  }, [gameState.gameOver]);

  async function initSession() {
    try {
      await tidb.startSession();
      sessionInitialized.current = true;
      trackEvent('game_start', { location: gameState.location }, gameState.location);
      lastLocation.current = gameState.location;
    } catch (error) {
      console.warn('TiDB session init failed:', error);
    }
  }

  async function endSession(state: GameState) {
    try {
      await tidb.endSession(state);
    } catch (error) {
      console.warn('TiDB session end failed:', error);
    }
  }

  // Track generic events
  const trackEvent = useCallback(
    async (eventType: PlayerEventType, eventData: Record<string, unknown>, location?: Location) => {
      try {
        await tidb.trackEvent({
          eventType,
          eventData,
          location: location || gameState.location,
        });
      } catch (error) {
        // Silently fail - analytics shouldn't break the game
      }
    },
    [gameState.location]
  );

  // Track NPC conversation
  const trackConversation = useCallback(
    async (
      npcId: NPCId,
      playerMessage: string,
      npcResponse: string,
      sentiment?: number,
      laughDetected?: boolean
    ) => {
      try {
        await tidb.trackConversation({
          npcId,
          playerMessage,
          npcResponse,
          playerSentiment: sentiment,
          laughDetected,
        });
      } catch (error) {
        // Silently fail
      }
    },
    []
  );

  // Track emotion
  const trackEmotion = useCallback(
    async (
      emotion: string,
      confidence: number,
      triggerEvent: string
    ) => {
      try {
        await tidb.trackEmotion({
          emotion,
          confidence,
          triggerEvent,
          location: gameState.location,
        });
      } catch (error) {
        // Silently fail
      }
    },
    [gameState.location]
  );

  // Track chicken interactions
  const trackChickenPet = useCallback(async () => {
    await trackEvent('chicken_pet', { mood: gameState.chickenMood });
  }, [gameState.chickenMood, trackEvent]);

  const trackChickenName = useCallback(async (name: string) => {
    await trackEvent('chicken_name', { name });
  }, [trackEvent]);

  // Track quest completion
  const trackQuestComplete = useCallback(
    async (questId: string, success: boolean = true) => {
      await trackEvent(success ? 'quest_complete' : 'quest_fail', { questId });
    },
    [trackEvent]
  );

  // Track laugh
  const trackLaugh = useCallback(async () => {
    await trackEvent('laugh', { timestamp: Date.now() });
  }, [trackEvent]);

  // Track memory unlock
  const trackMemoryUnlock = useCallback(
    async (memoryId: string, unlockedBy: NPCId) => {
      await trackEvent('memory_unlock', { memoryId, unlockedBy });
    },
    [trackEvent]
  );

  // Get NPC gossip for spicier dialogue
  const getNPCGossip = useCallback(async (npcId: NPCId) => {
    try {
      return await tidb.getNPCGossip(npcId, 3);
    } catch {
      return [];
    }
  }, []);

  return {
    sessionId: tidb.getSessionId(),
    trackEvent,
    trackConversation,
    trackEmotion,
    trackChickenPet,
    trackChickenName,
    trackQuestComplete,
    trackLaugh,
    trackMemoryUnlock,
    getNPCGossip,
  };
}
