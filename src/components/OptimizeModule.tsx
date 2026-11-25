import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Wand2, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { CircularGauge } from './CircularGauge';
import { apiFetch } from '../lib/api';
import type { ConnectedChannelData, GeneratedContentResult } from '../types';

interface OptimizeModuleProps {
  channel: ConnectedChannelData | null;
  topic: string;
  onTopicChange: (topic: string) => void;
  content: GeneratedContentResult | null;
  onContentUpdate: (content: GeneratedContentResult) => void;
  autoTriggerKey: number;
  onCopy: (text: string, label?: string) => void;
  onToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const TONE_OPTIONS = [
  'Merak Uyandırıcı & Stratejik',
  'Eğitici & Net Rehber',
  'Yüksek Enerjili & Meydan Okuma',
  'Analitik & Belgesel',
];

export const OptimizeModule: React.FC<OptimizeModuleProps> = ({
  channel,
  topic,
  onTopicChange,
  content,
  onContentUpdate,
  autoTriggerKey,
  onCopy,
  onToast,
}) => {
  const [tone, setTone] = useState(TONE_OPTIONS[0]);
  const [editableTitle, setEditableTitle] = useState(content?.titles[0]?.title || topic);
  const [editableDescription, setEditableDescription] = useState(content?.description || '');
  const [editableTags, setEditableTags] = useState<string[]>(content?.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (content) {
      setEditableTitle(content.titles[0]?.title || content.topic);
      setEditableDescription(content.description);
      setEditableTags(content.tags);
    }
  }, [content]);

