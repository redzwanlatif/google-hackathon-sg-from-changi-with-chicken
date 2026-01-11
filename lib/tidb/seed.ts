// Seed script for TiDB - creates sample player data for demo
// 23 simulated players with diverse profiles

import { v4 as uuidv4 } from 'uuid';

// Chicken name generator
const CHICKEN_NAMES = [
  'Colonel Sanders', 'Nugget', 'Cluckles', 'Sir Clucks-a-Lot', 'Hainanese',
  'General Tso', 'Birdy', 'Char Siew', 'Drumstick', 'Feathers McFlap',
  'Popcorn', 'Tikka', 'Satay', 'Laksa', 'Rendang',
  'Ayam', 'Chicky', 'Wing Commander', 'Beaky', 'Scrambles',
  'Sunny Side', 'Omelette', 'Benedict', 'Teriyaki', 'Buffalo'
];

const NICKNAMES = [
  'ChickenLord88', 'SpeedyGonzales', 'AuntieFan', 'ChaosKing', 'SingaporeanDream',
  'FirstTimer', 'FoodiePlayer', 'LaughMaster', 'SinglishPro', 'MBSRacer',
  'ChickenWhisperer99', 'HawkerHero', 'GrabUncle', 'KiaSuKing', 'ShiokPlayer',
  'LocalLegend', 'TouristBob', 'WeddingCrasher', 'BestManBen', 'AhBengFan',
  'MaxwellMaster', 'EastCoastEric', 'CBDChampion'
];

const PLAYER_TYPES = [
  'The Chicken Whisperer', 'The Speedrunner', 'The Comedy King', 'The Local Legend',
  'The Chatterbox', 'The Explorer', 'The Chaos Agent', 'The Adventurer'
];

const ENDINGS = ['perfect', 'good', 'okay', 'timeout', 'chicken-lost', 'broke'];
const ENDING_WEIGHTS = [0.25, 0.30, 0.20, 0.10, 0.10, 0.05]; // Probability weights

const EMOTIONS = ['happy', 'stressed', 'confused', 'laughing', 'angry', 'triumphant', 'funny', 'shocked'];
const TRAITS = ['chicken_lover', 'singlish_speaker', 'good_humor', 'patient', 'completionist'];

// Generate weighted random ending
function getWeightedEnding(): string {
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < ENDINGS.length; i++) {
    cumulative += ENDING_WEIGHTS[i];
    if (rand < cumulative) return ENDINGS[i];
  }
  return 'good';
}

// Generate random subset of array
function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Generate 23 sample players
export function generateSamplePlayers() {
  const players = [];

  for (let i = 0; i < 23; i++) {
    const ending = getWeightedEnding();
    const isGoodEnding = ['perfect', 'good', 'okay'].includes(ending);

    // Stats correlated with ending
    const baseChickenMood = isGoodEnding ? 60 : 30;
    const chickenMood = Math.min(100, Math.max(0, baseChickenMood + Math.floor(Math.random() * 40) - 10));

    const baseLaughs = isGoodEnding ? 8 : 3;
    const laughs = Math.max(0, baseLaughs + Math.floor(Math.random() * 15) - 5);

    const conversations = Math.floor(Math.random() * 50) + 10;
    const singlishFluency = Math.floor(Math.random() * 80) + 20;

    // Completion time (faster for speedrunners, slower for explorers)
    const completionTime = Math.floor(Math.random() * 4800) + 1800; // 30min to 110min

    // Determine player type based on stats
    let playerType: string;
    if (chickenMood >= 80) playerType = 'The Chicken Whisperer';
    else if (completionTime < 2400) playerType = 'The Speedrunner';
    else if (laughs >= 15) playerType = 'The Comedy King';
    else if (singlishFluency >= 80) playerType = 'The Local Legend';
    else if (conversations >= 40) playerType = 'The Chatterbox';
    else if (ending === 'chicken-lost' || ending === 'broke') playerType = 'The Chaos Agent';
    else playerType = PLAYER_TYPES[Math.floor(Math.random() * PLAYER_TYPES.length)];

    const emotions = randomSubset(EMOTIONS, 2, 5);
    const traits = randomSubset(TRAITS, 0, 4);

    players.push({
      nickname: NICKNAMES[i] || `Player${i + 1}`,
      chickenName: CHICKEN_NAMES[i] || `Chicken${i + 1}`,
      playerType,
      ending,
      chickenMood,
      laughs,
      conversations,
      singlishFluency,
      emotions,
      traits,
      completionTime,
      locationsVisited: ending === 'timeout' ? Math.floor(Math.random() * 3) + 2 : 5,
    });
  }

  return players;
}

// Sample Singlish phrases with realistic counts
export const SAMPLE_SINGLISH = [
  { phrase: 'lah', meaning: 'Emphasis particle', context: 'emphasis', count: 1247 },
  { phrase: 'wah', meaning: 'Expression of surprise', context: 'exclamation', count: 823 },
  { phrase: 'can or not', meaning: 'Is it possible?', context: 'question', count: 612 },
  { phrase: 'aiyo', meaning: 'Oh dear/Oh no', context: 'exclamation', count: 589 },
  { phrase: 'paiseh', meaning: 'Embarrassed/Sorry', context: 'apology', count: 456 },
  { phrase: 'shiok', meaning: 'Great/Awesome', context: 'adjective', count: 398 },
  { phrase: 'blur', meaning: 'Confused', context: 'adjective', count: 267 },
  { phrase: 'kiasu', meaning: 'Fear of losing out', context: 'adjective', count: 245 },
  { phrase: 'lepak', meaning: 'Relax/Chill', context: 'verb', count: 198 },
  { phrase: 'siao', meaning: 'Crazy', context: 'adjective', count: 187 },
  { phrase: 'steady', meaning: 'Cool/Reliable', context: 'adjective', count: 156 },
  { phrase: 'makan', meaning: 'Eat', context: 'verb', count: 143 },
];

// Generate a fake 384-dim embedding (for demo purposes)
export function generateFakeEmbedding(): number[] {
  return Array.from({ length: 384 }, () => Math.random() * 2 - 1);
}

// Export sample players
export const SAMPLE_PLAYERS = generateSamplePlayers();

// Export for API route
export const seedData = {
  players: SAMPLE_PLAYERS,
  singlish: SAMPLE_SINGLISH,
};
