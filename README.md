# The Chicken Must Arrive

**A voice-first comedy adventure game for the Gemini 3 Hackathon Singapore**

Wake up with amnesia at Changi Airport holding a ceremonial chicken. Race across Singapore talking to AI NPCs to deliver the chicken and save your best friend's wedding!

---

## Technical Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PLAYER INTERACTION                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Voice      │    │    Text      │    │   Camera     │              │
│  │   Input      │    │   Fallback   │    │   Quest      │              │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
└─────────┼───────────────────┼───────────────────┼──────────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        GEMINI AI LAYER                                  │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │         Gemini Live API (gemini-2.5-flash-native-audio)        │    │
│  │    • Real-time voice chat with Singlish accents                │    │
│  │    • WebSocket streaming • PCM audio 16kHz/24kHz               │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                   Gemini 2.0 Flash                             │    │
│  │    • NPC dialogue generation                                   │    │
│  │    • Quest validation (camera image analysis)                  │    │
│  │    • Player emotion detection (face + text)                    │    │
│  │    • Chicken narrator AI reactions                             │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │           Gemini TTS (gemini-2.5-flash-preview-tts)            │    │
│  │    • Text-to-speech with Singlish persona context              │    │
│  │    • Character-specific voices (Aoede, Charon, Puck, Kore)     │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        GAME STATE LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │   Resources  │  │   Location   │  │    Quest     │  │   Memory   │  │
│  │  Time/Money  │  │  Progression │  │   Tracking   │  │   Unlock   │  │
│  │  Battery/Mood│  │              │  │              │  │            │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Gemini AI API Usage

### 1. Gemini Live API - Voice Chat

**Model:** `gemini-2.5-flash-native-audio-preview-12-2025`

The Live API enables real-time, natural voice conversations with NPCs speaking authentic Singlish.

```typescript
// lib/gemini-live-client.ts
import { GoogleGenAI, Modality } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Initialize voice session with NPC persona
const session = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: {
    responseModalities: [Modality.AUDIO, Modality.TEXT],
    systemInstruction: {
      parts: [{ text: npcSystemPrompt }]
    },
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: 'Kore' // Warm auntie voice
        }
      }
    }
  }
});

// Stream player audio to Gemini
session.sendRealtimeInput({
  audio: {
    data: base64AudioChunk,  // PCM 16kHz
    mimeType: 'audio/pcm;rate=16000'
  }
});

// Receive and play NPC response audio (24kHz)
session.on('audio', (audioData) => {
  audioContext.decodeAudioData(audioData);
});
```

**Voice Mapping per NPC:**
| NPC | Voice | Personality |
|-----|-------|-------------|
| Airport Auntie | Kore | Warm, helpful |
| Auntie Mei Mei | Aoede | Fierce, motherly |
| Grab Uncle | Charon | Philosophical, wise |
| Ah Beng | Puck | Energetic, bro-like |
| Security Guard | Fenrir | Stern, authoritative |

---

### 2. Gemini 2.0 Flash - Multi-Modal AI

**Model:** `gemini-2.0-flash`

Used for text generation, image analysis, and emotion detection.

#### A. NPC Dialogue Generation (Text Fallback)

```typescript
// hooks/useBrowserVoiceChat.ts
const response = await ai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: [
    {
      role: 'user',
      parts: [{ text: playerMessage }]
    }
  ],
  systemInstruction: {
    parts: [{ text: `
      ## Character: ${npc.name}
      You are a Singaporean ${npc.role} speaking Singlish.

      ## Singlish Rules
      - End sentences with "lah", "leh", "lor", "meh", "sia"
      - Use "can" for yes, "cannot" for no
      - Keep responses SHORT: 2-3 sentences max

      ## Current Game State
      - Player has $${money}, ${timeRemaining} minutes left
      - Chicken mood: ${chickenMood}/100
      - Quest status: ${questCompleted ? 'DONE - chase them away!' : 'pending'}
    ` }]
  }
});
```

#### B. Camera Quest Validation (Vision)

