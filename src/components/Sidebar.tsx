import React from 'react';
import {
  Home,
  BarChart2,
  Sliders,
  MessageSquare,
  KeyRound,
  Flame,
  TrendingUp,
  Users,
  Image as ImageIcon,
  Bookmark,
  LogOut,
  X,
} from 'lucide-react';
import type { ConnectedChannelData, ModuleId } from '../types';
import type { AuthUserProfile } from '../lib/firebaseAuth';
import { GoogleSignInButton } from './GoogleSignInButton';

interface SidebarProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  savedCount: number;
  onOpenSaved: () => void;
  authUser: AuthUserProfile | null;
  channel: ConnectedChannelData | null;
  isLoggingIn: boolean;
  onGoogleLogin: () => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenLegal: (page: 'privacy' | 'terms') => void;
}

const NAV_ITEMS: Array<{
  id: ModuleId;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'home', label: 'Ana Sayfa', icon: Home },
  { id: 'video-audit', label: 'Video Analizi', icon: BarChart2 },
  { id: 'daily-ideas', label: 'Günlük Fikirler', icon: Flame },
  { id: 'keywords', label: 'Anahtar Kelimeler', icon: KeyRound },
  { id: 'optimize', label: 'Optimize Et', icon: Sliders },
  { id: 'outliers', label: 'Outliers', icon: TrendingUp },
  { id: 'competitors', label: 'Rakipler', icon: Users },
  { id: 'thumbnails', label: 'Thumbnail Önizleme', icon: ImageIcon },
  { id: 'coach', label: 'AI Koç', icon: MessageSquare },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  savedCount,
  onOpenSaved,
  authUser,
  channel,
  isLoggingIn,
  onGoogleLogin,
  onLogout,
  mobileOpen,
  onCloseMobile,
  onOpenLegal,
}) => {
  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#0F131C] border-r border-white/[0.08]">
      <div className="flex-1 overflow-y-auto">
        {/* VidPro Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/[0.08] px-5">
          <button
            type="button"
            onClick={() => {
              onSelectModule('home');
              onCloseMobile();
            }}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <img
              src="/src/assets/images/vidpro_logo_1795622870800.jpg"
              alt="VidPro Logo"
              className="h-8 w-8 rounded-lg object-cover border border-white/10"
            />
            <span className="font-display text-lg font-extrabold tracking-tight text-white whitespace-nowrap">
              Vid<span className="text-[#38BDF8]">Pro</span>
            </span>
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Menüyü kapat"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white lg:hidden cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="p-3 space-y-1" aria-label="Ana Menü">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectModule(item.id);
                  onCloseMobile();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-[13.5px] transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#2563EB]/20 text-white font-semibold'
                    : 'text-slate-400 font-medium hover:bg-white/[0.04] hover:text-slate-100'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? 'text-[#38BDF8]' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Saved & Channel Account */}
      <div className="border-t border-white/[0.08] p-3 space-y-2.5">
        <button
          type="button"
          onClick={() => {
            onOpenSaved();
            onCloseMobile();
          }}
          className="flex w-full items-center justify-between rounded-lg border border-white/[0.08] bg-[#131722] px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-white/20 hover:text-white cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Bookmark className="h-3.5 w-3.5 text-[#38BDF8]" />
            <span>Kaydedilen Fikirler</span>
          </span>
          <span className="font-mono-tabular text-slate-400">{savedCount}</span>
        </button>

        {channel ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-[#131722] p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {channel.thumbnailUrl && (
                <img
                  src={channel.thumbnailUrl}
                  alt={channel.title}
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full object-cover shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{channel.title}</p>
                <p className="truncate font-mono-tabular text-[11px] text-[#10B981]">
                  {channel.hiddenSubscriberCount
                    ? 'Gizli Abone'
                    : `${channel.subscriberCount.toLocaleString('tr-TR')} abone`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Çıkış yap"
              aria-label="Çıkış yap"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.06] hover:text-rose-400 shrink-0 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : authUser ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-[#131722] p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {authUser.photoURL && (
                <img
                  src={authUser.photoURL}
                  alt={authUser.displayName || 'Kullanıcı'}
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full object-cover shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {authUser.displayName || 'Google Hesabı'}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {authUser.email || 'Oturum açık'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Çıkış yap"
              aria-label="Çıkış yap"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.06] hover:text-rose-400 shrink-0 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <GoogleSignInButton
              onClick={onGoogleLogin}
              loading={isLoggingIn}
              label="Google ile Giriş Yap"
              compact
            />
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-slate-500">
          <a
            href="/privacy"
            onClick={(e) => {
              e.preventDefault();
              onOpenLegal('privacy');
              onCloseMobile();
            }}
            className="hover:text-slate-300 transition-colors"
          >
            Gizlilik Politikası
          </a>
          <span>·</span>
          <a
            href="/terms"
            onClick={(e) => {
              e.preventDefault();
              onOpenLegal('terms');
              onCloseMobile();
            }}
            className="hover:text-slate-300 transition-colors"
          >
            Hizmet Şartları
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-[244px]">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-[256px] max-w-[85vw]">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
