import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import QuestionSelectionApp from './pages/question-selection/QuestionSelectionApp';
import './index.css';

const isQS = window.location.pathname.startsWith('/question-selection');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isQS ? (
      <BrowserRouter>
        <QuestionSelectionApp />
      </BrowserRouter>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
