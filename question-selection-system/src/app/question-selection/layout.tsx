'use client';

import React from 'react';

export default function QuestionSelectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">★</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                기업의별 치프인증
              </h1>
              <p className="text-xs text-slate-500">
                TEST 케이스 문제 선정 시스템
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
              2026년 1차 출제
            </span>
          </div>
        </div>
      </header>

      {/* 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>

      {/* 푸터 */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-slate-400">
          © 2026 기업의별 ASSO 치프인증제도 | TEST RED 30일 전 1차 출제 시스템
        </div>
      </footer>
    </div>
  );
}
