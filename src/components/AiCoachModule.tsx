import React, { useRef, useState } from 'react';
import { Send, Bot, User, Sparkles, Copy } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { CoachMessage, ConnectedChannelData } from '../types';

interface AiCoachModuleProps {
  channel: ConnectedChannelData | null;
  niche: string;
  onCopy: (text: string, label?: string) => void;
  onToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const COACH_PROMPTS = [
  'Kanalım için 30 günlük büyüme planı çıkar',
  'İlk 30 saniyede izleyici kaybını nasıl azaltırım?',
  'Düşük CTR alan videolarımın başlığını nasıl iyileştiririm?',
  'Shorts videolarından ana kanala nasıl abone çekerim?',
];

export const AiCoachModule: React.FC<AiCoachModuleProps> = ({
  channel,
  niche,
  onCopy,
  onToast,
}) => {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      timestamp: 'Şimdi',
      content: channel
        ? `Merhaba ${channel.title}! Gerçek kanal verilerinizi (${channel.subscriberCount.toLocaleString('tr-TR')} abone, ${channel.viewCount.toLocaleString('tr-TR')} toplam izlenme) incelemeye hazırım. Kanalınızı büyütmek için ne üzerinde çalışalım?`
        : `Merhaba! Ben YouTube Growth AI Koçunuz. Google hesabınızla kanalınızı bağlayabilir veya doğrudan nişiniz hakkında soru sorarak büyüme stratejisi alabilirsiniz.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMessage = async (promptText: string) => {
    const clean = promptText.trim();
    if (!clean || isTyping) return;

    const userMsg: CoachMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: clean,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsTyping(true);

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    const channelSummary = channel
      ? `Kanal Adı: ${channel.title}
Abone Sayısı: ${channel.subscriberCount}
Toplam İzlenme: ${channel.viewCount}
Video Sayısı: ${channel.videoCount}
Son Videolar: ${channel.recentVideos
          .slice(0, 5)
          .map((v) => `${v.title} (${v.viewCount} izlenme)`)
          .join(' | ')}`
      : '';

    try {
      const data = await apiFetch<{ reply: string }>('/api/ai/coach', {
        method: 'POST',
        body: JSON.stringify({
          message: clean,
          niche,
          channelSummary,
          history: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      onToast(msg, 'error');
    } finally {
      setIsTyping(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[540px] flex-col rounded-xl border border-white/[0.08] bg-[#161922] overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-white">
              YouTube AI Büyüme Koçu
            </h2>
            <p className="text-xs text-slate-400">
              {channel
                ? `Bağlı Kanal: ${channel.title} (${channel.subscriberCount.toLocaleString('tr-TR')} abone)`
                : `Aktif Niş: ${niche} · Canlı Gemini Stratejisti`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/25">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#3B82F6] text-white'
                    : 'border border-white/[0.08] bg-[#0B0F19] text-slate-200'
                }`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>
                <div className="mt-2 flex items-center justify-between gap-4 text-[11px] opacity-70">
                  <span className="font-mono-tabular">{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => onCopy(msg.content, 'AI Koç tavsiyesi')}
                      className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Kopyala</span>
                    </button>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-200">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6]/15 text-[#3B82F6]">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0F19] px-4 py-3 text-xs text-slate-400">
              Kanal stratejisi hazırlanıyor...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/[0.08] bg-[#0B0F19]/60 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {COACH_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => sendMessage(q)}
              className="rounded-md border border-white/[0.08] bg-[#161922] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-[#3B82F6]/50 hover:text-white cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="AI Koça strateji, başlık veya algoritma sorusu sorun..."
            className="h-11 flex-1 rounded-lg border border-white/[0.1] bg-[#0B0F19] px-4 text-sm text-white placeholder-slate-500 focus:border-[#3B82F6] focus:outline-none"
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#3B82F6] px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Gönder</span>
          </button>
        </form>
      </div>
    </div>
  );
};
