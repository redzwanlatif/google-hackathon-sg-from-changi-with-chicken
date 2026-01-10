export type Location =
  | 'changi'
  | 'maxwell'
  | 'cbd'
  | 'east-coast'
  | 'mbs';

export type ChickenMood = 'happy' | 'neutral' | 'upset' | 'furious';

export type NPCId =
  | 'airport-auntie'
  | 'auntie-mei'
  | 'grab-uncle'
  | 'ah-beng'
  | 'jessica'
  | 'security-guard'
  | 'marcus';

export interface Memory {
  id: string;
  text: string;
  unlockedBy: NPCId;
  unlockedAt: number;
}

export interface GameState {
  // Core resources
  timeRemaining: number;    // seconds (starts at 7200 = 2 hours)
  money: number;            // dollars (starts at 30)
  battery: number;          // percentage (starts at 3)

  // Chicken
  chickenMood: number;      // 0-100 (starts at 50)
  chickenName: string | null;

  // Progress
  memories: Memory[];       // 0-10 fragments
  location: Location;
  currentNpc: NPCId | null;
  unlockedLocations: Location[];  // Sequential progression

  // Game status
  gameStarted: boolean;
  gameOver: boolean;
  ending: 'perfect' | 'good' | 'okay' | 'timeout' | 'chicken-lost' | 'broke' | null;

  // NPC relationships
  npcTrust: Record<NPCId, number>;
  completedQuests: string[];
}

export const INITIAL_GAME_STATE: GameState = {
  timeRemaining: 7200,  // 2 hours in seconds
  money: 30,
  battery: 3,
  chickenMood: 50,
  chickenName: null,
  memories: [],
  location: 'changi',
  currentNpc: 'airport-auntie',
  unlockedLocations: ['changi'],  // Only starting location unlocked
  gameStarted: false,
  gameOver: false,
  ending: null,
  npcTrust: {
    'airport-auntie': 0,
    'auntie-mei': -2,  // starts mad (owes $50)
    'grab-uncle': 1,
    'ah-beng': 0,
    'jessica': -1,     // stressed
    'security-guard': 0,
    'marcus': 3,       // your best friend
  },
  completedQuests: [],
};

// Location unlock progression: which memory unlocks which location
export const LOCATION_UNLOCK_MAP: Record<string, Location> = {
  'memory-1': 'maxwell',      // Airport Auntie mentions Maxwell → unlock Maxwell
  'memory-2': 'cbd',          // Auntie Mei mentions Marcus → unlock CBD (Grab Uncle)
  'memory-3': 'east-coast',   // Grab Uncle mentions MBS → unlock East Coast
  'memory-4': 'mbs',          // Ah Beng mentions best man → unlock MBS (final)
};

export const LOCATION_INFO: Record<Location, {
  name: string;
  description: string;
  npcs: NPCId[];
  travelCost: number;
  travelTime: number;
}> = {
  changi: {
    name: 'Changi Airport',
    description: 'Terminal 3, where you woke up',
    npcs: ['airport-auntie'],
    travelCost: 0,
    travelTime: 0,
  },
  maxwell: {
    name: 'Maxwell Food Centre',
    description: 'Famous hawker center',
    npcs: ['auntie-mei'],
    travelCost: 5,
    travelTime: 600, // 10 min
  },
  cbd: {
    name: 'CBD / Raffles Place',
    description: 'Business district',
    npcs: ['grab-uncle'],
    travelCost: 8,
    travelTime: 480, // 8 min
  },
  'east-coast': {
    name: 'East Coast Park',
    description: 'Beach and BBQ pits',
    npcs: ['ah-beng'],
    travelCost: 10,
    travelTime: 720, // 12 min
  },
  mbs: {
    name: 'Marina Bay Sands',
    description: 'The wedding venue',
    npcs: ['jessica', 'security-guard', 'marcus'],
    travelCost: 12,
    travelTime: 600, // 10 min
  },
};

export function getChickenMoodLabel(mood: number): ChickenMood {
  if (mood >= 70) return 'happy';
  if (mood >= 40) return 'neutral';
  if (mood >= 20) return 'upset';
  return 'furious';
}

export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
