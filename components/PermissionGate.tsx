'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface PermissionGateProps {
  onPermissionsGranted: () => void;
}

type PermissionStatus = 'pending' | 'granted' | 'denied' | 'requesting';

export function PermissionGate({ onPermissionsGranted }: PermissionGateProps) {
  const [cameraStatus, setCameraStatus] = useState<PermissionStatus>('pending');
  const [micStatus, setMicStatus] = useState<PermissionStatus>('pending');
  const [currentStep, setCurrentStep] = useState<'camera' | 'mic' | 'ready'>('camera');
  const [error, setError] = useState<string | null>(null);

  // Check if all permissions granted
  useEffect(() => {
    if (cameraStatus === 'granted' && micStatus === 'granted') {
      setCurrentStep('ready');
      // Small delay before starting game
      setTimeout(() => {
        onPermissionsGranted();
      }, 1500);
    }
  }, [cameraStatus, micStatus, onPermissionsGranted]);

  // Move to mic step after camera granted
  useEffect(() => {
    if (cameraStatus === 'granted' && currentStep === 'camera') {
      setTimeout(() => setCurrentStep('mic'), 800);
    }
  }, [cameraStatus, currentStep]);

  const requestCamera = async () => {
    setCameraStatus('requesting');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately, we just need permission
      setCameraStatus('granted');
    } catch (err) {
      setCameraStatus('denied');
      setError('Camera access denied. The game needs your camera to detect emotions and for camera quests!');
    }
  };

  const requestMic = async () => {
    setMicStatus('requesting');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicStatus('granted');
    } catch (err) {
      setMicStatus('denied');
      setError('Microphone access denied. The game needs your mic for voice chat with NPCs!');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 comic-game-bg relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/assets/background/changi_airport.jpeg"
          alt="Changi Airport"
          fill
          className="object-cover"
          priority
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, rgba(26, 26, 46, 0.9) 0%, rgba(22, 33, 62, 0.85) 50%, rgba(15, 52, 96, 0.9) 100%)`,
          }}
        />
      </div>

      {/* Floating chicken */}
      <motion.div
        className="absolute top-10 right-10 text-6xl z-20"
        animate={{ y: [0, -15, 0], rotate: [-5, 5, -5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        🐔
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 max-w-md w-full bg-black/40 backdrop-blur-sm rounded-2xl p-6 border-4 border-black shadow-[6px_6px_0px_#000]"
      >
        {/* Title */}
        <motion.div
          className="text-center mb-8"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
        >
          <h1
            className="text-4xl text-yellow-400 mb-2"
            style={{
              fontFamily: 'Bangers, cursive',
              textShadow: '3px 3px 0 #E23636, 6px 6px 0 #1a1a1a',
            }}
          >
            BEFORE WE START...
          </h1>
          <p
            className="text-white/80 text-lg"
            style={{ fontFamily: 'Comic Neue, cursive' }}
          >
            The chicken needs a few things from you!
          </p>
        </motion.div>

        {/* Permission Cards */}
        <div className="space-y-4">
          {/* Camera Permission */}
          <motion.div
            className="comic-panel p-5 relative overflow-hidden group"
            animate={currentStep === 'camera' ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 1, repeat: currentStep === 'camera' ? Infinity : 0 }}
          >
            {/* Background Image & Overlay */}
            <div className="absolute inset-0 z-0">
              <Image 
                src="/assets/background/changi_airport.jpeg" 
                alt="Background" 
                fill 
                className="object-cover"
              />
              <div className={`absolute inset-0 opacity-80 ${
                cameraStatus === 'granted'
                  ? 'bg-[#FFE135]'
                  : cameraStatus === 'denied'
                  ? 'bg-[#E23636]'
                  : 'bg-[#4ECDC4]'
              }`} />
            </div>

            <div className="flex items-start gap-4 relative z-10">
              <motion.div
                className="text-5xl"
                animate={cameraStatus === 'requesting' ? { rotate: [0, 10, -10, 0] } : {}}
                transition={{ duration: 0.5, repeat: cameraStatus === 'requesting' ? Infinity : 0 }}
              >
                {cameraStatus === 'granted' ? '✅' : cameraStatus === 'denied' ? '❌' : '📷'}
              </motion.div>
              <div className="flex-1">
                <h3
                  className={`text-xl font-bold mb-1 ${
                    cameraStatus === 'denied' ? 'text-white' : 'text-[#1a1a1a]'
                  }`}
                  style={{ fontFamily: 'Bangers, cursive' }}
                >
                  CAMERA ACCESS
                </h3>
                <p
                  className={`text-sm mb-3 ${
                    cameraStatus === 'denied' ? 'text-white/90' : 'text-[#1a1a1a]/90'
                  }`}
                  style={{ fontFamily: 'Comic Neue, cursive' }}
                >
                  {cameraStatus === 'granted'
                    ? 'Camera ready! NPCs can see your reactions now!'
                    : 'NPCs will read your facial expressions and roast you accordingly! Also needed for camera quests.'}
                </p>
                {cameraStatus !== 'granted' && currentStep === 'camera' && (
                  <div className="flex gap-2">
                    <motion.button
                      onClick={requestCamera}
                      disabled={cameraStatus === 'requesting'}
                      className="flex-1 py-2 px-4 bg-white text-black font-bold rounded-lg border-3 border-black shadow-[3px_3px_0px_#000]"
                      style={{ fontFamily: 'Bangers, cursive' }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {cameraStatus === 'requesting' ? '🔄 CHECKING...' : '📷 ALLOW CAMERA'}
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Microphone Permission */}
          <motion.div
            className="comic-panel p-5 relative overflow-hidden group"
            animate={currentStep === 'mic' ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 1, repeat: currentStep === 'mic' ? Infinity : 0 }}
          >
            {/* Background Image & Overlay */}
            <div className="absolute inset-0 z-0">
              <Image 
                src="/assets/background/maxwell_fc.jpeg" 
                alt="Background" 
                fill 
                className="object-cover"
              />
              <div className={`absolute inset-0 opacity-80 ${
                micStatus === 'granted'
                  ? 'bg-[#FFE135]'
                  : micStatus === 'denied'
                  ? 'bg-[#E23636]'
                  : currentStep === 'mic' || currentStep === 'ready'
                  ? 'bg-[#FF69B4]'
                  : 'bg-[#2B4C7E]'
              }`} />
            </div>

            <div className="flex items-start gap-4 relative z-10">
              <motion.div
                className="text-5xl"
                animate={micStatus === 'requesting' ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3, repeat: micStatus === 'requesting' ? Infinity : 0 }}
              >
                {micStatus === 'granted' ? '✅' : micStatus === 'denied' ? '❌' : '🎤'}
              </motion.div>
              <div className="flex-1">
                <h3
                  className={`text-xl font-bold mb-1 ${
                    micStatus === 'granted' || (currentStep === 'mic' || currentStep === 'ready') && micStatus !== 'denied'
                      ? 'text-[#1a1a1a]'
                      : 'text-white'
                  }`}
                  style={{ fontFamily: 'Bangers, cursive' }}
                >
                  MICROPHONE ACCESS
                </h3>
                <p
                  className={`text-sm mb-3 ${
                    micStatus === 'granted' || (currentStep === 'mic' || currentStep === 'ready') && micStatus !== 'denied'
                      ? 'text-[#1a1a1a]/90'
                      : 'text-white/90'
                  }`}
                  style={{ fontFamily: 'Comic Neue, cursive' }}
                >
                  {micStatus === 'granted'
                    ? 'Mic ready! Talk to NPCs with your voice!'
                    : 'Talk to Singaporean NPCs using your voice! They\'ll respond in Singlish. Don\'t worry, text input also available lah!'}
                </p>
                {micStatus !== 'granted' && currentStep === 'mic' && (
                  <div className="flex gap-2">
                    <motion.button
                      onClick={requestMic}
                      disabled={micStatus === 'requesting'}
                      className="flex-1 py-2 px-4 bg-white text-black font-bold rounded-lg border-3 border-black shadow-[3px_3px_0px_#000]"
                      style={{ fontFamily: 'Bangers, cursive' }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {micStatus === 'requesting' ? '🔄 CHECKING...' : '🎤 ALLOW MIC'}
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-3 bg-red-500/20 border-2 border-red-400 rounded-lg"
            >
              <p className="text-red-200 text-sm text-center" style={{ fontFamily: 'Comic Neue, cursive' }}>
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ready State */}
        <AnimatePresence>
          {currentStep === 'ready' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 text-center"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-6xl mb-3"
              >
                🐔
              </motion.div>
              <h2
                className="text-3xl text-yellow-400"
                style={{
                  fontFamily: 'Bangers, cursive',
                  textShadow: '2px 2px 0 #E23636',
                }}
              >
                ALL SET! STARTING GAME...
              </h2>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress indicator */}
        <div className="flex justify-center gap-3 mt-6">
          <div
            className={`w-3 h-3 rounded-full border-2 border-white ${
              cameraStatus === 'granted' ? 'bg-green-400' : 'bg-white/30'
            }`}
          />
          <div
            className={`w-3 h-3 rounded-full border-2 border-white ${
              micStatus === 'granted' ? 'bg-green-400' : 'bg-white/30'
            }`}
          />
        </div>
      </motion.div>
    </div>
  );
}
