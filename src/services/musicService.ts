import { TrackItem } from '../plugins';

const ITUNES_SEARCH_API = 'https://itunes.apple.com/search';
const ITUNES_PH_TOP_SONGS = 'https://itunes.apple.com/ph/rss/topsongs/limit=25/json';

export const MusicService = {
  /**
   * Returns the official Top Hits in the Philippines / OPM Chart.
   */
  async getTrendingMusic(limit = 25): Promise<TrackItem[]> {
    return this.getTopPhilippinesTracks(limit);
  },

  /**
   * Fetches the Top Hits in the Philippines using Apple Music PH Charts & Search API.
   */
  async getTopPhilippinesTracks(limit = 25): Promise<TrackItem[]> {
    try {
      // Fetch Philippine Top Hits directly with country=PH
      const url = `${ITUNES_SEARCH_API}?term=Top+Hits+Philippines&country=PH&entity=song&limit=${limit}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          return data.results.map(this.mapItunesTrack);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch iTunes search top hits:', e);
    }

    // Fallback: Apple Music Philippines Official Top Songs RSS Feed
    try {
      const res = await fetch(ITUNES_PH_TOP_SONGS);
      if (res.ok) {
        const data = await res.json();
        const entries = data.feed?.entry || [];
        if (entries.length > 0) {
          return entries.slice(0, limit).map((entry: any) => {
            const rawImg =
              entry['im:image']?.[entry['im:image'].length - 1]?.label || '';
            const highResArt = rawImg
              ? rawImg.replace(/\/\d+x\d+bb\./, '/600x600bb.')
              : '';

            const previewLink = entry.link?.find(
              (l: any) => l.attributes?.rel === 'enclosure'
            );

            return {
              videoId: String(entry.id?.attributes?.['im:id'] || Math.random()),
              title: entry['im:name']?.label || 'Unknown Title',
              artist: entry['im:artist']?.label || 'Unknown Artist',
              album: entry['im:collection']?.['im:name']?.label || '',
              artworkUrl: highResArt,
              streamUrl: previewLink?.attributes?.href || '',
              durationMs: 30000,
            };
          });
        }
      }
    } catch (e) {
      console.warn('Failed to fetch Apple Music PH RSS:', e);
    }

    return [];
  },

  /**
   * Searches for music with Philippine regional catalog prioritization (country=PH).
   */
  async searchMusic(query: string, limit = 25): Promise<TrackItem[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return this.getTopPhilippinesTracks(limit);
    }

    // Recognize common Philippines chart search requests
    let searchTerm = trimmed;
    const lower = trimmed.toLowerCase();
    if (
      lower.includes('top 10') ||
      lower.includes('top songs') ||
      lower.includes('philippines') ||
      lower.includes('pinoy') ||
      lower.includes('opm')
    ) {
      searchTerm = 'Top Hits Philippines';
    }

    try {
      const url = `${ITUNES_SEARCH_API}?term=${encodeURIComponent(
        searchTerm
      )}&country=PH&entity=song&limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Search failed with status: ${res.status}`);
      const data = await res.json();

      return (data.results || []).map(this.mapItunesTrack);
    } catch (err) {
      console.error('Music search failed:', err);
      return [];
    }
  },

  mapItunesTrack(item: any): TrackItem {
    const rawArt = item.artworkUrl100 || item.artworkUrl60 || '';
    const highResArt = rawArt
      ? rawArt.replace('100x100bb.jpg', '600x600bb.jpg')
      : '';

    return {
      videoId: String(item.trackId || item.collectionId || Math.random()),
      title: item.trackName || 'Unknown Title',
      artist: item.artistName || 'Unknown Artist',
      album: item.collectionName || '',
      artworkUrl: highResArt,
      streamUrl: item.previewUrl || '',
      durationMs: item.trackTimeMillis || 30000,
    };
  },
};
