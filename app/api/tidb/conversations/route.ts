// API Route: Track NPC conversations
import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/tidb/db';

// POST /api/tidb/conversations - Track a conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, npcId, playerMessage, npcResponse, playerSentiment, laughDetected } = body;

    if (!sessionId || !npcId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await execute(
      `INSERT INTO npc_conversations
       (session_id, npc_id, player_message, npc_response, player_sentiment, laugh_detected, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        sessionId,
        npcId,
        playerMessage || null,
        npcResponse || null,
        playerSentiment ?? null,
        laughDetected ?? false,
      ]
    );

    // Extract and track Singlish phrases from NPC response
    if (npcResponse) {
      const singlishPatterns = [
        { pattern: /\blah\b/gi, phrase: 'lah', meaning: 'Emphasis particle', context: 'emphasis' },
        { pattern: /\bleh\b/gi, phrase: 'leh', meaning: 'Softer emphasis', context: 'emphasis' },
        { pattern: /\blor\b/gi, phrase: 'lor', meaning: 'Resignation', context: 'emotion' },
        { pattern: /\bwah\b/gi, phrase: 'wah', meaning: 'Expression of surprise', context: 'exclamation' },
        { pattern: /\baiyo+\b/gi, phrase: 'aiyo', meaning: 'Oh dear/Oh no', context: 'exclamation' },
        { pattern: /\bpaiseh\b/gi, phrase: 'paiseh', meaning: 'Embarrassed/Sorry', context: 'apology' },
        { pattern: /\bcan or not\b/gi, phrase: 'can or not', meaning: 'Is it possible?', context: 'question' },
        { pattern: /\bwah lau\b/gi, phrase: 'wah lau', meaning: 'Expression of frustration', context: 'exclamation' },
        { pattern: /\bsiao\b/gi, phrase: 'siao', meaning: 'Crazy', context: 'adjective' },
        { pattern: /\bkiasu\b/gi, phrase: 'kiasu', meaning: 'Fear of losing out', context: 'adjective' },
      ];

      for (const { pattern, phrase, meaning, context } of singlishPatterns) {
        if (pattern.test(npcResponse)) {
          await execute(
            `INSERT INTO singlish_phrases (phrase, english_meaning, context, usage_count, last_used)
             VALUES (?, ?, ?, 1, NOW())
             ON DUPLICATE KEY UPDATE usage_count = usage_count + 1, last_used = NOW()`,
            [phrase, meaning, context]
          ).catch(() => {}); // Ignore duplicates
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to track conversation:', error);
    return NextResponse.json(
      { error: 'Failed to track conversation' },
      { status: 500 }
    );
  }
}
