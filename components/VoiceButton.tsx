'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface VoiceButtonProps {
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export function VoiceButton({
  isConnected,
  isRecording,
  isProcessing,
  onStartRecording,
  onStopRecording,
  disabled = false,
}: VoiceButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePressStart = useCallback(() => {
    if (disabled || !isConnected) return;
    setIsPressed(true);
    onStartRecording();
  }, [disabled, isConnected, onStartRecording]);

  const handlePressEnd = useCallback(() => {
    if (!isPressed) return;
    setIsPressed(false);
    onStopRecording();
  }, [isPressed, onStopRecording]);

  const getButtonState = () => {
    if (!isConnected) return 'disconnected';
    if (isRecording) return 'recording';
    if (isProcessing) return 'processing';
    return 'ready';
  };

  const state = getButtonState();

  const stateStyles = {
    disconnected: 'bg-gray-500 cursor-not-allowed',
    ready: 'bg-blue-500 hover:bg-blue-600 cursor-pointer',
    recording: 'bg-red-500 voice-recording',
    processing: 'bg-yellow-500 animate-pulse',
  };

  const stateText = {
    disconnected: 'Connecting...',
    ready: 'Hold to Talk',
    recording: 'Listening...',
    processing: 'Thinking...',
  };

  const stateIcon = {
    disconnected: '...',
    ready: '🎤',
    recording: '🔴',
    processing: '💭',
  };

  return (
    <motion.button
      className={`
        w-24 h-24 rounded-full text-white font-bold
        flex flex-col items-center justify-center
        transition-colors duration-200
        ${stateStyles[state]}
        ${disabled ? 'opacity-50' : ''}
      `}
      whileTap={state === 'ready' ? { scale: 1.1 } : {}}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      disabled={disabled || !isConnected}
      aria-label={stateText[state]}
    >
      <span className="text-3xl mb-1">{stateIcon[state]}</span>
      <span className="text-xs">{stateText[state]}</span>
    </motion.button>
  );
}
