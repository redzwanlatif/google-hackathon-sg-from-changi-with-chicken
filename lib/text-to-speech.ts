'use client';

/**
 * Text-to-Speech using Web Speech API
 * Falls back to browser's built-in voices
 */

export interface TTSOptions {
  voice?: string;  // Voice name preference
  rate?: number;   // Speech rate (0.1 to 10)
  pitch?: number;  // Pitch (0 to 2)
  lang?: string;   // Language code
}

class TextToSpeechService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isSpeaking = false;
  private onStartCallback?: () => void;
  private onEndCallback?: () => void;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
      this.loadVoices();

      // Voices may load asynchronously
      if (this.synth) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices(): void {
    if (this.synth) {
      this.voices = this.synth.getVoices();
      console.log('[TTS] Available voices:', this.voices.map(v => `${v.name} (${v.lang})`));
    }
  }

  setCallbacks(onStart?: () => void, onEnd?: () => void): void {
    this.onStartCallback = onStart;
    this.onEndCallback = onEnd;
  }

  speak(text: string, options: TTSOptions = {}): void {
    if (!this.synth) {
      console.warn('[TTS] Speech synthesis not available');
      return;
    }

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Set voice - try to find a matching one
    if (options.voice) {
      const voice = this.voices.find(v =>
        v.name.toLowerCase().includes(options.voice!.toLowerCase())
      );
      if (voice) {
        utterance.voice = voice;
      }
    }

    // Try to find an English voice if no specific voice set
    if (!utterance.voice) {
      const englishVoice = this.voices.find(v =>
        v.lang.startsWith('en') && v.name.includes('Female')
      ) || this.voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
    }

    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.lang = options.lang ?? 'en-SG'; // Singapore English

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.onStartCallback?.();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.onEndCallback?.();
    };

    utterance.onerror = (event) => {
      console.error('[TTS] Error:', event.error);
      this.isSpeaking = false;
      this.onEndCallback?.();
    };

    this.synth.speak(utterance);
  }

  stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  get speaking(): boolean {
    return this.isSpeaking;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }
}

// Singleton instance
export const tts = new TextToSpeechService();
