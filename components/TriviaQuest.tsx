'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TriviaQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  category: 'singlish' | 'food' | 'singapore' | 'culture';
}

// Singapore-themed trivia questions with Zam Zam / murtabak flavor
const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // Singlish
  {
    id: 1,
    question: "What does 'makan' mean?",
    options: ["Sleep", "Eat", "Walk", "Talk"],
    correctIndex: 1,
    category: 'singlish'
  },
  {
    id: 2,
    question: "What does 'sedap' mean?",
    options: ["Spicy", "Expensive", "Delicious", "Hot"],
    correctIndex: 2,
    category: 'singlish'
  },
  {
    id: 3,
    question: "What does 'shiok' mean?",
    options: ["Tired", "Fantastic/Satisfying", "Angry", "Hungry"],
    correctIndex: 1,
    category: 'singlish'
  },
  {
    id: 4,
    question: "What does 'blur like sotong' mean?",
    options: ["Very fast", "Very confused", "Very smart", "Very sleepy"],
    correctIndex: 1,
    category: 'singlish'
  },
  {
    id: 5,
    question: "What does 'boleh' mean?",
    options: ["Cannot", "Maybe", "Can/Okay", "No way"],
    correctIndex: 2,
    category: 'singlish'
  },
  // Food
  {
    id: 6,
    question: "What meat is traditionally in murtabak?",
    options: ["Chicken", "Beef", "Mutton", "Fish"],
    correctIndex: 2,
    category: 'food'
  },
  {
    id: 7,
    question: "What year was Zam Zam Restaurant established?",
    options: ["1888", "1908", "1928", "1948"],
    correctIndex: 1,
    category: 'food'
  },
  {
    id: 8,
    question: "What is murtabak traditionally served with?",
    options: ["Chili sauce", "Curry", "Ketchup", "Mayo"],
    correctIndex: 1,
    category: 'food'
  },
  {
    id: 9,
    question: "Which area is famous for Indian Muslim food like murtabak?",
    options: ["Chinatown", "Little India", "Kampong Glam", "Orchard"],
    correctIndex: 2,
    category: 'food'
  },
  {
    id: 10,
    question: "What is prata also known as?",
    options: ["Roti canai", "Naan", "Chapati", "Paratha"],
    correctIndex: 0,
    category: 'food'
  },
  // Singapore
  {
    id: 11,
    question: "Sultan Mosque is located in which area?",
    options: ["Chinatown", "Kampong Glam", "Little India", "Bugis"],
    correctIndex: 1,
    category: 'singapore'
  },
  {
    id: 12,
    question: "How many towers does Marina Bay Sands have?",
    options: ["2", "3", "4", "5"],
    correctIndex: 1,
    category: 'singapore'
  },
  {
    id: 13,
    question: "What is Singapore's national flower?",
    options: ["Rose", "Orchid", "Hibiscus", "Jasmine"],
    correctIndex: 1,
    category: 'singapore'
  },
  {
    id: 14,
    question: "Which MRT line is the oldest in Singapore?",
    options: ["East-West Line", "North-South Line", "Circle Line", "Downtown Line"],
    correctIndex: 1,
    category: 'singapore'
  },
  {
    id: 15,
    question: "What is the name of Singapore's famous shopping street?",
    options: ["Bugis Street", "Orchard Road", "Haji Lane", "Arab Street"],
    correctIndex: 1,
    category: 'singapore'
  },
  // Culture
  {
    id: 16,
    question: "In Malay weddings, what is 'hantaran'?",
    options: ["Wedding dress", "Gift exchange", "Dance", "Food"],
    correctIndex: 1,
    category: 'culture'
  },
  {
    id: 17,
    question: "What color is traditionally worn at Chinese weddings?",
    options: ["White", "Blue", "Red", "Green"],
    correctIndex: 2,
    category: 'culture'
  },
  {
    id: 18,
    question: "What is thrown at weddings for good luck?",
    options: ["Flowers", "Rice", "Coins", "Water"],
    correctIndex: 1,
    category: 'culture'
  },
  {
    id: 19,
    question: "What does 'ang bao' contain?",
    options: ["Candy", "Money", "Rice", "Flowers"],
    correctIndex: 1,
    category: 'culture'
  },
  {
    id: 20,
    question: "Hari Raya celebrates the end of which month?",
    options: ["Ramadan", "Syawal", "Rajab", "Muharram"],
    correctIndex: 0,
    category: 'culture'
  },
];

