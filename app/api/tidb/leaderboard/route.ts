// API Route: Get chicken leaderboard
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/tidb/db';

// GET /api/tidb/leaderboard - Get top chickens
export async function GET(request: NextRequest) {
  try {
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '10'), 1), 100); // Sanitize: 1-100

    const leaderboard = await query<{
      chicken_name: string;
      final_mood: number;
      player_nickname: string;
      ending: string;
    }>(
      `SELECT chicken_name, final_mood, player_nickname, ending
       FROM chicken_leaderboard
       ORDER BY final_mood DESC
       LIMIT ${limit}`
    );

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    return NextResponse.json([], { status: 200 }); // Return empty array on error
  }
}
