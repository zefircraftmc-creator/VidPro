import React, { useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Search,
  ThumbsDown,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { ConnectedChannelData, PotentialLevel, ViralIdea } from '../types';

interface DailyIdeasModuleProps {
  channel: ConnectedChannelData | null;
  ideas: ViralIdea[];
  niche: string;
  onNicheChange: (niche: string) => void;
  onIdeasUpdate: (ideas: ViralIdea[]) => void;
  savedIds: Set<string>;
  onToggleSave: (idea: ViralIdea) => void;
  onDismissIdea: (id: string) => void;
  onConvertToScript: (title: string) => void;
  onToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const QUICK_NICHES = [
  'Minecraft',
  'Teknoloji',
  'Yapay Zeka',
  'Oyun',
  'Finans',
  'Kişisel Gelişim',
];

function getPotentialStyle(potential: PotentialLevel): {
  textColor: string;
  barColor: string;
  borderColor: string;
  bgColor: string;
} {
  if (potential === 'Çok Yüksek Potansiyel') {
    return {
      textColor: 'text-[#10B981]',
      barColor: 'bg-[#10B981]',
      borderColor: 'border-[#10B981]/25',
      bgColor: 'bg-[#10B981]/10',
    };
  }
  if (potential === 'Yüksek Potansiyel') {
    return {
      textColor: 'text-[#3B82F6]',
      barColor: 'bg-[#3B82F6]',
      borderColor: 'border-[#3B82F6]/25',
      bgColor: 'bg-[#3B82F6]/10',
    };
  }
  return {
    textColor: 'text-amber-400',
    barColor: 'bg-amber-400',
    borderColor: 'border-amber-400/25',
    bgColor: 'bg-amber-400/10',
  };
}

export const DailyIdeasModule: React.FC<DailyIdeasModuleProps> = ({
  channel,
  ideas,
  niche,
  onNicheChange,
  onIdeasUpdate,
  savedIds,
  onToggleSave,
  onDismissIdea,
  onConvertToScript,
  onToast,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [potentialFilter, setPotentialFilter] = useState<'Tümü' | PotentialLevel>('Tümü');

  const handleGenerate = async (targetNiche: string) => {
    const clean = targetNiche.trim();
    if (!clean) {
      onToast('Lütfen bir kanal nişi yazın.', 'error');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    const channelContext = channel
      ? `Kanal Adı: ${channel.title}, Abone: ${channel.subscriberCount}, Son Videolar: ${channel.recentVideos
          .slice(0, 4)
          .map((v) => v.title)
          .join(' | ')}`
      : '';

    try {
      const data = await apiFetch<{ ideas: ViralIdea[] }>('/api/ai/ideas', {
        method: 'POST',
        body: JSON.stringify({ niche: clean, channelContext }),
      });
      onIdeasUpdate(data.ideas);
      onToast(`"${clean}" nişi için 6 canlı viral fikir üretildi.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setErrorMsg(message);
      onToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate(niche);
  };

  const filteredIdeas =
    potentialFilter === 'Tümü'
      ? ideas
      : ideas.filter((idea) => idea.potential === potentialFilter);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#161922] p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Günlük Viral Fikirler & Trend Bulucu
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Kanal nişinizi yazın; Gemini AI ile yüksek tıklanma oranı (CTR) ve izlenme potansiyelli 6 video fikri üretin.
            {channel ? ` (${channel.title} kanal veriniz dikkate alınır)` : ''}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={niche}
              onChange={(e) => onNicheChange(e.target.value)}
              placeholder="Kanal nişiniz (örn: Minecraft, Teknoloji, Yapay Zeka, Finans...)"
              className="h-11 w-full rounded-lg border border-white/[0.1] bg-[#0B0F19] pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-[#3B82F6] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Fikirler Üretiliyor...' : '6 Viral Fikir Üret'}</span>
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400 mr-1">Örnek Nişler:</span>
            {QUICK_NICHES.map((preset) => {
              const active = niche.trim().toLowerCase() === preset.toLowerCase();
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    onNicheChange(preset);
                    handleGenerate(preset);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-[#0B0F19] text-slate-300 border border-white/[0.08] hover:border-white/20 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>

          {ideas.length > 0 && (
            <div className="flex items-center gap-1 rounded-lg bg-[#0B0F19] p-1 border border-white/[0.06] self-start">
              {(['Tümü', 'Çok Yüksek Potansiyel', 'Yüksek Potansiyel', 'Orta Potansiyel'] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPotentialFilter(tab)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      potentialFilter === tab
                        ? 'bg-[#1F2937] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab === 'Tümü' ? `Tümü (${ideas.length})` : tab.replace(' Potansiyel', '')}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </section>

      {errorMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <p>{errorMsg}</p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex h-[230px] flex-col justify-between rounded-xl border border-white/[0.08] bg-[#161922] p-5 animate-pulse"
            >
              <div className="space-y-3">
                <div className="h-3 w-24 rounded bg-slate-800" />
                <div className="h-5 w-full rounded bg-slate-800" />
                <div className="h-5 w-3/4 rounded bg-slate-800" />
              </div>
              <div className="h-9 w-full rounded-lg bg-slate-800" />
            </div>
          ))}
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#161922] p-12 text-center">
          <p className="text-sm font-semibold text-white">
            Henüz fikir üretilmedi.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Yukarıdaki alana nişinizi yazıp &ldquo;6 Viral Fikir Üret&rdquo; butonuna tıklayarak canlı yapay zeka fikirlerini oluşturun.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredIdeas.map((idea) => {
            const style = getPotentialStyle(idea.potential);
            const isSaved = savedIds.has(idea.id) || savedIds.has(idea.title);

            return (
              <article
                key={idea.id}
                className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#161922] p-5 transition-colors hover:border-white/[0.16]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="truncate font-medium text-slate-300">
                      {idea.format} · {idea.estimatedViews} tahmini izlenme
                    </span>
                    <button
                      type="button"
                      onClick={() => onDismissIdea(idea.id)}
                      title="Bu fikri geç"
                      aria-label="Fikri geç"
                      className="text-slate-500 hover:text-rose-400 cursor-pointer shrink-0"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <h3 className="mt-2.5 font-display text-base font-bold leading-snug text-white">
                    {idea.title}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {idea.reason}
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 font-semibold ${style.borderColor} ${style.bgColor} ${style.textColor}`}
                      >
                        {idea.potential}
                      </span>
                      <span className="font-mono-tabular font-semibold text-white">
                        {idea.score} <span className="text-slate-500">/ 100</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#0B0F19]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${style.barColor}`}
                        style={{ width: `${idea.score}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onToggleSave(idea)}
                      className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isSaved
                          ? 'border-[#10B981]/40 bg-[#10B981]/15 text-[#10B981]'
                          : 'border-white/[0.1] bg-[#0B0F19] text-slate-300 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <BookmarkCheck className="h-3.5 w-3.5" />
                          <span>Kaydedildi</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="h-3.5 w-3.5" />
                          <span>Kaydet</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onConvertToScript(idea.title)}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#3B82F6] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap cursor-pointer"
                    >
                      <span>Optimize Et</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
