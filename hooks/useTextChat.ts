'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { GeminiTTS, SINGLISH_PERSONAS } from '@/lib/gemini-tts';

export interface UseTextChatOptions {
  apiKey: string;
  systemInstruction?: string;
  voice?: 'Aoede' | 'Charon' | 'Fenrir' | 'Kore' | 'Puck';
  persona?: 'auntie' | 'uncle' | 'youngman' | string;
  onTranscript?: (text: string) => void;
  onSpeakingChange?: (speaking: boolean) => void;
}

export interface UseTextChatReturn {
  isLoading: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
  sendMessage: (message: string) => Promise<string>;
  stopSpeaking: () => void;
  resetConversation: () => void;
}

export function useTextChat(options: UseTextChatOptions): UseTextChatReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const aiRef = useRef<GoogleGenAI | null>(null);
  const ttsRef = useRef<GeminiTTS | null>(null);
  const conversationRef = useRef<Array<{ role: string; text: string }>>([]);
  const optionsRef = useRef(options);
  optionsRef.current = options;

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
        () => {
          setIsSpeaking(true);
          optionsRef.current.onSpeakingChange?.(true);
        },
        () => {
          setIsSpeaking(false);
          optionsRef.current.onSpeakingChange?.(false);
        }
      );

      console.log('[TextChat] AI and TTS initialized with voice:', options.voice);
    }
  }, [options.apiKey, options.voice, options.persona]);

  const sendMessage = useCallback(async (message: string): Promise<string> => {
    if (!aiRef.current) {
      setError('AI not initialized');
      return '';
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add user message to history
      conversationRef.current.push({ role: 'user', text: message });

      // Build conversation contents
      const contents = conversationRef.current.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

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

      // Update transcript
      setTranscript(responseText);
      optionsRef.current.onTranscript?.(responseText);

      // Speak the response using Gemini TTS with Singlish accent
      if (ttsRef.current) {
        await ttsRef.current.speak(responseText);
      }

      console.log('[TextChat] Response:', responseText);
      return responseText;
    } catch (err) {
      console.error('[TextChat] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response');
      return '';
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    ttsRef.current?.stop();
    setIsSpeaking(false);
  }, []);

  const resetConversation = useCallback(() => {
    conversationRef.current = [];
    setTranscript('');
  }, []);

  return {
    isLoading,
    isSpeaking,
    transcript,
    error,
    sendMessage,
    stopSpeaking,
    resetConversation,
  };
}
