// API Route: Track player emotions
import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/tidb/db';

// POST /api/tidb/emotions - Track an emotion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, emotion, confidence, triggerEvent, location } = body;

    if (!sessionId || !emotion) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await execute(
      `INSERT INTO emotion_timeline (session_id, emotion, confidence, trigger_event, location, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [sessionId, emotion, confidence ?? 0.5, triggerEvent || null, location || null]
    );

    // Update location emotions aggregate
    if (location) {
      await execute(
        `INSERT INTO location_emotions (location, emotion, count, last_updated)
         VALUES (?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE count = count + 1, last_updated = NOW()`,
        [location, emotion]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to track emotion:', error);
    return NextResponse.json(
      { error: 'Failed to track emotion' },
      { status: 500 }
    );
  }
}
