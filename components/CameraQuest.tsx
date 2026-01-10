'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';

interface CameraQuestProps {
  isOpen: boolean;
  onClose: () => void;
  questPrompt: string;
  questDescription: string;
  onQuestComplete: (success: boolean, description: string) => void;
}

export function CameraQuest({
  isOpen,
  onClose,
  questPrompt,
  questDescription,
  onQuestComplete
}: CameraQuestProps) {
  const [status, setStatus] = useState<'starting' | 'scanning' | 'success' | 'error'>('starting');
  const [scanMessage, setScanMessage] = useState('Starting camera...');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAnalyzingRef = useRef(false);
  const statusRef = useRef(status);
  const questPromptRef = useRef(questPrompt);

  // Keep refs in sync
  statusRef.current = status;
  questPromptRef.current = questPrompt;

  // Capture frame from video
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.6);
  }, []);

  // Stop camera and scanning
  const stopCamera = useCallback(() => {
    console.log('[CameraQuest] Stopping camera');
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Analyze frame with Gemini
  const analyzeFrame = useCallback(async () => {
    if (isAnalyzingRef.current || statusRef.current !== 'scanning') {
      console.log('[CameraQuest] Skipping analysis - busy or not scanning');
      return;
    }

    isAnalyzingRef.current = true;
    console.log('[CameraQuest] Analyzing frame...');

    try {
      const imageData = captureFrame();
      if (!imageData) {
        console.log('[CameraQuest] No image data');
        isAnalyzingRef.current = false;
        return;
      }

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error('API key not found');

      const ai = new GoogleGenAI({ apiKey });
      const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');

      console.log('[CameraQuest] Sending to Gemini...');

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
              }
            },
            {
              text: `You are checking a live camera feed for a game quest.

Quest requirement: ${questPromptRef.current}

Look at this image. Is the required item clearly visible?

Respond ONLY with this JSON format (no markdown):
{"found": true, "message": "short Singlish celebration"}
or
{"found": false, "message": "short Singlish hint"}

Examples:
- Found: {"found": true, "message": "Wah got lah! Can see already!"}
- Not found: {"found": false, "message": "Cannot see leh, show clearer!"}

Be generous - if you can reasonably see the item, return found=true.`
            }
          ]
        }]
      });

      const text = response.text || '';
      console.log('[CameraQuest] Gemini response:', text);

      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[CameraQuest] Parsed:', parsed);

        if (parsed.found) {
          // Success!
          console.log('[CameraQuest] SUCCESS!');
          setStatus('success');
          setSuccessMessage(parsed.message || 'Found it!');
          stopCamera();
        } else {
          // Keep scanning, show hint
          setScanMessage(parsed.message || 'Keep looking...');
        }
      }
    } catch (err) {
      console.error('[CameraQuest] Analysis error:', err);
      setScanMessage('Scanning... show the item!');
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [captureFrame, stopCamera]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      console.log('[CameraQuest] Starting camera...');
      setStatus('starting');
      setScanMessage('Starting camera...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log('[CameraQuest] Video playing');
      }

      setError(null);
      setStatus('scanning');
      setScanMessage('Point camera at the item!');

      // Start scanning after a short delay
      setTimeout(() => {
        console.log('[CameraQuest] Starting scan interval');
        // Clear any existing interval
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
        }
        // First scan
        analyzeFrame();
        // Then scan every 3 seconds
        scanIntervalRef.current = setInterval(() => {
          analyzeFrame();
        }, 3000);
      }, 1500);

    } catch (err) {
      console.error('[CameraQuest] Camera error:', err);
      setError('Cannot access camera. Please allow camera permissions.');
      setStatus('error');
    }
  }, [analyzeFrame]);

  // Handle close
  const handleClose = useCallback(() => {
    stopCamera();
    setStatus('starting');
    setScanMessage('Starting camera...');
    setSuccessMessage('');
    setError(null);
    onClose();
  }, [stopCamera, onClose]);

  // Handle success confirm
  const handleConfirm = useCallback(() => {
    onQuestComplete(true, successMessage);
    handleClose();
  }, [successMessage, onQuestComplete, handleClose]);

  // Start camera when opened
  useEffect(() => {
    if (isOpen) {
      console.log('[CameraQuest] Opening, starting camera');
      startCamera();
    }

    return () => {
      console.log('[CameraQuest] Cleanup');
      stopCamera();
    };
  }, [isOpen]); // Only depend on isOpen

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 z-50 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 text-center">
          <h2 className="text-xl font-bold text-white mb-1">📸 Camera Quest</h2>
          <p className="text-gray-300 text-sm">{questDescription}</p>
        </div>

        {/* Camera Area */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md aspect-[3/4] bg-gray-900 rounded-2xl overflow-hidden">
            {/* Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${status === 'success' ? 'opacity-50' : ''}`}
            />

            {/* Scanning Overlay */}
            {status === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Scanning corners */}
                <div className="absolute top-8 left-8 w-16 h-16 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                <div className="absolute top-8 right-8 w-16 h-16 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                <div className="absolute bottom-8 left-8 w-16 h-16 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                <div className="absolute bottom-8 right-8 w-16 h-16 border-b-4 border-r-4 border-green-400 rounded-br-lg" />

                {/* Scanning line animation */}
                <motion.div
                  className="absolute left-8 right-8 h-1 bg-green-400/50"
                  animate={{ top: ['15%', '85%', '15%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            )}

            {/* Success Overlay */}
            {status === 'success' && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/30">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-8xl"
                >
                  ✅
                </motion.div>
              </div>
            )}

            {/* Error Overlay */}
            {status === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
                <p className="text-red-400 text-center">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Status Message */}
        <div className="px-4 pb-2">
          <div className={`p-3 rounded-xl text-center ${
            status === 'success' ? 'bg-green-500/20 text-green-300' :
            status === 'error' ? 'bg-red-500/20 text-red-300' :
            'bg-blue-500/20 text-blue-300'
          }`}>
            {status === 'success' ? (
              <p className="text-lg font-bold">{successMessage}</p>
            ) : status === 'scanning' ? (
              <>
                <p className="text-lg">{scanMessage}</p>
                <p className="text-xs mt-1 opacity-70">🔍 Auto-scanning every 3s...</p>
              </>
            ) : status === 'error' ? (
              <p>{error}</p>
            ) : (
              <p>Initializing camera...</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-3">
          {status === 'success' ? (
            <button
              onClick={handleConfirm}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-full font-bold text-lg"
            >
              ✅ Quest Complete!
            </button>
          ) : (
            <>
              {status === 'scanning' && (
                <button
                  onClick={() => analyzeFrame()}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-full font-bold"
                >
                  🔍 Scan Now
                </button>
              )}
              <button
                onClick={handleClose}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-full"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
