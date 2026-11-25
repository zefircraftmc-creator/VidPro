import React, { useState } from 'react';
import { Search, Copy, ArrowRight, AlertCircle, TrendingUp } from 'lucide-react';
import { CircularGauge } from './CircularGauge';
import { apiFetch } from '../lib/api';
import type { KeywordAnalysisResult } from '../types';

interface KeywordInspectorModuleProps {
  analysis: KeywordAnalysisResult | null;
  onAnalysisUpdate: (result: KeywordAnalysisResult) => void;
  onCreateContentFromKeyword: (keyword: string) => void;
  onCopy: (text: string, label?: string) => void;
  onToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const QUICK_KEYWORDS = [
  'minecraft 100 gün',
  'yapay zeka araçları',
  'evden para kazanma',
  'borsa yatırımı',
];

function getScoreColor(score: number): string {
  if (score >= 70) return '#10B981';
  if (score >= 45) return '#F59E0B';
  return '#EF4444';
}

function getCompetitionColor(score: number): string {
  if (score <= 38) return '#10B981';
  if (score <= 66) return '#F59E0B';
  return '#EF4444';
}

export const KeywordInspectorModule: React.FC<KeywordInspectorModuleProps> = ({
  analysis,
  onAnalysisUpdate,
  onCreateContentFromKeyword,
  onCopy,
  onToast,
}) => {
  const [query, setQuery] = useState(analysis?.query || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runAnalysis = async (targetKeyword: string) => {
    const clean = targetKeyword.trim();
    if (!clean) {
      onToast('Lütfen analiz etmek için bir anahtar kelime girin.', 'error');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const data = await apiFetch<KeywordAnalysisResult>('/api/keywords/analyze', {
        method: 'POST',
        body: JSON.stringify({ keyword: clean }),
      });
      onAnalysisUpdate(data);
      onToast(`"${clean}" anahtar kelimesi analiz edildi.`);
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
    runAnalysis(query);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#161922] p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Anahtar Kelime ve Rekabet Analizi
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            YouTube Data API v3 arama sonuçları ve Gemini SEO skorlaması ile arama hacmi, rekabet ve 10 uzun kuyruklu fırsatı görün.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Anahtar kelime aratın (örn: minecraft 100 gün, yapay zeka video)"
              className="h-11 w-full rounded-lg border border-white/[0.1] bg-[#0B0F19] pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-[#3B82F6] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{isLoading ? 'Analiz Ediliyor...' : 'Kelimeyi Analiz Et'}</span>
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
          <span className="text-xs font-medium text-slate-400 mr-1">Hızlı Arama:</span>
          {QUICK_KEYWORDS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setQuery(item);
                runAnalysis(item);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                analysis?.query.toLowerCase() === item.toLowerCase()
                  ? 'bg-[#3B82F6] text-white'
                  : 'border border-white/[0.08] bg-[#0B0F19] text-slate-300 hover:border-white/20 hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {errorMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <p>{errorMsg}</p>
        </div>
      )}

      {!analysis && !isLoading && (
        <div className="rounded-xl border border-white/[0.08] bg-[#161922] p-12 text-center">
          <p className="text-sm font-semibold text-white">Anahtar kelime analizi için arama yapın</p>
          <p className="mt-1 text-xs text-slate-400">
            Arama yaptığınızda YouTube&apos;daki mevcut videoların izlenme ortalaması, rekabet zorluğu ve 10 uzun kuyruklu öneri burada listelenir.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-52 rounded-xl border border-white/[0.08] bg-[#161922] animate-pulse"
            />
          ))}
        </div>
      )}

      {analysis && !isLoading && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CircularGauge
              label="Arama Hacmi (Search Volume)"
              value={analysis.searchVolumeScore}
              subLabel={`${analysis.monthlySearchVolume.toLocaleString('tr-TR')} / ay`}
              color="#3B82F6"
            />
            <CircularGauge
              label="Rekabet Zorluğu (Competition)"
              value={analysis.competitionScore}
              subLabel={`${analysis.competitionLevel} Rekabet`}
              color={getCompetitionColor(analysis.competitionScore)}
            />
            <CircularGauge
              label="Genel Fırsat Skoru (Overall)"
              value={analysis.overallScore}
              subLabel={
                analysis.overallScore >= 70
                  ? 'Yüksek Fırsat'
                  : analysis.overallScore >= 45
                    ? 'Orta Fırsat'
                    : 'Zorlu Pazar'
              }
              color={getScoreColor(analysis.overallScore)}
            />
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#161922] px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#3B82F6]">
                Stratejik Özet · &ldquo;{analysis.query}&rdquo;
                {analysis.youtubeAvgViews !== undefined && (
                  <span className="ml-2 font-mono-tabular text-[#10B981]">
                    (İlk 10 YouTube videosu ort. {analysis.youtubeAvgViews.toLocaleString('tr-TR')} izlenme)
                  </span>
                )}
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">{analysis.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => onCreateContentFromKeyword(analysis.query)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#3B82F6]/40 bg-[#3B82F6]/10 px-4 text-xs font-semibold text-[#3B82F6] transition-colors hover:bg-[#3B82F6] hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Bu Kelimeyle Optimize Et</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#161922]">
            <div className="flex flex-col gap-2 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  En Çok Aranan 10 Uzun Kuyruklu (Long-Tail) Anahtar Kelime
                </h3>
                <p className="text-xs text-slate-400">
                  Düşük rekabetli ve yükselen trend etiketlerini kopyalayın veya doğrudan içerik üretin.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onCopy(
                    analysis.longTailKeywords.map((k) => k.keyword).join(', '),
                    '10 uzun kuyruklu anahtar kelime'
                  )
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#0B0F19] px-3 text-xs font-medium text-slate-200 hover:border-white/20 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Tümünü Kopyala</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#0B0F19]/60 text-xs font-semibold text-slate-400">
                    <th className="px-5 py-3">#</th>
                    <th className="px-5 py-3">Anahtar Kelime</th>
                    <th className="px-5 py-3 text-right">Aylık Arama</th>
                    <th className="px-5 py-3">Rekabet</th>
                    <th className="px-5 py-3 text-right">Trend</th>
                    <th className="px-5 py-3 text-right">Fırsat Skoru</th>
                    <th className="px-5 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {analysis.longTailKeywords.map((row, idx) => {
                    const compClass =
                      row.competition === 'Düşük'
                        ? 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/25'
                        : row.competition === 'Orta'
                          ? 'text-amber-400 bg-amber-400/10 border-amber-400/25'
                          : 'text-rose-400 bg-rose-400/10 border-rose-400/25';

                    return (
                      <tr key={`${row.keyword}-${idx}`} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-3.5 font-mono-tabular text-xs text-slate-500">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-white">{row.keyword}</td>
                        <td className="px-5 py-3.5 text-right font-mono-tabular text-slate-300">
                          {row.monthlySearches.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${compClass}`}
                          >
                            {row.competition}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono-tabular text-xs font-semibold text-[#10B981]">
                          <span className="inline-flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {row.trendChange}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span
                            className="font-mono-tabular text-sm font-bold"
                            style={{ color: getScoreColor(row.opportunityScore) }}
                          >
                            {row.opportunityScore}
                          </span>
                          <span className="font-mono-tabular text-xs text-slate-500"> / 100</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onCopy(row.keyword, 'Anahtar kelime')}
                              title="Kopyala"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-[#0B0F19] text-slate-300 hover:border-white/20 hover:text-white cursor-pointer"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onCreateContentFromKeyword(row.keyword)}
                              className="inline-flex h-8 items-center rounded-md bg-[#3B82F6]/15 px-2.5 text-xs font-semibold text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white whitespace-nowrap cursor-pointer"
                            >
                              Optimize Et
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
