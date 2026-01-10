'use client';

/**
 * Gemini Live API Client
 * Based on: https://github.com/google-gemini/live-api-web-console
 */

import { GoogleGenAI, Modality } from '@google/genai';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface LiveClientCallbacks {
  onOpen?: () => void;
  onClose?: () => void;
  onAudio?: (audioData: ArrayBuffer) => void;
  onText?: (text: string) => void;
  onError?: (error: Error) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
}

export class GeminiLiveClient {
  private ai: GoogleGenAI;
  private session: any = null;
  private status: ConnectionStatus = 'disconnected';
  private callbacks: LiveClientCallbacks;
  private systemInstruction: string = '';
  private conversationHistory: Array<{role: string, text: string}> = [];

  constructor(apiKey: string, callbacks: LiveClientCallbacks = {}) {
    this.ai = new GoogleGenAI({ apiKey });
    this.callbacks = callbacks;
  }

  get connectionStatus(): ConnectionStatus {
    return this.status;
  }

  // Get text response from regular Gemini API (for transcript/keyword detection)
  async getTextResponse(userMessage: string): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({ role: 'user', text: userMessage });

      // Build conversation for API
      const contents = this.conversationHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
        config: {
          systemInstruction: this.systemInstruction,
          maxOutputTokens: 200,
        }
      });

      const text = response.text || '';

      // Add assistant response to history
      this.conversationHistory.push({ role: 'model', text });

      // Keep history limited to last 10 exchanges
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      console.log('[GeminiLive] Text API response:', text);
      return text;
    } catch (error) {
      console.error('[GeminiLive] Text API error:', error);
      return '';
    }
  }

  // Reset conversation when changing NPCs
  resetConversation(): void {
    this.conversationHistory = [];
  }

  async connect(config: {
    model?: string;
    systemInstruction?: string;
    voice?: string;
  } = {}): Promise<boolean> {
    if (this.status === 'connected') {
      return true;
    }

    this.status = 'connecting';

    // Store system instruction for text API
    this.systemInstruction = config.systemInstruction || '';
    this.conversationHistory = []; // Reset conversation for new NPC

    try {
      // Native audio model for natural voice
      const modelToUse = config.model || 'gemini-2.0-flash-exp';

      // Config - AUDIO only (transcription not supported in current API)
      const liveConfig: any = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: config.voice || 'Kore'
            }
          }
        },
      };

      // Add system instruction with parts format (matching demo)
      if (config.systemInstruction) {
        liveConfig.systemInstruction = {
          parts: [{ text: config.systemInstruction }]
        };
      }

      // Voice is already set in speechConfig above

      console.log('[GeminiLive] Full config being sent:', {
        model: modelToUse,
        config: liveConfig,
      });

      this.session = await (this.ai as any).live.connect({
        model: modelToUse,
        config: liveConfig,
        callbacks: {
          onopen: () => {
            this.status = 'connected';
            console.log('[GeminiLive] Connected');
            this.callbacks.onOpen?.();
          },
          onmessage: (message: any) => {
            console.log('[GeminiLive] Message received:', message);
            this.handleMessage(message);
          },
          onerror: (error: any) => {
            console.error('[GeminiLive] Error:', error);
            this.callbacks.onError?.(new Error(error?.message || 'Connection error'));
          },
          onclose: (event: any) => {
            console.log('[GeminiLive] Closed. Full event:', event);
            console.log('[GeminiLive] Close reason:', event?.reason);
            console.log('[GeminiLive] Close code:', event?.code);
            this.status = 'disconnected';
            this.session = null;
            this.callbacks.onClose?.();
          },
        },
      });

      return true;
    } catch (error) {
      console.error('[GeminiLive] Connection failed:', error);
      this.status = 'disconnected';
      this.callbacks.onError?.(error as Error);
      return false;
    }
  }

  private handleMessage(message: any): void {
    const serverContent = message?.serverContent;
    if (!serverContent) {
      // Log non-serverContent messages for debugging
      console.log('[GeminiLive] Non-serverContent message:', JSON.stringify(message).substring(0, 200));
      return;
    }

    // Debug: log all serverContent keys
    const keys = Object.keys(serverContent);
    if (keys.length > 0 && !keys.every(k => k === 'modelTurn')) {
      console.log('[GeminiLive] ServerContent keys:', keys);
    }

    // Handle interruption
    if (serverContent.interrupted) {
      console.log('[GeminiLive] Interrupted');
      this.callbacks.onInterrupted?.();
      return;
    }

    // Handle turn complete
    if (serverContent.turnComplete) {
      console.log('[GeminiLive] Turn complete');
      this.callbacks.onTurnComplete?.();
    }

    // Handle output transcription (if available)
    if (serverContent.outputTranscription?.text) {
      console.log('[GeminiLive] Output transcription:', serverContent.outputTranscription.text);
      this.callbacks.onText?.(serverContent.outputTranscription.text);
    }

    // Handle model output
    const parts = serverContent?.modelTurn?.parts;
    if (parts) {
      for (const part of parts) {
        // Audio data
        if (part.inlineData?.data) {
          const audioData = this.base64ToArrayBuffer(part.inlineData.data);
          this.callbacks.onAudio?.(audioData);
        }
        // Text data - THIS IS KEY FOR MEMORY UNLOCK
        if (part.text) {
          console.log('[GeminiLive] ★ TEXT RECEIVED:', part.text);
          this.callbacks.onText?.(part.text);
        }
      }
    }
  }

  sendAudio(base64Audio: string): void {
    if (!this.session || this.status !== 'connected') {
      console.warn('[GeminiLive] Cannot send audio: not connected');
      return;
    }

    // SDK expects 'media' property
    this.session.sendRealtimeInput({
      media: {
        data: base64Audio,
        mimeType: 'audio/pcm;rate=16000',
      },
    });
  }

  sendText(text: string): void {
    if (!this.session || this.status !== 'connected') {
      console.warn('[GeminiLive] Cannot send text: not connected');
      return;
    }

    this.session.send({ text });
  }

  disconnect(): void {
    if (this.session) {
      try {
        this.session.close();
      } catch (e) {
        // Ignore close errors
      }
      this.session = null;
    }
    this.status = 'disconnected';
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/**
 * Audio recorder using modern AudioWorklet API
 * Outputs base64-encoded PCM audio chunks
 */
export class SimpleAudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private onDataCallback: ((base64Audio: string) => void) | null = null;

  async start(onData: (base64Audio: string) => void): Promise<void> {
    this.onDataCallback = onData;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: 16000 });

      // Load the AudioWorklet processor
      await this.audioContext.audioWorklet.addModule('/audio-worklet-processor.js');

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');

      // Handle audio data from worklet
      this.workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio') {
          const base64 = this.arrayBufferToBase64(event.data.data);
          this.onDataCallback?.(base64);
        }
      };

      this.source.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);

      console.log('[AudioRecorder] Started with AudioWorklet');
    } catch (error) {
      console.error('[AudioRecorder] Failed to start:', error);
      throw error;
    }
  }

  stop(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.onDataCallback = null;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

/**
 * Audio player for PCM data with proper queue management
 * Best practices:
 * - Queue-based playback to prevent overlap
 * - Single AudioContext reused for all playback
 * - Proper cleanup and state management
 */
export class SimpleAudioPlayer {
  private audioContext: AudioContext | null = null;
  private queue: ArrayBuffer[] = [];
  private isProcessing = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private onPlaybackStart?: () => void;
  private onPlaybackEnd?: () => void;

  constructor(callbacks?: { onPlaybackStart?: () => void; onPlaybackEnd?: () => void }) {
    this.onPlaybackStart = callbacks?.onPlaybackStart;
    this.onPlaybackEnd = callbacks?.onPlaybackEnd;
  }

  private async ensureContext(): Promise<AudioContext> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  async play(audioData: ArrayBuffer): Promise<void> {
    // Add to queue
    this.queue.push(audioData);

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    this.onPlaybackStart?.();

    while (this.queue.length > 0) {
      const audioData = this.queue.shift();
      if (!audioData) continue;

      try {
        await this.playChunk(audioData);
      } catch (error) {
        console.error('[AudioPlayer] Error playing chunk:', error);
      }
    }

    this.isProcessing = false;
    this.currentSource = null;
    this.onPlaybackEnd?.();
  }

  private async playChunk(audioData: ArrayBuffer): Promise<void> {
    const ctx = await this.ensureContext();
    if (!this.gainNode) return;

    // Convert PCM Int16 to Float32
    const int16Array = new Int16Array(audioData);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }

    // Create audio buffer
    const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    // Create and play source
    return new Promise<void>((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode!);

      this.currentSource = source;

      source.onended = () => {
        this.currentSource = null;
        resolve();
      };

      source.start(0);
    });
  }

  stop(): void {
    // Clear queue
    this.queue = [];

    // Stop current playback
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Already stopped
      }
      this.currentSource = null;
    }

    this.isProcessing = false;
    this.onPlaybackEnd?.();
  }

  get isPlaying(): boolean {
    return this.isProcessing || this.queue.length > 0;
  }

  close(): void {
    this.stop();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.gainNode = null;
  }
}
