// API Route: Get NPC Gossip (what other players said)
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/tidb/db';

interface ConversationRow {
  player_message: string;
  npc_response: string;
  timestamp: Date;
  nickname: string | null;
  chicken_name: string | null;
}

// GET /api/tidb/npc-gossip?npcId=xxx&limit=3
export async function GET(request: NextRequest) {
  try {
    const npcId = request.nextUrl.searchParams.get('npcId');
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '3'), 1), 20); // Sanitize: 1-20
    const currentSessionId = request.nextUrl.searchParams.get('excludeSession');

    if (!npcId) {
      return NextResponse.json({ error: 'NPC ID required' }, { status: 400 });
    }

    // Get interesting recent conversations with this NPC
    // Prioritize ones with high sentiment (positive or negative reactions)
    let sql = `
      SELECT
        c.player_message,
        c.npc_response,
        c.timestamp,
        s.nickname,
        s.chicken_name
      FROM npc_conversations c
      LEFT JOIN player_sessions s ON c.session_id = s.id
      WHERE c.npc_id = ?
    `;
    const params: string[] = [npcId];

    if (currentSessionId) {
      sql += ` AND c.session_id != ?`;
      params.push(currentSessionId);
    }

    sql += `
      ORDER BY ABS(COALESCE(c.player_sentiment, 0)) DESC, c.timestamp DESC
      LIMIT ${limit}
    `;

    const conversations = await query<ConversationRow>(sql, params);

    // Create gossip summaries
    const gossip = conversations.map((c) => {
      const playerName = c.nickname || (c.chicken_name ? `someone with ${c.chicken_name}` : 'a player');

      // Create a short summary
      let summary = '';
      if (c.player_message && c.player_message.length > 0) {
        const shortMessage =
          c.player_message.length > 50
            ? c.player_message.slice(0, 50) + '...'
            : c.player_message;
        summary = `${playerName} said: "${shortMessage}"`;
      } else {
        summary = `${playerName} came by earlier`;
      }

      return {
        playerNickname: c.nickname || undefined,
        chickenName: c.chicken_name || undefined,
        summary,
        timestamp: c.timestamp.toISOString(),
      };
    });

    return NextResponse.json(gossip);
  } catch (error) {
    console.error('Failed to get gossip:', error);
    return NextResponse.json(
      { error: 'Failed to get gossip' },
      { status: 500 }
    );
  }
}
