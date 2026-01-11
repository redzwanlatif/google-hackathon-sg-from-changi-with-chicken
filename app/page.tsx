'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { soundManager } from '@/lib/sound-manager';
import LiveStats from '@/components/LiveStats';

export default function HomePage() {
  const [showIntro, setShowIntro] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    // Staggered animation reveal
    setTimeout(() => setShowTitle(true), 300);
    setTimeout(() => setShowSubtitle(true), 800);
    setTimeout(() => setShowButtons(true), 1300);
  }, []);

  const handleStartClick = () => {
    soundManager.playWhoosh();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/assets/background/changi_airport.jpeg"
          alt="Changi Airport"
          fill
          className="object-cover"
          priority
        />
        {/* Comic overlay with moving dots */}
        <motion.div
          className="absolute inset-0"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{
            background: `
              linear-gradient(135deg, rgba(26, 26, 46, 0.85) 0%, rgba(22, 33, 62, 0.8) 50%, rgba(15, 52, 96, 0.85) 100%),
              radial-gradient(circle, rgba(255, 225, 53, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 8px 8px',
          }}
        />
      </div>

      {/* Floating decorative elements */}
      <motion.div
        className="absolute top-10 left-10 text-6xl z-20"
        animate={{
          y: [0, -20, 0],
          rotate: [-10, 10, -10],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        🐔
      </motion.div>
      <motion.div
        className="absolute bottom-20 right-10 text-5xl z-20"
        animate={{
          y: [0, -15, 0],
          rotate: [10, -10, 10],
        }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
      >
        💒
      </motion.div>
      <motion.div
        className="absolute top-1/4 right-20 text-4xl z-20"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 360],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        💍
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={showTitle ? { scale: 1, opacity: 1 } : {}}
          transition={{ type: 'spring', damping: 12, stiffness: 100 }}
          className="mb-4"
        >
          <Image
            src="/assets/logo.png"
            alt="From Changi With Chicken"
            width={280}
            height={280}
            className="mx-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
            priority
          />
        </motion.div>

        {/* Main Title - Comic Style */}
        <motion.div
          initial={{ y: -100, opacity: 0, rotate: -10 }}
          animate={showTitle ? { y: 0, opacity: 1, rotate: 0 } : {}}
          transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.2 }}
          className="mb-6"
        >
          <div className="relative inline-block">
            {/* Starburst background */}
            <motion.div
              className="absolute inset-0 -z-10"
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              style={{
                background: `conic-gradient(
                  from 0deg,
                  #FFE135 0deg 15deg,
                  #FF6B35 15deg 30deg,
                  #FFE135 30deg 45deg,
                  #FF6B35 45deg 60deg,
                  #FFE135 60deg 75deg,
                  #FF6B35 75deg 90deg,
                  #FFE135 90deg 105deg,
                  #FF6B35 105deg 120deg,
                  #FFE135 120deg 135deg,
                  #FF6B35 135deg 150deg,
                  #FFE135 150deg 165deg,
                  #FF6B35 165deg 180deg,
                  #FFE135 180deg 195deg,
                  #FF6B35 195deg 210deg,
                  #FFE135 210deg 225deg,
                  #FF6B35 225deg 240deg,
                  #FFE135 240deg 255deg,
                  #FF6B35 255deg 270deg,
                  #FFE135 270deg 285deg,
                  #FF6B35 285deg 300deg,
                  #FFE135 300deg 315deg,
                  #FF6B35 315deg 330deg,
                  #FFE135 330deg 345deg,
                  #FF6B35 345deg 360deg
                )`,
                transform: 'scale(1.5)',
                opacity: 0.3,
              }}
            />

            <h1
              className="text-5xl md:text-7xl font-bold leading-tight"
              style={{
                fontFamily: 'Bangers, cursive',
                color: '#FFE135',
                textShadow: `
                  4px 4px 0 #E23636,
                  8px 8px 0 #1a1a1a,
                  -2px -2px 0 #1a1a1a,
                  2px -2px 0 #1a1a1a,
                  -2px 2px 0 #1a1a1a
                `,
                letterSpacing: '2px',
              }}
            >
              THE CHICKEN
            </h1>
            <h1
              className="text-5xl md:text-7xl font-bold"
              style={{
                fontFamily: 'Bangers, cursive',
                color: '#E23636',
                textShadow: `
                  4px 4px 0 #FFE135,
                  8px 8px 0 #1a1a1a,
                  -2px -2px 0 #1a1a1a,
                  2px -2px 0 #1a1a1a,
                  -2px 2px 0 #1a1a1a
                `,
                letterSpacing: '2px',
              }}
            >
              MUST ARRIVE!
            </h1>
          </div>
        </motion.div>

        {/* Subtitle */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={showSubtitle ? { x: 0, opacity: 1 } : {}}
          transition={{ type: 'spring', damping: 15 }}
          className="mb-8"
        >
          <div className="inline-block bg-white/95 px-6 py-3 border-4 border-black shadow-[6px_6px_0px_#1a1a1a] transform -rotate-2">
            <p
              className="text-xl md:text-2xl text-black"
              style={{ fontFamily: 'Comic Neue, cursive', fontWeight: 700 }}
            >
              A Voice-First Comedy Adventure
            </p>
            <p
              className="text-lg text-gray-700 mt-1"
              style={{ fontFamily: 'Comic Neue, cursive' }}
            >
              Wake up at Changi. Save a wedding. Don&apos;t lose the chicken!
            </p>
          </div>
        </motion.div>

        {/* Feature badges */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={showSubtitle ? { y: 0, opacity: 1 } : {}}
          transition={{ delay: 0.2, type: 'spring' }}
          className="flex flex-wrap justify-center gap-3 mb-6"
        >
          {['🎤 VOICE CHAT', '🧠 AI NPCs', '📸 CAMERA QUESTS', '🥁 MINI GAMES'].map((feature, i) => (
            <motion.div
              key={feature}
              className="bg-[#FFE135] text-black px-4 py-2 border-3 border-black shadow-[3px_3px_0px_#1a1a1a]"
              style={{ fontFamily: 'Bangers, cursive' }}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3 + i * 0.1, type: 'spring' }}
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              {feature}
            </motion.div>
          ))}
        </motion.div>

        {/* TiDB WOW Features */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={showSubtitle ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.5, type: 'spring' }}
          className="mb-8"
        >
          <div className="bg-gradient-to-r from-[#E23636] via-[#B91C1C] to-[#E23636] p-4 border-4 border-black shadow-[6px_6px_0px_#1a1a1a] rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Image src="/assets/tidb-white.png" alt="TiDB" width={60} height={22} />
              <span
                className="text-xl text-white"
                style={{ fontFamily: 'Bangers, cursive' }}
              >
                POWERED FEATURES
              </span>
              <motion.span
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                ⚡
              </motion.span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { icon: '🧬', title: 'PLAYER DNA', desc: 'Your unique playstyle fingerprint' },
                { icon: '👯', title: 'SOUL TWINS', desc: 'Find players like you via vector search' },
                { icon: '💬', title: 'NPC GOSSIP', desc: 'NPCs remember other players' },
                { icon: '🗣️', title: 'SINGLISH STATS', desc: 'Track trending phrases' },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center border border-white/20"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <div className="text-2xl mb-1">{feature.icon}</div>
                  <div
                    className="text-xs font-bold text-yellow-300"
                    style={{ fontFamily: 'Bangers, cursive' }}
                  >
                    {feature.title}
                  </div>
                  <div
                    className="text-[10px] text-white/80 leading-tight"
                    style={{ fontFamily: 'Comic Neue, cursive' }}
                  >
                    {feature.desc}
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-2 text-center">
              <span
                className="text-white/60 text-xs"
                style={{ fontFamily: 'Comic Neue, cursive' }}
              >
                Real-time analytics with TiDB Cloud Vector Search
              </span>
            </div>
          </div>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={showButtons ? { scale: 1, rotate: 0 } : {}}
          transition={{ type: 'spring', damping: 10 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/game" onClick={handleStartClick}>
            <motion.button
              className="relative px-12 py-6 text-3xl bg-[#E23636] text-white border-4 border-black shadow-[8px_8px_0px_#1a1a1a]"
              style={{ fontFamily: 'Bangers, cursive', letterSpacing: '3px' }}
              whileHover={{
                scale: 1.05,
                boxShadow: '12px 12px 0px #1a1a1a',
              }}
              whileTap={{ scale: 0.95, boxShadow: '4px 4px 0px #1a1a1a' }}
            >
              {/* Animated glow */}
              <motion.div
                className="absolute inset-0 bg-white/20"
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="relative z-10">🎮 START GAME!</span>
            </motion.button>
          </Link>

          <motion.button
            onClick={() => setShowIntro(true)}
            className="px-8 py-4 text-xl bg-[#2B4C7E] text-white border-4 border-black shadow-[6px_6px_0px_#1a1a1a]"
            style={{ fontFamily: 'Bangers, cursive' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            📖 HOW TO PLAY
          </motion.button>
        </motion.div>

        {/* Powered by badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={showButtons ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <div
            className="inline-flex items-center bg-black/80 text-white px-4 py-2 rounded-lg border-2 border-[#4ECDC4]"
            style={{ fontFamily: 'Comic Neue, cursive' }}
          >
            <span className="text-sm">Powered by</span>
            <span className="ml-2 text-[#4ECDC4] font-bold">Gemini 2.0</span>
            <span className="ml-1 text-sm">🌟</span>
          </div>
          <div
            className="inline-flex items-center bg-black/80 text-white px-4 py-2 rounded-lg border-2 border-[#E23636]"
            style={{ fontFamily: 'Comic Neue, cursive' }}
          >
            <span className="text-sm">Database by</span>
            <Image
              src="/assets/tidb-white.png"
              alt="TiDB"
              width={60}
              height={20}
              className="ml-2"
            />
          </div>
        </motion.div>

        {/* Hackathon badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={showButtons ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7 }}
          className="mt-4"
        >
          <div
            className="inline-block bg-[#FFE135]/90 text-black px-4 py-2 border-2 border-black"
            style={{ fontFamily: 'Comic Neue, cursive' }}
          >
            Gemini 3 Hackathon Singapore 2026 | Wayang Studio 🇲🇾 × 65Labs 🇸🇬
          </div>
        </motion.div>
      </div>

      {/* Live Stats Panel - TiDB Powered */}
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={showButtons ? { x: 0, opacity: 1 } : {}}
        transition={{ delay: 0.8, type: 'spring', damping: 20 }}
        className="fixed top-20 right-4 w-72 z-30 hidden lg:block"
      >
        <LiveStats />
      </motion.div>

      {/* Mobile Stats - shown below main content */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={showButtons ? { y: 0, opacity: 1 } : {}}
        transition={{ delay: 1 }}
        className="relative z-10 mt-8 px-4 max-w-sm mx-auto lg:hidden"
      >
        <LiveStats />
      </motion.div>

      {/* Comic panel corners */}
      <div className="fixed top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-[#FFE135] z-20" />
      <div className="fixed top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-[#FFE135] z-20" />
      <div className="fixed bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-[#FFE135] z-20" />
      <div className="fixed bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-[#FFE135] z-20" />

      {/* Speed lines on sides */}
      <div
        className="fixed left-0 top-0 bottom-0 w-8 pointer-events-none z-10"
        style={{
          background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,225,53,0.1) 2px, rgba(255,225,53,0.1) 4px)',
        }}
      />
      <div
        className="fixed right-0 top-0 bottom-0 w-8 pointer-events-none z-10"
        style={{
          background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,225,53,0.1) 2px, rgba(255,225,53,0.1) 4px)',
        }}
      />

      {/* How to Play Modal - Comic Style */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
            onClick={() => setShowIntro(false)}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, rotate: 10 }}
              transition={{ type: 'spring', damping: 15 }}
              className="bg-[#FFFEF2] border-4 border-black shadow-[8px_8px_0px_#1a1a1a] p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-3xl text-black mb-4 text-center"
                style={{ fontFamily: 'Bangers, cursive' }}
              >
                📖 HOW TO PLAY
              </h3>

              <div className="space-y-4">
                {[
                  { icon: '🎯', title: 'GOAL', text: 'Get to Marina Bay Sands with the ceremonial chicken before the wedding starts!' },
                  { icon: '🎤', title: 'VOICE CHAT', text: 'Tap the microphone button to talk to NPCs. They\'ll respond with voice!' },
                  { icon: '⌨️', title: 'TEXT FALLBACK', text: 'Can\'t use voice? Type your message instead.' },
                  { icon: '🐔', title: 'THE CHICKEN', text: 'Keep it happy! Click to pet it. If it gets too upset, it\'ll escape!' },
                  { icon: '🗺️', title: 'TRAVEL', text: 'Move between locations to find clues and NPCs. Travel costs money and time!' },
                  { icon: '🧠', title: 'MEMORIES', text: 'Talk to NPCs to recover your lost memories and unlock new locations!' },
                  { icon: '📸', title: 'QUESTS', text: 'Complete camera quests and mini-games for rewards!' },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-3 items-start bg-[#FFE135]/30 p-3 border-2 border-black"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <div
                        className="font-bold text-black"
                        style={{ fontFamily: 'Bangers, cursive' }}
                      >
                        {item.title}
                      </div>
                      <div
                        className="text-sm text-gray-700"
                        style={{ fontFamily: 'Comic Neue, cursive' }}
                      >
                        {item.text}
                      </div>
                    </div>
                  </motion.div>
                ))}

                <div className="bg-[#E23636]/20 p-3 border-2 border-black">
                  <div
                    className="font-bold text-black mb-2"
                    style={{ fontFamily: 'Bangers, cursive' }}
                  >
                    💡 PRO TIPS
                  </div>
                  <ul
                    className="text-sm text-gray-700 space-y-1"
                    style={{ fontFamily: 'Comic Neue, cursive' }}
                  >
                    <li>• Speak in Singlish for better NPC reactions!</li>
                    <li>• Complete quests before asking for info</li>
                    <li>• Watch your money - you need it for travel</li>
                    <li>• Pet the chicken regularly lah!</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowIntro(false)}
                className="mt-6 w-full py-3 bg-[#E23636] text-white border-3 border-black shadow-[4px_4px_0px_#1a1a1a]"
                style={{ fontFamily: 'Bangers, cursive', fontSize: '1.2rem' }}
              >
                GOT IT!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
