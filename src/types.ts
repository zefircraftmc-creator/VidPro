export type ModuleId =
  | 'home'
  | 'video-audit'
  | 'daily-ideas'
  | 'keywords'
  | 'optimize'
  | 'outliers'
  | 'competitors'
  | 'coach'
  | 'thumbnails';

export type PotentialLevel =
  | 'Çok Yüksek Potansiyel'
  | 'Yüksek Potansiyel'
  | 'Orta Potansiyel';

export interface YouTubeChannelVideo {
  id: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  thumbnailUrl: string;
  url: string;
}

export interface AnalyticsDailyPoint {
  date: string;
  views: number;
  subscribersGained: number;
  subscribersLost: number;
  estimatedMinutesWatched: number;
}

export interface ConnectedChannelData {
  channelId: string;
  connectionMode?: 'oauth' | 'public';
  title: string;
  customUrl: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: number;
  hiddenSubscriberCount: boolean;
  viewCount: number;
  videoCount: number;
  recentVideos: YouTubeChannelVideo[];
  analytics28d: {
    available: boolean;
    errorReason?: string;
    totalViews: number;
    netSubscribers: number;
    watchHours: number;
    avgViewDurationSec: number;
    dailySeries: AnalyticsDailyPoint[];
  };
}

export interface ChannelSearchCandidate {
  channelId: string;
  title: string;
  customUrl: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
}

export interface VideoChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface VideoCommentItem {
  id: string;
  author: string;
  authorPhotoUrl?: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

export interface VideoInspectionData {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  duration: string;
  durationSeconds: number;
  thumbnailUrl: string;
  url: string;
  channelId: string;
  channelTitle: string;
  channelCustomUrl: string;
  channelThumbnailUrl: string;
  channelSubscribers: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  vph: number;
  engagementRate: number;
  outlierMultiplier: number;
  definition: string;
  caption: boolean;
  tags: string[];
  seoScore: number;
  checklist: VideoChecklistItem[];
  topComments: VideoCommentItem[];
}

export interface VideoAiAuditResult {
  summary: string;
  strengths: string[];
  improvements: string[];
  audienceSentiment: string;
  betterTitles: string[];
}

export interface ViralIdea {
  id: string;
  niche: string;
  title: string;
  potential: PotentialLevel;
  score: number;
  format: string;
  estimatedViews: string;
  reason: string;
  savedAt?: string;
}

export interface LongTailKeyword {
  keyword: string;
  monthlySearches: number;
  competition: 'Düşük' | 'Orta' | 'Yüksek';
  trendChange: string;
  opportunityScore: number;
}

export interface KeywordAnalysisResult {
  query: string;
  searchVolumeScore: number;
  monthlySearchVolume: number;
  competitionScore: number;
  competitionLevel: 'Düşük' | 'Orta' | 'Yüksek';
  overallScore: number;
  summary: string;
  youtubeSampleCount?: number;
  youtubeAvgViews?: number;
  longTailKeywords: LongTailKeyword[];
  source: 'youtube-gemini' | 'gemini';
}

export interface GeneratedTitle {
  title: string;
  ctrScore: number;
  angle: string;
}

export interface HookBeat {
  timeframe: string;
  label: string;
  script: string;
}

export interface GeneratedContentResult {
  topic: string;
  tone: string;
  titles: GeneratedTitle[];
  description: string;
  tags: string[];
  hookBeats: HookBeat[];
}

export interface OutlierVideo {
  id: string;
  title: string;
  channelName: string;
  category: string;
  publishedAgo: string;
  subscriberCount: number;
  viewCount: number;
  vph: number;
  duration: string;
  format: 'Uzun Video' | 'Shorts';
  outlierMultiplier: number;
  thumbnailUrl?: string;
  url?: string;
}

export interface CompetitorChannel {
  id: string;
  name: string;
  handle: string;
  thumbnailUrl?: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  topVideoTitle: string;
  topVideoViews: number;
  url: string;
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ThumbnailAuditResult {
  ctrPrediction: number;
  clarityScore: number;
  curiosityScore: number;
  contrastScore: number;
  verdict: string;
  improvements: string[];
}

export interface ApiStatusResponse {
  geminiReady: boolean;
  youtubeReady: boolean;
}

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
}
