// API Route: Find Soul Twins using TiDB Vector Search
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/tidb/db';

interface PlayerDNARow {
  session_id: string;
  nickname: string | null;
  chicken_name: string | null;
  player_type: string;
  dna_embedding: string;
  ending: string | null;
  traits: string;
  total_laughs: number;
  avg_chicken_mood: number;
}

// GET /api/tidb/soul-twins?sessionId=xxx&limit=5
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '5'), 1), 20); // Sanitize: 1-20

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // First, get the current player's DNA embedding
    const currentPlayer = await query<{ dna_embedding: string }>(
      `SELECT dna_embedding FROM player_dna WHERE session_id = ?`,
      [sessionId]
    );

    if (currentPlayer.length === 0) {
      return NextResponse.json({ error: 'Player DNA not found' }, { status: 404 });
    }

    const myEmbedding = currentPlayer[0].dna_embedding;

    // Use TiDB's vector similarity search to find similar players
    // VEC_COSINE_DISTANCE returns distance (0 = identical, 2 = opposite)
    // We convert to similarity (1 = identical, 0 = different)
    const soulTwins = await query<PlayerDNARow & { distance: number }>(
      `SELECT
        session_id,
        nickname,
        chicken_name,
        player_type,
        ending,
        traits,
        total_laughs,
        avg_chicken_mood,
        VEC_COSINE_DISTANCE(dna_embedding, ?) as distance
       FROM player_dna
       WHERE session_id != ?
       ORDER BY distance ASC
       LIMIT ${limit}`,
      [myEmbedding, sessionId]
    );

    // Transform to response format
    const results = soulTwins.map((twin) => ({
      sessionId: twin.session_id,
      nickname: twin.nickname || `Player ${twin.session_id.slice(0, 6)}`,
      chickenName: twin.chicken_name,
      playerType: twin.player_type,
      similarity: Math.round((1 - twin.distance / 2) * 100), // Convert distance to % similarity
      ending: twin.ending,
      traits: JSON.parse(twin.traits || '[]'),
      totalLaughs: twin.total_laughs,
      avgChickenMood: twin.avg_chicken_mood,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to find soul twins:', error);
    return NextResponse.json(
      { error: 'Failed to find soul twins' },
      { status: 500 }
    );
  }
}
