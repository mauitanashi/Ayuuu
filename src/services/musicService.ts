import { TrackItem } from '../plugins';

const ITUNES_SEARCH_API = 'https://itunes.apple.com/search';

export const MusicService = {
  async getTrendingMusic(limit = 25): Promise<TrackItem[]> {
    return this.searchMusic('Anime Hits', limit);
  },

  async searchMusic(query: string, limit = 25): Promise<TrackItem[]> {
    const url = `${ITUNES_SEARCH_API}?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Music search error: ${res.status}`);
    const data = await res.json();

    return (data.results || []).map((item: any) => {
      const highResArt = item.artworkUrl100
        ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg')
        : '';

      return {
        videoId: String(item.trackId || item.collectionId || Math.random()),
        title: item.trackName || 'Unknown Title',
        artist: item.artistName || 'Unknown Artist',
        artworkUrl: highResArt,
        streamUrl: item.previewUrl || '',
        durationMs: item.trackTimeMillis || 30000,
      };
    });
  },
};
