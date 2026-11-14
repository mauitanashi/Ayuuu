import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface MangaItem {
  id: string;
  title: string;
  coverUrl: string;
  description: string;
  latestChapter?: string;
  author?: string;
}

export interface ChapterItem {
  id: string;
  chapter: string;
  title: string;
  publishAt: string;
}

const isNative = Capacitor.isNativePlatform();

// In web development, route through Vite proxy to attach app headers; on native, call directly
const API_BASE = isNative ? 'https://api.mangadex.org' : '/api-manga';
const COVERS_BASE = isNative ? 'https://uploads.mangadex.org' : '/api-covers';

async function fetchJson(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}${endpoint}${query ? '?' + query : ''}`;

  if (isNative) {
    const res = await CapacitorHttp.get({
      url,
      headers: {
        'User-Agent': 'Auris/1.0 (Android; Mobile)',
        'Accept': 'application/json',
      },
    });
    if (res.status !== 200) {
      throw new Error(`Request failed (${res.status})`);
    }
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  } else {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    return await res.json();
  }
}

export const MangaService = {
  async getPopularManga(limit = 24, offset = 0): Promise<MangaItem[]> {
    const data = await fetchJson('/manga', {
      limit: String(limit),
      offset: String(offset),
      'includes[]': 'cover_art',
      'availableTranslatedLanguage[]': 'en',
      hasAvailableChapters: 'true',
      'contentRating[]': 'safe',
      'order[followedCount]': 'desc',
    });

    return this.parseList(data.data || []);
  },

  async searchManga(query: string, limit = 20): Promise<MangaItem[]> {
    const data = await fetchJson('/manga', {
      limit: String(limit),
      title: query.trim(),
      'includes[]': 'cover_art',
      'availableTranslatedLanguage[]': 'en',
      hasAvailableChapters: 'true',
      'contentRating[]': 'safe',
      'order[relevance]': 'desc',
    });

    return this.parseList(data.data || []);
  },

  async getChapters(mangaId: string, limit = 100): Promise<ChapterItem[]> {
    const data = await fetchJson(`/manga/${mangaId}/feed`, {
      'translatedLanguage[]': 'en',
      includeExternalUrl: '0',
      includeEmptyPages: '0',
      includeFuturePublishAt: '0',
      'order[chapter]': 'asc',
      limit: String(limit),
    });

    return (data.data || []).map((ch: any) => {
      const attr = ch.attributes || {};
      const chNum = attr.chapter ? `Ch. ${attr.chapter}` : 'Special';
      const title = attr.title ? `${chNum}: ${attr.title}` : chNum;
      return {
        id: ch.id,
        chapter: attr.chapter || '1',
        title,
        publishAt: attr.publishAt || '',
      };
    });
  },

  async getChapterPages(chapterId: string): Promise<string[]> {
    const data = await fetchJson(`/at-home/server/${chapterId}`);
    const baseUrl = data.baseUrl;
    const hash = data.chapter?.hash;
    const files: string[] = data.chapter?.data || [];

    return files.map((file) => `${baseUrl}/data/${hash}/${file}`);
  },

  parseList(list: any[]): MangaItem[] {
    return list.map((item) => {
      const id = item.id;
      const attr = item.attributes || {};
      const title = attr.title?.en || Object.values(attr.title || {})[0] || 'Untitled';
      const description = attr.description?.en || '';

      const rels: any[] = item.relationships || [];
      const coverRel = rels.find((r) => r.type === 'cover_art');
      const coverFileName = coverRel?.attributes?.fileName;
      const coverUrl = coverFileName
        ? `${COVERS_BASE}/covers/${id}/${coverFileName}.256.jpg`
        : 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80';

      const authorRel = rels.find((r) => r.type === 'author');
      const author = authorRel?.attributes?.name || '';

      return {
        id,
        title,
        description,
        coverUrl,
        author,
        latestChapter: attr.lastChapter ? `Ch. ${attr.lastChapter}` : 'Ongoing',
      };
    });
  },
};
