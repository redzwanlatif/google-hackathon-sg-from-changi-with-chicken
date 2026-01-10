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
{"sound": "BAWK BAWK!", "thought": "Oi! Why you talk so long, pay attention to me leh!", "action": "pecks player's hand jealously", "moodChange": -5}

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
 * Quick chicken reactions (no API call) - Chicken is the narrator!
 */
export const QUICK_CHICKEN_REACTIONS: Record<string, ChickenResponse[]> = {
  // === PLAYER INTERACTIONS ===
  petted: [
    { sound: 'Cluck cluck~', thought: 'Shiok ah! Finally this blur sotong remember I exist!', action: 'closes eyes contentedly', moodChange: 5 },
    { sound: 'Bok bok!', thought: 'Okay lah, you not so bad. Maybe got hope for you.', action: 'nuzzles into hand', moodChange: 5 },
  ],
  ignored: [
    { sound: 'Bawk!', thought: 'OI! I the star of this show leh! Why you ignore me?!', action: 'pecks at player impatiently', moodChange: -3 },
    { sound: 'Bok...', thought: 'Wah this one really blur king sia... forget about chicken already.', action: 'droops head sadly', moodChange: -5 },
  ],

  // === TRAVEL & LOCATIONS ===
  traveling: [
    { sound: 'BAWK!', thought: 'Walao this journey damn jialat! My feathers all mess up!', action: 'grips tighter', moodChange: -2 },
    { sound: 'Bok bok bok!', thought: 'Eh steady lah! I not luggage okay!', action: 'fluffs feathers anxiously', moodChange: -3 },
  ],
  location_hawker: [
    { sound: 'BOK BOK BOK!', thought: 'WAH THE CHICKEN RICE SMELL! Confirm that my cousin Ah Huat!', action: 'looks around nervously', moodChange: -5 },
    { sound: 'BAWK?!', thought: 'Why you bring me to hawker centre?! You want eat ME issit?!', action: 'hides behind player', moodChange: -3 },
  ],
  location_beach: [
    { sound: 'Bok bok~', thought: 'Wah East Coast shiok! Sea breeze best for my feathers~', action: 'enjoys the sea breeze', moodChange: 3 },
  ],
  location_mbs: [
    { sound: 'BAWK!', thought: 'Marina Bay Sands sia! I just kampong chicken only, damn paiseh...', action: 'tries to look dignified', moodChange: 0 },
  ],

  // === GAME START ===
  game_start: [
    { sound: 'BOK BOK!', thought: 'Wah lao this blur sotong finally wake up! Got chicken but dunno why!', action: 'stares at player judgingly', moodChange: 0 },
    { sound: 'Cluck?', thought: 'Eh hello? You remember anything not? I been waiting damn long already!', action: 'pecks player gently', moodChange: 0 },
  ],

  // === TIME PRESSURE ===
  time_warning: [
    { sound: 'BOK BOK BOK!', thought: 'FASTER LAH! Wedding waiting for us! You want Marcus angry ah?!', action: 'flaps wings urgently', moodChange: -5 },
    { sound: 'BAWK BAWK!', thought: 'Aiyo time running out liao! Chiong ah chiong!', action: 'jumps up and down', moodChange: -3 },
  ],
  time_critical: [
    { sound: 'BAWK BAWK BAWK!!!', thought: 'DIE LAH DIE LAH! Only few minutes left! RUN!!!', action: 'flapping frantically', moodChange: -10 },
  ],

  // === PLAYER EMOTIONS ===
  player_angry: [
    { sound: 'Bok?', thought: 'Eh why you so fierce? I never do anything wrong leh...', action: 'shrinks back nervously', moodChange: -5 },
    { sound: 'Bawk...', thought: 'Walao relax lah bro, angry also cannot solve problem one.', action: 'looks worried', moodChange: -3 },
  ],
  player_happy: [
    { sound: 'Bok bok!', thought: 'Wah you smiling! Good good, happy chicken happy human!', action: 'bobs head cheerfully', moodChange: 3 },
  ],
  player_funny: [
    { sound: 'BOK BOK BOK!', thought: 'HAHAHA wah lao why you make monkey face at me sia!', action: 'tilts head confused then laughs', moodChange: 5 },
    { sound: 'Cluck cluck~', thought: 'Aiyo this one natural born comedian! Blur but funny!', action: 'flaps wings amused', moodChange: 4 },
  ],
  player_shocked: [
    { sound: 'BAWK?!', thought: 'Eh why you so shocked? Got hantu ah?! WHERE?!', action: 'looks around nervously', moodChange: -2 },
  ],
  player_confused: [
    { sound: 'Bok bok...', thought: 'Aiyo this one really blur like sotong. Need help sia...', action: 'shakes head', moodChange: 0 },
  ],
  player_sad: [
    { sound: 'Bok...', thought: 'Eh don cry lah... everything will be okay one...', action: 'nuzzles closer comfortingly', moodChange: 2 },
  ],

  // === NPC INTERACTIONS ===
  npc_female: [
    { sound: 'BAWK!', thought: 'OI! Eyes on mission, not on the chio bu! I watching you!', action: 'pecks player jealously', moodChange: -2 },
  ],
  npc_angry: [
    { sound: 'Bok bok...', thought: 'Wah this NPC damn fierce sia. Better talk nicely!', action: 'hides behind player', moodChange: -2 },
  ],
  npc_happy: [
    { sound: 'Cluck!', thought: 'Nice nice, this one friendly! Got hope for us!', action: 'perks up happily', moodChange: 2 },
  ],

  // === QUEST EVENTS ===
  quest_complete: [
    { sound: 'BOK BOK BOK!', thought: 'YESSS! Quest complete! This blur sotong actually can do things!', action: 'does victory dance', moodChange: 5 },
  ],
  memory_unlock: [
    { sound: 'BAWK!', thought: 'OH FINALLY! Brain cells working! You remember something liao!', action: 'flaps excitedly', moodChange: 5 },
  ],

  // === CHICKEN MOOD ===
  chicken_angry: [
    { sound: 'BAWK BAWK!', thought: 'Oi I damn sian already! You never sayang me at all!', action: 'ruffles feathers angrily', moodChange: 0 },
  ],
  chicken_happy: [
    { sound: 'Cluck cluck~', thought: 'Wah I so happy now! Best day ever sia~', action: 'preens happily', moodChange: 0 },
  ],
  chicken_escape_warning: [
    { sound: 'BOK BOK BOK!', thought: 'Eh I warning you ah! One more time I fly away! Serious!', action: 'flaps wings threateningly', moodChange: 0 },
  ],

  // === ENDING ===
  near_ending: [
    { sound: 'BAWK BAWK BAWK!', thought: 'ALMOST THERE! The wedding waiting! Don screw up now!', action: 'bounces excitedly', moodChange: 0 },
  ],
  success: [
    { sound: 'BOK BOK BOK!!!', thought: 'WE DID IT!!! HUAT AH! Best human ever (actually not bad lah)!', action: 'victory dance', moodChange: 10 },
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
