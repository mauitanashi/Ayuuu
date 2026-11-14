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

// Authenticated client user agent
const CLIENT_UA = 'Auris/1.0 (personal-client-4eb77cf5-46a6-4789-9305-73dd5d1290da-25f99f56)';

// In web development, route through Vite proxy; on native, call directly
const API_BASE = isNative ? 'https://api.mangadex.org' : '/api-manga';
const COVERS_BASE = isNative ? 'https://uploads.mangadex.org' : '/api-covers';
const ALT_BASE = isNative ? 'https://mangapill.com' : '/api-alt';

type QueryParam = [string, string];

async function fetchJson(endpoint: string, params: QueryParam[] = []): Promise<any> {
  const queryString = params
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `${API_BASE}${endpoint}${queryString ? '?' + queryString : ''}`;

  if (isNative) {
    const res = await CapacitorHttp.get({
      url,
      headers: {
        'User-Agent': CLIENT_UA,
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

async function fetchAltHtml(path: string): Promise<string> {
  const url = `${ALT_BASE}${path}`;
  if (isNative) {
    const res = await CapacitorHttp.get({
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://mangapill.com/',
      },
    });
    return String(res.data || '');
  } else {
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://mangapill.com/',
      },
    });
    return await res.text();
  }
}

export const MangaService = {
  async getPopularManga(limit = 24, offset = 0): Promise<MangaItem[]> {
    const params: QueryParam[] = [
      ['limit', String(limit)],
      ['offset', String(offset)],
      ['includes[]', 'cover_art'],
      ['includes[]', 'author'],
      ['hasAvailableChapters', 'true'],
      ['contentRating[]', 'safe'],
      ['contentRating[]', 'suggestive'],
      ['contentRating[]', 'erotica'],
      ['order[followedCount]', 'desc'],
    ];

    const data = await fetchJson('/manga', params);
    return this.parseList(data.data || []);
  },

  async searchManga(query: string, limit = 20, offset = 0): Promise<MangaItem[]> {
    const params: QueryParam[] = [
      ['limit', String(limit)],
      ['offset', String(offset)],
      ['title', query.trim()],
      ['includes[]', 'cover_art'],
      ['includes[]', 'author'],
      ['hasAvailableChapters', 'true'],
      ['contentRating[]', 'safe'],
      ['contentRating[]', 'suggestive'],
      ['contentRating[]', 'erotica'],
      ['order[relevance]', 'desc'],
    ];

    const data = await fetchJson('/manga', params);
    return this.parseList(data.data || []);
  },

  async getMangaById(id: string): Promise<MangaItem | null> {
    try {
      const data = await fetchJson(`/manga/${id}`, [
        ['includes[]', 'cover_art'],
        ['includes[]', 'author'],
      ]);
      const list = this.parseList([data.data]);
      return list[0] || null;
    } catch {
      return null;
    }
  },

  async getChapters(mangaId: string, mangaTitle?: string, limit = 100): Promise<ChapterItem[]> {
    // 1. Try primary hosted chapters
    const params: QueryParam[] = [
      ['translatedLanguage[]', 'en'],
      ['includeExternalUrl', '0'],
      ['includeEmptyPages', '0'],
      ['includeFuturePublishAt', '0'],
      ['contentRating[]', 'safe'],
      ['contentRating[]', 'suggestive'],
      ['contentRating[]', 'erotica'],
      ['order[chapter]', 'asc'],
      ['limit', String(limit)],
    ];

    const data = await fetchJson(`/manga/${mangaId}/feed`, params);
    let chapters = (data.data || []).map((ch: any) => {
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

    // 2. If fewer than 2 chapters found (e.g. One Piece, Jujutsu Kaisen with publisher external redirects),
    // automatically fallback to full chapter resolver
    if (chapters.length < 2) {
      let titleToUse = mangaTitle;
      if (!titleToUse) {
        try {
          const detail = await fetchJson(`/manga/${mangaId}`);
          titleToUse = detail.data?.attributes?.title?.en || Object.values(detail.data?.attributes?.title || {})[0];
        } catch (_) {}
      }
      if (titleToUse) {
        const altChapters = await this.getAltChapters(titleToUse);
        if (altChapters.length > 0) {
          return altChapters;
        }
      }
    }

    return chapters;
  },

  async getAltChapters(title: string): Promise<ChapterItem[]> {
    try {
      const searchHtml = await fetchAltHtml(`/search?q=${encodeURIComponent(title)}`);
      const linkMatch = searchHtml.match(/\/manga\/([0-9]+\/[a-z0-9-]+)/);
      if (!linkMatch) return [];

      const mangaPath = `/manga/${linkMatch[1]}`;
      const detailHtml = await fetchAltHtml(mangaPath);
      const matches = [...detailHtml.matchAll(/href="(\/chapters\/[0-9]+-[0-9]+\/[^"]+)"[^>]*>([^<]+)<\/a>/g)];

      return matches.reverse().map((m, index) => {
        const link = m[1];
        const rawTitle = m[2].trim();
        const chNumMatch = rawTitle.match(/Chapter\s+([0-9.]+)/i);
        const chapter = chNumMatch ? chNumMatch[1] : String(index + 1);

        return {
          id: `alt:${link}`,
          chapter,
          title: rawTitle,
          publishAt: '',
        };
      });
    } catch (e) {
      console.warn('Fallback chapter retrieval error:', e);
      return [];
    }
  },

  async getChapterPages(chapterId: string): Promise<string[]> {
    if (chapterId.startsWith('alt:')) {
      const path = chapterId.substring(4);
      const html = await fetchAltHtml(path);
      const rawPages = html
        .split('data-src="')
        .slice(1)
        .map((s) => s.split('"')[0])
        .filter((u) => u.startsWith('http'));

      // If in web/browser, route through Vite proxy to attach Referer header so images aren't 403 thumbnails
      return rawPages.map((url) => {
        return !isNative ? `/proxy-img?url=${encodeURIComponent(url)}` : url;
      });
    }

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
