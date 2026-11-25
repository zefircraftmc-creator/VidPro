import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '2mb' }));

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getYoutubeApiKey(): string | null {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || key === 'MY_YOUTUBE_DATA_API_V3_KEY') {
    return null;
  }
  return key;
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token || null;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>
) {
  const modelsToTry = ['gemini-4-hydrogen', 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  let lastError: unknown;

  for (let i = 0; i < modelsToTry.length; i++) {
    try {
      return await ai.models.generateContent({
        ...params,
        model: modelsToTry[i],
      });
    } catch (err) {
      lastError = err;
      const msg = extractErrorMessage(err);
      const isTransient503 = msg.includes('503') || msg.includes('UNAVAILABLE');
      if (!isTransient503 || i === modelsToTry.length - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * (i + 1)));
    }
  }

  throw lastError;
}

function formatIsoDuration(iso: string): string {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
  if (!match) return '0:00';
  const h = Number(match[1] || 0);
  const m = Number(match[2] || 0);
  const s = Number(match[3] || 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function getDurationSeconds(iso: string): number {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

async function fetchYoutubeJson(url: URL, bearerToken: string | null, apiKey: string | null) {
  const headers: Record<string, string> = {};
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  } else if (apiKey) {
    url.searchParams.set('key', apiKey);
  } else {
    throw new Error(
      'YouTube verisi için Google ile giriş yapın veya Secrets panelinden YOUTUBE_API_KEY tanımlayın.'
    );
  }

  const res = await fetch(url.toString(), { headers });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`YouTube API geçersiz yanıt döndürdü (HTTP ${res.status}).`);
  }

  if (!res.ok) {
    const apiErr = (json as { error?: { message?: string } }).error?.message || text;
    throw new Error(`YouTube API hatası (${res.status}): ${apiErr}`);
  }
  return json;
}

app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    geminiReady: Boolean(getGeminiClient()),
    youtubeReady: Boolean(getYoutubeApiKey()),
  });
});

