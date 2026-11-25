import React, { useState } from 'react';
import { Plus, Trash2, Sparkles, ExternalLink, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { CompetitorChannel } from '../types';

interface CompetitorsModuleProps {
  competitors: CompetitorChannel[];
  onAddCompetitor: (channel: CompetitorChannel) => void;
  onRemoveCompetitor: (id: string) => void;
  onAdaptIdea: (title: string) => void;
  onToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const CompetitorsModule: React.FC<CompetitorsModuleProps> = ({
  competitors,
  onAddCompetitor,
  onRemoveCompetitor,
  onAdaptIdea,
  onToast,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) {
      onToast('Lütfen takip edilecek rakip kanal adını veya @handle bilgisini girin.', 'error');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const url = new URL('/api/youtube/channel-lookup', window.location.origin);
      url.searchParams.set('q', clean);
      const data = await apiFetch<{ channel: CompetitorChannel }>(url.pathname + url.search);

      if (competitors.some((c) => c.id === data.channel.id)) {
        onToast(`${data.channel.name} zaten listenizde bulunuyor.`, 'info');
      } else {
        onAddCompetitor(data.channel);
        onToast(`${data.channel.name} gerçek verileriyle eklendi.`);
      }
      setQuery('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setErrorMsg(msg);
      onToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#161922] p-5 sm:p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Rakip Kanal Takibi
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              İstediğiniz YouTube kanalının @kullanıcıadını veya ismini yazarak abone, toplam izlenme ve en popüler videosunu takip edin.
            </p>
          </div>
          <span className="font-mono-tabular text-xs text-slate-400">
            Takip Edilen: {competitors.length} Kanal
          </span>
        </div>

        <form onSubmit={handleAdd} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rakip kanal @handle veya adı (örn: @BarisOzcan, @MrBeast)"
            className="h-11 flex-1 rounded-lg border border-white/[0.1] bg-[#0B0F19] px-4 text-sm text-white placeholder-slate-500 focus:border-[#3B82F6] focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{isLoading ? 'Aranıyor...' : 'Kanalı Ekle'}</span>
          </button>
        </form>
      </section>

      {errorMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <p>{errorMsg}</p>
        </div>
      )}

      {competitors.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#161922] p-12 text-center">
          <p className="text-sm font-semibold text-white">Henüz takip edilen rakip kanal yok.</p>
          <p className="mt-1 text-xs text-slate-400">
            Yukarıdaki alana bir YouTube kanalı yazarak karşılaştırma tablosuna ekleyin.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#161922]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0B0F19]/60 text-xs font-semibold text-slate-400">
                  <th className="px-5 py-3.5">Rakip Kanal</th>
                  <th className="px-5 py-3.5 text-right">Abone</th>
                  <th className="px-5 py-3.5 text-right">Toplam İzlenme</th>
                  <th className="px-5 py-3.5 text-right">Video Sayısı</th>
                  <th className="px-5 py-3.5">En Çok İzlenen Videosu</th>
                  <th className="px-5 py-3.5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {competitors.map((comp) => (
                  <tr key={comp.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {comp.thumbnailUrl && (
                          <img
                            src={comp.thumbnailUrl}
                            alt={comp.name}
                            referrerPolicy="no-referrer"
                            className="h-9 w-9 rounded-full object-cover shrink-0 bg-[#0B0F19]"
                          />
                        )}
                        <div>
                          <a
                            href={comp.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-white hover:text-[#3B82F6]"
                          >
                            <span>{comp.name}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <p className="text-xs text-slate-400">{comp.handle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-mono-tabular font-semibold text-white whitespace-nowrap">
                      {comp.subscribers.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-5 py-4 text-right font-mono-tabular text-slate-300 whitespace-nowrap">
                      {comp.totalViews.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-5 py-4 text-right font-mono-tabular text-slate-300 whitespace-nowrap">
                      {comp.videoCount.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="truncate text-xs font-medium text-slate-200">
                        {comp.topVideoTitle}
                      </p>
                      <p className="text-[11px] font-mono-tabular text-[#10B981]">
                        {comp.topVideoViews.toLocaleString('tr-TR')} izlenme
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onAdaptIdea(comp.topVideoTitle)}
                          className="inline-flex h-8 items-center gap-1 rounded-md bg-[#3B82F6]/15 px-2.5 text-xs font-semibold text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white cursor-pointer"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Uyarla</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveCompetitor(comp.id)}
                          aria-label={`${comp.name} kanalını sil`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-[#0B0F19] text-slate-400 hover:border-rose-500/40 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
