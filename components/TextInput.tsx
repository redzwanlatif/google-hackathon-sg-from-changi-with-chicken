'use client';

import { useState, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';

interface TextInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function TextInput({ onSend, disabled = false, placeholder = 'Type a message...' }: TextInputProps) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          flex-1 bg-white/10 text-white px-4 py-3 rounded-full
          placeholder-white/50 outline-none
          border-2 border-white/20 focus:border-white/40
          transition-colors duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      />
      <motion.button
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className={`
          bg-blue-500 text-white px-6 py-3 rounded-full font-bold
          transition-colors duration-200
          ${disabled || !value.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}
        `}
      >
        Send
      </motion.button>
    </div>
  );
}