// Connected User's Real YouTube Channel + 28-Day YouTube Analytics
app.get('/api/youtube/my-channel', async (req: Request, res: Response) => {
  const bearerToken = getBearerToken(req);
  if (!bearerToken) {
    res.status(401).json({
      error: 'Kanal verilerinizi görmek için Google hesabınızla giriş yapıp YouTube izni vermelisiniz.',
    });
    return;
  }

  try {
    const channelUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
    channelUrl.searchParams.set('part', 'snippet,statistics,contentDetails');
    channelUrl.searchParams.set('mine', 'true');

    const channelData = (await fetchYoutubeJson(channelUrl, bearerToken, null)) as {
      items?: Array<{
        id: string;
        snippet?: {
          title?: string;
          customUrl?: string;
          description?: string;
          thumbnails?: { high?: { url?: string }; default?: { url?: string } };
        };
        statistics?: {
          subscriberCount?: string;
          hiddenSubscriberCount?: boolean;
          viewCount?: string;
          videoCount?: string;
        };
        contentDetails?: {
          relatedPlaylists?: { uploads?: string };
        };
      }>;
    };

    const ch = channelData.items?.[0];
    if (!ch) {
      res.status(404).json({
        error: 'Bu Google hesabına bağlı bir YouTube kanalı bulunamadı.',
      });
      return;
    }

    const uploadsPlaylistId = ch.contentDetails?.relatedPlaylists?.uploads;
    let recentVideos: Array<{
      id: string;
      title: string;
      publishedAt: string;
      viewCount: number;
      likeCount: number;
      commentCount: number;
      duration: string;
      thumbnailUrl: string;
      url: string;
    }> = [];

    if (uploadsPlaylistId) {
      const plUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      plUrl.searchParams.set('part', 'contentDetails');
      plUrl.searchParams.set('playlistId', uploadsPlaylistId);
      plUrl.searchParams.set('maxResults', '12');

      const plData = (await fetchYoutubeJson(plUrl, bearerToken, null)) as {
        items?: Array<{ contentDetails?: { videoId?: string } }>;
      };

      const videoIds = (plData.items ?? [])
        .map((i) => i.contentDetails?.videoId)
        .filter((id): id is string => Boolean(id));

      if (videoIds.length > 0) {
        const vUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        vUrl.searchParams.set('part', 'snippet,statistics,contentDetails');
        vUrl.searchParams.set('id', videoIds.join(','));
        const vData = (await fetchYoutubeJson(vUrl, bearerToken, null)) as {
          items?: Array<{
            id: string;
            snippet?: {
              title?: string;
              publishedAt?: string;
              thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
            };
            statistics?: {
              viewCount?: string;
              likeCount?: string;
              commentCount?: string;
            };
            contentDetails?: { duration?: string };
          }>;
        };

        recentVideos = (vData.items ?? []).map((v) => ({
          id: v.id,
          title: v.snippet?.title ?? 'Başlıksız Video',
          publishedAt: v.snippet?.publishedAt ?? '',
          viewCount: Number(v.statistics?.viewCount ?? 0),
          likeCount: Number(v.statistics?.likeCount ?? 0),
          commentCount: Number(v.statistics?.commentCount ?? 0),
          duration: formatIsoDuration(v.contentDetails?.duration ?? ''),
          thumbnailUrl:
            v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || '',
          url: `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`,
        }));
      }
    }

    // Fetch 28-day YouTube Analytics
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 28 * 86400 * 1000);
    const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

    let analytics28d: {
      available: boolean;
      errorReason?: string;
      totalViews: number;
      netSubscribers: number;
      watchHours: number;
      avgViewDurationSec: number;
      dailySeries: Array<{
        date: string;
        views: number;
        subscribersGained: number;
        subscribersLost: number;
        estimatedMinutesWatched: number;
      }>;
    } = {
      available: false,
      totalViews: 0,
      netSubscribers: 0,
      watchHours: 0,
      avgViewDurationSec: 0,
      dailySeries: [],
    };

    try {
      const yaUrl = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
      yaUrl.searchParams.set('ids', 'channel==MINE');
      yaUrl.searchParams.set('startDate', fmtDate(startDate));
      yaUrl.searchParams.set('endDate', fmtDate(endDate));
      yaUrl.searchParams.set(
        'metrics',
        'views,subscribersGained,subscribersLost,estimatedMinutesWatched,averageViewDuration'
      );
      yaUrl.searchParams.set('dimensions', 'day');
      yaUrl.searchParams.set('sort', 'day');

      const yaRes = await fetch(yaUrl.toString(), {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });

      if (yaRes.ok) {
        const yaJson = (await yaRes.json()) as {
          rows?: Array<[string, number, number, number, number, number]>;
        };
        const rows = yaJson.rows ?? [];
        let totalViews = 0;
        let gained = 0;
        let lost = 0;
        let totalMinutes = 0;
        let avgDurSum = 0;

        const dailySeries = rows.map((r) => {
          const [day, views, subG, subL, mins, avgDur] = r;
          totalViews += Number(views || 0);
          gained += Number(subG || 0);
          lost += Number(subL || 0);
          totalMinutes += Number(mins || 0);
          avgDurSum += Number(avgDur || 0);
          return {
            date: day,
            views: Number(views || 0),
            subscribersGained: Number(subG || 0),
            subscribersLost: Number(subL || 0),
            estimatedMinutesWatched: Number(mins || 0),
          };
        });

        analytics28d = {
          available: true,
          totalViews,
          netSubscribers: gained - lost,
          watchHours: Math.round(totalMinutes / 60),
          avgViewDurationSec: rows.length > 0 ? Math.round(avgDurSum / rows.length) : 0,
          dailySeries,
        };
      } else {
        const errText = await yaRes.text();
        analytics28d.errorReason = `YouTube Analytics API henüz etkin değil veya veri yok (${yaRes.status}): ${errText.slice(0, 140)}`;
      }
    } catch (yaErr) {
      analytics28d.errorReason = extractErrorMessage(yaErr);
    }

    res.json({
      channelId: ch.id,
      connectionMode: 'oauth',
      title: ch.snippet?.title ?? 'YouTube Kanalı',
      customUrl: ch.snippet?.customUrl ?? '',
      description: ch.snippet?.description ?? '',
      thumbnailUrl:
        ch.snippet?.thumbnails?.high?.url || ch.snippet?.thumbnails?.default?.url || '',
      subscriberCount: Number(ch.statistics?.subscriberCount ?? 0),
      hiddenSubscriberCount: Boolean(ch.statistics?.hiddenSubscriberCount),
      viewCount: Number(ch.statistics?.viewCount ?? 0),
      videoCount: Number(ch.statistics?.videoCount ?? 0),
      recentVideos,
      analytics28d,
    });
  } catch (err) {
    console.error('YouTube /api/youtube/my-channel error:', err);
    res.status(502).json({ error: extractErrorMessage(err) });
  }
});

