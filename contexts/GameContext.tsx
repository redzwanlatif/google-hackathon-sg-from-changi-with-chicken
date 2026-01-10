'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  GameState,
  INITIAL_GAME_STATE,
  Location,
  NPCId,
  Memory,
  LOCATION_INFO,
  LOCATION_UNLOCK_MAP
} from '@/lib/game-state';

type GameAction =
  | { type: 'START_GAME' }
  | { type: 'TICK' }
  | { type: 'SPEND_MONEY'; amount: number }
  | { type: 'GAIN_MONEY'; amount: number }
  | { type: 'DRAIN_BATTERY'; amount: number }
  | { type: 'CHARGE_BATTERY'; amount: number }
  | { type: 'UPDATE_CHICKEN_MOOD'; delta: number }
  | { type: 'SET_CHICKEN_NAME'; name: string }
  | { type: 'UNLOCK_MEMORY'; memory: Memory }
  | { type: 'TRAVEL_TO'; location: Location }
  | { type: 'SET_NPC'; npcId: NPCId | null }
  | { type: 'UPDATE_NPC_TRUST'; npcId: NPCId; delta: number }
  | { type: 'COMPLETE_QUEST'; questId: string }
  | { type: 'GAME_OVER'; ending: GameState['ending'] }
  | { type: 'RESET_GAME' }
  | { type: 'DEBUG_JUMP'; location: Location; unlockedLocations: Location[] };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return { ...state, gameStarted: true };

    case 'TICK':
      if (!state.gameStarted || state.gameOver) return state;
      const newTime = state.timeRemaining - 1;
      const newBattery = Math.max(0, state.battery - 0.003); // ~1% per 5 min

      // Check for timeout
      if (newTime <= 0) {
        return { ...state, timeRemaining: 0, gameOver: true, ending: 'timeout' };
      }

      // Check for dead battery
      return {
        ...state,
        timeRemaining: newTime,
        battery: newBattery,
      };

    case 'SPEND_MONEY':
      const afterSpend = state.money - action.amount;
      if (afterSpend < 0) {
        return { ...state, money: 0, gameOver: true, ending: 'broke' };
      }
      return { ...state, money: afterSpend };

    case 'GAIN_MONEY':
      return { ...state, money: state.money + action.amount };

    case 'DRAIN_BATTERY':
      return { ...state, battery: Math.max(0, state.battery - action.amount) };

    case 'CHARGE_BATTERY':
      return { ...state, battery: Math.min(100, state.battery + action.amount) };

    case 'UPDATE_CHICKEN_MOOD':
      const newMood = Math.max(0, Math.min(100, state.chickenMood + action.delta));
      // Check for chicken escape
      if (newMood <= 0) {
        return { ...state, chickenMood: 0, gameOver: true, ending: 'chicken-lost' };
      }
      return { ...state, chickenMood: newMood };

    case 'SET_CHICKEN_NAME':
      return {
        ...state,
        chickenName: action.name,
        chickenMood: Math.min(100, state.chickenMood + 10), // naming bonus
      };

    case 'UNLOCK_MEMORY':
      if (state.memories.find(m => m.id === action.memory.id)) {
        return state; // already unlocked
      }
      // Check if this memory unlocks a new location
      const newLocation = LOCATION_UNLOCK_MAP[action.memory.id];
      const newUnlockedLocations = newLocation && !state.unlockedLocations.includes(newLocation)
        ? [...state.unlockedLocations, newLocation]
        : state.unlockedLocations;

      return {
        ...state,
        memories: [...state.memories, action.memory],
        unlockedLocations: newUnlockedLocations,
      };

    case 'TRAVEL_TO':
      // Check if location is unlocked
      if (!state.unlockedLocations.includes(action.location)) {
        console.log('[GameContext] Location not unlocked:', action.location);
        return state; // location not unlocked yet
      }

      const locationInfo = LOCATION_INFO[action.location];
      const travelCost = locationInfo.travelCost;

      if (state.money < travelCost) {
        return state; // can't afford
      }

      return {
        ...state,
        location: action.location,
        money: state.money - travelCost,
        timeRemaining: state.timeRemaining - locationInfo.travelTime,
        currentNpc: locationInfo.npcs[0] || null,
        chickenMood: Math.max(0, state.chickenMood - 5), // travel stress
      };

    case 'SET_NPC':
      return { ...state, currentNpc: action.npcId };

    case 'UPDATE_NPC_TRUST':
      return {
        ...state,
        npcTrust: {
          ...state.npcTrust,
          [action.npcId]: state.npcTrust[action.npcId] + action.delta,
        },
      };

    case 'COMPLETE_QUEST':
      if (state.completedQuests.includes(action.questId)) {
        return state;
      }
      return {
        ...state,
        completedQuests: [...state.completedQuests, action.questId]
      };

    case 'GAME_OVER':
      return { ...state, gameOver: true, ending: action.ending };

    case 'RESET_GAME':
      return INITIAL_GAME_STATE;

    case 'DEBUG_JUMP':
      const jumpLocationInfo = LOCATION_INFO[action.location];
      return {
        ...state,
        gameStarted: true,
        location: action.location,
        currentNpc: jumpLocationInfo.npcs[0] || null,
        unlockedLocations: action.unlockedLocations,
      };

    default:
      return state;
  }
}

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  // Convenience methods
  startGame: () => void;
  spendMoney: (amount: number) => boolean;
  gainMoney: (amount: number) => void;
  updateChickenMood: (delta: number) => void;
  nameChicken: (name: string) => void;
  travelTo: (location: Location) => boolean;
  unlockMemory: (memory: Memory) => void;
  setNpc: (npcId: NPCId | null) => void;
  updateNpcTrust: (npcId: NPCId, delta: number) => void;
  completeQuest: (questId: string) => void;
  triggerEnding: (ending: GameState['ending']) => void;
  debugJump: (location: Location, unlockedLocations: Location[]) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);

  // Game timer
  useEffect(() => {
    if (!state.gameStarted || state.gameOver) return;

    const interval = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.gameStarted, state.gameOver]);

  // Convenience methods
  const startGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
  }, []);

  const spendMoney = useCallback((amount: number): boolean => {
    if (state.money >= amount) {
      dispatch({ type: 'SPEND_MONEY', amount });
      return true;
    }
    return false;
  }, [state.money]);

  const gainMoney = useCallback((amount: number) => {
    dispatch({ type: 'GAIN_MONEY', amount });
  }, []);

  const updateChickenMood = useCallback((delta: number) => {
    dispatch({ type: 'UPDATE_CHICKEN_MOOD', delta });
  }, []);

  const nameChicken = useCallback((name: string) => {
    dispatch({ type: 'SET_CHICKEN_NAME', name });
  }, []);

  const travelTo = useCallback((location: Location): boolean => {
    // Check if location is unlocked
    if (!state.unlockedLocations.includes(location)) {
      console.log('[GameContext] Cannot travel - location locked:', location);
      return false;
    }
    const info = LOCATION_INFO[location];
    if (state.money >= info.travelCost) {
      dispatch({ type: 'TRAVEL_TO', location });
      return true;
    }
    return false;
  }, [state.money, state.unlockedLocations]);

  const unlockMemory = useCallback((memory: Memory) => {
    dispatch({ type: 'UNLOCK_MEMORY', memory });
  }, []);

  const setNpc = useCallback((npcId: NPCId | null) => {
    dispatch({ type: 'SET_NPC', npcId });
  }, []);

  const updateNpcTrust = useCallback((npcId: NPCId, delta: number) => {
    dispatch({ type: 'UPDATE_NPC_TRUST', npcId, delta });
  }, []);

  const completeQuest = useCallback((questId: string) => {
    dispatch({ type: 'COMPLETE_QUEST', questId });
  }, []);

  const triggerEnding = useCallback((ending: GameState['ending']) => {
    dispatch({ type: 'GAME_OVER', ending });
  }, []);

  const debugJump = useCallback((location: Location, unlockedLocations: Location[]) => {
    dispatch({ type: 'DEBUG_JUMP', location, unlockedLocations });
  }, []);

  return (
    <GameContext.Provider value={{
      state,
      dispatch,
      startGame,
      spendMoney,
      gainMoney,
      updateChickenMood,
      nameChicken,
      travelTo,
      unlockMemory,
      setNpc,
      updateNpcTrust,
      completeQuest,
      triggerEnding,
      debugJump,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
