import React, { useEffect, useState } from 'react';
import {
  Users,
  Eye,
  Video,
  BarChart3,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Search,
  LogOut,
  CheckCircle2,
  BarChart2,
  Loader2,
  Clock,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { ChannelSearchCandidate, ConnectedChannelData, ModuleId } from '../types';
import type { AuthUserProfile } from '../lib/firebaseAuth';
import { GoogleSignInButton } from './GoogleSignInButton';

interface HomeDashboardModuleProps {
  authUser: AuthUserProfile | null;
  channel: ConnectedChannelData | null;
  isLoadingChannel: boolean;
  channelError: string | null;
  isLoggingIn: boolean;
  onGoogleLogin: () => void;
  onConnectPublicChannel: (query: string) => void;
  onRefreshChannel: () => void;
  onDisconnectChannel: () => void;
  onNavigate: (module: ModuleId) => void;
  onAnalyzeVideo: (videoUrlOrId: string) => void;
  onOptimizeVideo: (title: string) => void;
  onOpenLegal: (page: 'privacy' | 'terms') => void;
}

export const HomeDashboardModule: React.FC<HomeDashboardModuleProps> = ({
  authUser,
  channel,
  isLoadingChannel,
  channelError,
  isLoggingIn,
  onGoogleLogin,
  onConnectPublicChannel,
  onRefreshChannel,
  onDisconnectChannel,
  onNavigate,
  onAnalyzeVideo,
  onOptimizeVideo,
  onOpenLegal,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hoveredVideoIdx, setHoveredVideoIdx] = useState<number | null>(null);
  const [channelQuery, setChannelQuery] = useState('');
  const [quickVideoInput, setQuickVideoInput] = useState('');

  const [candidates, setCandidates] = useState<ChannelSearchCandidate[]>([]);
  const [isSearchingChannels, setIsSearchingChannels] = useState(false);

  // When a user logs in with Google without a linked channel yet, automatically
  // surface matching YouTube channels from their Google name / email prefix.
  useEffect(() => {
    if (channel || !authUser) {
      setCandidates([]);
      return;
    }

    const seed = (authUser.displayName || authUser.email?.split('@')[0] || '').trim();
    if (!seed) return;

    let cancelled = false;
    setIsSearchingChannels(true);
    const url = new URL('/api/youtube/channel-search', window.location.origin);
    url.searchParams.set('q', seed);

    apiFetch<{ channels: ChannelSearchCandidate[] }>(url.pathname + url.search)
      .then((res) => {
        if (!cancelled) {
          setCandidates(res.channels ?? []);
        }
      })
      .catch(() => {
        // Ignore auto-suggestion error silently
      })
      .finally(() => {
        if (!cancelled) {
          setIsSearchingChannels(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authUser, channel]);

  const handleChannelSearchOrConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = channelQuery.trim();
    if (!clean) return;

    // Direct @handle, URL, or UC... channel ID loads immediately
    if (
      clean.startsWith('@') ||
      clean.includes('youtube.com/') ||
      clean.includes('youtu.be/') ||
      /^UC[A-Za-z0-9_-]{10,}$/.test(clean)
    ) {
      onConnectPublicChannel(clean);
      return;
    }

    // Channel name search: show matching candidates to pick in 1 click (or auto-bind if exact)
    setIsSearchingChannels(true);
    try {
      const url = new URL('/api/youtube/channel-search', window.location.origin);
      url.searchParams.set('q', clean);
      const res = await apiFetch<{ channels: ChannelSearchCandidate[] }>(url.pathname + url.search);
      const list = res.channels ?? [];
      if (list.length === 1) {
        onConnectPublicChannel(list[0].channelId);
      } else if (list.length > 1) {
        setCandidates(list);
      } else {
        onConnectPublicChannel(clean);
      }
    } catch {
      onConnectPublicChannel(clean);
    } finally {
      setIsSearchingChannels(false);
    }
  };

  if (!channel) {
    return (
      <div className="space-y-6">
        {/* vidIQ Onboarding Hero & Smart Channel Selector */}
        <section className="rounded-xl border border-white/[0.08] bg-[#131722] p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
            <div className="space-y-4 lg:col-span-5">
              <h2 className="font-display text-2xl font-bold tracking-tight text-white">
                YouTube Kanalını Büyütmeye Başla
              </h2>
              <p className="text-sm leading-relaxed text-slate-300">
                Google hesabınla giriş yap ve YouTube kanalını seçerek video performansını, SEO skorunu, rakipleri ve viral fırsatları tek panelden yönet.
              </p>

              {authUser ? (
                <div className="flex items-center gap-3 border-t border-white/[0.08] pt-4">
                  {authUser.photoURL && (
                    <img
                      src={authUser.photoURL}
                      alt={authUser.displayName || 'Kullanıcı'}
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 rounded-full object-cover shrink-0 border border-white/15"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-white truncate">
                      <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" />
                      <span className="truncate">{authUser.displayName || 'Google Hesabı'}</span>
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {authUser.email} · Sağdan kanalını seçip bağla
                    </p>
                  </div>
                </div>
              ) : (
                <div className="pt-1 flex flex-wrap items-center gap-3">
                  <GoogleSignInButton
                    onClick={onGoogleLogin}
                    loading={isLoggingIn || isLoadingChannel}
                    label="Google ile Giriş Yap"
                  />
                </div>
              )}

              {channelError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs leading-relaxed text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <span>{channelError}</span>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.08] pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0 lg:col-span-7 space-y-4">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  YouTube Kanalını Bul ve Bağla
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Kanal adını, @kullanıcıadını veya YouTube kanal linkini yaz — tek tıkla hesabına bağlansın.
                </p>
              </div>

              <form onSubmit={handleChannelSearchOrConnect} className="flex flex-col gap-2.5 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={channelQuery}
                    onChange={(e) => setChannelQuery(e.target.value)}
                    placeholder="Kanal adı, @kanaladi veya youtube.com/@kanaladi"
                    className="h-11 w-full rounded-lg border border-white/[0.1] bg-[#0B0E14] pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoadingChannel || isSearchingChannels || !channelQuery.trim()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {(isLoadingChannel || isSearchingChannels) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <span>{isLoadingChannel ? 'Bağlanıyor...' : 'Kanalı Bul'}</span>
                </button>
              </form>

              {isSearchingChannels && candidates.length === 0 && (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#38BDF8]" />
                  <span>Eşleşen YouTube kanalları aranıyor...</span>
                </p>
              )}

              {candidates.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-slate-400">
                    Bağlamak istediğin kanalı seç:
                  </p>
                  <div className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.08] bg-[#0B0E14]">
                    {candidates.map((cand) => (
                      <div
                        key={cand.channelId}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {cand.thumbnailUrl && (
                            <img
                              src={cand.thumbnailUrl}
                              alt={cand.title}
                              referrerPolicy="no-referrer"
                              className="h-9 w-9 rounded-full object-cover shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-white">{cand.title}</p>
                            <p className="truncate font-mono-tabular text-[11px] text-slate-400">
                              {cand.customUrl ? `${cand.customUrl} · ` : ''}
                              {cand.subscriberCount.toLocaleString('tr-TR')} abone ·{' '}
                              {cand.videoCount.toLocaleString('tr-TR')} video
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isLoadingChannel}
                          onClick={() => onConnectPublicChannel(cand.channelId)}
                          className="inline-flex h-8 items-center rounded-md bg-[#2563EB] px-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Bağla
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* vidIQ Quick Video Analyzer Strip */}
        <section className="rounded-xl border border-white/[0.08] bg-[#131722] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Herhangi Bir Videoyu Anında Analiz Et
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Kanal bağlamadan da herhangi bir YouTube videosunun VPH hızını, gizli etiketlerini, SEO puanını ve yorumlarını inceleyebilirsiniz.
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!quickVideoInput.trim()) return;
                onAnalyzeVideo(quickVideoInput.trim());
              }}
              className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:min-w-[440px]"
            >
              <input
                type="text"
                value={quickVideoInput}
                onChange={(e) => setQuickVideoInput(e.target.value)}
                placeholder="https://youtube.com/watch?v=... yapıştır"
                className="h-10 flex-1 rounded-lg border border-white/[0.1] bg-[#0B0E14] px-3.5 text-xs text-white placeholder-slate-500 focus:border-[#2563EB] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!quickVideoInput.trim()}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#38BDF8]/40 bg-[#2563EB]/20 px-4 text-xs font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BarChart2 className="h-3.5 w-3.5" />
                <span>Videoyu Analiz Et</span>
              </button>
            </form>
          </div>
        </section>

        {/* vidIQ Full Feature Suite Grid */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              id: 'video-audit' as ModuleId,
              title: 'Video Analizi',
              desc: 'İzlenme hızı (VPH), gizli YouTube etiketleri, SEO skoru ve AI yorum denetimi.',
            },
            {
              id: 'daily-ideas' as ModuleId,
              title: 'Günlük Fikirler',
              desc: 'Nişine özel yüksek CTR ve izlenme potansiyelli günlük video fikirleri üret.',
            },
            {
              id: 'keywords' as ModuleId,
              title: 'Anahtar Kelimeler',
              desc: 'Arama hacmi, rekabet zorluğu ve yükselen uzun kuyruklu fırsatları keşfet.',
            },
            {
              id: 'optimize' as ModuleId,
              title: 'Optimize Et',
              desc: 'Canlı SEO skoru, 5 CTR başlık, SEO açıklama, 15 etiket ve 30sn kanca oluştur.',
            },
            {
              id: 'outliers' as ModuleId,
              title: 'Outliers',
              desc: 'Kendi abone sayısını katlayan viral videoları ve saatlik VPH hızlarını incele.',
            },
            {
              id: 'competitors' as ModuleId,
              title: 'Rakipler & Thumbnail',
              desc: 'Rakip kanalları takip et ve video kapaklarını AI koç ile değerlendir.',
            },
          ].map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onNavigate(tool.id)}
              className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#131722] p-5 text-left transition-colors hover:border-[#2563EB]/70 cursor-pointer"
            >
              <div>
                <h3 className="font-display text-sm font-bold text-white">{tool.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{tool.desc}</p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#38BDF8]">
                <span>Aracı Aç</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4 text-xs text-slate-500">
          <span>VidPro · YouTube Kanal Büyütme Platformu</span>
          <div className="flex items-center gap-4">
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                onOpenLegal('privacy');
              }}
              className="hover:text-slate-300 transition-colors"
            >
              Gizlilik Politikası
            </a>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                onOpenLegal('terms');
              }}
              className="hover:text-slate-300 transition-colors"
            >
              Hizmet Şartları
            </a>
          </div>
        </footer>
      </div>
    );
  }

  // Connected Channel Dashboard (vidIQ Overview)
  const series = channel.analytics28d.dailySeries;
  const chartW = 680;
  const chartH = 200;
  const padX = 16;
  const padY = 20;

  const minVal = series.length > 0 ? Math.min(...series.map((d) => d.views)) : 0;
  const maxVal = series.length > 0 ? Math.max(...series.map((d) => d.views), minVal + 1) : 1;

  const points = series.map((pt, i) => {
    const x =
      series.length > 1
        ? padX + (i / (series.length - 1)) * (chartW - padX * 2)
        : chartW / 2;
    const y =
      chartH -
      padY -
      ((pt.views - minVal) / (maxVal - minVal)) * (chartH - padY * 2);
    return { ...pt, x, y };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaStr =
    points.length > 0
      ? `${points[0].x},${chartH - padY} ${polylineStr} ${
          points[points.length - 1].x
        },${chartH - padY}`
      : '';

  const activePoint =
    points.length > 0
      ? hoveredIdx !== null && points[hoveredIdx]
        ? points[hoveredIdx]
        : points[points.length - 1]
      : null;

  const totalRecentViews = channel.recentVideos.reduce((acc, v) => acc + v.viewCount, 0);
  const totalRecentEngagement = channel.recentVideos.reduce(
    (acc, v) => acc + v.likeCount + v.commentCount,
    0
  );
  const avgEngagementPct =
    totalRecentViews > 0
      ? ((totalRecentEngagement / totalRecentViews) * 100).toFixed(2)
      : '0';

  return (
    <div className="space-y-6">
      {/* Channel Banner */}
      <section className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-[#131722] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          {channel.thumbnailUrl && (
            <img
              src={channel.thumbnailUrl}
              alt={channel.title}
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-full border border-white/15 object-cover shrink-0"
            />
          )}
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-bold text-white">
              {channel.title}
            </h2>
            <p className="text-xs text-slate-400">
              {channel.customUrl || channel.channelId}
              {authUser?.email ? ` · ${authUser.email}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onRefreshChannel}
            disabled={isLoadingChannel}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.1] bg-[#0B0E14] px-4 text-xs font-semibold text-white hover:border-[#2563EB] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingChannel ? 'animate-spin' : ''}`} />
            <span>{isLoadingChannel ? 'Yenileniyor...' : 'Yenile'}</span>
          </button>

          <button
            type="button"
            onClick={onDisconnectChannel}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#0B0E14] px-3.5 text-xs font-semibold text-slate-300 hover:border-rose-500/40 hover:text-rose-300 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Kanalı Değiştir</span>
          </button>
        </div>
      </section>

      {/* 4 Tabular KPI Metrics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#131722] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Abone Sayısı</span>
            <Users className="h-4 w-4 text-[#38BDF8]" />
          </div>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-white">
            {channel.hiddenSubscriberCount
              ? 'Gizli'
              : channel.subscriberCount.toLocaleString('tr-TR')}
          </p>
          <p className="mt-1 font-mono-tabular text-xs text-[#10B981]">
            {channel.analytics28d.available
              ? `${channel.analytics28d.netSubscribers >= 0 ? '+' : ''}${channel.analytics28d.netSubscribers.toLocaleString('tr-TR')} son 28 gün`
              : 'Canlı YouTube verisi'}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#131722] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Toplam İzlenme</span>
            <Eye className="h-4 w-4 text-[#38BDF8]" />
          </div>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-white">
            {channel.viewCount.toLocaleString('tr-TR')}
          </p>
          <p className="mt-1 font-mono-tabular text-xs text-slate-400">
            {channel.analytics28d.available
              ? `Son 28 gün: ${channel.analytics28d.totalViews.toLocaleString('tr-TR')}`
              : `${channel.videoCount.toLocaleString('tr-TR')} toplam içerik`}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#131722] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Yayınlanan Video</span>
            <Video className="h-4 w-4 text-[#10B981]" />
          </div>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-white">
            {channel.videoCount.toLocaleString('tr-TR')}
          </p>
          <p className="mt-1 font-mono-tabular text-xs text-slate-400">
            Ort. kanal izlenme:{' '}
            {channel.videoCount > 0
              ? Math.round(channel.viewCount / channel.videoCount).toLocaleString('tr-TR')
              : '0'}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#131722] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {channel.analytics28d.available ? '28 Gün İzlenme Süresi' : 'Son Videolar Ort. İzlenme'}
            </span>
            {channel.analytics28d.available ? (
              <Clock className="h-4 w-4 text-[#10B981]" />
            ) : (
              <BarChart3 className="h-4 w-4 text-[#10B981]" />
            )}
          </div>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-white">
            {channel.analytics28d.available
              ? `${channel.analytics28d.watchHours.toLocaleString('tr-TR')} saat`
              : channel.recentVideos.length > 0
                ? Math.round(totalRecentViews / channel.recentVideos.length).toLocaleString('tr-TR')
                : '0'}
          </p>
          <p className="mt-1 font-mono-tabular text-xs text-slate-400">
            {channel.analytics28d.available
              ? `Ort. süre: ${Math.floor(channel.analytics28d.avgViewDurationSec / 60)}dk ${
                  channel.analytics28d.avgViewDurationSec % 60
                }sn`
              : `Ort. etkileşim: %${avgEngagementPct}`}
          </p>
        </div>
      </section>

      {/* Performance Chart */}
      <section className="rounded-xl border border-white/[0.08] bg-[#131722] p-5 sm:p-6">
        {channel.analytics28d.available && points.length > 0 ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Son 28 Günlük İzlenme Performansı
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">YouTube Analytics günlük dağılımı</p>
              </div>
              {activePoint && (
                <div className="border border-white/[0.08] bg-[#0B0E14] rounded-lg px-3 py-1.5 text-right">
                  <p className="text-[11px] font-mono-tabular text-slate-400">{activePoint.date}</p>
                  <p className="font-mono-tabular text-xs font-bold text-white">
                    {activePoint.views.toLocaleString('tr-TR')} izlenme · +
                    {activePoint.subscribersGained} / -{activePoint.subscribersLost} abone
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="h-[200px] w-full"
                role="img"
                aria-label="28 Günlük YouTube Analytics Grafiği"
              >
                <defs>
                  <linearGradient id="ytRealArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <polygon points={areaStr} fill="url(#ytRealArea)" />
                <polyline
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={polylineStr}
                />
                {points.map((pt, i) => (
                  <circle
                    key={pt.date}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredIdx === i ? 6 : 3.5}
                    fill={hoveredIdx === i ? '#10B981' : '#38BDF8'}
                    stroke="#0B0E14"
                    strokeWidth="1.5"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(i)}
                  />
                ))}
              </svg>
            </div>
          </>
        ) : (
          (() => {
            const chartVideos = [...channel.recentVideos].reverse();
            const maxVidViews = Math.max(...chartVideos.map((v) => v.viewCount), 1);
            const activeVid =
              chartVideos.length > 0
                ? hoveredVideoIdx !== null && chartVideos[hoveredVideoIdx]
                  ? chartVideos[hoveredVideoIdx]
                  : chartVideos[chartVideos.length - 1]
                : null;

            return (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold text-white">
                      Son Videolar İzlenme Grafiği
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Çubukların üzerine gelin veya video analizini açmak için tıklayın
                    </p>
                  </div>
                  {activeVid && (
                    <div className="rounded-lg border border-white/[0.08] bg-[#0B0E14] px-3 py-1.5 text-right max-w-xs">
                      <p className="truncate text-[11px] text-slate-400">{activeVid.title}</p>
                      <p className="font-mono-tabular text-xs font-bold text-white">
                        {activeVid.viewCount.toLocaleString('tr-TR')} izlenme ·{' '}
                        {activeVid.likeCount.toLocaleString('tr-TR')} beğeni
                      </p>
                    </div>
                  )}
                </div>

                {chartVideos.length > 0 ? (
                  <div className="mt-5 flex h-[170px] items-end gap-2 sm:gap-3 pt-4">
                    {chartVideos.map((vid, idx) => {
                      const pct = Math.max(8, Math.round((vid.viewCount / maxVidViews) * 100));
                      const isActive =
                        hoveredVideoIdx !== null
                          ? hoveredVideoIdx === idx
                          : idx === chartVideos.length - 1;
                      return (
                        <button
                          key={vid.id}
                          type="button"
                          onMouseEnter={() => setHoveredVideoIdx(idx)}
                          onClick={() => onAnalyzeVideo(vid.url)}
                          title={`${vid.title} — Analiz etmek için tıkla`}
                          className="group flex flex-1 flex-col items-center gap-2 h-full justify-end cursor-pointer"
                        >
                          <div className="w-full flex-1 flex items-end">
                            <div
                              style={{ height: `${pct}%` }}
                              className={`w-full rounded-t-md transition-colors ${
                                isActive
                                  ? 'bg-gradient-to-t from-[#2563EB] to-[#38BDF8]'
                                  : 'bg-[#2563EB]/35 group-hover:bg-[#3B82F6]/70'
                              }`}
                            />
                          </div>
                          <span className="font-mono-tabular text-[10px] text-slate-500 truncate max-w-full">
                            {vid.publishedAt.slice(5, 10)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-400">
                    Grafik için kanalda henüz herkese açık video bulunmuyor.
                  </p>
                )}
              </>
            );
          })()
        )}
      </section>

      {/* Recent Videos Table with Analiz Et + Optimize Et */}
      <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#131722]">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-white">Son Videolar</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Her videonun SEO puanını, gizli etiketlerini analiz edin veya Optimize Et&apos;e gönderin
            </p>
          </div>
          <span className="font-mono-tabular text-xs text-slate-400">
            {channel.recentVideos.length} video
          </span>
        </div>

        {channel.recentVideos.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Kanalda henüz herkese açık video bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0B0E14]/60 text-xs font-semibold text-slate-400">
                  <th className="px-5 py-3">Video</th>
                  <th className="px-5 py-3 text-right">İzlenme</th>
                  <th className="px-5 py-3 text-right">Beğeni</th>
                  <th className="px-5 py-3 text-right">Yorum</th>
                  <th className="px-5 py-3 text-right">Etkileşim</th>
                  <th className="px-5 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {channel.recentVideos.map((vid) => {
                  const eng =
                    vid.viewCount > 0
                      ? (((vid.likeCount + vid.commentCount) / vid.viewCount) * 100).toFixed(1)
                      : '0';
                  return (
                    <tr key={vid.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 max-w-md">
                        <div className="flex items-center gap-3">
                          {vid.thumbnailUrl && (
                            <img
                              src={vid.thumbnailUrl}
                              alt={vid.title}
                              referrerPolicy="no-referrer"
                              className="h-11 w-20 rounded object-cover shrink-0 bg-[#0B0E14]"
                            />
                          )}
                          <div className="min-w-0">
                            <a
                              href={vid.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-white hover:text-[#38BDF8] line-clamp-1"
                            >
                              <span className="truncate">{vid.title}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                            <p className="mt-0.5 text-xs text-slate-400 font-mono-tabular">
                              {vid.duration} · {vid.publishedAt.slice(0, 10)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono-tabular font-semibold text-white whitespace-nowrap">
                        {vid.viewCount.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono-tabular text-slate-300 whitespace-nowrap">
                        {vid.likeCount.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono-tabular text-slate-300 whitespace-nowrap">
                        {vid.commentCount.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono-tabular text-[#10B981] whitespace-nowrap">
                        %{eng}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onAnalyzeVideo(vid.url)}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-white/[0.12] bg-[#0B0E14] px-3 text-xs font-semibold text-white hover:border-[#38BDF8] hover:text-[#38BDF8] cursor-pointer"
                          >
                            <BarChart2 className="h-3.5 w-3.5" />
                            <span>Analiz Et</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOptimizeVideo(vid.title)}
                            className="inline-flex h-8 items-center gap-1 rounded-md bg-[#2563EB] px-3 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer"
                          >
                            <span>Optimize Et</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
