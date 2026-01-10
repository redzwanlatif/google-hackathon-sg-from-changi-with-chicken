'use client';

/**
 * Voice Chat using Browser Speech Recognition + Gemini Text API + Gemini TTS
 * Uses Gemini's native audio for proper Singlish accent
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { speechRecognition } from '@/lib/speech-recognition';
import { GeminiTTS, SINGLISH_PERSONAS } from '@/lib/gemini-tts';

export interface UseBrowserVoiceChatOptions {
  apiKey: string;
  systemInstruction?: string;
  voice?: 'Aoede' | 'Charon' | 'Fenrir' | 'Kore' | 'Puck';
  persona?: 'auntie' | 'uncle' | 'youngman' | string;
  onTranscript?: (text: string) => void;
}

export interface UseBrowserVoiceChatReturn {
  status: 'idle' | 'listening' | 'processing' | 'speaking';
  userTranscript: string;
  aiTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  stopSpeaking: () => void;
  sendText: (text: string) => Promise<void>;
  resetConversation: () => void;
}

export function useBrowserVoiceChat(options: UseBrowserVoiceChatOptions): UseBrowserVoiceChatReturn {
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const aiRef = useRef<GoogleGenAI | null>(null);
  const ttsRef = useRef<GeminiTTS | null>(null);
  const conversationRef = useRef<Array<{ role: string; text: string }>>([]);
  const optionsRef = useRef(options);
  const statusRef = useRef(status);

  // Keep refs in sync
  optionsRef.current = options;
  statusRef.current = status;

  // Initialize AI client and TTS
  useEffect(() => {
    if (options.apiKey) {
      aiRef.current = new GoogleGenAI({ apiKey: options.apiKey });

      // Initialize Gemini TTS with persona
      const personaText = options.persona
        ? (SINGLISH_PERSONAS[options.persona as keyof typeof SINGLISH_PERSONAS] || options.persona)
        : SINGLISH_PERSONAS.auntie;

      ttsRef.current = new GeminiTTS({
        apiKey: options.apiKey,
        voice: options.voice || 'Kore',
        persona: personaText,
      });

      ttsRef.current.setCallbacks(
        () => setStatus('speaking'),
        () => setStatus('idle')
      );

      console.log('[BrowserVoiceChat] AI and TTS initialized with voice:', options.voice);
    }
  }, [options.apiKey, options.voice, options.persona]);

  // Reset conversation when system instruction changes (NPC change)
  useEffect(() => {
    conversationRef.current = [];
    setUserTranscript('');
    setAiTranscript('');
  }, [options.systemInstruction]);

  const processMessage = useCallback(async (message: string) => {
    if (!aiRef.current || !message.trim()) {
      setStatus('idle');
      return;
    }

    setStatus('processing');
    setError(null);

    try {
      // Add user message to history
      conversationRef.current.push({ role: 'user', text: message });

      // Build conversation contents
      const contents = conversationRef.current.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      console.log('[BrowserVoiceChat] Sending to Gemini:', message.substring(0, 50));

      // Get response from Gemini
      const response = await aiRef.current.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
        config: {
          systemInstruction: optionsRef.current.systemInstruction,
          maxOutputTokens: 300,
        }
      });

      const responseText = response.text || '';

      // Add to history
      conversationRef.current.push({ role: 'model', text: responseText });

      // Keep history manageable
      if (conversationRef.current.length > 20) {
        conversationRef.current = conversationRef.current.slice(-20);
      }

      // Update transcript and notify
      setAiTranscript(responseText);
      console.log('[BrowserVoiceChat] AI Response:', responseText);
      optionsRef.current.onTranscript?.(responseText);

      // Speak the response using Gemini TTS with Singlish accent
      if (ttsRef.current) {
        await ttsRef.current.speak(responseText);
      }

    } catch (err) {
      console.error('[BrowserVoiceChat] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response');
      setStatus('idle');
    }
  }, []);

  const startListening = useCallback(() => {
    if (!speechRecognition.available) {
      setError('Speech recognition not available. Please use Chrome browser.');
      return;
    }

    // Stop any ongoing speech
    ttsRef.current?.stop();
    setUserTranscript('');
    setError(null);
    setStatus('listening');

    speechRecognition.start({
      lang: 'en-SG',
      continuous: true,  // Keep listening until manually stopped
      interimResults: true,
      onResult: (transcript, isFinal) => {
        setUserTranscript(transcript);
        if (isFinal && transcript.trim()) {
          console.log('[BrowserVoiceChat] User said:', transcript);
          // Stop listening and process
          speechRecognition.stop();
          processMessage(transcript);
        }
      },
      onError: (err) => {
        console.error('[BrowserVoiceChat] Speech recognition error:', err);
        if (err !== 'no-speech' && err !== 'aborted') {
          setError(err);
        }
        setStatus('idle');
      },
      onEnd: () => {
        // Only reset to idle if we're still in listening state
        if (statusRef.current === 'listening') {
          setStatus('idle');
        }
      },
    });
  }, [processMessage]);

  const stopListening = useCallback(() => {
    speechRecognition.stop();
    setStatus('idle');
  }, []);

  const stopSpeaking = useCallback(() => {
    ttsRef.current?.stop();
    setStatus('idle');
  }, []);

  const sendText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setUserTranscript(text);
    await processMessage(text);
  }, [processMessage]);

  const resetConversation = useCallback(() => {
    conversationRef.current = [];
    setUserTranscript('');
    setAiTranscript('');
    ttsRef.current?.stop();
    speechRecognition.stop();
    setStatus('idle');
  }, []);

  return {
    status,
    userTranscript,
    aiTranscript,
    error,
    startListening,
    stopListening,
    stopSpeaking,
    sendText,
    resetConversation,
  };
}
