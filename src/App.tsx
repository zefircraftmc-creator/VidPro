import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Menu, Bookmark, LogOut } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { HomeDashboardModule } from './components/HomeDashboardModule';
import { OptimizeModule } from './components/OptimizeModule';
import { AiCoachModule } from './components/AiCoachModule';
import { KeywordInspectorModule } from './components/KeywordInspectorModule';
import { DailyIdeasModule } from './components/DailyIdeasModule';
import { OutliersModule } from './components/OutliersModule';
import { CompetitorsModule } from './components/CompetitorsModule';
import { ThumbnailsModule } from './components/ThumbnailsModule';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { SavedIdeasDrawer } from './components/SavedIdeasDrawer';
import { ToastContainer } from './components/Toast';
import { LegalPages } from './components/LegalPages';
import {
  googleSignIn,
  initAuth,
  logout,
  type AuthUserProfile,
} from './lib/firebaseAuth';
import { apiFetch } from './lib/api';
import type {
  ApiStatusResponse,
  CompetitorChannel,
  ConnectedChannelData,
  GeneratedContentResult,
  KeywordAnalysisResult,
  ModuleId,
  OutlierVideo,
  ToastMessage,
  ViralIdea,
} from './types';

const SAVED_STORAGE_KEY = 'ygs_saved_ideas_v1';
const COMPETITORS_STORAGE_KEY = 'ygs_competitors_v1';
const BOUND_CHANNEL_KEY_PREFIX = 'ygs_bound_channel_v1_';

const MODULE_BREADCRUMBS: Record<ModuleId, string> = {
  home: 'Ana Sayfa · Kanal Özeti',
  'daily-ideas': 'Günlük Fikirler · Viral Trendler',
  keywords: 'Anahtar Kelimeler · Hacim ve Rekabet',
  optimize: 'Optimize Et · SEO Skoru & İçerik',
  outliers: 'Outliers · Viral Video Keşfi',
  competitors: 'Rakipler · Kanal Takibi',
  coach: 'AI Koç · Strateji Sohbeti',
  thumbnails: 'Thumbnail Önizleme · CTR Analizi',
};

const getInitialLegalPage = (): 'privacy' | 'terms' | null => {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/privacy') return 'privacy';
  if (path === '/terms') return 'terms';
  return null;
};

