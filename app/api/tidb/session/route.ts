// API Route: Create/manage player sessions
import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/tidb/db';
import { v4 as uuidv4 } from 'uuid';

// POST /api/tidb/session - Create a new session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nickname } = body;

    const sessionId = uuidv4();

    await execute(
      `INSERT INTO player_sessions (id, nickname, started_at) VALUES (?, ?, NOW())`,
      [sessionId, nickname || null]
    );

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

// GET /api/tidb/session?id=xxx - Get session info
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const sessions = await query<{
      id: string;
      nickname: string | null;
      chicken_name: string | null;
      started_at: Date;
      ended_at: Date | null;
      ending: string | null;
    }>(
      `SELECT id, nickname, chicken_name, started_at, ended_at, ending
       FROM player_sessions WHERE id = ?`,
      [sessionId]
    );

    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(sessions[0]);
  } catch (error) {
    console.error('Failed to get session:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