// Public YouTube Channel Loader (via @handle, channel URL, UC... ID, or channel name)
app.get('/api/youtube/public-channel', async (req: Request, res: Response) => {
  const bearerToken = getBearerToken(req);
  const ytKey = getYoutubeApiKey();
  const rawQuery = String(req.query.q ?? '').trim();

  if (!rawQuery) {
    res.status(400).json({ error: 'Lütfen kanal @handle adını, kanal linkini veya kanal adını girin.' });
    return;
  }
  if (!bearerToken && !ytKey) {
    res.status(401).json({
      error: 'YouTube kanal verisi için Google ile giriş yapın veya Secrets panelinden YOUTUBE_API_KEY tanımlayın.',
    });
    return;
  }

  try {
    let normalized = rawQuery;
    // Extract @handle or channel ID if user pasted a full YouTube URL
    if (normalized.includes('youtube.com/') || normalized.includes('youtu.be/')) {
      const handleMatch = /youtube\.com\/(@[A-Za-z0-9._-]+)/.exec(normalized);
      const channelIdMatch = /youtube\.com\/channel\/(UC[A-Za-z0-9_-]+)/.exec(normalized);
      if (handleMatch?.[1]) {
        normalized = handleMatch[1];
      } else if (channelIdMatch?.[1]) {
        normalized = channelIdMatch[1];
      }
    }

    let channelId = '';
    if (/^UC[A-Za-z0-9_-]{10,}$/.test(normalized)) {
      channelId = normalized;
    } else if (normalized.startsWith('@')) {
      const handleUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
      handleUrl.searchParams.set('part', 'id');
      handleUrl.searchParams.set('forHandle', normalized);
      const hData = (await fetchYoutubeJson(handleUrl, bearerToken, ytKey)) as {
        items?: Array<{ id: string }>;
      };
      channelId = hData.items?.[0]?.id ?? '';
    }

    if (!channelId) {
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('q', normalized);
      searchUrl.searchParams.set('type', 'channel');
      searchUrl.searchParams.set('maxResults', '1');
      const sData = (await fetchYoutubeJson(searchUrl, bearerToken, ytKey)) as {
        items?: Array<{ id?: { channelId?: string } }>;
      };
      channelId = sData.items?.[0]?.id?.channelId ?? '';
    }

    if (!channelId) {
      res.status(404).json({ error: `"${rawQuery}" ile eşleşen bir YouTube kanalı bulunamadı.` });
      return;
    }

    const chUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
    chUrl.searchParams.set('part', 'snippet,statistics,contentDetails');
    chUrl.searchParams.set('id', channelId);
    const chData = (await fetchYoutubeJson(chUrl, bearerToken, ytKey)) as {
      items?: Array<{
        id: string;
        snippet?: {
          title?: string;
          customUrl?: string;
          description?: string;
          thumbnails?: { high?: { url?: string }; default?: { url?: string } };
        };
        statistics?: {
          subscriberCount?: string;
          hiddenSubscriberCount?: boolean;
          viewCount?: string;
          videoCount?: string;
        };
        contentDetails?: {
          relatedPlaylists?: { uploads?: string };
        };
      }>;
    };

    const ch = chData.items?.[0];
    if (!ch) {
      res.status(404).json({ error: 'YouTube kanal detayları alınamadı.' });
      return;
    }

    const uploadsPlaylistId = ch.contentDetails?.relatedPlaylists?.uploads;
    let recentVideos: Array<{
      id: string;
      title: string;
      publishedAt: string;
      viewCount: number;
      likeCount: number;
      commentCount: number;
      duration: string;
      thumbnailUrl: string;
      url: string;
    }> = [];

    if (uploadsPlaylistId) {
      const plUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      plUrl.searchParams.set('part', 'contentDetails');
      plUrl.searchParams.set('playlistId', uploadsPlaylistId);
      plUrl.searchParams.set('maxResults', '12');
      const plData = (await fetchYoutubeJson(plUrl, bearerToken, ytKey)) as {
        items?: Array<{ contentDetails?: { videoId?: string } }>;
      };
      const videoIds = (plData.items ?? [])
        .map((i) => i.contentDetails?.videoId)
        .filter((id): id is string => Boolean(id));

      if (videoIds.length > 0) {
        const vUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        vUrl.searchParams.set('part', 'snippet,statistics,contentDetails');
        vUrl.searchParams.set('id', videoIds.join(','));
        const vData = (await fetchYoutubeJson(vUrl, bearerToken, ytKey)) as {
          items?: Array<{
            id: string;
            snippet?: {
              title?: string;
              publishedAt?: string;
              thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
            };
            statistics?: {
              viewCount?: string;
              likeCount?: string;
              commentCount?: string;
            };
            contentDetails?: { duration?: string };
          }>;
        };
        recentVideos = (vData.items ?? []).map((v) => ({
          id: v.id,
          title: v.snippet?.title ?? 'Başlıksız Video',
          publishedAt: v.snippet?.publishedAt ?? '',
          viewCount: Number(v.statistics?.viewCount ?? 0),
          likeCount: Number(v.statistics?.likeCount ?? 0),
          commentCount: Number(v.statistics?.commentCount ?? 0),
          duration: formatIsoDuration(v.contentDetails?.duration ?? ''),
          thumbnailUrl:
            v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || '',
          url: `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`,
        }));
      }
    }

    res.json({
      channelId: ch.id,
      connectionMode: 'public',
      title: ch.snippet?.title ?? rawQuery,
      customUrl: ch.snippet?.customUrl ?? '',
      description: ch.snippet?.description ?? '',
      thumbnailUrl:
        ch.snippet?.thumbnails?.high?.url || ch.snippet?.thumbnails?.default?.url || '',
      subscriberCount: Number(ch.statistics?.subscriberCount ?? 0),
      hiddenSubscriberCount: Boolean(ch.statistics?.hiddenSubscriberCount),
      viewCount: Number(ch.statistics?.viewCount ?? 0),
      videoCount: Number(ch.statistics?.videoCount ?? 0),
      recentVideos,
      analytics28d: {
        available: false,
        errorReason:
          '28 günlük günlük izlenme ve abone grafiği için Google ile Giriş Yap (YouTube Analytics izni) gerekir. Açık kanal istatistikleri ve son videolarınız yukarıda canlı olarak yüklenmiştir.',
        totalViews: 0,
        netSubscribers: 0,
        watchHours: 0,
        avgViewDurationSec: 0,
        dailySeries: [],
      },
    });
  } catch (err) {
    console.error('YouTube /api/youtube/public-channel error:', err);
    res.status(502).json({ error: extractErrorMessage(err) });
  }
});

