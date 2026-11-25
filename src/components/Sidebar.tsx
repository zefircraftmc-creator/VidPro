import React from 'react';
import {
  Home,
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
import { GoogleSignInButton } from './GoogleSignInButton';

interface SidebarProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  savedCount: number;
  onOpenSaved: () => void;
  channel: ConnectedChannelData | null;
  isLoggingIn: boolean;
  onGoogleLogin: () => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: ModuleId;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'home', label: 'Ana Sayfa & Kanal', icon: Home },
  { id: 'daily-ideas', label: 'Günlük Fikirler', icon: Flame },
  { id: 'keywords', label: 'Anahtar Kelimeler', icon: KeyRound },
  { id: 'optimize', label: 'Optimize Et', icon: Sliders },
  { id: 'outliers', label: 'Outliers', icon: TrendingUp },
  { id: 'competitors', label: 'Rakipler', icon: Users },
  { id: 'coach', label: 'AI Koç', icon: MessageSquare },
  { id: 'thumbnails', label: 'Thumbnail Önizleme', icon: ImageIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  savedCount,
  onOpenSaved,
  channel,
  isLoggingIn,
  onGoogleLogin,
  onLogout,
  mobileOpen,
  onCloseMobile,
}) => {
  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#11141D] border-r border-white/[0.08]">
      <div className="flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/[0.08] px-5">
          <button
            type="button"
            onClick={() => {
              onSelectModule('home');
              onCloseMobile();
            }}
            className="font-display text-base font-extrabold tracking-tight text-white whitespace-nowrap cursor-pointer"
          >
            YouTube Growth Studio
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
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#3B82F6] text-white font-semibold'
                    : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Account & Saved Ideas */}
      <div className="border-t border-white/[0.08] p-3 space-y-2.5">
        <button
          type="button"
          onClick={() => {
            onOpenSaved();
            onCloseMobile();
          }}
          className="flex w-full items-center justify-between rounded-lg border border-white/[0.08] bg-[#0B0F19] px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-white/20 hover:text-white cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Bookmark className="h-3.5 w-3.5 text-[#3B82F6]" />
            <span>Kaydedilen Fikirler</span>
          </span>
          <span className="font-mono-tabular text-slate-400">{savedCount}</span>
        </button>

        {channel ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-[#0B0F19] p-2.5">
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
        ) : (
          <div className="flex justify-center">
            <GoogleSignInButton
              onClick={onGoogleLogin}
              loading={isLoggingIn}
              label="Kanalını Bağla"
              compact
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-[256px]">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-[264px] max-w-[85vw]">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
