'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { NPCId } from '@/lib/game-state';
import { GeminiLiveSession, createGeminiLiveSession, GeminiLiveCallbacks } from '@/lib/gemini-live';
import { PCMRecorder, resumeAudioContext } from '@/lib/audio-utils';

export interface UseVoiceChatOptions {
  onTranscript?: (text: string, isUser: boolean) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export interface UseVoiceChatReturn {
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  lastTranscript: string;
  error: Error | null;
  connect: (npcId: NPCId, gameContext?: string) => Promise<void>;
  disconnect: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  sendText: (text: string) => void;
}

export function useVoiceChat(options: UseVoiceChatOptions = {}): UseVoiceChatReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [error, setError] = useState<Error | null>(null);

  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const recorderRef = useRef<PCMRecorder | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.disconnect();
      recorderRef.current?.stop();
    };
  }, []);

  const connect = useCallback(async (npcId: NPCId, gameContext?: string) => {
    // Disconnect existing session
    if (sessionRef.current) {
      sessionRef.current.disconnect();
    }

    setError(null);
    setIsProcessing(true);

    const callbacks: GeminiLiveCallbacks = {
      onText: (text) => {
        setLastTranscript(text);
        options.onTranscript?.(text, false);
      },
      onAudio: () => {
        // Audio is auto-played by the session
      },
      onTurnComplete: () => {
        setIsProcessing(false);
      },
      onInterrupted: () => {
        setIsProcessing(false);
      },
      onError: (err) => {
        setError(err);
        setIsProcessing(false);
        options.onError?.(err);
      },
      onConnect: () => {
        setIsConnected(true);
        setIsProcessing(false);
        options.onConnectionChange?.(true);
      },
      onDisconnect: () => {
        setIsConnected(false);
        options.onConnectionChange?.(false);
      },
    };

    try {
      const session = createGeminiLiveSession(npcId, callbacks);
      sessionRef.current = session;
      await session.connect(gameContext);
    } catch (err) {
      setError(err as Error);
      setIsProcessing(false);
      options.onError?.(err as Error);
    }
  }, [options]);

  const disconnect = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.disconnect();
      sessionRef.current = null;
    }
    setIsRecording(false);
    setIsConnected(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (!sessionRef.current?.connected) {
      console.warn('Cannot record: not connected to Gemini Live');
      return;
    }

    // Resume audio context (required after user interaction)
    await resumeAudioContext();

    const recorder = new PCMRecorder();
    recorderRef.current = recorder;

    await recorder.start((base64Audio) => {
      sessionRef.current?.sendAudio(base64Audio);
    });

    setIsRecording(true);
    setIsProcessing(true);
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const sendText = useCallback((text: string) => {
    if (!sessionRef.current?.connected) {
      console.warn('Cannot send text: not connected to Gemini Live');
      return;
    }
    sessionRef.current.sendText(text);
    setIsProcessing(true);
    options.onTranscript?.(text, true);
  }, [options]);

  return {
    isConnected,
    isRecording,
    isProcessing,
    lastTranscript,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendText,
  };
}
