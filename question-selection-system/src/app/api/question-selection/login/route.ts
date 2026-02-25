import { NextRequest, NextResponse } from 'next/server';
import { findEvaluator } from '@/data/evaluators';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { evaluatorId, name, password } = body;

    if (!evaluatorId || !name || !password) {
      return NextResponse.json(
        { success: false, message: '필수 항목을 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    const evaluator = findEvaluator(name, password);

    if (!evaluator) {
      return NextResponse.json(
        { success: false, message: '이름 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    if (evaluator.id !== evaluatorId) {
      return NextResponse.json(
        { success: false, message: '평가위원 정보가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      evaluator: {
        id: evaluator.id,
        name: evaluator.name,
        role: evaluator.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