```typescript
// components/CameraQuest.tsx
const analyzeFrame = async (imageData: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData  // Base64 encoded
          }
        },
        {
          text: `Does this image show a chicken or any bird?

          Respond in JSON format:
          {
            "detected": true/false,
            "confidence": 0.0-1.0,
            "description": "What you see in the image"
          }`
        }
      ]
    }]
  });

  const result = JSON.parse(response.text());
  if (result.detected && result.confidence > 0.7) {
    completeQuest();
  }
};
```

#### C. Player Emotion Detection

```typescript
// lib/emotion-detector.ts

// Face emotion from camera (every 4 seconds)
export async function detectFaceEmotion(imageData: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: imageData } },
        { text: `Analyze the person's facial expression.

          Emotions: happy, angry, sad, confused, shocked, funny, neutral

          JSON response:
          {
            "emotion": "...",
            "confidence": 0.0-1.0,
            "description": "Brief Singlish comment like 'Wah you look stressed sia!'"
          }`
        }
      ]
    }]
  });

  return JSON.parse(response.text());
}

// Text emotion from speech
export async function detectTextEmotion(playerText: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{
      parts: [{
        text: `Analyze the emotion/tone of this message: "${playerText}"

        Return: { "emotion": "...", "tone": "aggressive|pleading|casual|emotional" }`
      }]
    }]
  });

  return JSON.parse(response.text());
}
```

#### D. Chicken Narrator AI

```typescript
// lib/ai-chicken.ts
export async function getChickenReaction(gameEvent: string, context: GameState) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{
      parts: [{
        text: `You are a proud kampong chicken with attitude, speaking Singlish.

        Current situation: ${gameEvent}
        Location: ${context.location}
        Your mood: ${context.chickenMood}/100

        React to this moment! JSON response:
        {
          "sound": "BAWK BAWK!" or similar,
          "thought": "Your sassy inner monologue in Singlish",
          "action": "What you physically do",
          "moodChange": number (-5 to +5)
        }`
      }]
    }]
  });

  return JSON.parse(response.text());
}
```

---

### 3. Gemini TTS - Singlish Text-to-Speech

**Model:** `gemini-2.5-flash-preview-tts`

Converts NPC text responses to natural Singlish speech.

```typescript
// lib/gemini-tts.ts
const SINGLISH_PERSONAS = {
  auntie: `You are a warm Singaporean auntie speaking Singlish.
    Always use: "lah", "leh", "lor", "meh", "sia"
    Say "can" for yes, drop articles, add emotion!`,

  uncle: `You are a wise Singaporean uncle, philosophical but casual.
    Speak slowly with "wah", "aiyo", pepper in Hokkien words.`,

  youngman: `You are an energetic young Singaporean bro.
    Heavy Singlish: "eh bro", "walao", "shiok", speak fast!`
};

export async function generateSpeech(text: string, persona: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{
      parts: [{
        text: `${SINGLISH_PERSONAS[persona]}

        Now speak this naturally: "${text}"`
      }]
    }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceMap[persona] }
        }
      }
    }
  });

  // Play audio via Web Audio API
  const audioData = response.candidates[0].content.parts[0].inlineData.data;
  playAudio(audioData);
}
```

---

## Technical Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GAME FLOW                                        │
└────────────────────────────────────────────────────────────────────────┘

    START GAME
         │
         ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  PERMISSION GATE │     │  Request Mic     │     │  All Granted?    │
│  Request Camera  │────▶│  "Talk to NPCs   │────▶│  Start Game!     │
│  "NPCs will read │     │   with voice!"   │     │                  │
│   your emotions" │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                          │
                                                          ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Initialize      │     │  Start Timer     │     │  Load Location   │