// Daily Ideas Generator (100% Real Gemini AI)
app.post('/api/ai/ideas', async (req: Request, res: Response) => {
  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error: 'GEMINI_API_KEY tanımlı değil. Lütfen AI Studio Secrets panelinden Gemini API anahtarını ekleyin.',
    });
    return;
  }

  const niche = String(req.body?.niche ?? '').trim();
  const channelContext = String(req.body?.channelContext ?? '').trim();
  if (!niche) {
    res.status(400).json({ error: 'Lütfen analiz edilecek bir kanal nişi girin.' });
    return;
  }

  try {
    const response = await generateContentWithRetry(ai, {
      contents: `Sen deneyimli bir Türkçe YouTube büyüme ve algoritma stratejistisin. "${niche}" nişinde yayın yapan bir YouTube kanalı için bugün çekilebilecek 6 adet yüksek viral potansiyelli video fikri üret.${
        channelContext ? `\nKanal Bağlamı: ${channelContext}` : ''
      }
Kurallar:
- Tüm metinler doğal, akıcı ve yüksek tıklanma odaklı Türkçe olmalı.
- Tam olarak 6 fikir üret: 2 tanesi "Çok Yüksek Potansiyel" (skor 88-98), 2 tanesi "Yüksek Potansiyel" (skor 75-87), 2 tanesi "Orta Potansiyel" (skor 60-74) olsun.
- estimatedViews alanı gerçekçi Türkçe formatta olsun (örn. "180B - 340B").
- reason alanında algoritmik olarak bu fikrin neden yüksek CTR veya izlenme süresi üreteceğini 1 net cümlede açıkla.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              potential: {
                type: Type.STRING,
                enum: ['Çok Yüksek Potansiyel', 'Yüksek Potansiyel', 'Orta Potansiyel'],
              },
              score: { type: Type.INTEGER },
              format: { type: Type.STRING },
              estimatedViews: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ['title', 'potential', 'score', 'format', 'estimatedViews', 'reason'],
          },
        },
      },
    });

    const raw = (response.text ?? '[]').trim();
    const parsed = JSON.parse(raw) as Array<{
      title: string;
      potential: 'Çok Yüksek Potansiyel' | 'Yüksek Potansiyel' | 'Orta Potansiyel';
      score: number;
      format: string;
      estimatedViews: string;
      reason: string;
    }>;

    const ideas = parsed.slice(0, 6).map((item, idx) => ({
      id: `live-${Date.now()}-${idx}`,
      niche,
      title: item.title,
      potential: item.potential,
      score: Math.max(0, Math.min(100, Number(item.score) || 75)),
      format: item.format,
      estimatedViews: item.estimatedViews,
      reason: item.reason,
    }));

    res.json({ ideas, source: 'gemini' });
  } catch (err) {
    console.error('Gemini /api/ai/ideas error:', err);
    res.status(502).json({
      error: `Gemini API isteği başarısız oldu: ${extractErrorMessage(err)}`,
    });
  }
});

// Keyword & Competition Inspector (Real YouTube Data API v3 + Gemini)
app.post('/api/keywords/analyze', async (req: Request, res: Response) => {
  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error: 'GEMINI_API_KEY tanımlı değil. Lütfen AI Studio Secrets panelini kontrol edin.',
    });
    return;
  }

  const keyword = String(req.body?.keyword ?? '').trim();
  if (!keyword) {
    res.status(400).json({ error: 'Lütfen analiz edilecek bir anahtar kelime girin.' });
    return;
  }

  const bearerToken = getBearerToken(req);
  const ytKey = getYoutubeApiKey();
  let ytContext = '';
  let usedYoutube = false;
  let youtubeSampleCount = 0;
  let youtubeAvgViews = 0;

  if (bearerToken || ytKey) {
    try {
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('q', keyword);
      searchUrl.searchParams.set('type', 'video');
      searchUrl.searchParams.set('regionCode', 'TR');
      searchUrl.searchParams.set('relevanceLanguage', 'tr');
      searchUrl.searchParams.set('maxResults', '10');

      const searchJson = (await fetchYoutubeJson(searchUrl, bearerToken, ytKey)) as {
        pageInfo?: { totalResults?: number };
        items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string } }>;
      };

      youtubeSampleCount = Number(searchJson.pageInfo?.totalResults ?? 0);

      const videoIds = (searchJson.items ?? [])
        .map((item) => item.id?.videoId)
        .filter((id): id is string => Boolean(id));

      if (videoIds.length > 0) {
        const statsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        statsUrl.searchParams.set('part', 'statistics');
        statsUrl.searchParams.set('id', videoIds.join(','));
        const statsJson = (await fetchYoutubeJson(statsUrl, bearerToken, ytKey)) as {
          items?: Array<{ statistics?: { viewCount?: string } }>;
        };
        const views = (statsJson.items ?? []).map((v) => Number(v.statistics?.viewCount ?? 0));
        if (views.length > 0) {
          youtubeAvgViews = Math.round(views.reduce((a, b) => a + b, 0) / views.length);
        }
      }

      const sampleTitles = (searchJson.items ?? [])
        .slice(0, 6)
        .map((i) => i.snippet?.title)
        .filter(Boolean)
        .join(' | ');

      ytContext = `\nGerçek YouTube Data API v3 Verileri:\n- Toplam tahmini sonuç: ${youtubeSampleCount}\n- İlk 10 video ortalama izlenmesi: ${youtubeAvgViews}\n- Mevcut öne çıkan başlıklar: ${sampleTitles}`;
      usedYoutube = true;
    } catch (ytErr) {
      console.warn('YouTube keyword lookup warning:', ytErr);
    }
  }

  try {
    const response = await generateContentWithRetry(ai, {
      contents: `Sen bir YouTube SEO ve anahtar kelime analiz uzmanısın (VidIQ metodolojisi). "${keyword}" anahtar kelimesi için Türkçe YouTube Türkiye pazarı analiz raporu üret.${ytContext}
Kurallar:
- searchVolumeScore: 0-100 arası arama hacmi skoru.
- monthlySearchVolume: tahmini aylık arama sayısı (tam sayı).
- competitionScore: 0-100 arası rekabet zorluğu skoru (yüksek = daha zor).
- competitionLevel: "Düşük", "Orta" veya "Yüksek".
- overallScore: 0-100 arası genel fırsat skoru (hacim yüksek + rekabet düşükse yüksek).
- summary: 2 cümlelik net stratejik değerlendirme.
- longTailKeywords: Tam olarak 10 adet ilgili uzun kuyruklu (long-tail) anahtar kelime ve yükselen trend etiketi.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            searchVolumeScore: { type: Type.INTEGER },
            monthlySearchVolume: { type: Type.INTEGER },
            competitionScore: { type: Type.INTEGER },
            competitionLevel: { type: Type.STRING, enum: ['Düşük', 'Orta', 'Yüksek'] },
            overallScore: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            longTailKeywords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  keyword: { type: Type.STRING },
                  monthlySearches: { type: Type.INTEGER },
                  competition: { type: Type.STRING, enum: ['Düşük', 'Orta', 'Yüksek'] },
                  trendChange: { type: Type.STRING },
                  opportunityScore: { type: Type.INTEGER },
                },
                required: [
                  'keyword',
                  'monthlySearches',
                  'competition',
                  'trendChange',
                  'opportunityScore',
                ],
              },
            },
          },
          required: [
            'searchVolumeScore',
            'monthlySearchVolume',
            'competitionScore',
            'competitionLevel',
            'overallScore',
            'summary',
            'longTailKeywords',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      searchVolumeScore: number;
      monthlySearchVolume: number;
      competitionScore: number;
      competitionLevel: 'Düşük' | 'Orta' | 'Yüksek';
      overallScore: number;
      summary: string;
      longTailKeywords: Array<{
        keyword: string;
        monthlySearches: number;
        competition: 'Düşük' | 'Orta' | 'Yüksek';
        trendChange: string;
        opportunityScore: number;
      }>;
    };

    res.json({
      query: keyword,
      searchVolumeScore: Math.max(0, Math.min(100, parsed.searchVolumeScore ?? 65)),
      monthlySearchVolume: Math.max(100, parsed.monthlySearchVolume ?? 15000),
      competitionScore: Math.max(0, Math.min(100, parsed.competitionScore ?? 45)),
      competitionLevel: parsed.competitionLevel ?? 'Orta',
      overallScore: Math.max(0, Math.min(100, parsed.overallScore ?? 68)),
      summary: parsed.summary ?? '',
      youtubeSampleCount: usedYoutube ? youtubeSampleCount : undefined,
      youtubeAvgViews: usedYoutube ? youtubeAvgViews : undefined,
      longTailKeywords: (parsed.longTailKeywords ?? []).slice(0, 10),
      source: usedYoutube ? 'youtube-gemini' : 'gemini',
    });
  } catch (err) {
    console.error('Gemini /api/keywords/analyze error:', err);
    res.status(502).json({
      error: `Anahtar kelime analizi başarısız oldu: ${extractErrorMessage(err)}`,
    });
  }
});

