import React, { useState } from 'react';
import {
  Upload,
  Sparkles,
  Monitor,
  Smartphone,
  Sidebar as SidebarIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { ConnectedChannelData, ThumbnailAuditResult } from '../types';

interface ThumbnailsModuleProps {
  channel: ConnectedChannelData | null;
  initialTitle: string;
  onToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

type PreviewLayout = 'desktop' | 'mobile' | 'sidebar';

export const ThumbnailsModule: React.FC<ThumbnailsModuleProps> = ({
  channel,
  initialTitle,
  onToast,
}) => {
  const firstChannelThumb = channel?.recentVideos[0]?.thumbnailUrl || '';
  const [selectedThumbUrl, setSelectedThumbUrl] = useState(
    firstChannelThumb || '/src/assets/images/thumb_ai_saas_1795617139532.jpg'
  );
  const [title, setTitle] = useState(
    channel?.recentVideos[0]?.title || initialTitle || ''
  );
  const [overlayText, setOverlayText] = useState('');
  const [previewLayout, setPreviewLayout] = useState<PreviewLayout>('desktop');
  const [isAuditing, setIsAuditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [audit, setAudit] = useState<ThumbnailAuditResult | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setSelectedThumbUrl(objectUrl);
    onToast('Özel thumbnail önizlemeye yüklendi.');
  };

  const runAudit = async () => {
    if (!title.trim()) {
      onToast('Lütfen analiz için bir video başlığı girin.', 'error');
      return;
    }

    setIsAuditing(true);
    setErrorMsg(null);

    try {
      const data = await apiFetch<ThumbnailAuditResult>('/api/ai/thumbnail-audit', {
        method: 'POST',
        body: JSON.stringify({
          title,
          overlayText,
          visualDescription: 'YouTube video thumbnail görseli ve başlık paketlemesi',
        }),
      });
      setAudit(data);
      onToast('Canlı AI Thumbnail CTR analizi tamamlandı.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setErrorMsg(msg);
      onToast(msg, 'error');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#161922] p-5 sm:p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Thumbnail Önizleme ve AI CTR Analizi
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Kendi görselinizi yükleyin veya bağlı kanalınızdaki bir videonun thumbnail&apos;ini seçip YouTube akışında test edin.
            </p>
          </div>
          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.12] bg-[#0B0F19] px-4 text-xs font-semibold text-white hover:border-[#3B82F6] cursor-pointer whitespace-nowrap shrink-0">
            <Upload className="h-3.5 w-3.5 text-[#3B82F6]" />
            <span>Görsel Yükle</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {channel && channel.recentVideos.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-slate-300 mb-2">
              Bağlı Kanalınızdaki Son Videoların Thumbnail&apos;leri:
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {channel.recentVideos.slice(0, 4).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    if (v.thumbnailUrl) setSelectedThumbUrl(v.thumbnailUrl);
                    setTitle(v.title);
                  }}
                  className={`overflow-hidden rounded-lg border text-left transition-all cursor-pointer ${
                    selectedThumbUrl === v.thumbnailUrl
                      ? 'border-[#3B82F6] ring-2 ring-[#3B82F6]/30'
                      : 'border-white/[0.08] hover:border-white/25'
                  }`}
                >
                  <div className="aspect-video w-full overflow-hidden bg-[#0B0F19]">
                    {v.thumbnailUrl && (
                      <img
                        src={v.thumbnailUrl}
                        alt={v.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <p className="truncate bg-[#0B0F19] px-2 py-1.5 text-[11px] font-medium text-slate-300">
                    {v.title}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <label htmlFor="thumb-title" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Video Başlığı
            </label>
            <input
              id="thumb-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Video başlığını yazın..."
              className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#0B0F19] px-3.5 text-sm text-white placeholder-slate-500 focus:border-[#3B82F6] focus:outline-none"
            />
          </div>
          <div className="lg:col-span-3">
            <label htmlFor="thumb-overlay" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Thumbnail Üstü Kısa Metin (Opsiyonel)
            </label>
            <input
              id="thumb-overlay"
              type="text"
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              placeholder="Örn: İMKANSIZ MOD"
              className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#0B0F19] px-3.5 text-sm text-white placeholder-slate-500 focus:border-[#3B82F6] focus:outline-none"
            />
          </div>
          <div className="lg:col-span-3 flex items-end">
            <button
              type="button"
              onClick={runAudit}
              disabled={isAuditing}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60 cursor-pointer"
            >
              <Sparkles className={`h-3.5 w-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              <span>{isAuditing ? 'Analiz Ediliyor...' : 'AI CTR Analizi Yap'}</span>
            </button>
          </div>
        </div>
      </section>

      {errorMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <p>{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="rounded-xl border border-white/[0.08] bg-[#161922] p-5 sm:p-6 xl:col-span-7">
          <div className="flex flex-col gap-3 pb-4 border-b border-white/[0.08] sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-display text-base font-bold text-white">
              YouTube Akış Önizlemesi
            </h3>
            <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#0B0F19] p-1">
              <button
                type="button"
                onClick={() => setPreviewLayout('desktop')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                  previewLayout === 'desktop' ? 'bg-[#3B82F6] text-white' : 'text-slate-400'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>Masaüstü</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewLayout('mobile')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                  previewLayout === 'mobile' ? 'bg-[#3B82F6] text-white' : 'text-slate-400'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Mobil</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewLayout('sidebar')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                  previewLayout === 'sidebar' ? 'bg-[#3B82F6] text-white' : 'text-slate-400'
                }`}
              >
                <SidebarIcon className="h-3.5 w-3.5" />
                <span>Önerilen</span>
              </button>
            </div>
          </div>

          <div className="mt-5 flex justify-center rounded-xl bg-[#0F0F0F] p-5 border border-white/[0.06]">
            {previewLayout === 'sidebar' ? (
              <div className="flex w-full max-w-md gap-3">
                <div className="relative aspect-video w-44 shrink-0 overflow-hidden rounded-lg bg-black">
                  <img
                    src={selectedThumbUrl}
                    alt="Thumbnail önizleme"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  {overlayText && (
                    <span className="absolute left-2 top-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-extrabold text-[#10B981]">
                      {overlayText}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-white leading-snug">
                    {title || 'Video başlığınız burada görünecek'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{channel?.title || 'Kanalınız'}</p>
                </div>
              </div>
            ) : (
              <div className={previewLayout === 'mobile' ? 'w-full max-w-[340px]' : 'w-full max-w-[440px]'}>
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
                  <img
                    src={selectedThumbUrl}
                    alt="Thumbnail önizleme"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  {overlayText && (
                    <span className="absolute left-3 bottom-3 rounded-md bg-black/80 px-2.5 py-1 font-display text-sm font-extrabold tracking-tight text-white border border-white/15">
                      {overlayText}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-start gap-3">
                  {channel?.thumbnailUrl ? (
                    <img
                      src={channel.thumbnailUrl}
                      alt={channel.title}
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3B82F6] text-xs font-bold text-white">
                      YT
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-white leading-snug">
                      {title || 'Video başlığınız burada görünecek'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {channel?.title || 'Kanalınız'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-[#161922] p-5 sm:p-6 xl:col-span-5 space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Thumbnail CTR Değerlendirmesi
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Canlı Gemini paketleme analizi</p>
            </div>
            {audit && (
              <span className="rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-1.5 font-mono-tabular text-base font-extrabold text-[#10B981]">
                %{audit.ctrPrediction.toFixed(1)} CTR
              </span>
            )}
          </div>

          {!audit ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Başlığınızı yazıp &ldquo;AI CTR Analizi Yap&rdquo; butonuna tıkladığınızda netlik, merak uyumu ve iyileştirme önerileri burada görünür.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {[
                  { label: 'Görsel Netlik ve Odak', value: audit.clarityScore },
                  { label: 'Merak & Başlık Uyumu', value: audit.curiosityScore },
                  { label: 'Kontrast & Mobil Okunabilirlik', value: audit.contrastScore },
                ].map((metric) => (
                  <div key={metric.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{metric.label}</span>
                      <span className="font-mono-tabular font-bold text-white">
                        {metric.value}/100
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#0B0F19]">
                      <div
                        className="h-full rounded-full bg-[#3B82F6]"
                        style={{ width: `${metric.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="rounded-lg border border-white/[0.06] bg-[#0B0F19] p-3.5 text-xs leading-relaxed text-slate-300">
                {audit.verdict}
              </p>

              <div>
                <p className="text-xs font-semibold text-white mb-2">Önerilen İyileştirmeler</p>
                <ul className="space-y-2">
                  {audit.improvements.map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
