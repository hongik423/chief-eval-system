import { useState } from 'react';

// ─── Badge ───
export function Badge({ children, variant = 'default', className = '' }) {
  const styles = {
    default: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    gold: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    muted: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border tracking-wide ${styles[variant] || styles.default} ${className}`}>
      {children}
    </span>
  );
}

// ─── Card ───
export function Card({ children, className = '', onClick, hover = false, ...rest }) {
  return (
    <div
      {...rest}
      onClick={onClick}
      className={`bg-surface-200 border border-surface-500/60 rounded-xl p-4 sm:p-6 transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
        ${hover ? 'hover:border-brand-500/30 hover:bg-surface-300/50' : ''}
        ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Button ───
export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, className = '', type = 'button' }) {
  const variants = {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white border-transparent shadow-lg shadow-brand-500/20',
    secondary: 'bg-transparent hover:bg-surface-300 text-slate-400 border-surface-500',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20',
    ghost: 'bg-transparent hover:bg-surface-300 text-slate-400 border-transparent',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent',
  };
  const sizes = {
    sm: 'px-3 py-2 sm:py-1.5 text-xs min-h-[44px] sm:min-h-0',
    md: 'px-5 py-3 sm:py-2.5 text-sm min-h-[44px] sm:min-h-0',
    lg: 'px-7 py-4 sm:py-3.5 text-sm min-h-[48px] sm:min-h-0',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg border transition-all duration-150
        ${variants[variant]} ${sizes[size]}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Score Input ───
export function ScoreInput({ value, max, onChange, disabled = false }) {
  const pct = value != null ? (value / max) * 100 : 0;
  const barColor = pct >= 80 ? 'bg-emerald-400' : pct >= 60 ? 'bg-amber-400' : pct > 0 ? 'bg-red-400' : 'bg-surface-500';

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <input
        type="number"
        min={0}
        max={max}
        value={value ?? ''}
        placeholder="—"
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value === '' ? null : Math.max(0, Math.min(max, parseInt(e.target.value) || 0));
          onChange(v);
        }}
        onBlur={(e) => {
          const raw = e.target.value;
          const v = raw === '' ? null : Math.max(0, Math.min(max, parseInt(raw, 10) || 0));
          if (value !== v) onChange(v);
        }}
        className="w-14 sm:w-16 px-2 sm:px-2.5 py-2.5 sm:py-2 rounded-lg border border-surface-500 bg-surface-50 text-white text-[15px] font-bold text-center font-mono outline-none focus:border-brand-500 transition-colors disabled:opacity-40 min-h-[44px] sm:min-h-0"
      />
      <span className="text-xs text-slate-500 font-medium min-w-[32px]">/ {max}</span>
      <div className="flex-1 h-1 bg-surface-500/40 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Progress Ring ───
export function ProgressRing({ value, max, size = 80, strokeWidth = 6 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 && value != null ? (value / max) * 100 : 0;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 70 ? '#34D399' : pct >= 50 ? '#FBBF24' : pct > 0 ? '#F87171' : '#243044';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#243044" strokeOpacity={0.4} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-bold text-white" style={{ fontSize: size * 0.22 }}>
          {value != null ? (Number(value) % 1 === 0 ? Math.round(value) : Number(value).toFixed(1)) : '—'}
        </span>
        <span className="text-slate-500" style={{ fontSize: size * 0.12, marginTop: -2 }}>점</span>
      </div>
    </div>
  );
}

// ─── Stat Box ───
export function StatBox({ label, value, unit = '', variant = 'default' }) {
  const colors = {
    default: 'text-white',
    green: 'text-emerald-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
    brand: 'text-brand-400',
  };
  return (
    <div className="bg-surface-100 rounded-lg p-4 border border-surface-500/30">
      <div className="text-[11px] text-slate-500 font-medium mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${colors[variant]}`}>
        {value}<span className="text-xs text-slate-500 font-normal ml-1">{unit}</span>
      </div>
    </div>
  );
}

// ─── Loading Spinner ───
export function Spinner({ size = 'md' }) {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return (
    <div className="flex items-center justify-center p-8">
      <div className={`${s} border-2 border-surface-500 border-t-brand-500 rounded-full animate-spin`} />
    </div>
  );
}

// ─── Empty State ───
export function EmptyState({ icon = '📋', title, description }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-400">{description}</p>}
    </div>
  );
}

// ─── Section Header ───
export function SectionHeader({ children, className = '' }) {
  return (
    <div className={`text-xs font-semibold text-slate-500 tracking-widest uppercase mb-3 ${className}`}>
      {children}
    </div>
  );
}

// ─── Connection Status (Supabase 필수) ───
export function ConnectionStatus() {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      Supabase 연결됨
    </div>
  );
}