│  Game State      │────▶│  (2 hours)       │────▶│  (Changi)        │
│  Money: $30      │     │  TICK every 1s   │     │  NPC: Auntie     │
│  Battery: 3%     │     │                  │     │                  │
│  Mood: 50        │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                          │
                                                          ▼
         ┌────────────────────────────────────────────────────┐
         │                 VOICE CHAT LOOP                    │
         │  ┌────────────┐    ┌────────────┐    ┌──────────┐  │
         │  │ Player     │    │ Gemini     │    │ NPC      │  │
         │  │ Speaks     │───▶│ Processes  │───▶│ Responds │  │
         │  │ (16kHz)    │    │ (Live API) │    │ (24kHz)  │  │
         │  └────────────┘    └────────────┘    └──────────┘  │
         │        │                                    │      │
         │        ▼                                    ▼      │
         │  ┌────────────┐                      ┌──────────┐  │
         │  │ Emotion    │                      │ Memory   │  │
         │  │ Detection  │                      │ Keywords │  │
         │  │ (Camera)   │                      │ Check    │  │
         │  └────────────┘                      └──────────┘  │
         └────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌──────────────────┐            ┌──────────────────┐
    │  QUEST TRIGGER   │            │  LOCATION UNLOCK │
    │  Camera Quest or │            │  New memory      │
    │  Drum Challenge  │            │  unlocked!       │
    └────────┬─────────┘            └────────┬─────────┘
             │                               │
             ▼                               ▼
    ┌──────────────────┐            ┌──────────────────┐
    │  Gemini Vision   │            │  Travel to new   │
    │  validates image │            │  location        │
    │  (is this a      │            │  (costs time &   │
    │   chicken?)      │            │   money)         │
    └────────┬─────────┘            └────────┬─────────┘
             │                               │
             ▼                               ▼
    ┌──────────────────┐            ┌──────────────────┐
    │  NPC ROAST!      │            │  NEW NPC         │
    │  Gemini analyzes │            │  INTERACTION     │
    │  player photo    │            │  Different       │
    │  and roasts them │            │  persona/voice   │
    └──────────────────┘            └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │    ENDINGS       │
                    │                  │
                    │  Timeout → FAIL  │
                    │  Broke → FAIL    │
                    │  Chicken escapes │
                    │    → FAIL        │
                    │  Deliver chicken │
                    │    → WIN!        │
                    └──────────────────┘
```

---

## Key Innovation: Context-Aware AI NPCs

Our NPCs dynamically adapt their responses based on:

1. **Quest Status** - After completing a quest, NPCs become dismissive
2. **Player Emotion** - Detected via camera, influences NPC reactions
3. **Game State** - Time pressure, resources affect NPC dialogue
4. **Conversation History** - Natural dialogue continuity

```typescript
// Dynamic system prompt injection
const systemPrompt = `
## Character: ${npc.name} (${npc.voice} voice)
${npc.basePersonality}

## CURRENT CONTEXT
- Time remaining: ${formatTime(timeRemaining)}
- Player's money: $${money}
- Chicken mood: ${chickenMood}% ${chickenMood < 30 ? '(CHICKEN IS ANGRY!)' : ''}
- Player emotion: ${detectedEmotion || 'unknown'}

## QUEST STATUS
${questCompleted ? `
⚠️ QUEST ALREADY DONE!
You already helped this person. Now SHOO them away!
Be funny but dismissive. They're wasting time!
` : `
Quest pending: ${quest.description}
Guide them towards completing the quest naturally.
`}
`;
```

---

## TiDB Cloud Integration

### Player DNA & Soul Twins (Vector Search)

Every player's journey creates a unique "DNA fingerprint" stored as a 384-dimensional vector embedding. TiDB's vector search finds players with similar playstyles.

```typescript
// lib/tidb/embeddings.ts
export async function generatePlayerDNA(stats: PlayerStats): Promise<number[]> {
  const dnaText = `
    Player type: ${stats.playerType}
    Ending: ${stats.ending}
    Chicken mood: ${stats.avgChickenMood}%
    Laughs: ${stats.totalLaughs}
    Singlish fluency: ${stats.singlishFluency}%
    Traits: ${stats.traits.join(', ')}
  `;

  // Generate embedding using Gemini
  const response = await ai.models.embedContent({
    model: 'text-embedding-004',
    content: dnaText
  });

  return response.embedding.values;
}

