import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button, Badge, ConnectionStatus } from '@/components/ui';
import ManualModal from '@/components/ManualModal';
import AnnouncementModal from '@/components/AnnouncementModal';

export default function AppNav() {
  const { currentUser, isAdmin, logout, evaluators } = useStore();
  const evaluator = evaluators.find(e => e.id === currentUser);
  const [manualOpen, setManualOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-surface-500/40 bg-surface-0/95 backdrop-blur-sm">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-4 min-h-14 py-2 sm:py-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <a href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity min-h-[44px] min-w-[44px] sm:min-w-0 justify-center sm:justify-start">
              <img src="/bi.png" alt="기업의별" className="h-8 w-8 object-contain" />
              <span className="font-bold text-white text-[15px] hidden sm:inline">치프인증 평가</span>
            </a>
            <span className="text-slate-600 text-sm hidden sm:inline">|</span>
            {isAdmin ? (
              <Badge variant="gold" className="text-xs hidden sm:inline-flex">관리자 대시보드</Badge>
            ) : (
              <span className="text-sm text-slate-400 truncate max-w-[140px] sm:max-w-none">
                {evaluator?.name} {evaluator?.role}
              </span>
            )}
          </div>

          {/* Nav Links - 로그인 시에만 */}
          {currentUser && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAnnouncementOpen(true)} className="min-h-[44px] sm:min-h-0">
                공고
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setManualOpen(true)} className="min-h-[44px] sm:min-h-0">
                매뉴얼
              </Button>
              {!isAdmin ? (
                <span className="text-xs text-slate-500 hidden md:inline">평가위원 모드</span>
              ) : (
                <Badge variant="gold" className="text-xs px-2 sm:px-3 py-1 hidden sm:inline-flex truncate max-w-[160px] md:max-w-none">
                  관리자
                </Badge>
              )}
              <ConnectionStatus />
              <Button variant="secondary" size="sm" onClick={logout} className="min-h-[44px] sm:min-h-0">
                로그아웃
              </Button>
            </div>
          )}
        </div>
      </nav>
      <ManualModal open={manualOpen} onClose={() => setManualOpen(false)} isAdmin={isAdmin} />
      <AnnouncementModal open={announcementOpen} onClose={() => setAnnouncementOpen(false)} />
    </>
  );
}
