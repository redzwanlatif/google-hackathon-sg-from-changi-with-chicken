'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerDNA as PlayerDNAType, SoulTwin, tidb } from '@/lib/tidb';

interface PlayerDNAProps {
  isVisible: boolean;
  onClose: () => void;
}

interface GlobalStats {
  totalPlayers: number;
  chickensSaved: number;
  avgChickenMood: number;
  topChickenNames: { name: string; count: number }[];
  endingDistribution: Record<string, number>;
  trendingSinglish?: { phrase: string; count: number }[];
  playerTypes?: { type: string; count: number }[];
}

// Player type icons and colors
const PLAYER_TYPE_CONFIG: Record<string, { icon: string; color: string; description: string }> = {
  'The Chicken Whisperer': {
    icon: '🐔',
    color: 'from-yellow-400 to-orange-500',
    description: 'You have a gift with poultry',
  },
  'The Speedrunner': {
    icon: '⚡',
    color: 'from-blue-400 to-purple-500',
    description: 'Time is precious, and you know it',
  },
  'The Comedy King': {
    icon: '😂',
    color: 'from-pink-400 to-red-500',
    description: 'Life of the party, everywhere you go',
  },
  'The Local Legend': {
    icon: '🇸🇬',
    color: 'from-red-500 to-white',
    description: 'Singlish master, true blue Singaporean',
  },
  'The Chatterbox': {
    icon: '💬',
    color: 'from-green-400 to-teal-500',
    description: 'Every NPC is your new best friend',
  },
  'The Explorer': {
    icon: '🗺️',
    color: 'from-indigo-400 to-blue-500',
    description: 'No stone left unturned',
  },
  'The Chaos Agent': {
    icon: '🔥',
    color: 'from-red-600 to-orange-500',
    description: 'Some people just want to watch the chicken escape',
  },
  'The Adventurer': {
    icon: '🎮',
    color: 'from-purple-400 to-pink-500',
    description: 'A balanced journey through Singapore',
  },
};

// Trait badges
const TRAIT_BADGES: Record<string, { icon: string; label: string }> = {
  chicken_lover: { icon: '💕', label: 'Chicken Lover' },
  singlish_speaker: { icon: '🗣️', label: 'Singlish Speaker' },
  good_humor: { icon: '😄', label: 'Good Humor' },
  patient: { icon: '🧘', label: 'Patient' },
  completionist: { icon: '✅', label: 'Completionist' },
};

// Emotion icons
const EMOTION_ICONS: Record<string, string> = {
  happy: '😊',
  stressed: '😰',
  confused: '😕',
  laughing: '😂',
  angry: '😠',
  sad: '😢',
  triumphant: '🎉',
  neutral: '😐',
};

