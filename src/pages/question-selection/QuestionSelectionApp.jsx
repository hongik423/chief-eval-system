import { Routes, Route, Navigate } from 'react-router-dom';
import QSLayout from './QSLayout';
import QSLoginPage from './QSLoginPage';
import QSVotePage from './QSVotePage';
import QSResultsPage from './QSResultsPage';

export default function QuestionSelectionApp() {
  return (
    <Routes>
      <Route element={<QSLayout />}>
        <Route path="/question-selection" element={<QSLoginPage />} />
        <Route path="/question-selection/vote" element={<QSVotePage />} />
        <Route path="/question-selection/results" element={<QSResultsPage />} />
        <Route path="/question-selection/*" element={<Navigate to="/question-selection" replace />} />
      </Route>
    </Routes>
  );
}
