'use client';

import { GoogleGenAI } from '@google/genai';

export type ChickenMood = 'happy' | 'neutral' | 'anxious' | 'angry' | 'sleepy';

interface ChickenContext {
  mood: number; // 0-100
  chickenName: string;
  location: string;
  playerEmotion?: string;
  lastPlayerAction?: string;
  timeRemaining?: number;
  npcName?: string;
}

interface ChickenResponse {
  sound: string; // "Bok bok!", "BAWK!", etc.
  thought: string; // What the chicken is thinking
  action: string; // What the chicken does
  moodChange: number; // -10 to +10
}

/**
 * AI Chicken Companion - has its own personality and reacts to events
 */
export async function getChickenReaction(
  context: ChickenContext,
  event: string,
  apiKey: string
): Promise<ChickenResponse | null> {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const moodDescription =
      context.mood > 80 ? 'very happy and content' :
      context.mood > 60 ? 'calm and comfortable' :
      context.mood > 40 ? 'slightly nervous' :
      context.mood > 20 ? 'anxious and restless' :
      'panicking and about to escape';

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `You are ${context.chickenName || 'the chicken'}, a ceremonial rooster being carried to a wedding in Singapore.

PERSONALITY:
- You're a proud kampong chicken with attitude
- You understand Singlish and human emotions
- You're dramatic and expressive
- You have opinions about Singapore locations and food smells
- You get jealous when player talks to pretty NPCs
- You love being petted and talked to nicely
- You HATE being ignored or treated roughly

CURRENT STATE:
- Mood: ${context.mood}% (${moodDescription})
- Location: ${context.location}
- Player emotion: ${context.playerEmotion || 'unknown'}
- Time remaining: ${context.timeRemaining ? Math.floor(context.timeRemaining / 60) + ' minutes' : 'unknown'}
${context.npcName ? `- Player is talking to: ${context.npcName}` : ''}

EVENT: ${event}

React to this event as the chicken. Respond in JSON format:
{
  "sound": "chicken sound like 'Bok bok!', 'BAWK!', 'Cluck cluck~', etc.",
  "thought": "what you're thinking in Singlish (short, 1 sentence)",
  "action": "physical action like 'fluffs feathers', 'pecks at player', 'nuzzles closer'",
  "moodChange": number from -10 to +10
}

Examples:
{"sound": "Bok bok!", "thought": "Wah this uncle drive so fast, my feathers all mess up!", "action": "grips player's arm tighter", "moodChange": -3}
{"sound": "Cluck cluck~", "thought": "Finally got attention sia, shiok!", "action": "preens happily", "moodChange": 5}
{"sound": "BAWK BAWK!", "thought": "Oi! Why you flirt with the pretty girl, I'm right here leh!", "action": "pecks player's hand jealously", "moodChange": -5}

Respond with ONLY the JSON, no markdown.`
        }]
      }]
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ChickenResponse;
    }
  } catch (err) {
    console.error('[AIChicken] Error:', err);
  }
  return null;
}

/**
 * Quick chicken reactions (no API call)
 */
export const QUICK_CHICKEN_REACTIONS: Record<string, ChickenResponse[]> = {
  petted: [
    { sound: 'Cluck cluck~', thought: 'Shiok ah, more please!', action: 'closes eyes contentedly', moodChange: 5 },
    { sound: 'Bok bok!', thought: 'Okay lah, you not so bad.', action: 'nuzzles into hand', moodChange: 5 },
  ],
  ignored: [
    { sound: 'Bawk!', thought: 'Hello?! I exist leh!', action: 'pecks at player impatiently', moodChange: -3 },
    { sound: 'Bok...', thought: 'Sian, nobody care about me...', action: 'droops head sadly', moodChange: -5 },
  ],
  traveling: [
    { sound: 'BAWK!', thought: 'Walao so bumpy!', action: 'grips tighter', moodChange: -2 },
    { sound: 'Bok bok bok!', thought: 'Motion sick already lah!', action: 'fluffs feathers anxiously', moodChange: -3 },
  ],
  location_hawker: [
    { sound: 'BOK BOK BOK!', thought: 'Wah the chicken rice smell... wait, that my cousin?!', action: 'looks around nervously', moodChange: -5 },
    { sound: 'Cluck?!', thought: 'Got chicken wing smell... scary sia!', action: 'hides behind player', moodChange: -3 },
  ],
  location_beach: [
    { sound: 'Bok bok~', thought: 'Beach vibes shiok!', action: 'enjoys the sea breeze', moodChange: 3 },
  ],
  location_mbs: [
    { sound: 'BAWK!', thought: 'Wah so atas! I just kampong chicken only...', action: 'tries to look dignified', moodChange: 0 },
  ],
  player_angry: [
    { sound: 'Bok?', thought: 'Eh why so angry? Not my fault leh...', action: 'shrinks back nervously', moodChange: -5 },
  ],
  player_happy: [
    { sound: 'Bok bok!', thought: 'You happy I also happy!', action: 'bobs head cheerfully', moodChange: 3 },
  ],
  npc_female: [
    { sound: 'BAWK!', thought: 'Oi! Eyes on me, not on her!', action: 'pecks player jealously', moodChange: -2 },
  ],
  time_warning: [
    { sound: 'BOK BOK BOK!', thought: 'FASTER LAH! Wedding waiting!', action: 'flaps wings urgently', moodChange: -5 },
  ],
};

export function getQuickChickenReaction(event: keyof typeof QUICK_CHICKEN_REACTIONS): ChickenResponse {
  const options = QUICK_CHICKEN_REACTIONS[event];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get chicken mood description
 */
export function getChickenMoodEmoji(mood: number): string {
  if (mood > 80) return '😊';
  if (mood > 60) return '😐';
  if (mood > 40) return '😟';
  if (mood > 20) return '😰';
  return '🔥'; // about to escape!
}

export function getChickenMoodText(mood: number): string {
  if (mood > 80) return 'Happy & Content';
  if (mood > 60) return 'Calm';
  if (mood > 40) return 'Nervous';
  if (mood > 20) return 'Anxious';
  return 'PANICKING!';
}
