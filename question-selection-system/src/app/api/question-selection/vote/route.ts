import { NextRequest, NextResponse } from 'next/server';
import { submitVote, getEvaluatorVotes, VoteSubmission } from '@/lib/voteStore';
import { getEvaluatorById } from '@/data/evaluators';
import { getQuestionById } from '@/data/questions';

export async function POST(request: NextRequest) {
  try {
    const body: VoteSubmission = await request.json();
    const { evaluatorId, evaluatorName, votes } = body;

    // 평가위원 검증
    const evaluator = getEvaluatorById(evaluatorId);
    if (!evaluator) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 평가위원입니다.' },
        { status: 400 }
      );
    }

    // 투표 데이터 검증
    if (!votes.stock_transfer || !votes.nominee_stock || !votes.temporary_payment) {
      return NextResponse.json(
        { success: false, message: '3개 분야 모두 선택해주세요.' },
        { status: 400 }
      );
    }

    // 문제 번호 유효성 검증
    const stockQ = getQuestionById(votes.stock_transfer);
    const nomineeQ = getQuestionById(votes.nominee_stock);
    const tempQ = getQuestionById(votes.temporary_payment);

    if (!stockQ || stockQ.category !== 'stock_transfer') {
      return NextResponse.json(
        { success: false, message: '주식 이동 분야의 유효한 문제를 선택해주세요.' },
        { status: 400 }
      );
    }
    if (!nomineeQ || nomineeQ.category !== 'nominee_stock') {
      return NextResponse.json(
        { success: false, message: '차명 주식 분야의 유효한 문제를 선택해주세요.' },
        { status: 400 }
      );
    }
    if (!tempQ || tempQ.category !== 'temporary_payment') {
      return NextResponse.json(
        { success: false, message: '가지급금 분야의 유효한 문제를 선택해주세요.' },
        { status: 400 }
      );
    }

    // 투표 제출
    const result = submitVote({
      evaluatorId,
      evaluatorName: evaluator.name,
      votes,
    });

    return NextResponse.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 특정 평가위원의 투표 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evaluatorId = searchParams.get('evaluatorId');

    if (!evaluatorId) {
      return NextResponse.json(
        { success: false, message: 'evaluatorId가 필요합니다.' },
        { status: 400 }
      );
    }

    const votes = getEvaluatorVotes(evaluatorId);
    return NextResponse.json({
      success: true,
      votes,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