// Optimize & AI Content Generator
app.post('/api/ai/generate-content', async (req: Request, res: Response) => {
  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error: 'GEMINI_API_KEY tanımlı değil. Lütfen Secrets panelini kontrol edin.',
    });
    return;
  }

  const topic = String(req.body?.topic ?? '').trim();
  const tone = String(req.body?.tone ?? 'Merak Uyandırıcı & Stratejik').trim();
  if (!topic) {
    res.status(400).json({ error: 'Lütfen bir video konusu veya fikri girin.' });
    return;
  }

  try {
    const response = await generateContentWithRetry(ai, {
      contents: `Sen yüksek tıklanma oranı (CTR) ve izleyici elde tutma (Retention) konusunda uzman bir YouTube içerik stratejistisin.
Video Konusu: "${topic}"
İstenen Ton: "${tone}"

Aşağıdaki JSON yapısını eksiksiz Türkçe olarak üret:
1. titles: Yüksek CTR odaklı 5 farklı merak uyandırıcı başlık (title, ctrScore 6.5-9.9 arası ondalık sayı, angle).
2. description: İlk 2 satırı arama önizlemesi için dikkat çekici, SEO uyumlu, madde işaretli ve zaman damgalı (00:00...) tam YouTube açıklaması.
3. tags: Tam olarak 15 adet yüksek arama hacimli Türkçe YouTube etiketi.
4. hookBeats: İlk 30 saniye kancası, tam olarak 3 zaman dilimi ("0:00 - 0:08", "0:08 - 0:20", "0:20 - 0:30").`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  ctrScore: { type: Type.NUMBER },
                  angle: { type: Type.STRING },
                },
                required: ['title', 'ctrScore', 'angle'],
              },
            },
            description: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            hookBeats: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timeframe: { type: Type.STRING },
                  label: { type: Type.STRING },
                  script: { type: Type.STRING },
                },
                required: ['timeframe', 'label', 'script'],
              },
            },
          },
          required: ['titles', 'description', 'tags', 'hookBeats'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      titles: Array<{ title: string; ctrScore: number; angle: string }>;
      description: string;
      tags: string[];
      hookBeats: Array<{ timeframe: string; label: string; script: string }>;
    };

    res.json({
      topic,
      tone,
      titles: (parsed.titles ?? []).slice(0, 5),
      description: parsed.description ?? '',
      tags: (parsed.tags ?? []).slice(0, 15),
      hookBeats: (parsed.hookBeats ?? []).slice(0, 3),
    });
  } catch (err) {
    console.error('Gemini /api/ai/generate-content error:', err);
    res.status(502).json({
      error: `İçerik üretimi başarısız oldu: ${extractErrorMessage(err)}`,
    });
  }
});

