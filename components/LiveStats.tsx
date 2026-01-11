'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface Stats {
  totalPlayers: number;
  chickensSaved: number;
  avgChickenMood: number;
  topChickenNames: { name: string; count: number }[];
  endingDistribution: Record<string, number>;
  trendingSinglish?: { phrase: string; count: number }[];
  playerTypes?: { type: string; count: number }[];
}

interface LeaderboardEntry {
  chicken_name: string;
  final_mood: number;
  player_nickname: string;
  ending: string;
}

export default function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const [statsRes, leaderboardRes] = await Promise.all([
        fetch('/api/tidb/stats'),
        fetch('/api/tidb/leaderboard'),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setLeaderboard(data);
      }

      setError(null);
    } catch (err) {
      setError('Could not connect to TiDB');
    } finally {
      setLoading(false);
    }
  }

  async function seedDatabase() {
    setSeeding(true);
    try {
      const res = await fetch('/api/tidb/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success || data.existing) {
        await fetchStats();
      }
    } catch (err) {
      setError('Failed to seed database');
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div className="comic-panel bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="text-4xl inline-block"
        >
          🐔
        </motion.div>
        <p className="text-white mt-2" style={{ fontFamily: 'Comic Neue, cursive' }}>
          Loading live stats from TiDB...
        </p>
      </div>
    );
  }

  if (error || !stats || stats.totalPlayers === 0) {
    return (
      <div className="comic-panel bg-gradient-to-br from-gray-700 to-gray-800 p-6 text-center">
        <div className="text-4xl mb-3">📊</div>
        <h3
          className="text-xl text-white mb-2"
          style={{ fontFamily: 'Bangers, cursive' }}
        >
          LIVE STATS
        </h3>
        <p className="text-gray-300 text-sm mb-4" style={{ fontFamily: 'Comic Neue, cursive' }}>
          {error || 'No player data yet. Be the first to play!'}
        </p>
        <button
          onClick={seedDatabase}
          disabled={seeding}
          className="comic-button text-sm px-4 py-2"
        >
          {seeding ? '🌱 Seeding...' : '🌱 Seed Demo Data'}
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="comic-panel overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #E23636 0%, #B91C1C 100%)' }}
    >
      {/* Collapsible Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full pt-6 px-4 pb-8 text-center cursor-pointer hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center justify-center gap-2">
          <Image src="/assets/tidb-white.png" alt="TiDB" width={50} height={18} />
          <h3
            className="text-xl text-white drop-shadow-lg flex items-center gap-2"
            style={{ fontFamily: 'Bangers, cursive' }}
          >
            <span className="text-yellow-300">⚡</span>
            LIVE STATS
            <span className="text-yellow-300">⚡</span>
          </h3>
          <motion.span
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            className="text-white text-xl"
          >
            ▼
          </motion.span>
        </div>
        <p className="text-white/70 text-xs mt-1">
          {isCollapsed ? 'Click to expand' : 'Real-time player analytics'}
        </p>
      </button>

      {/* Collapsible Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-6 pt-8 pb-6 border-t border-white/10"
          >

      {/* Big Numbers */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard
          icon="🎮"
          value={stats.totalPlayers}
          label="Players"
          color="from-blue-400 to-blue-600"
        />
        <StatCard
          icon="🐔"
          value={stats.chickensSaved}
          label="Saved"
          color="from-green-400 to-green-600"
        />
        <StatCard
          icon="💕"
          value={stats.avgChickenMood}
          label="Avg Mood"
          color="from-yellow-400 to-orange-500"
        />
      </div>

      {/* Chicken Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-black/20 rounded-lg p-3 mb-4">
          <h4 className="text-white text-sm font-bold mb-2 flex items-center gap-1">
            🏆 Chicken Hall of Fame
          </h4>
          <div className="space-y-1">
            {leaderboard.slice(0, 3).map((entry, i) => (
              <motion.div
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-white">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}{' '}
                  <span className="text-yellow-300">{entry.chicken_name}</span>
                </span>
                <span className="text-white/70">
                  {entry.final_mood}% mood
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Chicken Names */}
      {stats.topChickenNames.length > 0 && (
        <div className="bg-black/20 rounded-lg p-3 mb-4">
          <h4 className="text-white text-sm font-bold mb-2">
            🔥 Trending Chicken Names
          </h4>
          <div className="flex flex-wrap gap-1">
            {stats.topChickenNames.slice(0, 5).map((n, i) => (
              <span
                key={i}
                className="bg-yellow-500/30 text-yellow-200 px-2 py-0.5 rounded-full text-xs"
              >
                {n.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Singlish Trending */}
      {stats.trendingSinglish && stats.trendingSinglish.length > 0 && (
        <div className="bg-black/20 rounded-lg p-3">
          <h4 className="text-white text-sm font-bold mb-2">
            🗣️ Singlish Leaderboard
          </h4>
          <div className="flex flex-wrap gap-1">
            {stats.trendingSinglish.slice(0, 4).map((s, i) => (
              <span
                key={i}
                className="bg-red-500/30 text-red-200 px-2 py-0.5 rounded-full text-xs"
              >
                "{s.phrase}" ×{s.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Powered by TiDB */}
            <div className="mt-4 text-center">
              <span className="text-white/50 text-xs">
                Powered by TiDB Cloud Vector Search
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`bg-gradient-to-br ${color} rounded-lg p-2 text-center border-2 border-black shadow-[2px_2px_0px_#000]`}
    >
      <div className="text-lg">{icon}</div>
      <div className="text-xl font-bold text-white" style={{ fontFamily: 'Bangers, cursive' }}>
        {value}
      </div>
      <div className="text-xs text-white/80">{label}</div>
    </motion.div>
  );
}
