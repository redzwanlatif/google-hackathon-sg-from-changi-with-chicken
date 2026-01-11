'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DrumNote {
  id: number;
  side: 'left' | 'right';
  y: number;
  hit: boolean;
  missed: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  angle: number;
  speed: number;
}

interface DrumQuestProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestComplete: (success: boolean, message: string) => void;
}

// Chinese wedding drum pattern - more dynamic!
const DRUM_PATTERN: ('left' | 'right')[] = [
  'left', 'right', 'left', 'right',     // Opening beat
  'left', 'left', 'right', 'right',     // Double hits
  'right', 'left', 'right', 'left',     // Reverse
  'left', 'right', 'right', 'left',     // Syncopation
  'left', 'left', 'left', 'right',      // Build up
  'right', 'right', 'right', 'left',    // Mirror
  'left', 'right', 'left', 'right',     // Final flourish
];

// Web Audio drum synthesizer
class DrumSynth {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  playDrum(side: 'left' | 'right', isHit: boolean = true) {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Different frequencies for left (lower) and right (higher)
    const baseFreq = side === 'left' ? 80 : 120;

    // Oscillator for the body
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * (isHit ? 1 : 0.5), now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.1);

    gainNode.gain.setValueAtTime(isHit ? 0.8 : 0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);

    // Add noise burst for attack
    if (isHit) {
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.3;
      }

      const noiseSource = ctx.createBufferSource();
      const noiseGain = ctx.createGain();

      noiseSource.buffer = noiseBuffer;
      noiseGain.gain.setValueAtTime(0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

      noiseSource.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start(now);
    }
  }

  playCombo(level: number) {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Rising chime for combo
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseNote = 400 + (level * 50);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseNote, now);
    osc.frequency.exponentialRampToValueAtTime(baseNote * 1.5, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playSuccess() {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Victory fanfare
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.4, now + i * 0.15 + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.3);
    });
  }

  playMiss() {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }
}

const drumSynth = new DrumSynth();

