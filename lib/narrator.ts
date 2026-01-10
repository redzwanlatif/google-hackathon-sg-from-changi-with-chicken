'use client';

import { GoogleGenAI } from '@google/genai';

export type NarratorEvent =
  | 'game_start'
  | 'location_change'
  | 'memory_unlock'
  | 'quest_complete'
  | 'chicken_angry'
  | 'chicken_happy'
  | 'time_warning'
  | 'npc_angry'
  | 'npc_happy'
  | 'player_confused'
  | 'player_angry'
  | 'near_ending';

interface NarratorContext {
  event: NarratorEvent;
  location?: string;
  npc?: string;
  timeRemaining?: number;
  chickenMood?: number;
  memoriesCount?: number;
  playerEmotion?: string;
  extraContext?: string;
}

/**
 * Generate narrator commentary in Singlish
 */
export async function generateNarration(
  context: NarratorContext,
  apiKey: string
): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const eventDescriptions: Record<NarratorEvent, string> = {
      game_start: 'Player just woke up at Changi Airport with amnesia, holding a chicken',
      location_change: `Player traveled to ${context.location}`,
      memory_unlock: `Player just recovered a memory! Total: ${context.memoriesCount}/10`,
      quest_complete: `Player completed a quest for ${context.npc}`,
      chicken_angry: `The chicken mood dropped to ${context.chickenMood}% - it might escape!`,
      chicken_happy: `The chicken is happy at ${context.chickenMood}%`,
      time_warning: `Only ${Math.floor((context.timeRemaining || 0) / 60)} minutes left!`,
      npc_angry: `${context.npc} is getting angry at the player`,
      npc_happy: `${context.npc} is now friendly with the player`,
      player_confused: 'Player seems confused based on their expression',
      player_angry: 'Player looks frustrated or angry',
      near_ending: `Almost at the wedding! ${context.timeRemaining} seconds left!`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `You are a dramatic Singlish narrator for a comedy game about delivering a chicken to a wedding.

Event: ${eventDescriptions[context.event]}
${context.extraContext ? `Extra context: ${context.extraContext}` : ''}

Generate a SHORT (1-2 sentences) dramatic narrator line in heavy Singlish.
- Use particles: lah, leh, lor, sia, meh, ah
- Be dramatic but funny
- Reference Singapore culture
- Add tension or humor based on the event

Examples:
- "Wah lao eh, this blur sotong finally wake up! Got chicken some more, confirm something big happening sia!"
- "Alamak, the ayam looking damn sian already. Better sayang it before it fly away!"
- "Time running out liao! Faster go, don't play play!"

Respond with ONLY the narrator line, no quotes or explanation.`
        }]
      }]
    });

    return response.text?.trim() || null;
  } catch (err) {
    console.error('[Narrator] Error:', err);
    return null;
  }
}

/**
 * Pre-defined quick narrations (no API call needed)
 */
export const QUICK_NARRATIONS: Record<string, string[]> = {
  game_start: [
    "Wah lao eh, our hero wake up liao! But blur like sotong, dunno what happen sia...",
    "Alamak, got chicken in hand but brain empty. This one confirm jialat!",
  ],
  chicken_escape_warning: [
    "Eh eh eh! The ayam looking restless sia, better do something quick!",
    "Oi! Your chicken want to cabut already! Sayang it lah!",
  ],
  time_30min: [
    "30 minutes left only! Faster lah, the wedding cannot wait!",
    "Wah, time flying like no tomorrow sia! Chiong ah!",
  ],
  time_10min: [
    "10 MINUTES! Confirm plus chop must rush now!",
    "Die lah die lah, almost no time already!",
  ],
  memory_unlock: [
    "DING! Memory unlocked! The blur sotong starting to remember liao!",
    "Wah, brain cells finally working! Got clue already!",
  ],
};

export function getQuickNarration(event: keyof typeof QUICK_NARRATIONS): string {
  const options = QUICK_NARRATIONS[event];
  return options[Math.floor(Math.random() * options.length)];
}
