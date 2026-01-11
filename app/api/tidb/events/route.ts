// API Route: Track player events
import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/tidb/db';

// POST /api/tidb/events - Track an event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, eventType, eventData, location } = body;

    if (!sessionId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await execute(
      `INSERT INTO player_events (session_id, event_type, event_data, location, timestamp)
       VALUES (?, ?, ?, ?, NOW())`,
      [sessionId, eventType, JSON.stringify(eventData || {}), location || null]
    );

    // Update location emotions if emotion event
    if (eventType === 'emotion_detected' && location && eventData?.emotion) {
      await execute(
        `INSERT INTO location_emotions (location, emotion, count, last_updated)
         VALUES (?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE count = count + 1, last_updated = NOW()`,
        [location, eventData.emotion]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to track event:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}
