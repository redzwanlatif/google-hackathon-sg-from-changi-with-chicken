'use client';

/**
 * Gemini Text-to-Speech using native audio generation
 * Uses Gemini's audio output with persona/accent control
 */

import { GoogleGenAI } from '@google/genai';

export interface GeminiTTSOptions {
  apiKey: string;
  voice?: 'Aoede' | 'Charon' | 'Fenrir' | 'Kore' | 'Puck'; // Gemini voices
  persona?: string; // Audio profile for accent/style
}

export class GeminiTTS {
  private ai: GoogleGenAI;
  private voice: string;
  private persona: string;
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying = false;
  private onStartCallback?: () => void;
  private onEndCallback?: () => void;

  constructor(options: GeminiTTSOptions) {
    this.ai = new GoogleGenAI({ apiKey: options.apiKey });
    this.voice = options.voice || 'Kore';
    this.persona = options.persona || '';
  }

  setCallbacks(onStart?: () => void, onEnd?: () => void): void {
    this.onStartCallback = onStart;
    this.onEndCallback = onEnd;
  }

  setVoice(voice: string): void {
    this.voice = voice;
  }

  setPersona(persona: string): void {
    this.persona = persona;
  }

  async speak(text: string): Promise<void> {
    if (this.isPlaying) {
      this.stop();
    }

    try {
      this.isPlaying = true;
      this.onStartCallback?.();

      // Build the prompt with persona instructions
      const prompt = this.persona
        ? `${this.persona}\n\nNow speak this text naturally with the accent and style described above:\n"${text}"`
        : text;

      console.log('[GeminiTTS] Generating audio for:', text.substring(0, 50) + '...');

      // Use Gemini TTS model to generate audio
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.voice
              }
            }
          }
        }
      });

      // Extract audio data from response
      const audioResult = this.extractAudioData(response);

      if (audioResult) {
        await this.playAudio(audioResult.data, audioResult.mimeType);
      } else {
        console.warn('[GeminiTTS] No audio data in response, falling back to browser TTS');
        this.fallbackToWebSpeech(text);
      }
    } catch (error) {
      console.error('[GeminiTTS] Error:', error);
      // Fallback to browser TTS
      this.fallbackToWebSpeech(text);
    }
  }

  private extractAudioData(response: any): { data: ArrayBuffer; mimeType?: string } | null {
    try {
      console.log('[GeminiTTS] Full response:', JSON.stringify(response, null, 2).substring(0, 500));

      // Check for inline audio data in the response
      const candidates = response.candidates || [];
      for (const candidate of candidates) {
        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          // Check for inlineData (base64 audio)
          if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType;
            console.log('[GeminiTTS] Found inlineData, mime:', mimeType);
            const base64 = part.inlineData.data;
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            console.log('[GeminiTTS] Decoded audio bytes:', bytes.length);
            return { data: bytes.buffer, mimeType };
          }
        }
      }
      console.warn('[GeminiTTS] No audio data found in response structure');
    } catch (e) {
      console.error('[GeminiTTS] Error extracting audio:', e);
    }
    return null;
  }

  private async playAudio(audioData: ArrayBuffer, mimeType?: string): Promise<void> {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      let audioBuffer: AudioBuffer;

      // Check if it's encoded audio (MP3, WAV, etc.) or raw PCM
      if (mimeType && (mimeType.includes('mp3') || mimeType.includes('wav') || mimeType.includes('mpeg'))) {
        // Decode encoded audio formats
        console.log('[GeminiTTS] Decoding audio format:', mimeType);
        audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));
      } else {
        // Assume raw PCM 24kHz 16-bit
        console.log('[GeminiTTS] Processing as raw PCM');
        const int16Array = new Int16Array(audioData);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768;
        }
        audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      this.currentSource = source;

      source.onended = () => {
        this.currentSource = null;
        this.isPlaying = false;
        this.onEndCallback?.();
      };

      console.log('[GeminiTTS] Playing audio, duration:', audioBuffer.duration, 'seconds');
      source.start(0);
    } catch (error) {
      console.error('[GeminiTTS] Playback error:', error);
      this.isPlaying = false;
      this.onEndCallback?.();
    }
  }

  private fallbackToWebSpeech(text: string): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-SG';
      utterance.rate = 1.0;

      utterance.onend = () => {
        this.isPlaying = false;
        this.onEndCallback?.();
      };

      utterance.onerror = () => {
        this.isPlaying = false;
        this.onEndCallback?.();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      this.isPlaying = false;
      this.onEndCallback?.();
    }
  }

  stop(): void {
    this.isPlaying = false;

    // Stop AudioContext source if playing
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Ignore errors (source might already be stopped)
      }
      this.currentSource = null;
    }

    // Stop Web Speech if active
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    this.onEndCallback?.();
  }

  get speaking(): boolean {
    return this.isPlaying;
  }
}

// Singlish persona prompts for different characters
export const SINGLISH_PERSONAS = {
  auntie: `## Audio Profile
You are a Singaporean 'Aunty' - a middle-aged or elderly woman from a Chinese-Singaporean background. You are maternal, opinionated, and highly practical, representing the heart of Singapore's local neighborhood culture.

## Performance Style
Adopt a thick Singlish accent (Singaporean English with heavy Mandarin and Hokkien influences). The delivery should be staccato and rhythmic. Intonation must fluctuate sharply between high and low pitches. Sentences should frequently conclude with pragmatic particles such as 'lah' for emphasis, 'lor' for resignation, 'leh' for uncertainty/softening, and 'meh' for skepticism. Pacing is fast, as if there is no time to waste.

## Director's Notes
Simplify grammar by removing unnecessary articles and tenses (e.g., 'I am going' becomes 'I go'). Drop ending consonants of words (e.g., 'don't' becomes 'don'). Avoid 'th' sounds, replacing them with 'd' or 't'. Focus on a sincere, energetic rhythm rather than smooth speech.`,

  uncle: `## Audio Profile
You are a Singaporean 'Uncle' - a middle-aged or older man, likely a taxi driver or hawker. You are philosophical, patient, and have seen it all. You speak with wisdom gained from years of experience.

## Performance Style
Adopt a calm Singlish accent with occasional Malay or Tamil influences. Speech is slower and more measured than Auntie. Use particles like 'lah', 'ah', and 'one' at the end of sentences. Tone is warm but matter-of-fact.

## Director's Notes
Use simple sentence structures. Occasionally insert Malay words like 'alamak' (oh no) or 'shiok' (great). Speak as if giving life advice to a younger person.`,

  youngman: `## Audio Profile
You are a young Singaporean man in his 20s, likely done with National Service. You're energetic, use lots of slang, and speak fast with friends.

## Performance Style
Fast-paced Singlish with modern slang. Heavy use of 'bro', 'sia', 'damn', and 'shiok'. Enthusiastic and slightly loud. Mix in some English internet slang.

## Director's Notes
Speak like you're talking to your army buddy. Use 'can' for yes, 'cannot' for no. End sentences with 'sia' for emphasis or 'bro' for addressing.`,
};
