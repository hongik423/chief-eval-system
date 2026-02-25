import { NextResponse } from 'next/server';
import { getResults, getVoteStatus } from '@/lib/voteStore';

export async function GET() {
  try {
    const status = getVoteStatus();
    const results = getResults();

    return NextResponse.json({
      success: true,
      status,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
