'use client';

import { useState, useCallback, useRef } from 'react';
import { NPCId } from '@/lib/game-state';

export interface Message {
  role: 'user' | 'npc';
  text: string;
}

export interface UseChatReturn {
  isConnected: boolean;
  isProcessing: boolean;
  messages: Message[];
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

export function useChat(npcId: NPCId, gameContext?: string): UseChatReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef<Array<{ role: 'user' | 'model'; text: string }>>([]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setError(null);
    setIsProcessing(true);

    // Add user message immediately
    setMessages(prev => [...prev, { role: 'user', text }]);
    historyRef.current.push({ role: 'user', text });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcId,
          message: text,
          history: historyRef.current.slice(-10), // Last 10 messages
          gameContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const npcResponse = data.response || 'Sorry, I didn\'t catch that lah.';

      // Add NPC response
      setMessages(prev => [...prev, { role: 'npc', text: npcResponse }]);
      historyRef.current.push({ role: 'model', text: npcResponse });

    } catch (err) {
      console.error('Chat error:', err);
      setError('Connection failed. Try again lah!');
      // Add fallback response
      const fallback = getFallbackResponse(npcId);
      setMessages(prev => [...prev, { role: 'npc', text: fallback }]);
    } finally {
      setIsProcessing(false);
    }
  }, [npcId, gameContext]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
  }, []);

  return {
    isConnected: true, // Always "connected" for text chat
    isProcessing,
    messages,
    error,
    sendMessage,
    clearMessages,
  };
}

function getFallbackResponse(npcId: NPCId): string {
  const fallbacks: Record<NPCId, string> = {
    'airport-auntie': 'Aiyoh, you okay or not? You look damn blur sia.',
    'auntie-mei': 'You still owe me money leh! $50 remember?',
    'grab-uncle': 'Boss, last night you were crying in my car about some wedding.',
    'ah-beng': 'Bro! You\'re Marcus\'s best man right?',
    'jessica': 'WHERE ARE YOU?! The wedding is starting!',
    'security-guard': 'Sorry, cannot bring chicken inside.',
    'marcus': 'Bro... you made it!',
  };
  return fallbacks[npcId] || 'Hmm, say again?';
}
