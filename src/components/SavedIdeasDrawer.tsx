import React from 'react';
import { X, Trash2, ArrowRight, Bookmark } from 'lucide-react';
import type { ViralIdea } from '../types';

interface SavedIdeasDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedIdeas: ViralIdea[];
  onRemove: (id: string) => void;
  onConvertToScript: (title: string) => void;
}

export const SavedIdeasDrawer: React.FC<SavedIdeasDrawerProps> = ({
  isOpen,
  onClose,
  savedIdeas,
  onRemove,
  onConvertToScript,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-xs">
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-white/[0.08] bg-[#111827] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Kaydedilen Video Fikirleri"
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Bookmark className="h-4 w-4 text-[#3B82F6]" />
            <h2 className="font-display text-base font-bold text-white">
              Kaydedilen Fikirler ({savedIdeas.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Çekmeceyi kapat"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0B0F19] text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {savedIdeas.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-[#0B0F19] p-8 text-center">
              <p className="text-sm font-medium text-slate-300">Henüz kaydedilmiş fikir yok.</p>
              <p className="mt-1 text-xs text-slate-500">
                Günlük Viral Fikirler modülünden beğendiğiniz kartlardaki &ldquo;Kaydet&rdquo; butonuna tıklayarak buraya ekleyebilirsiniz.
              </p>
            </div>
          ) : (
            savedIdeas.map((idea) => (
              <div
                key={idea.id}
                className="rounded-xl border border-white/[0.08] bg-[#0B0F19] p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{idea.niche} · {idea.format}</span>
                  <span className="font-mono-tabular font-semibold text-[#10B981]">
                    {idea.score} / 100
                  </span>
                </div>
                <h3 className="font-display text-sm font-bold text-white leading-snug">
                  {idea.title}
                </h3>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onConvertToScript(idea.title);
                      onClose();
                    }}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer"
                  >
                    <span>Senaryoya Dönüştür</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(idea.id)}
                    aria-label="Fikri sil"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-[#111827] text-slate-400 hover:border-rose-500/40 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
