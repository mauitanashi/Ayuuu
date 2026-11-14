import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface MangaItem {
  id: string;
  title: string;
  altTitle?: string;
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
const CLIENT_UA = 'Ayuuu/1.0 (personal-client-4eb77cf5-46a6-4789-9305-73dd5d1290da-25f99f56)';

// In web development, route through Vite proxy; on native, call directly
const API_BASE = isNative ? 'https://api.mangadex.org' : '/api-manga';
const COVERS_BASE = isNative ? 'https://uploads.mangadex.org' : '/api-covers';
const ALT_BASE = isNative ? 'https://mangapill.com' : '/api-alt';
const WC_BASE = isNative ? 'https://weebcentral.com' : '/api-wc';

const chapterCache = new Map<string, ChapterItem[]>();

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

async function fetchWcHtml(path: string): Promise<string> {
  const url = `${WC_BASE}${path}`;
  if (isNative) {
    const res = await CapacitorHttp.get({
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://weebcentral.com/',
      },
    });
    return String(res.data || '');
  } else {
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://weebcentral.com/',
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

  async getChapters(mangaId: string, mangaTitle?: string, altTitle?: string, limit = 100): Promise<ChapterItem[]> {
    if (chapterCache.has(mangaId)) {
      const cached = chapterCache.get(mangaId);
      if (cached && cached.length > 0) {
        return cached;
      }
    }

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

    try {
      const data = await fetchJson(`/manga/${mangaId}/feed`, params);
      const chapters = (data.data || []).map((ch: any) => {
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

      if (chapters.length >= 2) {
        chapterCache.set(mangaId, chapters);
        return chapters;
      }
    } catch (_) {}

    // 2. If fewer than 2 chapters found (e.g. licensed titles like Solo Leveling, One Piece),
    // automatically fallback to high-speed resolvers
    let primaryTitle = mangaTitle;
    let secondaryTitle = altTitle;
    if (!primaryTitle) {
      try {
        const detail = await fetchJson(`/manga/${mangaId}`);
        const attr = detail.data?.attributes || {};
        const altEn = Array.isArray(attr.altTitles) ? attr.altTitles.find((t: any) => t.en)?.en : undefined;
        primaryTitle = (attr.title?.en || altEn || Object.values(attr.title || {})[0]) as string | undefined;
        secondaryTitle = Object.values(attr.title || {})[0] as string | undefined;
      } catch (_) {}
    }

    if (primaryTitle) {
      // First try fast resolver (resolves full series in ~500ms)
      let resolved = await this.getWeebCentralChapters(primaryTitle);
      if (resolved.length === 0 && secondaryTitle && secondaryTitle !== primaryTitle) {
        resolved = await this.getWeebCentralChapters(secondaryTitle);
      }
      if (resolved.length > 0) {
        chapterCache.set(mangaId, resolved);
        return resolved;
      }

      // Secondary fallback
      let altResolved = await this.getAltChapters(primaryTitle);
      if (altResolved.length === 0 && secondaryTitle && secondaryTitle !== primaryTitle) {
        altResolved = await this.getAltChapters(secondaryTitle);
      }
      if (altResolved.length > 0) {
        chapterCache.set(mangaId, altResolved);
        return altResolved;
      }
    }

    return [];
  },

  async getWeebCentralChapters(title: string): Promise<ChapterItem[]> {
    try {
      const cleanTitle = title.replace(/[:\-]/g, ' ').replace(/\s+/g, ' ').trim();
      const searchHtml = await fetchWcHtml(`/search/data?text=${encodeURIComponent(cleanTitle)}&display_mode=Full%20Display`);
      const seriesMatch = searchHtml.match(/\/series\/([0-9A-Za-z]+)\/([^"]+)/) || searchHtml.match(/\/series\/([0-9A-Za-z]+)/);
      if (!seriesMatch) return [];

      const seriesId = seriesMatch[1];
      const listHtml = await fetchWcHtml(`/series/${seriesId}/full-chapter-list`);
      const regex = /href="\/chapters\/([0-9A-Za-z]+)"[^>]*>[\s\S]*?<span class="">([\s\S]*?)<\/span>/g;
      const chapters: ChapterItem[] = [];
      let m;
      while ((m = regex.exec(listHtml)) !== null) {
        const chId = m[1];
        const rawTitle = m[2].trim().replace(/\s+/g, ' ');
        const chNumMatch = rawTitle.match(/Chapter\s+([0-9.]+)/i);
        const chapter = chNumMatch ? chNumMatch[1] : rawTitle;
        chapters.push({
          id: `wc:${chId}`,
          chapter,
          title: rawTitle,
          publishAt: '',
        });
      }
      return chapters.reverse();
    } catch (e) {
      console.warn('Fast chapter retrieval error:', e);
      return [];
    }
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
    if (chapterId.startsWith('wc:')) {
      const chId = chapterId.substring(3);
      const html = await fetchWcHtml(`/chapters/${chId}/images?is_prev=False&reading_style=long_strip`);
      const imgMatches = [...html.matchAll(/<img[^>]+src="([^">]+)"/g)].map((x) => x[1]);
      return imgMatches.map((url) => {
        return !isNative ? `/proxy-img?url=${encodeURIComponent(url)}` : url;
      });
    }

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

      const primaryEn = attr.title?.en;
      const altEn = Array.isArray(attr.altTitles)
        ? attr.altTitles.find((t: any) => t.en)?.en
        : undefined;
      const originalLangTitle = Object.values(attr.title || {})[0] as string | undefined;

      const title = primaryEn || altEn || originalLangTitle || 'Untitled';
      const altTitle =
        !primaryEn && altEn && originalLangTitle
          ? originalLangTitle
          : altEn && altEn !== title
          ? altEn
          : undefined;

      const description = attr.description?.en || Object.values(attr.description || {})[0] || '';

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
        altTitle,
        description,
        coverUrl,
        author,
        latestChapter: attr.lastChapter ? `Ch. ${attr.lastChapter}` : 'Ongoing',
      };
    });
  },
};