// AI Coach Conversational Strategist
app.post('/api/ai/coach', async (req: Request, res: Response) => {
  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error: 'GEMINI_API_KEY tanımlı değil. Lütfen Secrets panelini kontrol edin.',
    });
    return;
  }

  const message = String(req.body?.message ?? '').trim();
  const niche = String(req.body?.niche ?? 'Genel').trim();
  const channelSummary = String(req.body?.channelSummary ?? '').trim();
  const history = Array.isArray(req.body?.history)
    ? (req.body.history as Array<{ role: string; content: string }>).slice(-8)
    : [];

  if (!message) {
    res.status(400).json({ error: 'Lütfen AI Koça bir soru sorun.' });
    return;
  }

  try {
    const conversationContext = history
      .map((m) => `${m.role === 'user' ? 'Kullanıcı' : 'AI Koç'}: ${m.content}`)
      .join('\n');

    const response = await generateContentWithRetry(ai, {
      contents: `${conversationContext ? `Önceki Konuşma:\n${conversationContext}\n\n` : ''}Kullanıcının Sorusu: ${message}`,
      config: {
        systemInstruction: `Sen vidIQ AI Koçu gibi çalışan kıdemli bir YouTube Büyüme ve Algoritma Stratejistisin. Kullanıcının odak nişi: "${niche}".${
          channelSummary ? `\nBağlı Gerçek Kanal Verisi:\n${channelSummary}` : ''
        }
Yanıtların daima Türkçe, uygulanabilir, net ve somut adım odaklı olmalı. Sahte rakam uydurma; sadece verilen gerçek kanal verilerine veya stratejik ilkelere dayan.`,
      },
    });

    res.json({
      reply: response.text ?? 'Yanıt üretilemedi, lütfen tekrar deneyin.',
    });
  } catch (err) {
    console.error('Gemini /api/ai/coach error:', err);
    res.status(502).json({
      error: `AI Koç yanıt veremedi: ${extractErrorMessage(err)}`,
    });
  }
});

// Thumbnail CTR Audit
app.post('/api/ai/thumbnail-audit', async (req: Request, res: Response) => {
  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error: 'GEMINI_API_KEY tanımlı değil. Lütfen Secrets panelini kontrol edin.',
    });
    return;
  }

  const title = String(req.body?.title ?? '').trim();
  const overlayText = String(req.body?.overlayText ?? '').trim();
  const visualDescription = String(req.body?.visualDescription ?? '').trim();

  if (!title) {
    res.status(400).json({ error: 'Lütfen analiz için bir video başlığı girin.' });
    return;
  }

  try {
    const response = await generateContentWithRetry(ai, {
      contents: `Sen bir YouTube Thumbnail & CTR uzmanısın. Aşağıdaki paketlemeyi analiz et:
Video Başlığı: "${title}"
Thumbnail Üstündeki Kısa Yazı: "${overlayText || 'Yok'}"
Görsel Bağlamı: "${visualDescription || 'Kullanıcı yüklemesi'}"

Türkçe JSON döndür:
- ctrPrediction: 4.0 ile 12.5 arası tahmini CTR yüzdesi (ondalık sayı)
- clarityScore: 0-100 arası görsel okunabilirlik skoru
- curiosityScore: 0-100 arası başlık+görsel merak uyumu skoru
- contrastScore: 0-100 arası dikkat çekicilik skoru
- verdict: 2 cümlelik net değerlendirme
- improvements: Tam olarak 3 somut iyileştirme önerisi`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ctrPrediction: { type: Type.NUMBER },
            clarityScore: { type: Type.INTEGER },
            curiosityScore: { type: Type.INTEGER },
            contrastScore: { type: Type.INTEGER },
            verdict: { type: Type.STRING },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'ctrPrediction',
            'clarityScore',
            'curiosityScore',
            'contrastScore',
            'verdict',
            'improvements',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      ctrPrediction: number;
      clarityScore: number;
      curiosityScore: number;
      contrastScore: number;
      verdict: string;
      improvements: string[];
    };

    res.json({
      ...parsed,
      improvements: (parsed.improvements ?? []).slice(0, 3),
    });
  } catch (err) {
    console.error('Gemini /api/ai/thumbnail-audit error:', err);
    res.status(502).json({
      error: `Thumbnail analizi başarısız oldu: ${extractErrorMessage(err)}`,
    });
  }
});

