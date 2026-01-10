'use client';

/**
 * Speech Recognition using Web Speech API
 */

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface SpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        this.recognition = new SpeechRecognitionClass();
      }
    }
  }

  get available(): boolean {
    return this.recognition !== null;
  }

  get listening(): boolean {
    return this.isListening;
  }

  start(options: SpeechRecognitionOptions = {}): void {
    if (!this.recognition) {
      console.warn('[SpeechRecognition] Not available in this browser');
      options.onError?.('Speech recognition not available');
      return;
    }

    if (this.isListening) {
      this.stop();
    }

    this.recognition.lang = options.lang ?? 'en-SG';
    this.recognition.continuous = options.continuous ?? false;
    this.recognition.interimResults = options.interimResults ?? true;

    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('[SpeechRecognition] Started');
      options.onStart?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        console.log('[SpeechRecognition] Final:', finalTranscript);
        options.onResult?.(finalTranscript, true);
      } else if (interimTranscript) {
        options.onResult?.(interimTranscript, false);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('[SpeechRecognition] Error:', event.error);
      this.isListening = false;
      options.onError?.(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('[SpeechRecognition] Ended');
      options.onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (err) {
      console.error('[SpeechRecognition] Start error:', err);
      options.onError?.('Failed to start');
    }
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}

// Singleton instance
export const speechRecognition = new SpeechRecognitionService();
