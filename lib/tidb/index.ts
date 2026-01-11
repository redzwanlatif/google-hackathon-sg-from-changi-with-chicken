// TiDB Connection Utility for "The Chicken Must Arrive"
// Uses mysql2 for TiDB Cloud connection (MySQL compatible)

import { GameState, Location, NPCId } from '../game-state';

// ============================================
// TYPES
// ============================================

export interface PlayerSession {
  id: string;
  nickname?: string;
  chickenName?: string;
  startedAt: Date;
  endedAt?: Date;
  ending?: string;
  finalTimeRemaining?: number;
  finalMoney?: number;
  finalChickenMood?: number;
  memoriesUnlocked?: number;
  locationsVisited?: Location[];
}

export interface PlayerEvent {
  sessionId: string;
  eventType: PlayerEventType;
  eventData: Record<string, unknown>;
  location: Location;
}

export type PlayerEventType =
  | 'game_start'
  | 'npc_talk'
  | 'npc_response'
  | 'travel'
  | 'quest_complete'
  | 'quest_fail'
  | 'emotion_detected'
  | 'chicken_pet'
  | 'chicken_name'
  | 'memory_unlock'
  | 'money_spent'
  | 'laugh'
  | 'game_end';

export interface NPCConversation {
  sessionId: string;
  npcId: NPCId;
  playerMessage: string;
  npcResponse: string;
  playerSentiment?: number;
  laughDetected?: boolean;
}

export interface EmotionEntry {
  sessionId: string;
  emotion: string;
  confidence: number;
  triggerEvent: string;
  location: Location;
}

export interface PlayerDNA {
  sessionId: string;
  nickname?: string;
  chickenName?: string;
  dnaEmbedding: number[];
  playerType: string;
  traits: string[];
  totalLaughs: number;
  totalConversations: number;
  avgChickenMood: number;
  singlishFluency: number;
  emotionalRange: string[];
  ending?: string;
  completionTime?: number;
  locationsVisited: number;
}

export interface SoulTwin {
  sessionId: string;
  nickname?: string;
  chickenName?: string;
  playerType: string;
  similarity: number;
  ending?: string;
}

// ============================================
// API CLIENT (calls our Next.js API routes)
// ============================================

const API_BASE = '/api/tidb';

class TiDBClient {
  private sessionId: string | null = null;

  // Initialize a new session
  async startSession(nickname?: string): Promise<string> {
    const response = await fetch(`${API_BASE}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    });
    const data = await response.json();
    this.sessionId = data.sessionId;
    return this.sessionId!;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  setSessionId(id: string) {
    this.sessionId = id;
  }

  // Track a player event
  async trackEvent(event: Omit<PlayerEvent, 'sessionId'>): Promise<void> {
    if (!this.sessionId) return;

    await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        ...event,
      }),
    }).catch(console.error); // Don't block on analytics
  }

  // Track NPC conversation
  async trackConversation(conversation: Omit<NPCConversation, 'sessionId'>): Promise<void> {
    if (!this.sessionId) return;

    await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        ...conversation,
      }),
    }).catch(console.error);
  }

  // Track emotion
  async trackEmotion(emotion: Omit<EmotionEntry, 'sessionId'>): Promise<void> {
    if (!this.sessionId) return;

    await fetch(`${API_BASE}/emotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        ...emotion,
      }),
    }).catch(console.error);
  }

  // End session and generate DNA
  async endSession(gameState: GameState): Promise<PlayerDNA | null> {
    if (!this.sessionId) return null;

    const response = await fetch(`${API_BASE}/session/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        gameState,
      }),
    });

    if (!response.ok) return null;
    return response.json();
  }

  // Find soul twins
  async findSoulTwins(limit: number = 5): Promise<SoulTwin[]> {
    if (!this.sessionId) return [];

    const response = await fetch(
      `${API_BASE}/soul-twins?sessionId=${this.sessionId}&limit=${limit}`
    );

    if (!response.ok) return [];
    return response.json();
  }

  // Get player DNA
  async getPlayerDNA(): Promise<PlayerDNA | null> {
    if (!this.sessionId) return null;

    const response = await fetch(`${API_BASE}/dna?sessionId=${this.sessionId}`);
    if (!response.ok) return null;
    return response.json();
  }

  // Get global stats
  async getGlobalStats(): Promise<{
    totalPlayers: number;
    chickensSaved: number;
    avgChickenMood: number;
    topChickenNames: { name: string; count: number }[];
    endingDistribution: Record<string, number>;
  }> {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) {
      return {
        totalPlayers: 0,
        chickensSaved: 0,
        avgChickenMood: 50,
        topChickenNames: [],
        endingDistribution: {},
      };
    }
    return response.json();
  }

  // Get location emotion heatmap
  async getLocationEmotions(): Promise<Record<Location, Record<string, number>>> {
    const response = await fetch(`${API_BASE}/location-emotions`);
    if (!response.ok) return {} as Record<Location, Record<string, number>>;
    return response.json();
  }

  // Get NPC gossip (what other players said)
  async getNPCGossip(npcId: NPCId, limit: number = 3): Promise<{
    playerNickname?: string;
    summary: string;
    timestamp: string;
  }[]> {
    const response = await fetch(
      `${API_BASE}/npc-gossip?npcId=${npcId}&limit=${limit}`
    );
    if (!response.ok) return [];
    return response.json();
  }
}

// Singleton instance
export const tidb = new TiDBClient();

// ============================================
// HELPER FUNCTIONS
// ============================================

// Generate a unique session ID
export function generateSessionId(): string {
  return crypto.randomUUID();
}

// Calculate player type based on their journey
export function calculatePlayerType(stats: {
  avgChickenMood: number;
  totalConversations: number;
  completionTime: number;
  singlishUsage: number;
  laughCount: number;
  locationsVisited: number;
}): string {
  const types: { condition: boolean; type: string }[] = [
    { condition: stats.avgChickenMood >= 80, type: 'The Chicken Whisperer' },
    { condition: stats.completionTime < 3600, type: 'The Speedrunner' },
    { condition: stats.laughCount >= 10, type: 'The Comedy King' },
    { condition: stats.singlishUsage >= 70, type: 'The Local Legend' },
    { condition: stats.totalConversations >= 50, type: 'The Chatterbox' },
    { condition: stats.locationsVisited >= 5, type: 'The Explorer' },
    { condition: stats.avgChickenMood <= 30, type: 'The Chaos Agent' },
  ];

  for (const { condition, type } of types) {
    if (condition) return type;
  }

  return 'The Adventurer';
}

// Extract traits from player journey
export function extractTraits(stats: {
  avgChickenMood: number;
  singlishUsage: number;
  laughCount: number;
  patienceScore: number;
  questsCompleted: number;
}): string[] {
  const traits: string[] = [];

  if (stats.avgChickenMood >= 70) traits.push('chicken_lover');
  if (stats.singlishUsage >= 50) traits.push('singlish_speaker');
  if (stats.laughCount >= 5) traits.push('good_humor');
  if (stats.patienceScore >= 70) traits.push('patient');
  if (stats.questsCompleted >= 4) traits.push('completionist');

  return traits.slice(0, 5); // Max 5 traits
}