  const handleCopyLocal = (id: string, text: string, label?: string) => {
    onCopy(text, label);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1500);
  };

  const generateContent = async (targetTopic: string, targetTone: string) => {
    const clean = targetTopic.trim();
    if (!clean) {
      onToast('Lütfen bir video konusu veya başlık fikri yazın.', 'error');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const data = await apiFetch<GeneratedContentResult>('/api/ai/generate-content', {
        method: 'POST',
        body: JSON.stringify({ topic: clean, tone: targetTone }),
      });
      onContentUpdate(data);
      onToast('Canlı AI optimizasyon paketi oluşturuldu.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setErrorMsg(message);
      onToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (autoTriggerKey > 0 && topic.trim()) {
      generateContent(topic, tone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTriggerKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateContent(topic, tone);
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTagInput.trim().toLowerCase();
    if (!clean) return;
    if (!editableTags.includes(clean)) {
      setEditableTags((prev) => [...prev, clean]);
    }
    setNewTagInput('');
  };

  const seoChecks = useMemo(() => {
    const titleLen = editableTitle.trim().length;
    const descLen = editableDescription.trim().length;
    const tagCount = editableTags.length;
    const hasTimestamps = /\b\d{1,2}:\d{2}\b/.test(editableDescription);
    const firstTwoLines = editableDescription.split('\n').slice(0, 2).join(' ').trim();
    const hasStrongFirstLines = firstTwoLines.length >= 60;
    const hasPowerWord = /(\d+|nasıl|neden|gizli|gerçek|2026|ücretsiz|rehber|hata|kritik|en iyi)/i.test(
      editableTitle
    );

    const checks = [
      {
        label: `Başlık uzunluğu ideal aralıkta (${titleLen}/70 karakter)`,
        passed: titleLen >= 25 && titleLen <= 72,
        points: 20,
      },
      {
        label: 'Başlıkta dikkat çekici tetikleyici kelime veya rakam var',
        passed: hasPowerWord,
        points: 15,
      },
      {
        label: 'Açıklamanın ilk 2 satırı arama önizlemesi için dolu',
        passed: hasStrongFirstLines,
        points: 20,
      },
      {
        label: `Açıklama uzunluğu SEO uyumlu (${descLen} karakter)`,
        passed: descLen >= 250,
        points: 15,
      },
      {
        label: 'Videoda zaman damgaları (00:00 bölümleri) mevcut',
        passed: hasTimestamps,
        points: 15,
      },
      {
        label: `Yeterli etiket sayısı (${tagCount}/15 etiket)`,
        passed: tagCount >= 10,
        points: 15,
      },
    ];

    const score = checks.reduce((acc, c) => acc + (c.passed ? c.points : 0), 0);
    return { checks, score };
  }, [editableTitle, editableDescription, editableTags]);

  const scoreColor =
    seoChecks.score >= 75 ? '#10B981' : seoChecks.score >= 50 ? '#F59E0B' : '#EF4444';
  const scoreLabel =
    seoChecks.score >= 75
      ? 'Yayınlamaya Hazır'
      : seoChecks.score >= 50
        ? 'İyileştirilebilir'
        : 'Eksik SEO';

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#161922] p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Video Optimizasyonu ve AI İçerik Üretici
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Video konunuzu yazın veya kanalınızdaki bir videoyu seçin; tek tıkla 5 CTR başlık, SEO açıklaması, 15 etiket ve 30 saniyelik kanca metni üretin.
          </p>
        </div>

        {channel && channel.recentVideos.length > 0 && (
          <div className="mt-4">
            <label htmlFor="channel-video-pick" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Bağlı Kanalınızdaki Bir Videoyu Seçip Optimize Edin
            </label>
            <select
              id="channel-video-pick"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  onTopicChange(e.target.value);
                  setEditableTitle(e.target.value);
                }
              }}
              className="h-10 w-full rounded-lg border border-white/[0.1] bg-[#0B0F19] px-3 text-xs font-medium text-slate-200 focus:border-[#3B82F6] focus:outline-none"
            >
              <option value="">-- Kanalınızdan bir video seçin --</option>
              {channel.recentVideos.map((v) => (
                <option key={v.id} value={v.title}>
                  {v.title} ({v.viewCount.toLocaleString('tr-TR')} izlenme)
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={topic}
              onChange={(e) => onTopicChange(e.target.value)}
              placeholder="Video konusunu yazın (örn: Minecraft 100 Gün İmkansız Modda Hayatta Kalma)"
              className="h-11 flex-1 rounded-lg border border-white/[0.1] bg-[#0B0F19] px-4 text-sm text-white placeholder-slate-500 focus:border-[#3B82F6] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Wand2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Optimize Ediliyor...' : 'AI ile Tam Paket Üret'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400 mr-1">Anlatım Tonu:</span>
            {TONE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setTone(opt)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tone === opt
                    ? 'bg-[#3B82F6] text-white'
                    : 'border border-white/[0.08] bg-[#0B0F19] text-slate-300 hover:border-white/20 hover:text-white'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </form>
      </section>

      {errorMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <p>{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4 space-y-6">
          <CircularGauge
            label="Canlı SEO Skoru"
            value={seoChecks.score}
            subLabel={scoreLabel}
            color={scoreColor}
            size={144}
          />

          <section className="rounded-xl border border-white/[0.08] bg-[#161922] p-5">
            <h3 className="font-display text-sm font-bold text-white pb-3 border-b border-white/[0.08]">
              SEO Kontrol Listesi
            </h3>
            <ul className="mt-3 space-y-2.5">
              {seoChecks.checks.map((chk, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs">
                  {chk.passed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  )}
                  <span className={chk.passed ? 'text-slate-200' : 'text-amber-200'}>
                    {chk.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="xl:col-span-8 space-y-6">
          <section className="rounded-xl border border-white/[0.08] bg-[#161922] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">
                Video Başlığı ve Açıklama Editörü
              </h3>
              <button
                type="button"
                onClick={() => handleCopyLocal('active-title', editableTitle, 'Video başlığı')}
                disabled={!editableTitle}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#0B0F19] px-2.5 text-xs font-medium text-slate-200 hover:text-white disabled:opacity-50 cursor-pointer"
              >
                {copiedId === 'active-title' ? (
                  <Check className="h-3.5 w-3.5 text-[#10B981]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>Başlığı Kopyala</span>
              </button>
            </div>

            <input
              type="text"
              value={editableTitle}
              onChange={(e) => setEditableTitle(e.target.value)}
              placeholder="Video başlığınızı buraya yazın veya AI ile üretin..."
              className="h-11 w-full rounded-lg border border-white/[0.1] bg-[#0B0F19] px-4 text-sm font-semibold text-white placeholder-slate-500 focus:border-[#3B82F6] focus:outline-none"
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="seo-desc-editor" className="text-xs font-semibold text-slate-300">
                  SEO Uyumlu Video Açıklaması
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyLocal('desc-all', editableDescription, 'Video açıklaması')
                  }
                  disabled={!editableDescription}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#0B0F19] px-2.5 text-xs font-medium text-slate-200 hover:text-white disabled:opacity-50 cursor-pointer"
                >
                  {copiedId === 'desc-all' ? (
                    <Check className="h-3.5 w-3.5 text-[#10B981]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>Açıklamayı Kopyala</span>
                </button>
              </div>
              <textarea
                id="seo-desc-editor"
                rows={7}
                value={editableDescription}
                onChange={(e) => setEditableDescription(e.target.value)}
                placeholder="AI ile tam paket ürettiğinizde SEO uyumlu video açıklamanız burada görünür..."
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0F19] p-3.5 text-sm leading-relaxed text-slate-200 placeholder-slate-500 focus:border-[#3B82F6] focus:outline-none"
              />
            </div>
          </section>

          {content && (
            <section className="rounded-xl border border-white/[0.08] bg-[#161922] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    Yüksek Tıklanma Oranı (CTR) Odaklı 5 Başlık
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Editöre uygulamak için başlığa tıklayın
                  </p>
                </div>
                <span className="font-mono-tabular text-xs font-semibold text-[#10B981]">
                  Tahmini CTR
                </span>
              </div>

              <div className="mt-4 divide-y divide-white/[0.06]">
                {content.titles.map((item, idx) => {
                  const copyKey = `title-${idx}`;
                  const isCopied = copiedId === copyKey;
                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-mono-tabular text-slate-500">0{idx + 1}.</span>
                          <span>{item.angle}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditableTitle(item.title);
                            onToast('Başlık aktif editöre uygulandı.', 'info');
                          }}
                          className="mt-1 text-left text-sm font-semibold text-white hover:text-[#3B82F6] transition-colors cursor-pointer"
                        >
                          {item.title}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center rounded-md border border-[#10B981]/25 bg-[#10B981]/10 px-2.5 py-1 font-mono-tabular text-xs font-bold text-[#10B981]">
                          %{item.ctrScore.toFixed(1)} CTR
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyLocal(copyKey, item.title, 'Video başlığı')}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#0B0F19] px-3 text-xs font-medium text-slate-200 hover:border-white/20 hover:text-white cursor-pointer"
                        >
                          {isCopied ? (
                            <Check className="h-3.5 w-3.5 text-[#10B981]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span>{isCopied ? 'Kopyalandı' : 'Kopyala'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="rounded-xl border border-white/[0.08] bg-[#161922] p-5 sm:p-6 xl:col-span-5">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Video Etiketleri ({editableTags.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tıklayarak kopyalayın veya yeni etiket ekleyin
              </p>
            </div>
            <button
              type="button"
              disabled={editableTags.length === 0}
              onClick={() =>
                handleCopyLocal('tags-all', editableTags.join(', '), 'Video etiketleri')
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedId === 'tags-all' ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>Tümünü Kopyala</span>
            </button>
          </div>

          <form onSubmit={handleAddTag} className="mt-4 flex gap-2">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              placeholder="Yeni etiket ekle..."
              className="h-9 flex-1 rounded-lg border border-white/[0.1] bg-[#0B0F19] px-3 text-xs text-white placeholder-slate-500 focus:border-[#3B82F6] focus:outline-none"
            />
            <button
              type="submit"
              className="h-9 rounded-lg border border-white/[0.1] bg-[#0B0F19] px-3 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
            >
              Ekle
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {editableTags.length === 0 ? (
              <p className="text-xs text-slate-500">
                Henüz etiket yok. AI ile tam paket üreterek 15 yüksek hacimli etiket oluşturabilirsiniz.
              </p>
            ) : (
              editableTags.map((tag, idx) => (
                <div
                  key={`${tag}-${idx}`}
                  className="inline-flex items-center rounded-md border border-white/[0.08] bg-[#0B0F19] text-xs font-medium text-slate-200"
                >
                  <button
                    type="button"
                    onClick={() => handleCopyLocal(`tag-${idx}`, tag, `"${tag}" etiketi`)}
                    className="px-2.5 py-1.5 hover:text-white cursor-pointer"
                  >
                    {tag}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditableTags((prev) => prev.filter((_, i) => i !== idx))
                    }
                    aria-label={`${tag} etiketini kaldır`}
                    className="border-l border-white/[0.08] px-2 py-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-[#161922] p-5 sm:p-6 xl:col-span-7">
          <div className="flex flex-col gap-2 pb-4 border-b border-white/[0.08] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-white">
                İlk 30 Saniye İzleyiciyi Tutma Kancası (Hook)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                İlk 30 saniyedeki düşüşü azaltan saniye bazlı açılış senaryosu
              </p>
            </div>
            {content && (
              <button
                type="button"
                onClick={() =>
                  handleCopyLocal(
                    'hook-all',
                    content.hookBeats
                      .map((b) => `[${b.timeframe} - ${b.label}]\n${b.script}`)
                      .join('\n\n'),
                    '30 saniyelik kanca metni'
                  )
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#0B0F19] px-3 text-xs font-medium text-slate-200 hover:border-white/20 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedId === 'hook-all' ? (
                  <Check className="h-3.5 w-3.5 text-[#10B981]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>Kancayı Kopyala</span>
              </button>
            )}
          </div>

          {!content ? (
            <div className="py-10 text-center text-xs text-slate-500">
              AI ile tam paket ürettiğinizde ilk 30 saniyelik açılış kancası burada oluşturulur.
            </div>
          ) : (
            <div className="mt-4 divide-y divide-white/[0.06]">
              {content.hookBeats.map((beat, idx) => (
                <div key={idx} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 py-0.5 font-mono-tabular text-xs font-semibold text-[#3B82F6]">
                      <Clock className="h-3 w-3" />
                      {beat.timeframe}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">{beat.label}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">{beat.script}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
