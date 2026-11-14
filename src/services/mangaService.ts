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

const MANGADEX_API = 'https://api.mangadex.org';
const MANGADEX_UPLOADS = 'https://uploads.mangadex.org';

export const MangaService = {
  async getPopularManga(limit = 24, offset = 0): Promise<MangaItem[]> {
    const url = `${MANGADEX_API}/manga?limit=${limit}&offset=${offset}&includes[]=cover_art&includes[]=author&hasAvailableChapters=true&contentRating[]=safe&contentRating[]=suggestive&order[followedCount]=desc`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MangaDex error: ${res.status}`);
    const data = await res.json();
    return this.parseMangaList(data.data || []);
  },

  async searchManga(query: string, limit = 20): Promise<MangaItem[]> {
    const url = `${MANGADEX_API}/manga?limit=${limit}&title=${encodeURIComponent(query)}&includes[]=cover_art&includes[]=author&hasAvailableChapters=true&contentRating[]=safe&contentRating[]=suggestive&order[relevance]=desc`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MangaDex search error: ${res.status}`);
    const data = await res.json();
    return this.parseMangaList(data.data || []);
  },

  async getChapters(mangaId: string, limit = 100): Promise<ChapterItem[]> {
    const url = `${MANGADEX_API}/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MangaDex chapters error: ${res.status}`);
    const data = await res.json();
    
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
    const url = `${MANGADEX_API}/at-home/server/${chapterId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MangaDex page server error: ${res.status}`);
    const data = await res.json();

    const baseUrl = data.baseUrl;
    const hash = data.chapter?.hash;
    const files: string[] = data.chapter?.data || [];

    return files.map((file) => `${baseUrl}/data/${hash}/${file}`);
  },

  parseMangaList(list: any[]): MangaItem[] {
    return list.map((item) => {
      const id = item.id;
      const attr = item.attributes || {};
      const title = attr.title?.en || Object.values(attr.title || {})[0] || 'Untitled';
      const description = attr.description?.en || '';

      const rels: any[] = item.relationships || [];
      const coverRel = rels.find((r) => r.type === 'cover_art');
      const coverFileName = coverRel?.attributes?.fileName;
      const coverUrl = coverFileName
        ? `${MANGADEX_UPLOADS}/covers/${id}/${coverFileName}.256.jpg`
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