// Live Outlier Videos via YouTube Data API v3 (OAuth Bearer OR Server YOUTUBE_API_KEY)
app.get('/api/youtube/outliers', async (req: Request, res: Response) => {
  const bearerToken = getBearerToken(req);
  const ytKey = getYoutubeApiKey();
  const query = String(req.query.q ?? '').trim();

  if (!bearerToken && !ytKey) {
    res.status(401).json({
      error:
        'Canlı YouTube Outliers verisi için Google ile giriş yapın veya Secrets panelinden YOUTUBE_API_KEY tanımlayın.',
    });
    return;
  }

  try {
    let videoItems: Array<{
      id: string;
      title: string;
      channelId: string;
      channelTitle: string;
      publishedAt: string;
      viewCount: number;
      durationIso: string;
      thumbnailUrl: string;
    }> = [];

    if (query) {
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('q', query);
      searchUrl.searchParams.set('type', 'video');
      searchUrl.searchParams.set('order', 'viewCount');
      searchUrl.searchParams.set(
        'publishedAfter',
        new Date(Date.now() - 21 * 86400 * 1000).toISOString()
      );
      searchUrl.searchParams.set('regionCode', 'TR');
      searchUrl.searchParams.set('maxResults', '18');

      const sJson = (await fetchYoutubeJson(searchUrl, bearerToken, ytKey)) as {
        items?: Array<{ id?: { videoId?: string } }>;
      };
      const ids = (sJson.items ?? [])
        .map((i) => i.id?.videoId)
        .filter((id): id is string => Boolean(id));

      if (ids.length > 0) {
        const vUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        vUrl.searchParams.set('part', 'snippet,statistics,contentDetails');
        vUrl.searchParams.set('id', ids.join(','));
        const vJson = (await fetchYoutubeJson(vUrl, bearerToken, ytKey)) as {
          items?: Array<{
            id: string;
            snippet?: {
              title?: string;
              channelId?: string;
              channelTitle?: string;
              publishedAt?: string;
              thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
            };
            statistics?: { viewCount?: string };
            contentDetails?: { duration?: string };
          }>;
        };
        videoItems = (vJson.items ?? []).map((v) => ({
          id: v.id,
          title: v.snippet?.title ?? 'Başlıksız Video',
          channelId: v.snippet?.channelId ?? '',
          channelTitle: v.snippet?.channelTitle ?? 'Kanal',
          publishedAt: v.snippet?.publishedAt ?? '',
          viewCount: Number(v.statistics?.viewCount ?? 0),
          durationIso: v.contentDetails?.duration ?? '',
          thumbnailUrl:
            v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || '',
        }));
      }
    } else {
      const popUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      popUrl.searchParams.set('part', 'snippet,statistics,contentDetails');
      popUrl.searchParams.set('chart', 'mostPopular');
      popUrl.searchParams.set('regionCode', 'TR');
      popUrl.searchParams.set('maxResults', '18');
      const pJson = (await fetchYoutubeJson(popUrl, bearerToken, ytKey)) as {
        items?: Array<{
          id: string;
          snippet?: {
            title?: string;
            channelId?: string;
            channelTitle?: string;
            publishedAt?: string;
            thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
          };
          statistics?: { viewCount?: string };
          contentDetails?: { duration?: string };
        }>;
      };
      videoItems = (pJson.items ?? []).map((v) => ({
        id: v.id,
        title: v.snippet?.title ?? 'Başlıksız Video',
        channelId: v.snippet?.channelId ?? '',
        channelTitle: v.snippet?.channelTitle ?? 'Kanal',
        publishedAt: v.snippet?.publishedAt ?? '',
        viewCount: Number(v.statistics?.viewCount ?? 0),
        durationIso: v.contentDetails?.duration ?? '',
        thumbnailUrl:
          v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || '',
      }));
    }

    const channelIds = Array.from(new Set(videoItems.map((v) => v.channelId).filter(Boolean)));
    const subsMap = new Map<string, number>();

    if (channelIds.length > 0) {
      const cUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
      cUrl.searchParams.set('part', 'statistics');
      cUrl.searchParams.set('id', channelIds.join(','));
      const cJson = (await fetchYoutubeJson(cUrl, bearerToken, ytKey)) as {
        items?: Array<{ id: string; statistics?: { subscriberCount?: string } }>;
      };
      for (const ch of cJson.items ?? []) {
        subsMap.set(ch.id, Math.max(100, Number(ch.statistics?.subscriberCount ?? 1000)));
      }
    }

    const videos = videoItems
      .map((v) => {
        const subs = subsMap.get(v.channelId) ?? 10000;
        const multiplier = Number((v.viewCount / subs).toFixed(1));
        const hoursSince = v.publishedAt
          ? Math.max(1, Math.round((Date.now() - new Date(v.publishedAt).getTime()) / 3600000))
          : 24;
        const daysAgo = Math.max(1, Math.round(hoursSince / 24));
        const vph = Math.round(v.viewCount / hoursSince);
        const seconds = getDurationSeconds(v.durationIso);
        return {
          id: v.id,
          title: v.title,
          channelName: v.channelTitle,
          category: query || 'Türkiye Trendleri',
          publishedAgo: `${daysAgo} gün önce`,
          subscriberCount: subs,
          viewCount: v.viewCount,
          vph,
          duration: formatIsoDuration(v.durationIso),
          format: seconds > 0 && seconds <= 65 ? ('Shorts' as const) : ('Uzun Video' as const),
          outlierMultiplier: multiplier,
          thumbnailUrl: v.thumbnailUrl,
          url: `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`,
        };
      })
      .sort((a, b) => b.outlierMultiplier - a.outlierMultiplier);

    res.json({ videos });
  } catch (err) {
    console.error('YouTube /api/youtube/outliers error:', err);
    res.status(502).json({
      error: extractErrorMessage(err),
    });
  }
});

