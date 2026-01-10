'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HomePage() {
  const [showIntro, setShowIntro] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 60,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-conic from-purple-500/20 via-transparent to-blue-500/20"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-2xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-8xl mb-4">🐔</div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-2">
            THE CHICKEN
          </h1>
          <h2 className="text-4xl md:text-5xl font-black text-yellow-400 mb-6">
            MUST ARRIVE
          </h2>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-xl text-gray-300 mb-8"
        >
          Wake up with amnesia, a stolen ceremonial chicken, and 2 hours
          to save your best friend&apos;s wedding.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/game">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xl px-8 py-4 rounded-full shadow-lg"
            >
              🎮 Start Game
            </motion.button>
          </Link>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowIntro(true)}
            className="bg-white/10 hover:bg-white/20 text-white font-bold text-xl px-8 py-4 rounded-full"
          >
            📖 How to Play
          </motion.button>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl mb-2">🎤</div>
            <div className="text-white font-bold">Voice Chat</div>
            <div className="text-gray-400 text-sm">Talk to NPCs</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl mb-2">🗣️</div>
            <div className="text-white font-bold">Singlish</div>
            <div className="text-gray-400 text-sm">Learn local lingo</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl mb-2">🐔</div>
            <div className="text-white font-bold">Chicken</div>
            <div className="text-gray-400 text-sm">It judges you</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-white font-bold">2 Hours</div>
            <div className="text-gray-400 text-sm">Race against time</div>
          </div>
        </motion.div>

        {/* Credits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="mt-12 text-gray-500 text-sm"
        >
          <p>Built for Gemini 3 Hackathon Singapore</p>
          <p>Powered by Gemini Live API • Imagen 3</p>
          <p className="mt-2">Wayang Studio 🇲🇾 × 65Labs 🇸🇬</p>
        </motion.div>
      </div>

      {/* How to Play Modal */}
      {showIntro && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
          onClick={() => setShowIntro(false)}
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-white mb-4">📖 How to Play</h3>

            <div className="space-y-4 text-gray-300">
              <div>
                <h4 className="text-yellow-400 font-bold">🎯 Goal</h4>
                <p>Get to Marina Bay Sands with the ceremonial chicken before the wedding starts!</p>
              </div>

              <div>
                <h4 className="text-yellow-400 font-bold">🎤 Voice Chat</h4>
                <p>Hold the microphone button to talk to NPCs. They&apos;ll respond with voice!</p>
              </div>

              <div>
                <h4 className="text-yellow-400 font-bold">⌨️ Text Fallback</h4>
                <p>Can&apos;t use voice? Type your message instead.</p>
              </div>

              <div>
                <h4 className="text-yellow-400 font-bold">🐔 The Chicken</h4>
                <p>Keep it happy! Click to pet it. If it gets too upset, it&apos;ll escape!</p>
              </div>

              <div>
                <h4 className="text-yellow-400 font-bold">🗺️ Travel</h4>
                <p>Move between locations to find clues and NPCs. Travel costs money and time!</p>
              </div>

              <div>
                <h4 className="text-yellow-400 font-bold">🧠 Memories</h4>
                <p>Talk to NPCs to recover your lost memories. You need at least 8 to win!</p>
              </div>

              <div>
                <h4 className="text-yellow-400 font-bold">💡 Tips</h4>
                <ul className="list-disc list-inside text-sm">
                  <li>Speak in Singlish for better NPC reactions!</li>
                  <li>Complete side quests for rewards</li>
                  <li>Watch your money - you need it for travel</li>
                  <li>Pet the chicken regularly</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowIntro(false)}
              className="mt-6 w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 rounded-full"
            >
              Got it!
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
