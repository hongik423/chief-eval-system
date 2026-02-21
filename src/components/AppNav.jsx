import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button, Badge, ConnectionStatus } from '@/components/ui';
import ManualModal from '@/components/ManualModal';

export default function AppNav() {
  const { currentUser, isAdmin, logout, evaluators } = useStore();
  const evaluator = evaluators.find(e => e.id === currentUser);
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-surface-500/40 bg-surface-0/95 backdrop-blur-sm">
        <div className="max-w-[1200px] mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <img src="/bi.png" alt="기업의별" className="h-8 w-8 object-contain" />
              <span className="font-bold text-white text-[15px] hidden sm:inline">치프인증 평가</span>
            </a>
            <span className="text-slate-600 text-sm">|</span>
            {isAdmin ? (
              <Badge variant="gold" className="text-xs">관리자 대시보드</Badge>
            ) : (
              <span className="text-sm text-slate-400">
                {evaluator?.name} {evaluator?.role}
              </span>
            )}
          </div>

          {/* Nav Links - 로그인 시에만 */}
          {currentUser && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setManualOpen(true)}>
                사용 매뉴얼
              </Button>
              {!isAdmin ? (
                <span className="text-xs text-slate-500">평가위원 모드</span>
              ) : (
                <Badge variant="gold" className="text-xs px-3 py-1">
                  관리자 · 전체 현황 · 가점 · 데이터 추적
                </Badge>
              )}
              <ConnectionStatus />
              <Button variant="secondary" size="sm" onClick={logout}>
                로그아웃
              </Button>
            </div>
          )}
        </div>
      </nav>
      <ManualModal open={manualOpen} onClose={() => setManualOpen(false)} isAdmin={isAdmin} />
    </>
  );
}
