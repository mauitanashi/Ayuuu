export interface AnimeItem {
  id: string;
  name: string;
  thumbnail: string;
  bannerImage?: string;
  episodes: number;
  synopsis: string;
  rating?: string;
}

export interface AnimeEpisodeItem {
  id: string;
  number: number;
  title: string;
  synopsis?: string;
}

const KITSU_API = 'https://kitsu.io/api/edge';

export const AnimeService = {
  async getTrendingAnime(limit = 20): Promise<AnimeItem[]> {
    const url = `${KITSU_API}/trending/anime?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Kitsu trending error: ${res.status}`);
    const data = await res.json();
    return this.parseAnimeList(data.data || []);
  },

  async searchAnime(query: string, limit = 20): Promise<AnimeItem[]> {
    const url = `${KITSU_API}/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Kitsu search error: ${res.status}`);
    const data = await res.json();
    return this.parseAnimeList(data.data || []);
  },

  async getEpisodes(animeId: string, limit = 50): Promise<AnimeEpisodeItem[]> {
    const url = `${KITSU_API}/anime/${animeId}/episodes?page[limit]=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Kitsu episodes error: ${res.status}`);
    const data = await res.json();

    return (data.data || []).map((ep: any) => {
      const attr = ep.attributes || {};
      const num = attr.number || 1;
      const title = attr.canonicalTitle || `Episode ${num}`;
      return {
        id: ep.id,
        number: num,
        title,
        synopsis: attr.synopsis || '',
      };
    });
  },

  parseAnimeList(list: any[]): AnimeItem[] {
    return list.map((item) => {
      const id = item.id;
      const attr = item.attributes || {};
      const name = attr.canonicalTitle || attr.titles?.en || attr.titles?.en_jp || 'Untitled';
      const thumbnail =
        attr.posterImage?.medium ||
        attr.posterImage?.original ||
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80';
      const bannerImage = attr.coverImage?.original || thumbnail;

      return {
        id,
        name,
        thumbnail,
        bannerImage,
        episodes: attr.episodeCount || 12,
        synopsis: attr.synopsis || 'No synopsis available.',
        rating: attr.averageRating ? `${attr.averageRating}%` : undefined,
      };
    });
  },
};
