// Gemini Live API integration for real-time voice chat
// Model: gemini-2.5-flash-native-audio-preview-12-2025

import { GoogleGenAI, Modality } from '@google/genai';
import { NPCId } from './game-state';
import { getNPCConfig, getNPCSystemPrompt } from './npc-configs';
import { playBase64Audio, stopAllAudio } from './audio-utils';

// Type definitions for Gemini Live API
interface LiveSession {
  sendRealtimeInput: (input: { audio: { data: string; mimeType: string } }) => void;
  send: (text: string) => void;
  close: () => void;
}

interface ServerMessage {
  serverContent?: {
    modelTurn?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          data: string;
          mimeType: string;
        };
      }>;
    };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
}

export interface GeminiLiveCallbacks {
  onText?: (text: string) => void;
  onAudio?: (base64Audio: string) => void;
  onTurnComplete?: () => void;
  onInterrupted?: () => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export class GeminiLiveSession {
  private ai: GoogleGenAI;
  private session: LiveSession | null = null;
  private npcId: NPCId;
  private callbacks: GeminiLiveCallbacks;
  private isConnected: boolean = false;

  constructor(apiKey: string, npcId: NPCId, callbacks: GeminiLiveCallbacks) {
    this.ai = new GoogleGenAI({ apiKey });
    this.npcId = npcId;
    this.callbacks = callbacks;
  }

  async connect(gameContext?: string): Promise<void> {
    const npcConfig = getNPCConfig(this.npcId);
    const systemPrompt = getNPCSystemPrompt(this.npcId, gameContext);

    try {
      this.session = await (this.ai as any).live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO, Modality.TEXT],
          systemInstruction: systemPrompt,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: npcConfig.voice
              }
            }
          }
        },
        callbacks: {
          onopen: () => {
            this.isConnected = true;
            this.callbacks.onConnect?.();
          },
          onmessage: (message: ServerMessage) => this.handleMessage(message),
          onerror: (error: Error) => {
            this.callbacks.onError?.(error);
          },
          onclose: () => {
            this.isConnected = false;
            this.callbacks.onDisconnect?.();
          },
        },
      });
    } catch (error) {
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  private handleMessage(message: ServerMessage): void {
    if (message.serverContent?.interrupted) {
      stopAllAudio();
      this.callbacks.onInterrupted?.();
      return;
    }

    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        // Handle audio response
        if (part.inlineData?.data) {
          this.callbacks.onAudio?.(part.inlineData.data);
          // Auto-play audio
          playBase64Audio(part.inlineData.data).catch(console.error);
        }
        // Handle text response
        if (part.text) {
          this.callbacks.onText?.(part.text);
        }
      }
    }

    if (message.serverContent?.turnComplete) {
      this.callbacks.onTurnComplete?.();
    }
  }

  sendAudio(base64Audio: string): void {
    if (!this.session || !this.isConnected) {
      console.warn('Cannot send audio: not connected');
      return;
    }
    this.session.sendRealtimeInput({
      audio: {
        data: base64Audio,
        mimeType: 'audio/pcm;rate=16000'
      }
    });
  }

  sendText(text: string): void {
    if (!this.session || !this.isConnected) {
      console.warn('Cannot send text: not connected');
      return;
    }
    this.session.send(text);
  }

  disconnect(): void {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.isConnected = false;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

// Factory function to create a new session
export function createGeminiLiveSession(
  npcId: NPCId,
  callbacks: GeminiLiveCallbacks
): GeminiLiveSession {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not set');
  }
  return new GeminiLiveSession(apiKey, npcId, callbacks);
}

// Text-only fallback using standard Gemini API
// This function is used by the API route, not the client
export async function sendTextToNPC(
  apiKey: string,
  npcId: NPCId,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'model'; text: string }>,
  gameContext?: string
): Promise<string> {
  // Use the newer @google/genai SDK
  const ai = new GoogleGenAI({ apiKey });
  const systemPrompt = getNPCSystemPrompt(npcId, gameContext);

  // Build the full prompt with conversation history
  let fullPrompt = systemPrompt + '\n\n';

  if (conversationHistory.length > 0) {
    fullPrompt += 'Previous conversation:\n';
    for (const msg of conversationHistory) {
      fullPrompt += `${msg.role === 'user' ? 'Player' : 'NPC'}: ${msg.text}\n`;
    }
    fullPrompt += '\n';
  }

  fullPrompt += `Player: ${userMessage}\n\nRespond as the NPC (keep it short, 2-3 sentences):`;

  // Use generateContent for simple text generation
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: fullPrompt,
  });

  return response.text || 'Sorry, I didn\'t catch that. Can you say again?';
}
