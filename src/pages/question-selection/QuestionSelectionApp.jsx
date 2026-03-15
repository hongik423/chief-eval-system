import { Routes, Route, Navigate } from 'react-router-dom';
import QSLayout from './QSLayout';
import QSLoginPage from './QSLoginPage';
import QSVotePage from './QSVotePage';
import QSResultsPage from './QSResultsPage';
import QSExamPage from './QSExamPage';

export default function QuestionSelectionApp() {
  return (
    <Routes>
      <Route element={<QSLayout />}>
        <Route path="/question-selection" element={<QSLoginPage />} />
        <Route path="/question-selection/vote" element={<QSVotePage />} />
        <Route path="/question-selection/results" element={<QSResultsPage />} />
        {/* 2차 출제 피평가자 개인 출제문제 (토큰: candidateId-stQ-nsQ-tpQ) */}
        <Route path="/question-selection/exam/:token" element={<QSExamPage />} />
        <Route path="/question-selection/*" element={<Navigate to="/question-selection" replace />} />
      </Route>
    </Routes>
  );
}
