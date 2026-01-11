// API Route: Seed TiDB with sample data for demo
import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/tidb/db';
import { generateSamplePlayers, SAMPLE_SINGLISH, generateFakeEmbedding } from '@/lib/tidb/seed';
import { v4 as uuidv4 } from 'uuid';

// POST /api/tidb/seed - Seed sample data
export async function POST(request: NextRequest) {
  try {
    const results = {
      players: 0,
      singlish: 0,
      locations: 0,
    };

    // Check if already seeded
    const existing = await query<{ count: number }>(
      'SELECT COUNT(*) as count FROM player_sessions'
    );

    if (existing[0]?.count > 0) {
      return NextResponse.json({
        message: 'Database already has data',
        existing: existing[0].count
      });
    }

    // Generate 23 sample players
    const samplePlayers = generateSamplePlayers();

    // Seed players
    for (const player of samplePlayers) {
      const sessionId = uuidv4();
      const embedding = generateFakeEmbedding();
      const hoursAgo = Math.floor(Math.random() * 24);

      // Insert session
      await execute(
        `INSERT INTO player_sessions
         (id, nickname, chicken_name, started_at, ended_at, ending, final_time_remaining, final_money, final_chicken_mood, memories_unlocked, locations_visited)
         VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR), NOW(), ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          player.nickname,
          player.chickenName,
          hoursAgo,
          player.ending,
          7200 - player.completionTime,
          Math.floor(Math.random() * 20) + 5,
          player.chickenMood,
          player.locationsVisited,
          JSON.stringify(['changi', 'maxwell', 'cbd', 'east-coast', 'mbs']),
        ]
      );

      // Insert DNA with vector embedding
      await execute(
        `INSERT INTO player_dna
         (session_id, nickname, chicken_name, dna_embedding, player_type, traits, total_laughs, total_conversations, avg_chicken_mood, singlish_fluency, emotional_range, ending, completion_time, locations_visited)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          player.nickname,
          player.chickenName,
          `[${embedding.join(',')}]`,
          player.playerType,
          JSON.stringify(player.traits),
          player.laughs,
          player.conversations,
          player.chickenMood,
          player.singlishFluency,
          JSON.stringify(player.emotions),
          player.ending,
          player.completionTime,
          player.locationsVisited,
        ]
      );

      // Insert to leaderboard
      await execute(
        `INSERT INTO chicken_leaderboard (session_id, chicken_name, final_mood, player_nickname, ending)
         VALUES (?, ?, ?, ?, ?)`,
        [sessionId, player.chickenName, player.chickenMood, player.nickname, player.ending]
      );

      results.players++;
    }

    // Seed Singlish phrases
    for (const phrase of SAMPLE_SINGLISH) {
      await execute(
        `INSERT INTO singlish_phrases (phrase, english_meaning, context, usage_count)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE usage_count = VALUES(usage_count)`,
        [phrase.phrase, phrase.meaning, phrase.context, phrase.count]
      );
      results.singlish++;
    }

    // Seed location emotions
    const locations = ['changi', 'maxwell', 'cbd', 'east-coast', 'mbs'];
    const emotions = ['happy', 'stressed', 'confused', 'laughing', 'angry'];
    for (const loc of locations) {
      for (const emo of emotions) {
        const count = Math.floor(Math.random() * 100) + 10;
        await execute(
          `INSERT INTO location_emotions (location, emotion, count)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE count = VALUES(count)`,
          [loc, emo, count]
        );
        results.locations++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      results,
    });
  } catch (error) {
    console.error('Failed to seed database:', error);
    return NextResponse.json(
      { error: 'Failed to seed database', details: String(error) },
      { status: 500 }
    );
  }
}