// Find soul twins using vector similarity
const soulTwins = await query(`
  SELECT nickname, chicken_name, player_type,
         VEC_COSINE_DISTANCE(dna_embedding, ?) as distance
  FROM player_dna
  WHERE session_id != ?
  ORDER BY distance ASC
  LIMIT 5
`, [myEmbedding, sessionId]);
```

### Live Stats Dashboard

Real-time analytics displayed on the home page, powered by TiDB aggregations:

- **Total Players** - How many adventurers have played
- **Chickens Saved** - Successful wedding deliveries
- **Chicken Hall of Fame** - Leaderboard of happiest chickens
- **Trending Chicken Names** - Most popular names players give their chicken
- **Singlish Leaderboard** - Most used Singlish phrases ("lah": 1247 times!)
- **Player Type Distribution** - The Chicken Whisperer, The Speedrunner, etc.

### NPC Gossip System

NPCs remember conversations from other players and gossip about them:

```typescript
// Fetch gossip before NPC interaction
const gossip = await fetch(`/api/tidb/npc-gossip?npcId=${npcId}`);

// Inject into NPC system prompt
const gossipContext = `
  GOSSIP FROM OTHER PLAYERS:
  - ChickenLord88 said: "Auntie, I need the chicken rice recipe!"
  - SpeedyGonzales came by earlier looking stressed

  Feel free to reference these players in your responses!
`;
```

### Database Schema

```sql
-- Player sessions with game stats
CREATE TABLE player_sessions (
  id VARCHAR(36) PRIMARY KEY,
  nickname VARCHAR(100),
  chicken_name VARCHAR(100),
  ending ENUM('perfect','good','okay','timeout','chicken-lost','broke'),
  final_chicken_mood INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player DNA with vector embeddings
CREATE TABLE player_dna (
  session_id VARCHAR(36) PRIMARY KEY,
  dna_embedding VECTOR(384),  -- TiDB vector type!
  player_type VARCHAR(50),
  traits JSON,
  VECTOR INDEX idx_dna ((VEC_COSINE_DISTANCE(dna_embedding))) USING HNSW
);

-- NPC conversation history for gossip
CREATE TABLE npc_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36),
  npc_id VARCHAR(50),
  player_message TEXT,
  npc_response TEXT,
  player_sentiment FLOAT
);
```

---

## UX Polish Features

### Permission Gate

Before the game starts, players are guided through a friendly permission request flow:

1. **Camera Permission** - "NPCs will read your facial expressions and roast you accordingly! Also needed for camera quests."
2. **Microphone Permission** - "Talk to Singaporean NPCs using your voice! They'll respond in Singlish."

Both have skip options, and the flow uses animated visuals to keep it engaging.

### Fun "Thinking" Messages

When NPCs are processing responses, instead of boring "Loading...", players see character-specific rotating messages:

| NPC | Thinking Messages |
|-----|-------------------|
| **Auntie Mei** | "Stirring her thoughts...", "Cooking up a response...", "Counting your $50 debt...", "Sharpening her tongue..." |
| **Grab Uncle** | "Checking GPS...", "Thinking philosophically...", "Adjusting rearview mirror...", "Tuning the radio..." |
| **Ah Beng** | "Flexing brain muscles...", "Doing mental pushups...", "Checking hair gel...", "Remembering NS days..." |
| **Airport Auntie** | "Cleaning thoughts...", "Sweeping her mind...", "Mopping up ideas...", "Dusting off memories..." |

Messages rotate every 1.5 seconds with smooth animations, making wait times feel shorter and more entertaining.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 + React 18 + Tailwind CSS |
| Animation | Framer Motion |
| Voice (Primary) | Gemini Live API (`gemini-2.5-flash-native-audio`) |
| Text AI | Gemini 2.0 Flash |
| Vision | Gemini 2.0 Flash (multi-modal) |
| TTS | Gemini TTS (`gemini-2.5-flash-preview-tts`) |
| Audio | Web Audio API + Browser Speech Recognition |
| Database | TiDB Cloud (Vector Search + MySQL) |
| State | React Context + useReducer |
| Deploy | Vercel |

---

## Running the Project

```bash
# Install dependencies
npm install

# Set up environment variables
cat > .env.local << EOF
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# TiDB Cloud connection
TIDB_HOST=gateway01.us-west-2.prod.aws.tidbcloud.com
TIDB_PORT=4000
TIDB_USER=your_username
TIDB_PASSWORD=your_password
TIDB_DATABASE=chicken_game
EOF

