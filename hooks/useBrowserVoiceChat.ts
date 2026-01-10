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
  sendTextWithImage: (text: string, imageBase64: string) => Promise<void>;
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

  // Lock to prevent concurrent processing
  const isProcessingRef = useRef(false);

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
        () => {
          setStatus('idle');
          isProcessingRef.current = false;
        }
      );

      console.log('[BrowserVoiceChat] AI and TTS initialized with voice:', options.voice);
    }
  }, [options.apiKey, options.voice, options.persona]);

  // Reset conversation when system instruction changes (NPC change)
  useEffect(() => {
    conversationRef.current = [];
    setUserTranscript('');
    setAiTranscript('');
    isProcessingRef.current = false;
  }, [options.systemInstruction]);

  const processMessage = useCallback(async (message: string, imageBase64?: string) => {
    // Prevent concurrent processing
    if (isProcessingRef.current) {
      console.log('[BrowserVoiceChat] Already processing, ignoring request');
      return;
    }

    if (!aiRef.current || !message.trim()) {
      setStatus('idle');
      return;
    }

    // Lock processing
    isProcessingRef.current = true;
    setStatus('processing');
    setError(null);

    try {
      // Add user message to history
      conversationRef.current.push({ role: 'user', text: message });

      // Build conversation contents
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contents: Array<{ role: string; parts: any[] }> = conversationRef.current.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      // If there's an image, add it to the last message for the NPC to see and roast
      if (imageBase64) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const lastContent = contents[contents.length - 1];
        lastContent.parts = [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: message + `

ROAST TIME! Look at this image and give the player a FUNNY Singlish roast based on what you see!

ROAST STYLE:
- Comment on their appearance, expression, hair, clothes, background - anything visible!
- Be playful and teasing like a Singapore auntie/uncle would - friendly but savage
- Use heavy Singlish: "Wah", "Aiyoh", "Aiyo", "Eh", "lah", "leh", "lor", "sia", "one", "meh"
- Keep it SHORT (2-3 sentences max)
- Make it specific to what you actually see!

EXAMPLE ROASTS:
- "Wah lau, your hair like kena electrocute sia! Very the anime style ah?"
- "Aiyo, why your face so blur one? Sleep not enough ah, busy chasing chicken?"
- "Eh your background very the messy leh! Marie Kondo see already sure cry one!"
- "This lighting make you look like pontianak sia! Very scary, even chicken also run away!"
- "Your expression like just saw the chicken fly away liddat! So stressed ah?"

Now acknowledge the quest completion AND give them a funny roast!` }
        ];
      }

      console.log('[BrowserVoiceChat] Sending to Gemini:', message.substring(0, 50), imageBase64 ? '(with image)' : '');

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

      console.log('[BrowserVoiceChat] AI Response:', responseText);

      // Speak the response using Gemini TTS with Singlish accent
      // Text will only be shown when audio starts playing
      if (ttsRef.current) {
        await ttsRef.current.speak(responseText, () => {
          // This callback is called when audio actually starts playing
          setAiTranscript(responseText);
          optionsRef.current.onTranscript?.(responseText);
        });
      } else {
        // No TTS available, show text immediately and unlock
        setAiTranscript(responseText);
        optionsRef.current.onTranscript?.(responseText);
        setStatus('idle');
        isProcessingRef.current = false;
      }

    } catch (err) {
      console.error('[BrowserVoiceChat] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response');
      setStatus('idle');
      isProcessingRef.current = false;
    }
  }, []);

  const startListening = useCallback(() => {
    // Prevent starting if already busy
    if (isProcessingRef.current || statusRef.current !== 'idle') {
      console.log('[BrowserVoiceChat] Cannot start listening - busy:', statusRef.current);
      return;
    }

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
        // Only reset to idle if we're still in listening state (not processing)
        if (statusRef.current === 'listening' && !isProcessingRef.current) {
          setStatus('idle');
        }
      },
    });
  }, [processMessage]);

  const stopListening = useCallback(() => {
    speechRecognition.stop();
    // Only set idle if not processing
    if (!isProcessingRef.current) {
      setStatus('idle');
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    ttsRef.current?.stop();
    setStatus('idle');
    isProcessingRef.current = false;
  }, []);

  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || isProcessingRef.current) return;
    setUserTranscript(text);
    await processMessage(text);
  }, [processMessage]);

  const sendTextWithImage = useCallback(async (text: string, imageBase64: string) => {
    if (!text.trim() || isProcessingRef.current) return;
    setUserTranscript(text);
    await processMessage(text, imageBase64);
  }, [processMessage]);

  const resetConversation = useCallback(() => {
    conversationRef.current = [];
    setUserTranscript('');
    setAiTranscript('');
    ttsRef.current?.stop();
    speechRecognition.stop();
    setStatus('idle');
    isProcessingRef.current = false;
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
    sendTextWithImage,
    resetConversation,
  };
}
