'use client';

import React from 'react';
import Image from 'next/image';

export default function QuestionSelectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0c10] flex flex-col">
      {/* 상단 헤더 */}
      <header className="bg-[#0f1117] border-b border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <Image
                src="/bi.png"
                alt="기업의별 로고"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                기업의별 치프인증
              </h1>
              <p className="text-xs text-gray-500">
                TEST 케이스 문제 선정 시스템
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-900/40 text-amber-400 border border-amber-700/50 px-3 py-1 rounded-full font-medium">
              2026년 1차 출제
            </span>
          </div>
        </div>
      </header>

      {/* 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-1">{children}</main>

      {/* 푸터 */}
      <footer className="bg-[#0f1117] border-t border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-gray-600">
          © 2026 기업의별 ASSO 치프인증제도 | TEST RED 30일 전 1차 출제 시스템
        </div>
      </footer>
    </div>
  );
}
