// API Route: Global game statistics
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/tidb/db';

// GET /api/tidb/stats - Get global game statistics
export async function GET(_request: NextRequest) {
  try {
    // Get total players
    const playerCount = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM player_sessions`
    );

    // Get chickens saved (games with good endings)
    const chickensSaved = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM player_sessions
       WHERE ending IN ('perfect', 'good', 'okay')`
    );

    // Get average chicken mood
    const avgMood = await query<{ avg_mood: number }>(
      `SELECT COALESCE(AVG(final_chicken_mood), 50) as avg_mood FROM player_sessions`
    );

    // Get top chicken names
    const topNames = await query<{ chicken_name: string; count: number }>(
      `SELECT chicken_name, COUNT(*) as count FROM player_sessions
       WHERE chicken_name IS NOT NULL
       GROUP BY chicken_name
       ORDER BY count DESC
       LIMIT 10`
    );

    // Get ending distribution
    const endings = await query<{ ending: string; count: number }>(
      `SELECT ending, COUNT(*) as count FROM player_sessions
       WHERE ending IS NOT NULL
       GROUP BY ending`
    );

    // Get trending Singlish phrases
    const singlish = await query<{ phrase: string; usage_count: number }>(
      `SELECT phrase, usage_count FROM singlish_phrases
       ORDER BY usage_count DESC
       LIMIT 5`
    );

    // Get player type distribution
    const playerTypes = await query<{ player_type: string; count: number }>(
      `SELECT player_type, COUNT(*) as count FROM player_dna
       GROUP BY player_type
       ORDER BY count DESC`
    );

    const endingDistribution: Record<string, number> = {};
    endings.forEach((e) => {
      endingDistribution[e.ending] = e.count;
    });

    return NextResponse.json({
      totalPlayers: playerCount[0]?.count || 0,
      chickensSaved: chickensSaved[0]?.count || 0,
      avgChickenMood: Math.round(avgMood[0]?.avg_mood || 50),
      topChickenNames: topNames.map((n) => ({ name: n.chicken_name, count: n.count })),
      endingDistribution,
      trendingSinglish: singlish.map((s) => ({ phrase: s.phrase, count: s.usage_count })),
      playerTypes: playerTypes.map((p) => ({ type: p.player_type, count: p.count })),
    });
  } catch (error) {
    console.error('Failed to get stats:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
