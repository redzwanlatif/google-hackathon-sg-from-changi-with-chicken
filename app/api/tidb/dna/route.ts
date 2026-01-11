// API Route: Get Player DNA
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/tidb/db';

interface PlayerDNARow {
  session_id: string;
  nickname: string | null;
  chicken_name: string | null;
  player_type: string;
  traits: string;
  total_laughs: number;
  total_conversations: number;
  avg_chicken_mood: number;
  singlish_fluency: number;
  emotional_range: string;
  ending: string | null;
  completion_time: number | null;
  locations_visited: number;
}

// GET /api/tidb/dna?sessionId=xxx - Get player DNA
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const dna = await query<PlayerDNARow>(
      `SELECT
        session_id, nickname, chicken_name, player_type, traits,
        total_laughs, total_conversations, avg_chicken_mood,
        singlish_fluency, emotional_range, ending,
        completion_time, locations_visited
       FROM player_dna
       WHERE session_id = ?`,
      [sessionId]
    );

    if (dna.length === 0) {
      return NextResponse.json({ error: 'DNA not found' }, { status: 404 });
    }

    const d = dna[0];

    // Get percentile rankings
    const moodRank = await query<{ rank: number; total: number }>(
      `SELECT
        (SELECT COUNT(*) FROM player_dna WHERE avg_chicken_mood <= ?) as rank,
        (SELECT COUNT(*) FROM player_dna) as total`,
      [d.avg_chicken_mood]
    );

    const laughRank = await query<{ rank: number; total: number }>(
      `SELECT
        (SELECT COUNT(*) FROM player_dna WHERE total_laughs <= ?) as rank,
        (SELECT COUNT(*) FROM player_dna) as total`,
      [d.total_laughs]
    );

    // Get chicken name ranking if named
    let chickenRank = null;
    if (d.chicken_name) {
      const rank = await query<{ position: number; total: number }>(
        `SELECT
          (SELECT COUNT(*) FROM chicken_leaderboard WHERE final_mood > (
            SELECT final_mood FROM chicken_leaderboard WHERE chicken_name = ? LIMIT 1
          )) + 1 as position,
          (SELECT COUNT(*) FROM chicken_leaderboard) as total`,
        [d.chicken_name]
      );
      if (rank[0]) {
        chickenRank = {
          position: rank[0].position,
          total: rank[0].total,
        };
      }
    }

    return NextResponse.json({
      sessionId: d.session_id,
      nickname: d.nickname,
      chickenName: d.chicken_name,
      playerType: d.player_type,
      traits: JSON.parse(d.traits || '[]'),
      totalLaughs: d.total_laughs,
      totalConversations: d.total_conversations,
      avgChickenMood: d.avg_chicken_mood,
      singlishFluency: d.singlish_fluency,
      emotionalRange: JSON.parse(d.emotional_range || '[]'),
      ending: d.ending,
      completionTime: d.completion_time,
      locationsVisited: d.locations_visited,
      rankings: {
        chickenMoodPercentile: moodRank[0]
          ? Math.round((moodRank[0].rank / moodRank[0].total) * 100)
          : 50,
        laughPercentile: laughRank[0]
          ? Math.round((laughRank[0].rank / laughRank[0].total) * 100)
          : 50,
        chickenRank,
      },
    });
  } catch (error) {
    console.error('Failed to get DNA:', error);
    return NextResponse.json(
      { error: 'Failed to get DNA' },
      { status: 500 }
    );
  }
}