export function DrumQuest({
  isOpen,
  onClose,
  onQuestComplete
}: DrumQuestProps) {
  const [status, setStatus] = useState<'starting' | 'countdown' | 'playing' | 'success' | 'failed'>('starting');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [notes, setNotes] = useState<DrumNote[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [lastHitSide, setLastHitSide] = useState<'left' | 'right' | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [message, setMessage] = useState('Get ready to drum!');
  const [hitCount, setHitCount] = useState(0);

  // Motion detection state
  const [motionLeft, setMotionLeft] = useState(0);
  const [motionRight, setMotionRight] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const noteIdRef = useRef(0);
  const noteIndexRef = useRef(0);
  const particleIdRef = useRef(0);
  const hitCountRef = useRef(0); // Use ref to track hits reliably

  // Spawn particles on hit
  const spawnParticles = useCallback((side: 'left' | 'right') => {
    const x = side === 'left' ? 25 : 75;
    const colors = side === 'left'
      ? ['#ef4444', '#dc2626', '#fca5a5', '#fef08a']
      : ['#eab308', '#facc15', '#fef08a', '#ef4444'];

    const newParticles: Particle[] = [];
    for (let i = 0; i < 12; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y: 80,
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: (Math.PI * 2 * i) / 12 + Math.random() * 0.5,
        speed: 3 + Math.random() * 4,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);

    // Clean up particles after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 500);
  }, []);

  // Motion detection using frame differencing
  const detectMotion = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0) return;

    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Draw mirrored frame
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -160, 0, 160, 120);
    ctx.restore();

    const currentFrame = ctx.getImageData(0, 0, 160, 120);

    if (prevFrameRef.current) {
      let leftMotion = 0;
      let rightMotion = 0;

      const data = currentFrame.data;
      const prevData = prevFrameRef.current.data;

      // Compare pixels
      for (let y = 0; y < 120; y++) {
        for (let x = 0; x < 160; x++) {
          const i = (y * 160 + x) * 4;

          // Calculate brightness difference
          const diff = Math.abs(data[i] - prevData[i]) +
                       Math.abs(data[i+1] - prevData[i+1]) +
                       Math.abs(data[i+2] - prevData[i+2]);

          // Threshold for motion
          if (diff > 60) {
            if (x < 80) {
              leftMotion++;
            } else {
              rightMotion++;
            }
          }
        }
      }

      // Normalize and apply threshold
      const threshold = 150;
      setMotionLeft(leftMotion > threshold ? leftMotion : 0);
      setMotionRight(rightMotion > threshold ? rightMotion : 0);
    }

    prevFrameRef.current = currentFrame;
  }, []);

  // Check for hits based on motion
  useEffect(() => {
    if (status !== 'playing') return;

    const motionSide = motionLeft > motionRight && motionLeft > 200 ? 'left'
                     : motionRight > motionLeft && motionRight > 200 ? 'right'
                     : null;

    if (!motionSide) return;

    setNotes(prevNotes => {
      let hitOccurred = false;
      const updated = prevNotes.map(note => {
        // Note is in hit zone (y between 65-90)
        if (!note.hit && !note.missed && note.y >= 65 && note.y <= 90) {
          if (motionSide === note.side && !hitOccurred) {
            hitOccurred = true;
            // HIT!
            drumSynth.playDrum(note.side, true);
            setScore(s => s + (10 * (combo + 1)));
            setCombo(c => {
              const newCombo = c + 1;
              setMaxCombo(m => Math.max(m, newCombo));
              if (newCombo >= 3) {
                drumSynth.playCombo(newCombo);
                setMessage(getComboMessage(newCombo));
              } else {
                setMessage(getHitMessage());
              }
              return newCombo;
            });
            setHitCount(h => h + 1); hitCountRef.current++;
            setLastHitSide(note.side);
            setScreenShake(true);
            spawnParticles(note.side);
            setTimeout(() => {
              setLastHitSide(null);
              setScreenShake(false);
            }, 150);
            return { ...note, hit: true };
          }
        }
        return note;
      });
      return updated;
    });
  }, [motionLeft, motionRight, status, combo, spawnParticles]);

  // Also allow keyboard controls as fallback
  useEffect(() => {
    if (status !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const side = (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') ? 'left'
                 : (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') ? 'right'
                 : null;

      if (!side) return;

      setNotes(prevNotes => {
        let hitOccurred = false;
        return prevNotes.map(note => {
          if (!note.hit && !note.missed && note.y >= 65 && note.y <= 90 && !hitOccurred) {
            if (side === note.side) {
              hitOccurred = true;
              drumSynth.playDrum(note.side, true);
              setScore(s => s + (10 * (combo + 1)));
              setCombo(c => {
                const newCombo = c + 1;
                setMaxCombo(m => Math.max(m, newCombo));
                if (newCombo >= 3) {
                  drumSynth.playCombo(newCombo);
                  setMessage(getComboMessage(newCombo));
                } else {
                  setMessage(getHitMessage());
                }
                return newCombo;
              });
              setHitCount(h => h + 1); hitCountRef.current++;
              setLastHitSide(note.side);
              setScreenShake(true);
              spawnParticles(note.side);
              setTimeout(() => {
                setLastHitSide(null);
                setScreenShake(false);
              }, 150);
              return { ...note, hit: true };
            }
          }
          return note;
        });
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, combo, spawnParticles]);

  // Touch controls
  const handleTouch = useCallback((side: 'left' | 'right') => {
    if (status !== 'playing') return;

    setNotes(prevNotes => {
      let hitOccurred = false;
      return prevNotes.map(note => {
        if (!note.hit && !note.missed && note.y >= 65 && note.y <= 90 && !hitOccurred) {
          if (side === note.side) {
            hitOccurred = true;
            drumSynth.playDrum(note.side, true);
            setScore(s => s + (10 * (combo + 1)));
            setCombo(c => {
              const newCombo = c + 1;
              setMaxCombo(m => Math.max(m, newCombo));
              if (newCombo >= 3) {
                drumSynth.playCombo(newCombo);
                setMessage(getComboMessage(newCombo));
              } else {
                setMessage(getHitMessage());
              }
              return newCombo;
            });
            setHitCount(h => h + 1); hitCountRef.current++;
            setLastHitSide(note.side);
            setScreenShake(true);
            spawnParticles(note.side);
            setTimeout(() => {
              setLastHitSide(null);
              setScreenShake(false);
            }, 150);
            return { ...note, hit: true };
          }
        }
        return note;
      });
    });
  }, [status, combo, spawnParticles]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('countdown');
    } catch {
      // Camera not available, still allow play with keyboard/touch
      console.log('[DrumQuest] Camera not available, using touch/keyboard controls');
      setStatus('countdown');
    }
  }, []);

  // Stop everything
  const stopGame = useCallback(() => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Countdown
  useEffect(() => {
    if (status !== 'countdown') return;

    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          setStatus('playing');
          return 0;
        }
        drumSynth.playDrum(c % 2 === 0 ? 'left' : 'right', true);
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // Game loop
  useEffect(() => {
    if (status !== 'playing') return;

    // Spawn notes
    const spawnInterval = setInterval(() => {
      if (noteIndexRef.current >= DRUM_PATTERN.length) {
        clearInterval(spawnInterval);
        return;
      }

      const side = DRUM_PATTERN[noteIndexRef.current];
      noteIndexRef.current++;

      setNotes(prev => [...prev, {
        id: noteIdRef.current++,
        side,
        y: 0,
        hit: false,
        missed: false
      }]);
    }, 600); // Faster notes

    // Move notes down and detect motion
    const moveInterval = setInterval(() => {
      detectMotion();

      setNotes(prev => {
        const updated = prev.map(note => {
          const newY = note.y + 3;
          const nowMissed = !note.hit && newY > 90;

          if (nowMissed && !note.missed) {
            drumSynth.playMiss();
            setCombo(0);
            setMessage('Miss!');
          }

          return {
            ...note,
            y: newY,
            missed: note.missed || nowMissed
          };
        });

        return updated.filter(note => note.y < 110);
      });
    }, 50);

    // Check for game end
    const checkEndInterval = setInterval(() => {
      if (noteIndexRef.current >= DRUM_PATTERN.length) {
        setNotes(prev => {
          if (prev.length === 0 || prev.every(n => n.hit || n.missed)) {
            clearInterval(checkEndInterval);
            clearInterval(moveInterval);
            clearInterval(spawnInterval);

            // Calculate result - need at least 50% hits (use ref for accurate count)
            setTimeout(() => {
              const successRate = hitCountRef.current / DRUM_PATTERN.length;
              console.log('[DrumQuest] Success check:', hitCountRef.current, '/', DRUM_PATTERN.length, '=', successRate);
              if (successRate >= 0.5 || score >= 100) {
                setStatus('success');
                setMessage('Huat ah! 大吉大利!');
                drumSynth.playSuccess();
              } else {
                setStatus('failed');
                setMessage('Aiyoh, not enough rhythm lah!');
              }
            }, 500);
          }
          return prev;
        });
      }
    }, 300);

    gameLoopRef.current = moveInterval;

    return () => {
      clearInterval(spawnInterval);
      clearInterval(moveInterval);
      clearInterval(checkEndInterval);
    };
  }, [status, detectMotion, hitCount, score]);

  // Start on open
  useEffect(() => {
    if (isOpen) {
      setStatus('starting');
      setScore(0);
      setCombo(0);
      setMaxCombo(0);
      setHitCount(0);
      setNotes([]);
      setParticles([]);
      setCountdown(3);
      noteIndexRef.current = 0;
      noteIdRef.current = 0;
      hitCountRef.current = 0;
      prevFrameRef.current = null;
      startCamera();
    }
    return () => stopGame();
  }, [isOpen, startCamera, stopGame]);

  // Handle completion
  const handleComplete = useCallback(() => {
    stopGame();
    onQuestComplete(status === 'success', message);
    onClose();
  }, [status, message, stopGame, onQuestComplete, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #7f1d1d 0%, #450a0a 50%, #1c1917 100%)'
        }}
      >
        {/* Chinese pattern overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30z' fill='%23fbbf24' fill-opacity='0.4'/%3E%3C/svg%3E")`,
            backgroundSize: '30px 30px'
          }}
        />

        {/* Header with Chinese wedding theme */}
        <div className="p-4 text-center relative z-10">
          <motion.h2
            className="text-2xl font-bold text-yellow-400 mb-1"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🥁 囍 Wedding Drum 囍 🥁
          </motion.h2>
          <p className="text-red-200 text-sm">Move hands LEFT or RIGHT • Keys: A/D • Tap drums!</p>
        </div>

        {/* Score display */}
        <div className="flex justify-center gap-8 text-white mb-2 relative z-10">
          <div className="text-center bg-black/30 px-4 py-2 rounded-lg border border-yellow-500/30">
            <div className="text-3xl font-bold text-yellow-400">{score}</div>
            <div className="text-xs text-yellow-200/70">Score</div>
          </div>
          <AnimatePresence>
            {combo > 1 && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                className="text-center bg-gradient-to-r from-red-600 to-orange-500 px-4 py-2 rounded-lg border-2 border-yellow-400"
              >
                <div className="text-3xl font-bold text-white">x{combo}</div>
                <div className="text-xs text-yellow-100">COMBO!</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Game Area */}
        <motion.div
          className="flex-1 flex items-center justify-center p-4 relative z-10"
          animate={screenShake ? { x: [0, -5, 5, -5, 0] } : {}}
          transition={{ duration: 0.15 }}
        >
          <div className="relative w-full max-w-md aspect-[3/4] rounded-2xl overflow-hidden border-4 border-yellow-500/50 shadow-2xl">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-red-900/80 via-red-950/90 to-black" />

            {/* Video Feed (mirrored, subtle) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover opacity-20"
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Drum Lanes */}
            <div className="absolute inset-0 flex">
              {/* Left Lane */}
              <motion.div
                className="flex-1 border-r-2 border-yellow-500/30 relative"
                animate={{ backgroundColor: lastHitSide === 'left' ? 'rgba(239, 68, 68, 0.4)' : 'transparent' }}
                onClick={() => handleTouch('left')}
                onTouchStart={(e) => { e.preventDefault(); handleTouch('left'); }}
              >
                {/* Hit zone glow */}
                <div className="absolute bottom-[10%] left-0 right-0 h-[25%] bg-gradient-to-t from-red-500/40 to-transparent" />

                {/* Drum target */}
                <motion.div
                  className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-4 border-yellow-400 flex items-center justify-center shadow-lg"
                  animate={lastHitSide === 'left' ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.15 }}
                  style={{ boxShadow: lastHitSide === 'left' ? '0 0 30px rgba(239, 68, 68, 0.8)' : '0 0 15px rgba(239, 68, 68, 0.3)' }}
                >
                  <span className="text-3xl">🥁</span>
                </motion.div>

                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-red-400 text-lg font-bold bg-black/50 px-3 py-1 rounded">
                  ← LEFT
                </div>

                {/* Motion indicator */}
                {motionLeft > 200 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute bottom-[35%] left-1/2 -translate-x-1/2 text-4xl"
                  >
                    👋
                  </motion.div>
                )}
              </motion.div>

              {/* Right Lane */}
              <motion.div
                className="flex-1 relative"
                animate={{ backgroundColor: lastHitSide === 'right' ? 'rgba(234, 179, 8, 0.4)' : 'transparent' }}
                onClick={() => handleTouch('right')}
                onTouchStart={(e) => { e.preventDefault(); handleTouch('right'); }}
              >
                {/* Hit zone glow */}
                <div className="absolute bottom-[10%] left-0 right-0 h-[25%] bg-gradient-to-t from-yellow-500/40 to-transparent" />

                {/* Drum target */}
                <motion.div
                  className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 border-4 border-red-400 flex items-center justify-center shadow-lg"
                  animate={lastHitSide === 'right' ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.15 }}
                  style={{ boxShadow: lastHitSide === 'right' ? '0 0 30px rgba(234, 179, 8, 0.8)' : '0 0 15px rgba(234, 179, 8, 0.3)' }}
                >
                  <span className="text-3xl">🥁</span>
                </motion.div>

                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-yellow-400 text-lg font-bold bg-black/50 px-3 py-1 rounded">
                  RIGHT →
                </div>

                {/* Motion indicator */}
                {motionRight > 200 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute bottom-[35%] left-1/2 -translate-x-1/2 text-4xl"
                  >
                    👋
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* Falling Notes */}
            {notes.map(note => (
              <motion.div
                key={note.id}
                className={`absolute w-14 h-14 rounded-full flex items-center justify-center
                  ${note.side === 'left' ? 'left-[25%] -translate-x-1/2' : 'right-[25%] translate-x-1/2'}
                `}
                style={{
                  top: `${note.y}%`,
                  background: note.hit
                    ? 'radial-gradient(circle, #22c55e, #15803d)'
                    : note.missed
                    ? 'radial-gradient(circle, #6b7280, #374151)'
                    : note.side === 'left'
                    ? 'radial-gradient(circle, #ef4444, #b91c1c)'
                    : 'radial-gradient(circle, #eab308, #a16207)',
                  boxShadow: note.hit
                    ? '0 0 20px rgba(34, 197, 94, 0.8)'
                    : note.missed
                    ? 'none'
                    : note.side === 'left'
                    ? '0 0 15px rgba(239, 68, 68, 0.6)'
                    : '0 0 15px rgba(234, 179, 8, 0.6)',
                  border: '3px solid rgba(255,255,255,0.3)'
                }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{
                  scale: note.hit ? [1, 1.5, 0] : 1,
                  opacity: note.hit ? [1, 1, 0] : note.missed ? 0.3 : 1
                }}
                transition={{ duration: note.hit ? 0.2 : 0.1 }}
              >
                <span className="text-2xl">{note.hit ? '✓' : note.side === 'left' ? '◀' : '▶'}</span>
              </motion.div>
            ))}

            {/* Particles */}
            {particles.map(particle => (
              <motion.div
                key={particle.id}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  left: `${particle.x}%`,
                  backgroundColor: particle.color,
                  boxShadow: `0 0 6px ${particle.color}`
                }}
                initial={{ y: '80%', scale: 1, opacity: 1 }}
                animate={{
                  x: Math.cos(particle.angle) * particle.speed * 20,
                  y: `${80 - Math.sin(particle.angle) * particle.speed * 15}%`,
                  scale: 0,
                  opacity: 0
                }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            ))}

            {/* Countdown Overlay */}
            {status === 'countdown' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <motion.div
                  key={countdown}
                  initial={{ scale: 3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="text-center"
                >
                  <div className="text-9xl font-bold text-yellow-400" style={{ textShadow: '0 0 30px rgba(234, 179, 8, 0.8)' }}>
                    {countdown}
                  </div>
                  <div className="text-xl text-red-300 mt-2">準備好!</div>
                </motion.div>
              </div>
            )}

            {/* Success/Fail Overlay */}
            {(status === 'success' || status === 'failed') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-black/80"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 10 }}
                  className="text-center"
                >
                  <motion.div
                    className="text-7xl mb-4"
                    animate={status === 'success' ? { rotate: [0, -10, 10, 0] } : {}}
                    transition={{ duration: 0.5, repeat: status === 'success' ? 3 : 0 }}
                  >
                    {status === 'success' ? '🎊' : '😅'}
                  </motion.div>
                  <div className={`text-3xl font-bold mb-2 ${status === 'success' ? 'text-yellow-400' : 'text-gray-300'}`}>
                    {status === 'success' ? '囍 HUAT AH! 囍' : 'Try Again lah!'}
                  </div>
                  <div className="text-yellow-400 text-2xl">Score: {score}</div>
                  {maxCombo > 2 && (
                    <div className="text-orange-400 text-lg mt-1">Max Combo: x{maxCombo}</div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Hidden canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Message */}
        <div className="px-4 pb-2 relative z-10">
          <motion.div
            key={message}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`p-3 rounded-xl text-center ${
              message.includes('COMBO') || message.includes('Perfect')
                ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border border-yellow-400/50'
                : message.includes('Miss')
                ? 'bg-red-900/30 border border-red-500/30'
                : 'bg-yellow-500/20 border border-yellow-500/30'
            }`}
          >
            <p className="text-lg font-bold text-yellow-100">{message}</p>
          </motion.div>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-3 relative z-10">
          {(status === 'success' || status === 'failed') ? (
            <motion.button
              onClick={handleComplete}
              className={`w-full py-4 rounded-full font-bold text-lg border-2 ${
                status === 'success'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 border-yellow-300 text-black'
                  : 'bg-gradient-to-r from-orange-600 to-red-600 border-orange-400 text-white'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {status === 'success' ? '✅ 恭喜! Quest Complete!' : '🔄 Try Again'}
            </motion.button>
          ) : (
            <button
              onClick={() => { stopGame(); onClose(); }}
              className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-full border border-white/20"
            >
              Cancel
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Helper functions for messages
function getHitMessage(): string {
  const messages = ['Nice!', 'Good!', '好!', 'Shiok!', 'On!'];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getComboMessage(combo: number): string {
  if (combo >= 10) return '🔥 LEGENDARY x' + combo + '! 🔥';
  if (combo >= 7) return '⚡ AMAZING x' + combo + '! ⚡';
  if (combo >= 5) return '🌟 COMBO x' + combo + '! 🌟';
  return '✨ COMBO x' + combo + '!';
}
