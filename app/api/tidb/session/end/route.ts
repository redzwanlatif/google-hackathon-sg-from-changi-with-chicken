// API Route: End session and generate Player DNA
import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/tidb/db';
import { GameState } from '@/lib/game-state';
import { calculatePlayerType, extractTraits } from '@/lib/tidb';
import { generateEmbedding } from '@/lib/tidb/embeddings';

interface SessionStats {
  total_conversations: number;
  total_laughs: number;
  avg_sentiment: number;
  emotions_detected: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, gameState } = body as { sessionId: string; gameState: GameState };

    if (!sessionId || !gameState) {
      return NextResponse.json({ error: 'Missing sessionId or gameState' }, { status: 400 });
    }

    // 1. Update the session with final state
    await execute(
      `UPDATE player_sessions SET
        ended_at = NOW(),
        ending = ?,
        chicken_name = ?,
        final_time_remaining = ?,
        final_money = ?,
        final_chicken_mood = ?,
        memories_unlocked = ?,
        locations_visited = ?
       WHERE id = ?`,
      [
        gameState.ending,
        gameState.chickenName,
        gameState.timeRemaining,
        gameState.money,
        gameState.chickenMood,
        gameState.memories.length,
        JSON.stringify(gameState.unlockedLocations),
        sessionId,
      ]
    );

    // 2. Gather stats from events
    const stats = await query<SessionStats>(
      `SELECT
        (SELECT COUNT(*) FROM npc_conversations WHERE session_id = ?) as total_conversations,
        (SELECT COUNT(*) FROM player_events WHERE session_id = ? AND event_type = 'laugh') as total_laughs,
        (SELECT COALESCE(AVG(player_sentiment), 0) FROM npc_conversations WHERE session_id = ?) as avg_sentiment,
        (SELECT CONCAT('[', COALESCE(GROUP_CONCAT(DISTINCT emotion), ''), ']') FROM emotion_timeline WHERE session_id = ?) as emotions_detected`,
      [sessionId, sessionId, sessionId, sessionId]
    );

    const sessionStats = stats[0] || {
      total_conversations: 0,
      total_laughs: 0,
      avg_sentiment: 0,
      emotions_detected: '[]',
    };

    // 3. Calculate derived values
    const completionTime = 7200 - gameState.timeRemaining;
    const singlishFluency = Math.min(100, sessionStats.total_conversations * 5 + 20);

    // Parse emotions - GROUP_CONCAT returns comma-separated string like "happy,sad,angry"
    const emotionsStr = sessionStats.emotions_detected || '[]';
    let emotionalRange: string[] = [];
    if (emotionsStr && emotionsStr !== '[]') {
      // Handle both JSON array and comma-separated string
      try {
        emotionalRange = JSON.parse(emotionsStr);
      } catch {
        // If not valid JSON, treat as comma-separated (from GROUP_CONCAT)
        const inner = emotionsStr.replace(/^\[|\]$/g, '');
        emotionalRange = inner ? inner.split(',').map(s => s.trim()).filter(Boolean) : [];
      }
    }

    // 4. Determine player type and traits
    const playerType = calculatePlayerType({
      avgChickenMood: gameState.chickenMood,
      totalConversations: sessionStats.total_conversations,
      completionTime,
      singlishUsage: singlishFluency,
      laughCount: sessionStats.total_laughs,
      locationsVisited: gameState.unlockedLocations.length,
    });

    const traits = extractTraits({
      avgChickenMood: gameState.chickenMood,
      singlishUsage: singlishFluency,
      laughCount: sessionStats.total_laughs,
      patienceScore: Math.min(100, completionTime / 72), // More time = more patient
      questsCompleted: gameState.completedQuests.length,
    });

    // 5. Generate DNA embedding from journey summary
    const journeySummary = `
      Player type: ${playerType}
      Chicken name: ${gameState.chickenName || 'unnamed'}
      Chicken mood: ${gameState.chickenMood}/100
      Ending: ${gameState.ending}
      Locations: ${gameState.unlockedLocations.join(', ')}
      Conversations: ${sessionStats.total_conversations}
      Laughs: ${sessionStats.total_laughs}
      Emotions: ${emotionalRange.join(', ')}
      Time taken: ${completionTime} seconds
      Traits: ${traits.join(', ')}
    `;

    const dnaEmbedding = await generateEmbedding(journeySummary);

    // 6. Insert DNA record
    await execute(
      `INSERT INTO player_dna (
        session_id, nickname, chicken_name, dna_embedding, player_type, traits,
        total_laughs, total_conversations, avg_chicken_mood, singlish_fluency,
        emotional_range, ending, completion_time, locations_visited
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        dna_embedding = VALUES(dna_embedding),
        player_type = VALUES(player_type),
        traits = VALUES(traits)`,
      [
        sessionId,
        null, // nickname from session
        gameState.chickenName,
        JSON.stringify(dnaEmbedding),
        playerType,
        JSON.stringify(traits),
        sessionStats.total_laughs,
        sessionStats.total_conversations,
        gameState.chickenMood,
        singlishFluency,
        JSON.stringify(emotionalRange),
        gameState.ending,
        completionTime,
        gameState.unlockedLocations.length,
      ]
    );

    // 7. Update chicken leaderboard if named
    if (gameState.chickenName) {
      await execute(
        `INSERT INTO chicken_leaderboard (session_id, chicken_name, final_mood, ending)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE final_mood = VALUES(final_mood)`,
        [sessionId, gameState.chickenName, gameState.chickenMood, gameState.ending]
      );
    }

    // Return the DNA
    return NextResponse.json({
      sessionId,
      chickenName: gameState.chickenName,
      dnaEmbedding,
      playerType,
      traits,
      totalLaughs: sessionStats.total_laughs,
      totalConversations: sessionStats.total_conversations,
      avgChickenMood: gameState.chickenMood,
      singlishFluency,
      emotionalRange,
      ending: gameState.ending,
      completionTime,
      locationsVisited: gameState.unlockedLocations.length,
    });
  } catch (error) {
    console.error('Failed to end session:', error);
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    );
  }
}