# Run development server
npm run dev

# Open http://localhost:3000
```

### TiDB Setup

1. Create a TiDB Cloud Serverless cluster at [tidbcloud.com](https://tidbcloud.com)
2. Enable Vector Search in your cluster settings
3. Run the schema from `lib/tidb/schema.sql`
4. Seed demo data by clicking "Seed Demo Data" on the home page

---

## Project Structure

```
/app
  /api/chat              # NPC chat API endpoint
  /api/tidb/*            # TiDB API routes (stats, leaderboard, soul-twins, etc.)
  /game                  # Main game page
  page.tsx               # Home/intro page with Live Stats

/components
  ChickenWidget.tsx      # Chicken companion
  ChickenBubble.tsx      # Chicken narrator reactions
  NPCCard.tsx            # NPC interaction UI
  CameraQuest.tsx        # Camera-based quests
  DrumQuest.tsx          # Rhythm mini-game
  GameHUD.tsx            # Resource display
  PermissionGate.tsx     # Camera/mic permission flow
  LiveStats.tsx          # TiDB-powered live stats panel
  PlayerDNA.tsx          # End-game DNA & Soul Twins display
  ComicSpeechBubble.tsx  # Speech bubbles with fun thinking messages

/lib
  gemini-live.ts         # Gemini Live API wrapper
  gemini-tts.ts          # Text-to-speech
  ai-chicken.ts          # Chicken narrator AI
  emotion-detector.ts    # Player emotion analysis
  npc-configs.ts         # NPC system prompts
  game-state.ts          # Game state types
  /tidb
    db.ts                # TiDB connection pool
    schema.sql           # Database schema with vectors
    embeddings.ts        # Player DNA embedding generation
    seed.ts              # Sample data generator

/hooks
  useBrowserVoiceChat.ts # Voice chat orchestration
  useGeminiLive.ts       # Live API connection
  useTiDB.ts             # TiDB tracking hooks

/contexts
  GameContext.tsx        # Global game state
```

---

## Demo Script for Judges

### Opening (30 seconds)
> "Imagine waking up at Changi Airport with no memory, holding a live chicken, and discovering you have 2 hours to deliver it to your best friend's wedding at Marina Bay Sands. Welcome to **The Chicken Must Arrive**."

### Gemini Live API Demo (1 minute)
> "Our game uses Gemini's Live API for real-time voice conversations. Each NPC has a distinct Singlish personality. Watch as I talk to Auntie Mei Mei at Maxwell Food Centre..."

*[Demonstrate voice chat with NPC]*

> "Notice how she responds naturally in Singlish with 'lah' and 'leh', and adapts to what I say. This is real-time audio streaming through WebSocket."

### Vision + Quest System (45 seconds)
> "Gemini 2.0 Flash powers our camera quests. Auntie Mei wants to see my chicken..."

*[Open camera, show something]*

> "Gemini Vision validates the image in real-time. When I complete the quest, the NPC even roasts my appearance using the captured photo!"

### Emotion Detection (30 seconds)
> "The game detects player emotions through the camera. Look at my face - Gemini analyzes my expression every few seconds. If I look stressed, the chicken reacts! If I look happy, NPCs respond differently."

*[Make faces at camera, show chicken reactions]*

### TiDB Integration Demo (45 seconds)
> "Check out our live stats powered by TiDB Cloud - we're tracking player analytics in real-time. See the Chicken Hall of Fame? Those are real players ranked by how happy they kept their chicken."

*[Show Live Stats panel on home page]*

> "After the game, we use TiDB's Vector Search to find your 'Soul Twins' - players with similar playstyles. We generate a 384-dimensional embedding from your gameplay and use VEC_COSINE_DISTANCE to find matches. NPCs even gossip about what other players said!"

### Closing (15 seconds)
> "Four Gemini APIs plus TiDB Cloud Vector Search working together: Live API for voice, 2.0 Flash for dialogue and vision, TTS for Singlish speech, and TiDB for cross-player features. The chicken must arrive!"

---

## Team Wayang Studio

Built with love and laughter for Singapore.

---

## License

MIT License - Built for Gemini 3 Hackathon Singapore 2026