export default function PlayerDNA({ isVisible, onClose }: PlayerDNAProps) {
  const [dna, setDna] = useState<PlayerDNAType | null>(null);
  const [soulTwins, setSoulTwins] = useState<SoulTwin[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dna' | 'twins' | 'global'>('dna');

  useEffect(() => {
    if (isVisible) {
      loadData();
    }
  }, [isVisible]);

  async function loadData() {
    setLoading(true);
    try {
      const [dnaData, twinsData, statsData] = await Promise.all([
        tidb.getPlayerDNA(),
        tidb.findSoulTwins(5),
        tidb.getGlobalStats(),
      ]);

      setDna(dnaData);
      setSoulTwins(twinsData);
      setGlobalStats(statsData);
    } catch (error) {
      console.error('Failed to load DNA data:', error);
    } finally {
      setLoading(false);
    }
  }

  const typeConfig = dna?.playerType
    ? PLAYER_TYPE_CONFIG[dna.playerType] || PLAYER_TYPE_CONFIG['The Adventurer']
    : PLAYER_TYPE_CONFIG['The Adventurer'];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-gradient-to-br from-gray-900 to-black border-2 border-yellow-500/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${typeConfig.color} p-6 text-center relative`}>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
              >
                ×
              </button>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-6xl mb-2"
              >
                🧬
              </motion.div>
              <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                YOUR SINGAPORE DNA
              </h1>
              <p className="text-white/80 text-sm mt-1">
                Powered by TiDB Vector Search
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              {[
                { id: 'dna', label: 'My DNA', icon: '🧬' },
                { id: 'twins', label: 'Soul Twins', icon: '👯' },
                { id: 'global', label: 'Global Stats', icon: '🌍' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'dna' | 'twins' | 'global')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-400/10'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {loading ? (
                <div className="text-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="text-4xl inline-block"
                  >
                    🧬
                  </motion.div>
                  <p className="text-gray-400 mt-4">Analyzing your DNA...</p>
                </div>
              ) : (
                <>
                  {/* DNA Tab */}
                  {activeTab === 'dna' && dna && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Player Type */}
                      <div className="text-center">
                        <div className="text-5xl mb-2">{typeConfig.icon}</div>
                        <h2
                          className={`text-2xl font-bold bg-gradient-to-r ${typeConfig.color} bg-clip-text text-transparent`}
                        >
                          {dna.playerType}
                        </h2>
                        <p className="text-gray-400 text-sm">{typeConfig.description}</p>
                      </div>

                      {/* Chicken Info */}
                      {dna.chickenName && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                          <span className="text-2xl">🐔</span>
                          <p className="text-yellow-400 font-bold">{dna.chickenName}</p>
                          <p className="text-gray-400 text-sm">
                            Mood: {dna.avgChickenMood}/100
                            {dna.avgChickenMood >= 70 && ' 💕'}
                          </p>
                        </div>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <StatBox
                          icon="😂"
                          label="Laughs"
                          value={dna.totalLaughs}
                          suffix="times"
                        />
                        <StatBox
                          icon="💬"
                          label="Conversations"
                          value={dna.totalConversations}
                          suffix="chats"
                        />
                        <StatBox
                          icon="🗣️"
                          label="Singlish Fluency"
                          value={Math.round(dna.singlishFluency)}
                          suffix="%"
                        />
                        <StatBox
                          icon="🗺️"
                          label="Locations"
                          value={dna.locationsVisited}
                          suffix="/ 5"
                        />
                      </div>

                      {/* Emotional Journey */}
                      {dna.emotionalRange.length > 0 && (
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <h3 className="text-sm text-gray-400 mb-3">Emotional Journey</h3>
                          <div className="flex flex-wrap gap-2">
                            {dna.emotionalRange.map((emotion, i) => (
                              <span
                                key={i}
                                className="bg-gray-700 px-3 py-1 rounded-full text-sm"
                              >
                                {EMOTION_ICONS[emotion] || '😐'} {emotion}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Traits */}
                      {dna.traits.length > 0 && (
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <h3 className="text-sm text-gray-400 mb-3">Your Traits</h3>
                          <div className="flex flex-wrap gap-2">
                            {dna.traits.map((trait, i) => {
                              const badge = TRAIT_BADGES[trait] || {
                                icon: '⭐',
                                label: trait,
                              };
                              return (
                                <span
                                  key={i}
                                  className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 px-3 py-1 rounded-full text-sm text-yellow-400"
                                >
                                  {badge.icon} {badge.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Ending */}
                      <div className="text-center py-4 border-t border-gray-700">
                        <p className="text-gray-400 text-sm">Your Ending</p>
                        <p className="text-2xl font-bold text-white capitalize">
                          {dna.ending === 'perfect' && '🏆 '}
                          {dna.ending === 'good' && '🎉 '}
                          {dna.ending === 'okay' && '👍 '}
                          {dna.ending === 'timeout' && '⏰ '}
                          {dna.ending === 'chicken-lost' && '🐔💨 '}
                          {dna.ending === 'broke' && '💸 '}
                          {dna.ending || 'Unknown'}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Soul Twins Tab */}
                  {activeTab === 'twins' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <p className="text-center text-gray-400 text-sm mb-4">
                        Players with similar journeys to yours (TiDB Vector Search)
                      </p>

                      {soulTwins.length === 0 ? (
                        <div className="text-center py-8">
                          <span className="text-4xl">👯</span>
                          <p className="text-gray-400 mt-4">
                            No soul twins found yet. You're one of a kind!
                          </p>
                        </div>
                      ) : (
                        soulTwins.map((twin, index) => (
                          <motion.div
                            key={twin.sessionId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex items-center gap-4"
                          >
                            <div className="text-3xl">
                              {index === 0
                                ? '🥇'
                                : index === 1
                                ? '🥈'
                                : index === 2
                                ? '🥉'
                                : '👤'}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">
                                  {twin.nickname || `Player ${twin.sessionId.slice(0, 6)}`}
                                </span>
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                  {twin.similarity}% match
                                </span>
                              </div>
                              <p className="text-sm text-gray-400">{twin.playerType}</p>
                              {twin.chickenName && (
                                <p className="text-xs text-yellow-400">
                                  🐔 {twin.chickenName}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-400 capitalize">{twin.ending}</p>
                            </div>
                          </motion.div>
                        ))
                      )}

                      <p className="text-center text-xs text-gray-500 mt-4">
                        Similarity calculated using TiDB vector embeddings
                      </p>
                    </motion.div>
                  )}

                  {/* Global Stats Tab */}
                  {activeTab === 'global' && globalStats && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Big Numbers */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-3xl font-bold text-white">
                            {globalStats.totalPlayers}
                          </p>
                          <p className="text-xs text-gray-400">Total Players</p>
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-green-400">
                            {globalStats.chickensSaved}
                          </p>
                          <p className="text-xs text-gray-400">Chickens Saved</p>
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-yellow-400">
                            {globalStats.avgChickenMood}
                          </p>
                          <p className="text-xs text-gray-400">Avg Mood</p>
                        </div>
                      </div>

                      {/* Top Chicken Names */}
                      {globalStats.topChickenNames.length > 0 && (
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <h3 className="text-sm text-gray-400 mb-3">
                            🐔 Trending Chicken Names
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {globalStats.topChickenNames.slice(0, 5).map((n, i) => (
                              <span
                                key={i}
                                className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm"
                              >
                                {n.name}{' '}
                                <span className="text-yellow-600">×{n.count}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trending Singlish */}
                      {globalStats.trendingSinglish && globalStats.trendingSinglish.length > 0 && (
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <h3 className="text-sm text-gray-400 mb-3">
                            🗣️ Trending Singlish
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {globalStats.trendingSinglish.map((s, i) => (
                              <span
                                key={i}
                                className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm"
                              >
                                "{s.phrase}"{' '}
                                <span className="text-red-600">×{s.count}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Player Types Distribution */}
                      {globalStats.playerTypes && globalStats.playerTypes.length > 0 && (
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <h3 className="text-sm text-gray-400 mb-3">
                            🎮 Player Types
                          </h3>
                          <div className="space-y-2">
                            {globalStats.playerTypes.slice(0, 4).map((p, i) => {
                              const config =
                                PLAYER_TYPE_CONFIG[p.type] ||
                                PLAYER_TYPE_CONFIG['The Adventurer'];
                              const percentage = Math.round(
                                (p.count / globalStats.totalPlayers) * 100
                              );
                              return (
                                <div key={i} className="flex items-center gap-3">
                                  <span className="text-xl">{config.icon}</span>
                                  <div className="flex-1">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-white">{p.type}</span>
                                      <span className="text-gray-400">{percentage}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ delay: i * 0.1 }}
                                        className={`h-full bg-gradient-to-r ${config.color}`}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 bg-gray-900/50 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                Powered by TiDB Cloud Vector Search
              </span>
              <button
                onClick={onClose}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Stat box component
function StatBox({
  icon,
  label,
  value,
  suffix,
}: {
  icon: string;
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-bold text-white mt-1">
        {value}
        <span className="text-sm text-gray-400 ml-1">{suffix}</span>
      </p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
