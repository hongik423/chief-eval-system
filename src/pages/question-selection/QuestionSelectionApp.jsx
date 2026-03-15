import { Component } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import QSLayout from './QSLayout';
import QSLoginPage from './QSLoginPage';
import QSVotePage from './QSVotePage';
import QSResultsPage from './QSResultsPage';
import QSExamPage from './QSExamPage';
import QSAssignmentConfirmPage from './QSAssignmentConfirmPage';

class QSErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(err) {
    return { hasError: true, error: err };
  }
  componentDidCatch(err, info) {
    console.error('[QS] 렌더 오류:', err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
          <div className="max-w-md text-center">
            <p className="text-red-400 mb-4">페이지를 불러오는 중 오류가 발생했습니다.</p>
            <p className="text-slate-500 text-sm mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-700"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function QuestionSelectionApp() {
  return (
    <QSErrorBoundary>
    <Routes>
      <Route element={<QSLayout />}>
        <Route path="/question-selection" element={<QSLoginPage />} />
        <Route path="/question-selection/vote" element={<QSVotePage />} />
        <Route path="/question-selection/results" element={<QSResultsPage />} />
        <Route path="/question-selection/assignment-confirm" element={<QSAssignmentConfirmPage />} />
        {/* 2차 출제 피평가자 개인 출제문제 (토큰: candidateId-stQ-nsQ-tpQ) */}
        <Route path="/question-selection/exam/:token" element={<QSExamPage />} />
        <Route path="/question-selection/*" element={<Navigate to="/question-selection" replace />} />
      </Route>
    </Routes>
    </QSErrorBoundary>
  );
}
