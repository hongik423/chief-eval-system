/**
 * 초기화 확인 모달 - 관리자 비밀번호 + "초기화하라" 입력 필수
 * @encoding UTF-8
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { ADMIN_PASSWORD } from '@/lib/constants';

const CONFIRM_TEXT = '초기화하라';

export default function ResetConfirmModal({ open, onClose, onConfirm, isResetting }) {
  const [password, setPassword] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  useEffect(() => {
    if (!open) {
      setPassword('');
      setConfirmInput('');
      setPasswordError('');
      setConfirmError('');
    }
  }, [open]);

  const isPasswordValid = password === ADMIN_PASSWORD;
  const isConfirmTextValid = confirmInput.trim() === CONFIRM_TEXT;
  const canSubmit = isPasswordValid && isConfirmTextValid && !isResetting;

  const handleSubmit = (e) => {
    e.preventDefault();
    setPasswordError('');
    setConfirmError('');

    if (!isPasswordValid) {
      setPasswordError('관리자 비밀번호가 올바르지 않습니다.');
      return;
    }
    if (!isConfirmTextValid) {
      setConfirmError(`정확히 "${CONFIRM_TEXT}"를 입력해 주세요.`);
      return;
    }

    onConfirm();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-100 border border-red-500/40 rounded-2xl max-w-md w-full shadow-2xl shadow-red-500/10" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-red-400">⚠️</span> 평가 데이터 초기화 확인
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              모든 평가 점수·세션·가점·합격여부가 삭제되며 되돌릴 수 없습니다.
              <br />
              <strong className="text-amber-400">관리자 비밀번호</strong>와 <strong className="text-amber-400">확인 문구</strong>를 입력해 주세요.
            </p>
          </div>

          {/* 관리자 비밀번호 */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">관리자 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              placeholder="비밀번호 입력"
              disabled={isResetting}
              autoComplete="current-password"
              className={`w-full px-4 py-3 rounded-lg bg-surface-200 border text-white placeholder-slate-500 outline-none transition-colors
                ${passwordError ? 'border-red-500/60' : 'border-surface-500 focus:border-brand-500'}
                disabled:opacity-50`}
            />
            {passwordError && <p className="text-xs text-red-400 mt-1">{passwordError}</p>}
          </div>

          {/* 확인 문구 */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              아래 문구를 정확히 입력: <span className="text-amber-400 font-mono">&quot;{CONFIRM_TEXT}&quot;</span>
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => {
                setConfirmInput(e.target.value);
                setConfirmError('');
              }}
              placeholder={CONFIRM_TEXT}
              disabled={isResetting}
              autoComplete="off"
              className={`w-full px-4 py-3 rounded-lg bg-surface-200 border text-white placeholder-slate-500 outline-none transition-colors font-mono
                ${confirmError ? 'border-red-500/60' : 'border-surface-500 focus:border-brand-500'}
                disabled:opacity-50`}
            />
            {confirmError && <p className="text-xs text-red-400 mt-1">{confirmError}</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isResetting} className="flex-1">
              취소
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={!canSubmit}
              className="flex-1"
            >
              {isResetting ? '초기화 중...' : '확인 후 초기화'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
