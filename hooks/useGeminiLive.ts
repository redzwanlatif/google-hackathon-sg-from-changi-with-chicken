'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GeminiLiveClient,
  SimpleAudioRecorder,
  SimpleAudioPlayer,
  ConnectionStatus,
} from '@/lib/gemini-live-client';

export interface UseGeminiLiveOptions {
  apiKey: string;
  systemInstruction?: string;
  voice?: string;
  onTranscript?: (text: string) => void;
  onTurnComplete?: () => void;
}

export interface UseGeminiLiveReturn {
  status: ConnectionStatus;
  isRecording: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function useGeminiLive(options: UseGeminiLiveOptions): UseGeminiLiveReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const recorderRef = useRef<SimpleAudioRecorder | null>(null);
  const playerRef = useRef<SimpleAudioPlayer | null>(null);
  const audioBufferRef = useRef<string[]>([]); // Buffer audio chunks
  const isSpeakingRef = useRef(false); // Track speaking state for callbacks

  // Store options in a ref for stable callbacks
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Initialize player with callbacks
  useEffect(() => {
    playerRef.current = new SimpleAudioPlayer({
      onPlaybackStart: () => {
        console.log('[useGeminiLive] Audio playback started');
        isSpeakingRef.current = true;
        setIsSpeaking(true);
      },
      onPlaybackEnd: () => {
        console.log('[useGeminiLive] Audio playback ended');
        isSpeakingRef.current = false;
        setIsSpeaking(false);
      },
    });
    return () => {
      playerRef.current?.close();
    };
  }, []);

  const connect = useCallback(async () => {
    const opts = optionsRef.current;

    if (clientRef.current) {
      clientRef.current.disconnect();
    }

    setError(null);
    setStatus('connecting');

    console.log('[useGeminiLive] Creating client with API key:', opts.apiKey ? 'present' : 'MISSING');

    const client = new GeminiLiveClient(opts.apiKey, {
      onOpen: () => {
        console.log('[useGeminiLive] Connection opened');
        setStatus('connected');
        setError(null);
      },
      onClose: () => {
        console.log('[useGeminiLive] Connection closed');
        setStatus('disconnected');
        setIsSpeaking(false);
      },
      onAudio: (audioData) => {
        // Player callbacks handle speaking state
        playerRef.current?.play(audioData);
      },
      onText: (text) => {
        console.log('[useGeminiLive] Received text:', text);
        setTranscript(text);
        optionsRef.current.onTranscript?.(text);
      },
      onError: (err) => {
        console.error('[useGeminiLive] Error:', err);
        setError(err.message);
        setStatus('disconnected');
        setIsSpeaking(false);
      },
      onInterrupted: () => {
        console.log('[useGeminiLive] Interrupted by user');
        playerRef.current?.stop();
        // Player callback handles setIsSpeaking(false)
      },
      onTurnComplete: () => {
        console.log('[useGeminiLive] Turn complete');
        // Note: Audio might still be playing when turn completes
        // The player callback will set isSpeaking to false when done
        optionsRef.current.onTurnComplete?.();
      },
    });

    clientRef.current = client;

    const success = await client.connect({
      systemInstruction: opts.systemInstruction,
      voice: opts.voice,
    });

    if (!success) {
      setError('Failed to connect to Gemini Live API');
      setStatus('disconnected');
    }
  }, []); // Empty deps - uses ref for options

  const disconnect = useCallback(() => {
    console.log('[useGeminiLive] Disconnecting...');
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    // Stop any playing audio
    playerRef.current?.stop();
    // Clear audio buffer
    audioBufferRef.current = [];
    setIsRecording(false);
    setIsSpeaking(false);
    setStatus('disconnected');
  }, []);

  const startRecording = useCallback(async () => {
    if (status !== 'connected' || !clientRef.current) {
      setError('Not connected to Gemini Live API');
      return;
    }

    try {
      // Stop any playing audio first (user is interrupting)
      if (playerRef.current?.isPlaying) {
        console.log('[useGeminiLive] Stopping playback - user starting to record');
        playerRef.current.stop();
      }

      // Clear previous buffer
      audioBufferRef.current = [];

      const recorder = new SimpleAudioRecorder();
      recorderRef.current = recorder;

      // Buffer audio instead of sending immediately
      await recorder.start((base64Audio) => {
        audioBufferRef.current.push(base64Audio);
      });

      setIsRecording(true);
      setError(null);
      console.log('[useGeminiLive] Recording started - buffering audio');
    } catch (err) {
      setError('Failed to access microphone');
      console.error('[useGeminiLive] Recording error:', err);
    }
  }, [status]);

  const stopRecording = useCallback(async () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    setIsRecording(false);

    // Send all buffered audio at once
    if (clientRef.current && audioBufferRef.current.length > 0) {
      console.log('[useGeminiLive] Sending', audioBufferRef.current.length, 'audio chunks');
      for (const chunk of audioBufferRef.current) {
        clientRef.current.sendAudio(chunk);
      }
      audioBufferRef.current = [];

      // Also get text response for keyword detection (parallel to audio)
      try {
        const textResponse = await clientRef.current.getTextResponse(
          'The user just spoke to you. Continue the conversation naturally. Remember to mention the key information from your character background.'
        );
        if (textResponse) {
          console.log('[useGeminiLive] Text transcript for keywords:', textResponse);
          setTranscript(textResponse);
          optionsRef.current.onTranscript?.(textResponse);
        }
      } catch (err) {
        console.error('[useGeminiLive] Failed to get text transcript:', err);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      clientRef.current?.disconnect();
      playerRef.current?.close();
    };
  }, []);

  return {
    status,
    isRecording,
    isSpeaking,
    transcript,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
  };
}