// Live Competitor Channel Lookup via YouTube Data API v3
app.get('/api/youtube/channel-lookup', async (req: Request, res: Response) => {
  const bearerToken = getBearerToken(req);
  const ytKey = getYoutubeApiKey();
  const query = String(req.query.q ?? '').trim();

  if (!query) {
    res.status(400).json({ error: 'Lütfen aranacak kanal adını veya @handle bilgisini girin.' });
    return;
  }
  if (!bearerToken && !ytKey) {
    res.status(401).json({
      error: 'Gerçek rakip kanal araması için Google ile giriş yapın veya YOUTUBE_API_KEY tanımlayın.',
    });
    return;
  }

  try {
    let channelId = '';

    if (query.startsWith('@')) {
      const handleUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
      handleUrl.searchParams.set('part', 'id');
      handleUrl.searchParams.set('forHandle', query);
      const hData = (await fetchYoutubeJson(handleUrl, bearerToken, ytKey)) as {
        items?: Array<{ id: string }>;
      };
      channelId = hData.items?.[0]?.id ?? '';
    }

    if (!channelId) {
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('q', query);
      searchUrl.searchParams.set('type', 'channel');
      searchUrl.searchParams.set('maxResults', '1');
      const sData = (await fetchYoutubeJson(searchUrl, bearerToken, ytKey)) as {
        items?: Array<{ id?: { channelId?: string } }>;
      };
      channelId = sData.items?.[0]?.id?.channelId ?? '';
    }

    if (!channelId) {
      res.status(404).json({ error: `"${query}" için YouTube kanalı bulunamadı.` });
      return;
    }

    const chUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
    chUrl.searchParams.set('part', 'snippet,statistics');
    chUrl.searchParams.set('id', channelId);
    const chData = (await fetchYoutubeJson(chUrl, bearerToken, ytKey)) as {
      items?: Array<{
        id: string;
        snippet?: {
          title?: string;
          customUrl?: string;
          thumbnails?: { default?: { url?: string }; medium?: { url?: string } };
        };
        statistics?: {
          subscriberCount?: string;
          viewCount?: string;
          videoCount?: string;
        };
      }>;
    };

    const ch = chData.items?.[0];
    if (!ch) {
      res.status(404).json({ error: 'Kanal detayları alınamadı.' });
      return;
    }

    // Fetch channel's top recent video
    let topVideoTitle = 'Son video bilgisi yok';
    let topVideoViews = 0;

    const topUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    topUrl.searchParams.set('part', 'snippet');
    topUrl.searchParams.set('channelId', channelId);
    topUrl.searchParams.set('type', 'video');
    topUrl.searchParams.set('order', 'viewCount');
    topUrl.searchParams.set('maxResults', '1');
    const topSearch = (await fetchYoutubeJson(topUrl, bearerToken, ytKey)) as {
      items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string } }>;
    };
    const topVidId = topSearch.items?.[0]?.id?.videoId;
    if (topVidId) {
      topVideoTitle = topSearch.items?.[0]?.snippet?.title ?? topVideoTitle;
      const tvUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      tvUrl.searchParams.set('part', 'statistics');
      tvUrl.searchParams.set('id', topVidId);
      const tvData = (await fetchYoutubeJson(tvUrl, bearerToken, ytKey)) as {
        items?: Array<{ statistics?: { viewCount?: string } }>;
      };
      topVideoViews = Number(tvData.items?.[0]?.statistics?.viewCount ?? 0);
    }

    res.json({
      channel: {
        id: ch.id,
        name: ch.snippet?.title ?? query,
        handle: ch.snippet?.customUrl ?? '',
        thumbnailUrl:
          ch.snippet?.thumbnails?.medium?.url || ch.snippet?.thumbnails?.default?.url || '',
        subscribers: Number(ch.statistics?.subscriberCount ?? 0),
        totalViews: Number(ch.statistics?.viewCount ?? 0),
        videoCount: Number(ch.statistics?.videoCount ?? 0),
        topVideoTitle,
        topVideoViews,
        url: `https://www.youtube.com/channel/${encodeURIComponent(ch.id)}`,
      },
    });
  } catch (err) {
    console.error('YouTube /api/youtube/channel-lookup error:', err);
    res.status(502).json({ error: extractErrorMessage(err) });
  }
});

// Ensure unmatched /api/* routes ALWAYS return JSON (never Vite HTML)
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API uç noktası bulunamadı.' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`YouTube Growth Studio server listening on http://localhost:${PORT}`);
  });
}

startServer();
