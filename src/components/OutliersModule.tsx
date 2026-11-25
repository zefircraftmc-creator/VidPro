import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  Sparkles,
  ArrowUpDown,
  ExternalLink,
  AlertCircle,
  LayoutGrid,
  Table as TableIcon,
  Play,
  BarChart2,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { OutlierVideo } from '../types';

interface OutliersModuleProps {
  hasYoutubeAccess: boolean;
  outliers: OutlierVideo[];
  onOutliersUpdate: (videos: OutlierVideo[]) => void;
  onAnalyzeVideo: (videoUrlOrId: string) => void;
  onAdaptIdea: (videoTitle: string) => void;
  onToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

type SortKey = 'outlierMultiplier' | 'vph' | 'viewCount' | 'subscriberCount';
type ViewMode = 'grid' | 'table';
type FormatFilter = 'Tümü' | 'Uzun Video' | 'Shorts';

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace('.', ',')} Mn`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace('.0', '').replace('.', ',')} B`;
  }
  return num.toLocaleString('tr-TR');
}

export const OutliersModule: React.FC<OutliersModuleProps> = ({
  hasYoutubeAccess,
  outliers,
  onOutliersUpdate,
  onAnalyzeVideo,
  onAdaptIdea,
  onToast,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('Tümü');
  const [minMultiplier, setMinMultiplier] = useState<number>(1);
  const [sortBy, setSortBy] = useState<SortKey>('outlierMultiplier');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLiveOutliers = async (q = searchQuery) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const url = new URL('/api/youtube/outliers', window.location.origin);
      if (q.trim()) {
        url.searchParams.set('q', q.trim());
      }
      const data = await apiFetch<{ videos: OutlierVideo[] }>(url.pathname + url.search);
      onOutliersUpdate(data.videos);
      if (data.videos.length > 0) {
        onToast(`${data.videos.length} gerçek YouTube videosu analiz edildi.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setErrorMsg(msg);
      onToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasYoutubeAccess && outliers.length === 0) {
      fetchLiveOutliers('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasYoutubeAccess]);

  const filteredAndSorted = useMemo(() => {
    return outliers
      .filter((v) => {
        const matchesFormat = formatFilter === 'Tümü' || v.format === formatFilter;
        const matchesMult = v.outlierMultiplier >= minMultiplier;
        return matchesFormat && matchesMult;
      })
      .sort((a, b) => b[sortBy] - a[sortBy]);
  }, [outliers, formatFilter, minMultiplier, sortBy]);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#161922] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Outliers · Viral Video Keşfi
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Kanal abone sayısının çok üzerinde izlenen videoları ve saatlik izlenme (VPH) ivmelerini inceleyin.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center rounded-lg border border-white/[0.08] bg-[#0B0F19] p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#3B82F6] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Görsel Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-[#3B82F6] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Tablo</span>
              </button>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchLiveOutliers(searchQuery);
          }}
          className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center"
        >
          <div className="relative lg:col-span-5 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Konu veya niş ara (boş bırakırsanız trendler listelenir)"
                className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#0B0F19] pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-[#3B82F6] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#3B82F6] px-4 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Aranıyor...' : 'Trendleri Getir'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#0B0F19] p-1 lg:col-span-3">
            {(['Tümü', 'Uzun Video', 'Shorts'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormatFilter(fmt)}
                className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  formatFilter === fmt
                    ? 'bg-[#1F2937] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 lg:col-span-2">
            <label htmlFor="min-mult" className="text-xs text-slate-400 whitespace-nowrap">
              Min Çarpan: <strong className="font-mono-tabular text-[#10B981]">{minMultiplier}x</strong>
            </label>
            <input
              id="min-mult"
              type="range"
              min={0}
              max={10}
              step={1}
              value={minMultiplier}
              onChange={(e) => setMinMultiplier(Number(e.target.value))}
              className="w-full accent-[#3B82F6] cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 lg:col-span-2">
            <ArrowUpDown className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Sıralama kriteri"
              className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#0B0F19] px-2.5 text-xs font-medium text-slate-200 focus:border-[#3B82F6] focus:outline-none"
            >
              <option value="outlierMultiplier">Outlier Çarpanı</option>
              <option value="vph">Saatlik İzlenme (VPH)</option>
              <option value="viewCount">Toplam İzlenme</option>
              <option value="subscriberCount">Abone Sayısı</option>
            </select>
          </div>
        </form>
      </section>

      {errorMsg && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <p>{errorMsg}</p>
        </div>
      )}

      {!hasYoutubeAccess && outliers.length === 0 && !errorMsg && !isLoading && (
        <div className="rounded-xl border border-white/[0.08] bg-[#161922] p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-white">
            Viral videoları listelemek için Trendleri Getir butonuna basın
          </p>
          <p className="text-xs text-slate-400">
            Türkiye trendleri ve aradığınız nişlerde öne çıkan videolar saatlik VPH hızlarıyla birlikte listelenir.
          </p>
          <div className="pt-1 flex justify-center">
            <button
              type="button"
              onClick={() => fetchLiveOutliers(searchQuery)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#3B82F6] px-5 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Trendleri Getir</span>
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 rounded-xl border border-white/[0.08] bg-[#161922] animate-pulse"
            />
          ))}
        </div>
      )}

      {!isLoading && filteredAndSorted.length > 0 && (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredAndSorted.map((video) => (
              <article
                key={video.id}
                className="flex flex-col justify-between overflow-hidden rounded-xl border border-white/[0.08] bg-[#161922] transition-colors hover:border-white/[0.18]"
              >
                <div>
                  <div className="relative aspect-video w-full overflow-hidden bg-[#0B0F19]">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#0B0F19] text-slate-500">
                        <Play className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

                    <div className="absolute left-3 top-3 flex items-center gap-1.5">
                      <span className="rounded-md bg-[#10B981] px-2 py-1 font-mono-tabular text-xs font-extrabold text-[#0B0F19] shadow-md">
                        {video.outlierMultiplier.toFixed(1).replace('.0', '')}x Outlier
                      </span>
                      <span className="rounded-md bg-black/75 px-2 py-1 font-mono-tabular text-xs font-semibold text-white backdrop-blur-xs">
                        {video.vph.toLocaleString('tr-TR')} VPH
                      </span>
                    </div>

                    <span className="absolute bottom-2.5 right-2.5 rounded bg-black/85 px-1.5 py-0.5 font-mono-tabular text-[11px] font-semibold text-white">
                      {video.duration}
                    </span>
                  </div>

                  <div className="p-4">
                    <p className="text-xs text-slate-400">
                      {video.channelName} · {formatCompactNumber(video.subscriberCount)} abone · {video.publishedAgo}
                    </p>
                    <h3 className="mt-1.5 font-display text-sm font-bold leading-snug text-white line-clamp-2">
                      {video.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
                  <div className="font-mono-tabular text-xs font-semibold text-slate-300">
                    {formatCompactNumber(video.viewCount)} izlenme
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onAnalyzeVideo(video.url || video.id)}
                      title="Videoyu Analiz Et"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/[0.1] bg-[#0B0F19] px-2.5 text-xs font-semibold text-slate-200 hover:border-[#38BDF8] hover:text-[#38BDF8] cursor-pointer whitespace-nowrap"
                    >
                      <BarChart2 className="h-3.5 w-3.5" />
                      <span>Analiz</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdaptIdea(video.title)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer whitespace-nowrap"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Uyarla</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#161922]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#0B0F19]/60 text-xs font-semibold text-slate-400">
                    <th className="px-5 py-3.5">Video Başlığı</th>
                    <th className="px-5 py-3.5 text-right whitespace-nowrap">Kanal Abone Sayısı</th>
                    <th className="px-5 py-3.5 text-right whitespace-nowrap">İzlenme Sayısı</th>
                    <th className="px-5 py-3.5 text-right whitespace-nowrap">VPH (Saatlik)</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">Outlier Çarpanı</th>
                    <th className="px-5 py-3.5 text-right whitespace-nowrap">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredAndSorted.map((video) => {
                    const isHighOutlier = video.outlierMultiplier >= 5;
                    return (
                      <tr key={video.id} className="transition-colors hover:bg-white/[0.02]">
                        <td className="px-5 py-4 max-w-md">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-white leading-snug">{video.title}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {video.channelName} · {video.format} · {video.publishedAgo}
                              </p>
                            </div>
                            {video.url && (
                              <a
                                href={video.url}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="YouTube'da aç"
                                className="mt-0.5 text-slate-400 hover:text-white shrink-0"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-mono-tabular text-slate-300 whitespace-nowrap">
                          {formatCompactNumber(video.subscriberCount)}
                        </td>
                        <td className="px-5 py-4 text-right font-mono-tabular font-semibold text-white whitespace-nowrap">
                          {formatCompactNumber(video.viewCount)}
                        </td>
                        <td className="px-5 py-4 text-right font-mono-tabular text-[#3B82F6] whitespace-nowrap">
                          {video.vph.toLocaleString('tr-TR')}/sa
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`font-mono-tabular text-xs font-bold ${
                              isHighOutlier ? 'text-[#10B981]' : 'text-[#38BDF8]'
                            }`}
                          >
                            {video.outlierMultiplier.toFixed(1).replace('.0', '')}x daha fazla izlendi
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onAnalyzeVideo(video.url || video.id)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#0B0F19] px-3 text-xs font-semibold text-slate-200 hover:border-[#38BDF8] hover:text-[#38BDF8] cursor-pointer"
                            >
                              <BarChart2 className="h-3.5 w-3.5" />
                              <span>Analiz Et</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onAdaptIdea(video.title)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Uyarla</span>
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
        )
      )}
    </div>
  );
};
