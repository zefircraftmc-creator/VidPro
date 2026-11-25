import React from 'react';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import type { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const isError = t.type === 'error';
        const isInfo = t.type === 'info';
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-lg border px-4 py-3 text-xs font-semibold shadow-xl backdrop-blur-md transition-all ${
              isError
                ? 'border-rose-500/40 bg-[#111827]/95 text-rose-200'
                : isInfo
                  ? 'border-[#3B82F6]/40 bg-[#111827]/95 text-slate-100'
                  : 'border-[#10B981]/40 bg-[#111827]/95 text-white'
            }`}
          >
            {isError ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            ) : isInfo ? (
              <Info className="h-4 w-4 shrink-0 text-[#3B82F6]" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
            )}
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
};
