import React, { useEffect, useState } from 'react';
import {
  Search,
  ExternalLink,
  Copy,
  CheckCircle2,
  XCircle,
  Sparkles,
  MessageSquare,
  Tag,
  AlertCircle,
  Loader2,
  Play,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { VideoAiAuditResult, VideoInspectionData } from '../types';

interface VideoAnalyzerModuleProps {
  initialVideoInput: string;
  autoTriggerKey: number;
  recentChannelVideos?: Array<{
    id: string;
    title: string;
    thumbnailUrl: string;
    viewCount: number;
    url: string;
  }>;
  onRouteToOptimize: (title: string) => void;
  onCopy: (text: string, label?: string) => void;
  onToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

type DetailTab = 'overview' | 'comments' | 'description';

export const VideoAnalyzerModule: React.FC<VideoAnalyzerModuleProps> = ({
  initialVideoInput,
  autoTriggerKey,
  recentChannelVideos = [],
  onRouteToOptimize,
  onCopy,
  onToast,
}) => {
  const [videoInput, setVideoInput] = useState(initialVideoInput);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<VideoInspectionData | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  const [isAuditing, setIsAuditing] = useState(false);
  const [aiAudit, setAiAudit] = useState<VideoAiAuditResult | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  const inspectVideo = async (rawQuery: string) => {
    const clean = rawQuery.trim();
    if (!clean) {
      onToast('Lütfen analiz edilecek bir YouTube video linki veya ID girin.', 'error');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setAiAudit(null);
    setAuditError(null);

    try {
      const url = new URL('/api/youtube/video-inspect', window.location.origin);
      url.searchParams.set('v', clean);
      const data = await apiFetch<VideoInspectionData>(url.pathname + url.search);
      setVideoData(data);
      setActiveTab('overview');
      onToast('Video verileri başarıyla analiz edildi.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Video analizi alınamadı.';
      setErrorMsg(msg);
      onToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (autoTriggerKey > 0 && initialVideoInput.trim()) {
      setVideoInput(initialVideoInput);
      inspectVideo(initialVideoInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTriggerKey, initialVideoInput]);

  const runAiAudit = async () => {
    if (!videoData) return;
    setIsAuditing(true);
    setAuditError(null);
    try {
      const result = await apiFetch<VideoAiAuditResult>('/api/ai/video-audit', {
        method: 'POST',
        body: JSON.stringify({
          video: {
            title: videoData.title,
            description: videoData.description,
            tags: videoData.tags,
            viewCount: videoData.viewCount,
            likeCount: videoData.likeCount,
            commentCount: videoData.commentCount,
            vph: videoData.vph,
            engagementRate: videoData.engagementRate,
            outlierMultiplier: videoData.outlierMultiplier,
            channelTitle: videoData.channelTitle,
            channelSubscribers: videoData.channelSubscribers,
            topComments: videoData.topComments.map((c) => ({
              text: c.text,
              likeCount: c.likeCount,
            })),
          },
        }),
      });
      setAiAudit(result);
      onToast('AI video ve yorum analizi tamamlandı.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI analizi başarısız oldu.';
      setAuditError(msg);
      onToast(msg, 'error');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Inspector Input Bar */}
      <section className="rounded-xl border border-white/[0.08] bg-[#131722] p-5 sm:p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Video Denetleyici &amp; SEO Skoru
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Herhangi bir YouTube video veya Shorts bağlantısını yapıştırarak VPH hızını, gizli etiketlerini, SEO puanını ve izleyici yorumlarını analiz edin.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            inspectVideo(videoInput);
          }}
          className="mt-5 flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              placeholder="YouTube video linki veya ID yapıştırın (örn: https://youtube.com/watch?v=...)"
              className="h-11 w-full rounded-lg border border-white/[0.1] bg-[#0B0E14] pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !videoInput.trim()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span>{isLoading ? 'Analiz Ediliyor...' : 'Videoyu Analiz Et'}</span>
          </button>
        </form>

        {recentChannelVideos.length > 0 && !videoData && (
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <p className="text-xs font-semibold text-slate-400 mb-3">
              Kanalınızdaki Son Videolardan Hızlı Seçin
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {recentChannelVideos.slice(0, 6).map((vid) => (
                <button
                  key={vid.id}
                  type="button"
                  onClick={() => {
                    setVideoInput(vid.url);
                    inspectVideo(vid.id);
                  }}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-[#0B0E14] p-2.5 text-left transition-colors hover:border-[#2563EB]/60 cursor-pointer"
                >
                  {vid.thumbnailUrl ? (
                    <img
                      src={vid.thumbnailUrl}
                      alt={vid.title}
                      referrerPolicy="no-referrer"
                      className="h-11 w-20 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-11 w-20 items-center justify-center rounded bg-[#161B26] text-slate-500 shrink-0">
                      <Play className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">{vid.title}</p>
                    <p className="mt-0.5 font-mono-tabular text-[11px] text-slate-400">
                      {vid.viewCount.toLocaleString('tr-TR')} izlenme
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {errorMsg && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <p>{errorMsg}</p>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-80 rounded-xl border border-white/[0.08] bg-[#131722] animate-pulse lg:col-span-5" />
          <div className="h-80 rounded-xl border border-white/[0.08] bg-[#131722] animate-pulse lg:col-span-7" />
        </div>
      )}

      {!isLoading && videoData && (
        <>
          {/* Main 2-Column vidIQ Video Overview & SEO Score */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Video Preview + Real Telemetry */}
            <div className="rounded-xl border border-white/[0.08] bg-[#131722] overflow-hidden lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="relative aspect-video w-full bg-[#0B0E14]">
                  {videoData.thumbnailUrl ? (
                    <img
                      src={videoData.thumbnailUrl}
                      alt={videoData.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-500">
                      <Play className="h-10 w-10" />
                    </div>
                  )}
                  <span className="absolute bottom-2.5 right-2.5 rounded bg-black/85 px-2 py-0.5 font-mono-tabular text-xs font-semibold text-white">
                    {videoData.duration}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-xs text-slate-400">
                      {videoData.channelTitle}
                      {videoData.channelCustomUrl ? ` · ${videoData.channelCustomUrl}` : ''} ·{' '}
                      {videoData.publishedAt.slice(0, 10)}
                    </p>
                    <h3 className="mt-1.5 font-display text-base font-bold leading-snug text-white">
                      {videoData.title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] text-slate-400">İzlenme</p>
                      <p className="mt-0.5 font-mono-tabular text-base font-bold text-white">
                        {videoData.viewCount.toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">VPH (Saatlik)</p>
                      <p className="mt-0.5 font-mono-tabular text-base font-bold text-[#38BDF8]">
                        {videoData.vph.toLocaleString('tr-TR')}/sa
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Outlier</p>
                      <p className="mt-0.5 font-mono-tabular text-base font-bold text-[#10B981]">
                        {videoData.outlierMultiplier}x
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Beğeni</p>
                      <p className="mt-0.5 font-mono-tabular text-sm font-semibold text-slate-200">
                        {videoData.likeCount.toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Yorum</p>
                      <p className="mt-0.5 font-mono-tabular text-sm font-semibold text-slate-200">
                        {videoData.commentCount.toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Etkileşim</p>
                      <p className="mt-0.5 font-mono-tabular text-sm font-semibold text-slate-200">
                        %{videoData.engagementRate}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3.5">
                <a
                  href={videoData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>YouTube&apos;da İzle</span>
                </a>
                <button
                  type="button"
                  onClick={() => onRouteToOptimize(videoData.title)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Optimize Et&apos;e Aktar</span>
                </button>
              </div>
            </div>

            {/* vidIQ SEO Score + Checklist + Tabs */}
            <div className="rounded-xl border border-white/[0.08] bg-[#131722] p-5 sm:p-6 lg:col-span-7 space-y-5">
              <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">vidIQ Teknik SEO Puanı</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-mono-tabular text-3xl font-extrabold text-white">
                      {videoData.seoScore}
                    </span>
                    <span className="font-mono-tabular text-sm text-slate-400">/ 100</span>
                    <span className="text-xs font-semibold text-[#10B981]">
                      · {videoData.definition}
                      {videoData.caption ? ' · Altyazılı' : ''}
                    </span>
                  </div>
                </div>

                {/* Segmented Tabs */}
                <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#0B0E14] p-1 self-start">
                  {(
                    [
                      { id: 'overview', label: 'SEO & Etiketler' },
                      { id: 'comments', label: `Yorumlar (${videoData.topComments.length})` },
                      { id: 'description', label: 'Açıklama' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-[#2563EB] text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#0B0E14]">
                <div
                  style={{ width: `${videoData.seoScore}%` }}
                  className={`h-full transition-all ${
                    videoData.seoScore >= 80
                      ? 'bg-[#10B981]'
                      : videoData.seoScore >= 50
                        ? 'bg-[#2563EB]'
                        : 'bg-amber-500'
                  }`}
                />
              </div>

              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Checklist */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {videoData.checklist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2.5 border-b border-white/[0.06] pb-2.5"
                      >
                        {item.passed ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white">{item.label}</p>
                          <p className="font-mono-tabular text-[11px] text-slate-400">
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Video Tags */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Tag className="h-3.5 w-3.5 text-[#38BDF8]" />
                        <span>Video Etiketleri ({videoData.tags.length})</span>
                      </div>
                      {videoData.tags.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onCopy(videoData.tags.join(', '), 'Video Etiketleri')}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#38BDF8] hover:text-white cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>Tümünü Kopyala</span>
                        </button>
                      )}
                    </div>

                    {videoData.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {videoData.tags.map((tag, idx) => (
                          <button
                            key={`${tag}-${idx}`}
                            type="button"
                            onClick={() => onCopy(tag, tag)}
                            title="Kopyalamak için tıkla"
                            className="rounded-md border border-white/[0.08] bg-[#0B0E14] px-2.5 py-1 text-xs text-slate-200 transition-colors hover:border-[#38BDF8] hover:text-white cursor-pointer"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Bu videoda tanımlanmış gizli/açık etiket bulunmuyor.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {videoData.topComments.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Bu video için yorumlar kapalı veya henüz öne çıkan yorum bulunmuyor.
                    </p>
                  ) : (
                    videoData.topComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="border-b border-white/[0.06] pb-3 last:border-b-0"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-white">{comment.author}</span>
                          <span className="font-mono-tabular text-[11px] text-slate-400">
                            {comment.likeCount.toLocaleString('tr-TR')} beğeni ·{' '}
                            {comment.publishedAt.slice(0, 10)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-300 whitespace-pre-line">
                          {comment.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'description' && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onCopy(videoData.description, 'Video Açıklaması')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#38BDF8] hover:text-white cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Açıklamayı Kopyala</span>
                    </button>
                  </div>
                  <pre className="max-h-[300px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/[0.06] bg-[#0B0E14] p-4 font-sans text-xs leading-relaxed text-slate-300">
                    {videoData.description || 'Açıklama metni bulunmuyor.'}
                  </pre>
                </div>
              )}
            </div>
          </section>

          {/* AI Deep Video & Comment Audit */}
          <section className="rounded-xl border border-white/[0.08] bg-[#131722] p-5 sm:p-6 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  AI Video &amp; Yorum Derin Analizi
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Videonun performansı, başlık/açıklama kalitesi ve izleyici yorumlarından çıkan sonraki fırsatları analiz edin.
                </p>
              </div>
              <button
                type="button"
                onClick={runAiAudit}
                disabled={isAuditing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isAuditing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>{isAuditing ? 'Analiz Hazırlanıyor...' : 'AI ile Derin Analiz Yap'}</span>
              </button>
            </div>

            {auditError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{auditError}</span>
              </div>
            )}

            {aiAudit && (
              <div className="space-y-6 border-t border-white/[0.08] pt-5">
                <p className="text-sm leading-relaxed text-slate-200">{aiAudit.summary}</p>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-[#10B981]">Güçlü Yönler</h4>
                    <ul className="space-y-2 text-xs leading-relaxed text-slate-300">
                      {aiAudit.strengths.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-[#38BDF8]">Geliştirme Aksiyonları</h4>
                    <ul className="space-y-2 text-xs leading-relaxed text-slate-300">
                      {aiAudit.improvements.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#38BDF8]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="border-t border-white/[0.06] pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <MessageSquare className="h-3.5 w-3.5 text-[#38BDF8]" />
                    <span>İzleyici Yorumları &amp; Sonraki Video Fırsatı</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {aiAudit.audienceSentiment}
                  </p>
                </div>

                <div className="border-t border-white/[0.06] pt-4 space-y-2.5">
                  <h4 className="text-xs font-bold text-white">Daha Yüksek CTR İçin Alternatif Başlıklar</h4>
                  <div className="space-y-2">
                    {aiAudit.betterTitles.map((title, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-[#0B0E14] px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="text-xs font-semibold text-white">{title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onCopy(title, 'Başlık')}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white cursor-pointer"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Kopyala</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRouteToOptimize(title)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#38BDF8] hover:text-white cursor-pointer"
                          >
                            <span>Optimize Et</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