// Sound effects using Web Audio API
class TriviaSounds {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  playCorrect() {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Happy ascending chime
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.1 + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  }

  playWrong() {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playTick() {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
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
      gain.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.4);
    });
  }
}

const triviaSounds = new TriviaSounds();

interface TriviaQuestProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestComplete: (success: boolean, score: number, message: string) => void;
}

export function TriviaQuest({
  isOpen,
  onClose,
  onQuestComplete
}: TriviaQuestProps) {
  const [status, setStatus] = useState<'intro' | 'playing' | 'result'>('intro');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [streak, setStreak] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize game
  useEffect(() => {
    if (isOpen) {
      // Shuffle and pick 5 random questions
      const shuffled = [...TRIVIA_QUESTIONS].sort(() => Math.random() - 0.5);
      setQuestions(shuffled.slice(0, 5));
      setStatus('intro');
      setCurrentIndex(0);
      setScore(0);
      setTimeLeft(10);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setStreak(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  // Timer countdown during play
  useEffect(() => {
    if (status !== 'playing' || showFeedback) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up!
          handleAnswer(-1);
          return 10;
        }
        if (prev <= 4) {
          triviaSounds.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, showFeedback, currentIndex]);

  const handleAnswer = useCallback((answerIndex: number) => {
    if (showFeedback) return;

    setSelectedAnswer(answerIndex);
    setShowFeedback(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const currentQuestion = questions[currentIndex];
    const isCorrect = answerIndex === currentQuestion?.correctIndex;

    if (isCorrect) {
      triviaSounds.playCorrect();
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
      setFeedbackMessage(getCorrectMessage(streak + 1));
    } else {
      triviaSounds.playWrong();
      setStreak(0);
      setFeedbackMessage(getWrongMessage());
    }

    // Move to next question after delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
        setTimeLeft(10);
      } else {
        // Quiz complete
        triviaSounds.playSuccess();
        setStatus('result');
      }
    }, 1500);
  }, [showFeedback, questions, currentIndex, streak]);

  const handleComplete = useCallback(() => {
    const moneyEarned = score * 5;
    const resultMessage = score === 5
      ? "Perfect! You know Singapore damn well sia!"
      : score >= 3
        ? "Not bad lah! You know your stuff!"
        : "Aiyoh, need to learn more about Singapore!";
    onQuestComplete(true, score, resultMessage);
  }, [score, onQuestComplete]);

  const startGame = useCallback(() => {
    setStatus('playing');
    setTimeLeft(10);
  }, []);

  if (!isOpen) return null;

  const currentQuestion = questions[currentIndex];
  const moneyEarned = score * 5;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #92400e 0%, #78350f 50%, #451a03 100%)'
        }}
      >
        {/* Murtabak pattern overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='15' fill='%23fbbf24' fill-opacity='0.3'/%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Header */}
        <div className="p-4 text-center relative z-10">
          <motion.h2
            className="text-2xl font-bold text-yellow-400 mb-1"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)', fontFamily: 'Bangers, cursive' }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🥙 ZAM ZAM TRIVIA 🥙
          </motion.h2>
          <p className="text-amber-200 text-sm">Answer questions to earn $$$!</p>
        </div>

        {/* Score & Timer Display */}
        {status === 'playing' && currentQuestion && (
          <div className="flex justify-center gap-6 text-white mb-4 px-4 relative z-10">
            <div className="text-center bg-black/30 px-4 py-2 rounded-lg border border-yellow-500/30">
              <div className="text-2xl font-bold text-green-400">${moneyEarned}</div>
              <div className="text-xs text-yellow-200/70">Earned</div>
            </div>
            <motion.div
              className={`text-center px-4 py-2 rounded-lg border-2 ${
                timeLeft <= 3 ? 'bg-red-500/30 border-red-400' : 'bg-black/30 border-yellow-500/30'
              }`}
              animate={timeLeft <= 3 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3, repeat: timeLeft <= 3 ? Infinity : 0 }}
            >
              <div className={`text-2xl font-bold ${timeLeft <= 3 ? 'text-red-400' : 'text-white'}`}>
                {timeLeft}s
              </div>
              <div className="text-xs text-yellow-200/70">Time</div>
            </motion.div>
            <div className="text-center bg-black/30 px-4 py-2 rounded-lg border border-yellow-500/30">
              <div className="text-2xl font-bold text-amber-300">{currentIndex + 1}/5</div>
              <div className="text-xs text-yellow-200/70">Question</div>
            </div>
          </div>
        )}

        {/* Game Content */}
        <div className="flex-1 flex items-center justify-center p-4 relative z-10">
          {/* Intro Screen */}
          {status === 'intro' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-black/40 backdrop-blur rounded-2xl p-6 max-w-md text-center border-4 border-yellow-500"
            >
              <div className="text-6xl mb-4">🥙</div>
              <h3
                className="text-2xl font-bold text-yellow-400 mb-2"
                style={{ fontFamily: 'Bangers, cursive' }}
              >
                ZAM ZAM UNCLE'S CHALLENGE!
              </h3>
              <p className="text-white mb-4">
                Answer 5 questions about Singapore!<br/>
                <span className="text-green-400 font-bold">$5 for each correct answer!</span>
              </p>
              <div className="text-left text-amber-200 text-sm mb-4 space-y-1 bg-black/30 p-3 rounded-lg">
                <p>⏱️ 10 seconds per question</p>
                <p>🎯 Tap the correct answer</p>
                <p>💰 Maximum reward: $25</p>
                <p>🥙 Best murtabak in Singapore!</p>
              </div>
              <motion.button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold rounded-xl border-4 border-black shadow-[4px_4px_0px_#000]"
                style={{ fontFamily: 'Bangers, cursive' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                START TRIVIA!
              </motion.button>
              <button
                onClick={onClose}
                className="w-full mt-3 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl border border-white/20"
              >
                Maybe Later
              </button>
            </motion.div>
          )}

          {/* Playing Screen */}
          {status === 'playing' && currentQuestion && (
            <motion.div
              key={currentIndex}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="w-full max-w-md"
            >
              {/* Category Badge */}
              <div className="flex justify-center mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  currentQuestion.category === 'singlish' ? 'bg-purple-500/50 text-purple-100' :
                  currentQuestion.category === 'food' ? 'bg-orange-500/50 text-orange-100' :
                  currentQuestion.category === 'singapore' ? 'bg-red-500/50 text-red-100' :
                  'bg-green-500/50 text-green-100'
                }`}>
                  {currentQuestion.category}
                </span>
              </div>

              {/* Question */}
              <div className="bg-black/40 backdrop-blur rounded-2xl p-5 mb-4 border-2 border-yellow-500/50">
                <h3 className="text-xl font-bold text-white text-center">
                  {currentQuestion.question}
                </h3>
              </div>

              {/* Answer Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = index === currentQuestion.correctIndex;
                  const showCorrect = showFeedback && isCorrect;
                  const showWrong = showFeedback && isSelected && !isCorrect;

                  return (
                    <motion.button
                      key={index}
                      onClick={() => !showFeedback && handleAnswer(index)}
                      disabled={showFeedback}
                      className={`
                        w-full p-4 rounded-xl text-left font-bold text-lg
                        border-4 transition-all flex items-center gap-3
                        ${showCorrect
                          ? 'bg-green-500 border-green-300 text-white'
                          : showWrong
                            ? 'bg-red-500 border-red-300 text-white'
                            : 'bg-black/30 border-yellow-500/30 text-white hover:bg-black/50 hover:border-yellow-400'
                        }
                      `}
                      whileHover={!showFeedback ? { scale: 1.02, x: 5 } : {}}
                      whileTap={!showFeedback ? { scale: 0.98 } : {}}
                      animate={showCorrect ? { scale: [1, 1.05, 1] } : showWrong ? { x: [0, -10, 10, -10, 0] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        showCorrect ? 'bg-green-700' :
                        showWrong ? 'bg-red-700' :
                        'bg-yellow-600/50'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {showCorrect && <span className="text-2xl">✓</span>}
                      {showWrong && <span className="text-2xl">✗</span>}
                    </motion.button>
                  );
                })}
              </div>

              {/* Feedback Message */}
              <AnimatePresence>
                {showFeedback && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className={`mt-4 p-3 rounded-xl text-center font-bold text-lg ${
                      selectedAnswer === currentQuestion.correctIndex
                        ? 'bg-green-500/30 text-green-300 border border-green-400/50'
                        : 'bg-red-500/30 text-red-300 border border-red-400/50'
                    }`}
                  >
                    {feedbackMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Result Screen */}
          {status === 'result' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-black/40 backdrop-blur rounded-2xl p-6 max-w-md text-center border-4 border-yellow-500"
            >
              <motion.div
                className="text-7xl mb-4"
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                {score === 5 ? '🏆' : score >= 3 ? '🎉' : '📚'}
              </motion.div>
              <h3
                className="text-3xl font-bold text-yellow-400 mb-2"
                style={{ fontFamily: 'Bangers, cursive' }}
              >
                {score === 5 ? 'PERFECT!' : score >= 3 ? 'WELL DONE!' : 'NICE TRY!'}
              </h3>
              <p className="text-white text-xl mb-2">
                You got <span className="text-green-400 font-bold">{score}/5</span> correct!
              </p>
              <motion.p
                className="text-4xl font-bold text-green-400 mb-4"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                +${moneyEarned}
              </motion.p>
              <p className="text-amber-200 mb-4 text-lg">
                {score === 5
                  ? "Wah, you know Singapore damn well sia!"
                  : score >= 3
                    ? "Not bad lah abang! You know your stuff!"
                    : "Aiyoh, need to explore Singapore more!"}
              </p>

              {/* Murtabak bonus message */}
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
                <p className="text-yellow-200 text-sm">
                  🥙 Zam Zam Uncle says: "Sedap! Now take your money and go save that wedding!"
                </p>
              </div>

              <motion.button
                onClick={handleComplete}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl border-4 border-black shadow-[4px_4px_0px_#000]"
                style={{ fontFamily: 'Bangers, cursive' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                COLLECT ${moneyEarned}! 💰
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* Streak indicator */}
        {status === 'playing' && streak >= 2 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-yellow-500 px-4 py-2 rounded-full border-2 border-yellow-300"
          >
            <span className="text-white font-bold">🔥 {streak} streak!</span>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Helper functions for Singlish feedback messages
function getCorrectMessage(streak: number): string {
  if (streak >= 4) return '🔥 ON FIRE! Sedap gila!';
  if (streak >= 3) return '⚡ POWER LAH! ' + streak + ' in a row!';
  const messages = [
    'Betul! Correct lah!',
    'Sedap! You know!',
    'Boleh! Very good!',
    'Wah steady!',
    'Power sia!'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getWrongMessage(): string {
  const messages = [
    'Alamak! Wrong leh!',
    'Aiyoh, not quite!',
    'Tak betul! Try again!',
    'Salah! Next time!',
    'Aduh, so close!'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