export default function App() {
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | null>(getInitialLegalPage);
  const [activeModule, setActiveModule] = useState<ModuleId>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [savedDrawerOpen, setSavedDrawerOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');

  const [apiStatus, setApiStatus] = useState<ApiStatusResponse>({
    geminiReady: false,
    youtubeReady: false,
  });

  // Google Auth & Connected YouTube Channel State
  const [authUser, setAuthUser] = useState<AuthUserProfile | null>(null);
  const [channel, setChannel] = useState<ConnectedChannelData | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);
  const lastAutoLoadedUidRef = useRef<string | null>(null);

  // Module States (100% real data, zero fake defaults)
  const [niche, setNiche] = useState('');
  const [ideas, setIdeas] = useState<ViralIdea[]>([]);
  const [keywordAnalysis, setKeywordAnalysis] = useState<KeywordAnalysisResult | null>(null);
  const [keywordQuery, setKeywordQuery] = useState('');
  const [autoTriggerKeywordKey, setAutoTriggerKeywordKey] = useState(0);
  const [contentTopic, setContentTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContentResult | null>(null);
  const [autoTriggerContentKey, setAutoTriggerContentKey] = useState(0);
  const [outliers, setOutliers] = useState<OutlierVideo[]>([]);

  const [competitors, setCompetitors] = useState<CompetitorChannel[]>(() => {
    try {
      const raw = localStorage.getItem(COMPETITORS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CompetitorChannel[]) : [];
    } catch {
      return [];
    }
  });

  const [savedIdeas, setSavedIdeas] = useState<ViralIdea[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ViralIdea[]) : [];
    } catch {
      return [];
    }
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  const copyToClipboard = useCallback(
    async (text: string, label?: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast(label ? `Kopyalandı! (${label})` : 'Kopyalandı!');
      } catch {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
        showToast(label ? `Kopyalandı! (${label})` : 'Kopyalandı!');
      }
    },
    [showToast]
  );

  const fetchPublicChannel = useCallback(
    async (query: string, uidOverride?: string | null) => {
      const clean = query.trim();
      if (!clean) return;
      setIsLoadingChannel(true);
      setChannelError(null);
      try {
        const url = new URL('/api/youtube/public-channel', window.location.origin);
        url.searchParams.set('q', clean);
        const data = await apiFetch<ConnectedChannelData>(url.pathname + url.search);
        setChannel(data);
        if (!niche && data.title) {
          setNiche(data.title);
        }
        try {
          const storageKey = `${BOUND_CHANNEL_KEY_PREFIX}${uidOverride ?? authUser?.uid ?? 'guest'}`;
          localStorage.setItem(storageKey, data.customUrl || data.channelId || clean);
        } catch {
          // Ignore storage errors
        }
        showToast(`${data.title} kanalının gerçek YouTube verileri yüklendi!`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Kanal verileri alınamadı.';
        setChannelError(msg);
        showToast(msg, 'error');
      } finally {
        setIsLoadingChannel(false);
      }
    },
    [authUser?.uid, niche, showToast]
  );

  useEffect(() => {
    apiFetch<ApiStatusResponse>('/api/status')
      .then((data) => setApiStatus(data))
      .catch(() => {
        // Ignore initial status error
      });

    const unsub = initAuth(
      (profile) => {
        setAuthUser(profile);
        if (lastAutoLoadedUidRef.current === profile.uid) return;
        lastAutoLoadedUidRef.current = profile.uid;
        try {
          const savedQuery = localStorage.getItem(`${BOUND_CHANNEL_KEY_PREFIX}${profile.uid}`);
          if (savedQuery) {
            fetchPublicChannel(savedQuery, profile.uid);
          }
        } catch {
          // Ignore storage errors
        }
      },
      () => {
        lastAutoLoadedUidRef.current = null;
        setAuthUser(null);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setLegalPage(getInitialLegalPage());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateLegal = useCallback((page: 'privacy' | 'terms' | null) => {
    const targetPath = page === 'privacy' ? '/privacy' : page === 'terms' ? '/terms' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setLegalPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setChannelError(null);
    try {
      const profile = await googleSignIn();
      setAuthUser(profile);
      let savedQuery: string | null = null;
      try {
        savedQuery = localStorage.getItem(`${BOUND_CHANNEL_KEY_PREFIX}${profile.uid}`);
      } catch {
        savedQuery = null;
      }
      if (savedQuery && lastAutoLoadedUidRef.current !== profile.uid) {
        lastAutoLoadedUidRef.current = profile.uid;
        await fetchPublicChannel(savedQuery, profile.uid);
      } else if (!savedQuery) {
        showToast('Google hesabınızla giriş yapıldı! Şimdi kanal @handle adresinizi bağlayabilirsiniz.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google girişi başarısız oldu.';
      setChannelError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRefreshChannel = async () => {
    if (!channel) return;
    await fetchPublicChannel(channel.customUrl || channel.channelId || channel.title);
  };

  const handleSwitchChannel = () => {
    try {
      localStorage.removeItem(`${BOUND_CHANNEL_KEY_PREFIX}${authUser?.uid ?? 'guest'}`);
    } catch {
      // Ignore storage errors
    }
    setChannel(null);
    setChannelError(null);
  };

  const handleLogout = async () => {
    if (authUser) {
      await logout();
    }
    setAuthUser(null);
    setChannel(null);
    setChannelError(null);
    showToast('Oturum kapatıldı.', 'info');
  };

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedIdeas));
    } catch {
      // Ignore storage errors
    }
  }, [savedIdeas]);

  useEffect(() => {
    try {
      localStorage.setItem(COMPETITORS_STORAGE_KEY, JSON.stringify(competitors));
    } catch {
      // Ignore storage errors
    }
  }, [competitors]);

  const savedIds = useMemo(() => {
    const set = new Set<string>();
    for (const item of savedIdeas) {
      set.add(item.id);
      set.add(item.title);
    }
    return set;
  }, [savedIdeas]);

  const handleToggleSaveIdea = (idea: ViralIdea) => {
    const exists = savedIdeas.some((s) => s.id === idea.id || s.title === idea.title);
    if (exists) {
      setSavedIdeas((prev) =>
        prev.filter((s) => s.id !== idea.id && s.title !== idea.title)
      );
      showToast('Fikir kaydedilenlerden çıkarıldı.', 'info');
    } else {
      setSavedIdeas((prev) => [{ ...idea, savedAt: new Date().toISOString() }, ...prev]);
      showToast('Fikir kaydedildi!');
    }
  };

  const handleDismissIdea = (id: string) => {
    setIdeas((prev) => prev.filter((item) => item.id !== id));
    showToast('Fikir listeden çıkarıldı.', 'info');
  };

  const handleRemoveSavedIdea = (id: string) => {
    setSavedIdeas((prev) => prev.filter((s) => s.id !== id));
    showToast('Kayıtlı fikir silindi.', 'info');
  };

  const handleRouteToOptimize = (topicText: string) => {
    setContentTopic(topicText);
    setActiveModule('optimize');
    setAutoTriggerContentKey((k) => k + 1);
  };

  const hasYoutubeAccess = apiStatus.youtubeReady;

  if (legalPage) {
    return (
      <LegalPages
        page={legalPage}
        onBack={() => navigateLegal(null)}
        onSwitchPage={(p) => navigateLegal(p)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100">
      <Sidebar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        savedCount={savedIdeas.length}
        onOpenSaved={() => setSavedDrawerOpen(true)}
        authUser={authUser}
        channel={channel}
        isLoggingIn={isLoggingIn}
        onGoogleLogin={handleGoogleLogin}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenLegal={(page) => navigateLegal(page)}
      />

      <div className="lg:pl-[244px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-white/[0.08] bg-[#0B0E14]/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Navigasyon menüsünü aç"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-[#161B26] text-slate-300 hover:text-white lg:hidden shrink-0 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-400">
                {channel ? channel.title : 'VidPro'}
              </p>
              <h1 className="truncate font-display text-sm font-bold text-white sm:text-base">
                {MODULE_BREADCRUMBS[activeModule]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = headerSearch.trim();
                if (!q) return;
                setKeywordQuery(q);
                setAutoTriggerKeywordKey((k) => k + 1);
                setActiveModule('keywords');
                setHeaderSearch('');
              }}
              className="hidden md:flex items-center"
            >
              <input
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Anahtar kelime veya konu ara..."
                className="h-9 w-56 rounded-lg border border-white/[0.08] bg-[#161B26] px-3 text-xs text-white placeholder-slate-500 focus:border-[#3B82F6] focus:outline-none lg:w-64"
              />
            </form>

            <button
              type="button"
              onClick={() => setSavedDrawerOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#161B26] px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-white/20 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Bookmark className="h-3.5 w-3.5 text-[#38BDF8]" />
              <span className="hidden sm:inline">Kaydedilenler</span>
              <span className="font-mono-tabular text-slate-400">({savedIdeas.length})</span>
            </button>

            {channel ? (
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#161922] px-2.5 py-1.5">
                {channel.thumbnailUrl && (
                  <img
                    src={channel.thumbnailUrl}
                    alt={channel.title}
                    referrerPolicy="no-referrer"
                    className="h-6 w-6 rounded-full object-cover"
                  />
                )}
                <span className="hidden sm:inline text-xs font-semibold text-white max-w-[140px] truncate">
                  {channel.title}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Çıkış yap"
                  title="Çıkış yap"
                  className="text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : authUser ? (
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#161922] px-2.5 py-1.5">
                {authUser.photoURL && (
                  <img
                    src={authUser.photoURL}
                    alt={authUser.displayName || 'Kullanıcı'}
                    referrerPolicy="no-referrer"
                    className="h-6 w-6 rounded-full object-cover"
                  />
                )}
                <span className="hidden sm:inline text-xs font-semibold text-white max-w-[140px] truncate">
                  {authUser.displayName || authUser.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Çıkış yap"
                  title="Çıkış yap"
                  className="text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <GoogleSignInButton
                onClick={handleGoogleLogin}
                loading={isLoggingIn}
                label="Google ile Giriş Yap"
                compact
              />
            )}
          </div>
        </header>

        <main className="mx-auto max-w-[1320px] p-4 sm:p-6 lg:p-8">
          {activeModule === 'home' && (
            <HomeDashboardModule
              authUser={authUser}
              channel={channel}
              isLoadingChannel={isLoadingChannel}
              channelError={channelError}
              isLoggingIn={isLoggingIn}
              onGoogleLogin={handleGoogleLogin}
              onConnectPublicChannel={fetchPublicChannel}
              onRefreshChannel={handleRefreshChannel}
              onDisconnectChannel={handleSwitchChannel}
              onNavigate={setActiveModule}
              onOptimizeVideo={handleRouteToOptimize}
              onOpenLegal={(page) => navigateLegal(page)}
            />
          )}

          {activeModule === 'daily-ideas' && (
            <DailyIdeasModule
              channel={channel}
              ideas={ideas}
              niche={niche}
              onNicheChange={setNiche}
              onIdeasUpdate={setIdeas}
              savedIds={savedIds}
              onToggleSave={handleToggleSaveIdea}
              onDismissIdea={handleDismissIdea}
              onConvertToScript={handleRouteToOptimize}
              onToast={showToast}
            />
          )}

          {activeModule === 'keywords' && (
            <KeywordInspectorModule
              analysis={keywordAnalysis}
              onAnalysisUpdate={setKeywordAnalysis}
              initialQuery={keywordQuery}
              autoTriggerKey={autoTriggerKeywordKey}
              onCreateContentFromKeyword={handleRouteToOptimize}
              onCopy={copyToClipboard}
              onToast={showToast}
            />
          )}

          {activeModule === 'optimize' && (
            <OptimizeModule
              channel={channel}
              topic={contentTopic}
              onTopicChange={setContentTopic}
              content={generatedContent}
              onContentUpdate={setGeneratedContent}
              autoTriggerKey={autoTriggerContentKey}
              onCopy={copyToClipboard}
              onToast={showToast}
            />
          )}

          {activeModule === 'outliers' && (
            <OutliersModule
              hasYoutubeAccess={hasYoutubeAccess}
              isLoggingIn={isLoggingIn}
              onGoogleLogin={handleGoogleLogin}
              outliers={outliers}
              onOutliersUpdate={setOutliers}
              onAdaptIdea={handleRouteToOptimize}
              onToast={showToast}
            />
          )}

          {activeModule === 'competitors' && (
            <CompetitorsModule
              competitors={competitors}
              onAddCompetitor={(c) => setCompetitors((prev) => [c, ...prev])}
              onRemoveCompetitor={(id) => {
                setCompetitors((prev) => prev.filter((c) => c.id !== id));
                showToast('Rakip kanal listeden çıkarıldı.', 'info');
              }}
              onAdaptIdea={handleRouteToOptimize}
              onToast={showToast}
            />
          )}

          {activeModule === 'coach' && (
            <AiCoachModule
              channel={channel}
              niche={niche || channel?.title || 'Genel'}
              onCopy={copyToClipboard}
              onToast={showToast}
            />
          )}

          {activeModule === 'thumbnails' && (
            <ThumbnailsModule
              channel={channel}
              initialTitle={contentTopic}
              onToast={showToast}
            />
          )}
        </main>
      </div>

      <SavedIdeasDrawer
        isOpen={savedDrawerOpen}
        onClose={() => setSavedDrawerOpen(false)}
        savedIdeas={savedIdeas}
        onRemove={handleRemoveSavedIdea}
        onConvertToScript={handleRouteToOptimize}
      />

      <ToastContainer toasts={toasts} />
    </div>
  );
}
