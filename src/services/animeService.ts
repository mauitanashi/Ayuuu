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

export interface EpisodeSubtitle {
  file: string;
  label?: string;
  kind?: string;
  default?: boolean;
}

export interface EpisodeStreamResult {
  streamUrl: string;
  isHls: boolean;
  headers: Record<string, string>;
  subtitles?: EpisodeSubtitle[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

const KITSU_API = 'https://kitsu.io/api/edge';

function getAnimeBase(): string {
  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  return isDev ? '/api-anime' : 'https://hianime.at';
}

function getStreamBase(): string {
  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  return isDev ? '/api-stream' : 'https://megaplay.buzz';
}

// AES-CBC keys for stream decryption
const SOURCE_ENC_KEY = "i?LMTAx0Q6,:}50U";
const SOURCE_ENC_IV = "W0;27ToaUpl_P%'c";

function sourceEncPadKeyBytes(str: string, len: number): Uint8Array {
  const b = new TextEncoder().encode(str);
  const out = new Uint8Array(len);
  out.set(b.subarray(0, Math.min(len, b.length)));
  return out;
}

function sourceEncB64UrlDecode(str: string): Uint8Array {
  let t = str.replace(/-/g, '+').replace(/_/g, '/');
  const n = t.length % 4;
  if (n) t += '===='.slice(n);
  const r = atob(t);
  const a = new Uint8Array(r.length);
  for (let i = 0; i < r.length; i++) a[i] = r.charCodeAt(i);
  return a;
}

async function decryptSourcesEnc(enc: string): Promise<{ file: string }> {
  const keyBytes = sourceEncPadKeyBytes(SOURCE_ENC_KEY, 32);
  const ivBytes = sourceEncPadKeyBytes(SOURCE_ENC_IV, 16);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyBytes as any,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: ivBytes as any },
    key,
    sourceEncB64UrlDecode(enc) as any
  );
  const text = new TextDecoder().decode(decrypted);
  return JSON.parse(text);
}

const OBF_KEY = 'otaku-embed-v1';
function deobfuscateZoko(blob: string): any {
  const bin = atob(blob);
  let out = '';
  for (let i = 0; i < bin.length; i++) {
    out += String.fromCharCode(bin.charCodeAt(i) ^ OBF_KEY.charCodeAt(i % OBF_KEY.length));
  }
  return JSON.parse(decodeURIComponent(escape(out)));
}

export const AnimeService = {
  async getTrendingAnime(limit = 20): Promise<AnimeItem[]> {
    const url = `${KITSU_API}/trending/anime?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Trending load error: ${res.status}`);
    const data = await res.json();
    return this.parseAnimeList(data.data || []);
  },

  async searchAnime(query: string, limit = 20): Promise<AnimeItem[]> {
    const url = `${KITSU_API}/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Search error: ${res.status}`);
    const data = await res.json();
    return this.parseAnimeList(data.data || []);
  },

  async searchSource(title: string): Promise<{ id: string; slug: string } | null> {
    try {
      const cleanTitle = title.replace(/[^\w\s-]/g, ' ').trim();
      const url = `${getAnimeBase()}/search?keyword=${encodeURIComponent(cleanTitle)}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      if (!res.ok) return null;
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const firstLink = doc.querySelector('.film_list-wrap .flw-item .film-name a');
      if (!firstLink) return null;

      const href = firstLink.getAttribute('href') || '';
      const parts = href.split('/');
      const slug = parts[parts.length - 1] || '';
      const id = slug.split('-').pop() || '';
      if (!id) return null;

      return { id, slug };
    } catch (err) {
      console.warn('Source search error:', err);
      return null;
    }
  },

  async getEpisodes(animeId: string, animeTitle?: string, limit = 50): Promise<AnimeEpisodeItem[]> {
    // 1. Try finding episodes from source with real episode IDs for video streams
    if (animeTitle) {
      try {
        const sourceAnime = await this.searchSource(animeTitle);
        if (sourceAnime) {
          const epUrl = `${getAnimeBase()}/api/theme/episode/list/${sourceAnime.id}`;
          const res = await fetch(epUrl, {
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.html) {
              const parser = new DOMParser();
              const doc = parser.parseFromString(data.html, 'text/html');
              const items = doc.querySelectorAll('.ep-item');
              if (items.length > 0) {
                const epList: AnimeEpisodeItem[] = [];
                items.forEach((item) => {
                  const id = item.getAttribute('data-id') || '';
                  const num = Number(item.getAttribute('data-number')) || 1;
                  const title = item.getAttribute('title')?.trim() || `Episode ${num}`;
                  if (id) {
                    epList.push({
                      id,
                      number: num,
                      title,
                    });
                  }
                });
                if (epList.length > 0) {
                  return epList;
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Direct source episode fetch failed, falling back to metadata:', err);
      }
    }

    // 2. Fallback to Kitsu metadata episodes
    try {
      const url = `${KITSU_API}/anime/${animeId}/episodes?page[limit]=${limit}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Episodes error: ${res.status}`);
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
    } catch (err) {
      console.error('Kitsu episodes error:', err);
      return [];
    }
  },

  async getEpisodeStream(
    episodeId: string,
    animeTitle?: string,
    epNumber?: number
  ): Promise<EpisodeStreamResult> {
    let resolvedEpId = episodeId;

    // If episodeId is purely numerical from Kitsu (not matched yet), find source ep
    if (animeTitle && epNumber !== undefined && Number(episodeId) < 1000) {
      const sourceAnime = await this.searchSource(animeTitle);
      if (sourceAnime) {
        const listRes = await fetch(`${getAnimeBase()}/api/theme/episode/list/${sourceAnime.id}`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          if (listData?.html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(listData.html, 'text/html');
            const target = doc.querySelector(`.ep-item[data-number="${epNumber}"]`);
            if (target) {
              const matchedId = target.getAttribute('data-id');
              if (matchedId) resolvedEpId = matchedId;
            }
          }
        }
      }
    }

    // 1. Fetch available servers for the episode
    const serversUrl = `${getAnimeBase()}/api/theme/episode/servers?episodeId=${resolvedEpId}`;
    const srvRes = await fetch(serversUrl, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!srvRes.ok) {
      throw new Error(`Failed to retrieve stream servers (${srvRes.status})`);
    }

    const srvData = await srvRes.json();
    if (!srvData?.html) {
      throw new Error('No server streams available for this episode');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(srvData.html, 'text/html');
    const serverItems = doc.querySelectorAll('.server-item');

    const servers: Array<{ name: string; url: string }> = [];
    serverItems.forEach((el) => {
      const hash = el.getAttribute('data-hash');
      const name = el.getAttribute('data-server-name') || '';
      if (hash) {
        try {
          const decoded = atob(hash);
          servers.push({ name, url: decoded });
        } catch {
          // ignore invalid hash
        }
      }
    });

    if (servers.length === 0) {
      throw new Error('No video stream endpoints found');
    }

    // 2. Try primary stream provider (MegaPlay / HD-1)
    const mpServer = servers.find((s) => s.url.includes('megaplay.buzz'));
    if (mpServer) {
      const match = mpServer.url.match(/\/(\d+)\//);
      const sourceId = match ? match[1] : null;
      if (sourceId) {
        try {
          const getSourcesUrl = `${getStreamBase()}/stream/getSources?id=${sourceId}&s=tcdn`;
          const res = await fetch(getSourcesUrl, {
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
            },
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.enc) {
              const decrypted = await decryptSourcesEnc(data.enc);
              if (decrypted?.file) {
                return {
                  streamUrl: decrypted.file,
                  isHls: true,
                  headers: {
                    'Referer': 'https://megaplay.buzz/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  },
                  subtitles: (data.tracks || []).filter((t: any) => t.kind === 'captions').map((t: any) => ({
                    file: t.file,
                    label: t.label || 'English',
                    default: !!t.default,
                  })),
                  intro: data.intro,
                  outro: data.outro,
                };
              }
            }
          }
        } catch (mpErr) {
          console.warn('MegaPlay extraction failed, trying secondary server:', mpErr);
        }
      }
    }

    // 3. Fallback to secondary stream provider (ZokoAnime)
    const zkServer = servers.find((s) => s.url.includes('zokoanime.video'));
    if (zkServer) {
      try {
        const zkRes = await fetch(zkServer.url, {
          headers: {
            'Referer': 'https://hianime.at/',
          },
        });
        if (zkRes.ok) {
          const zkHtml = await zkRes.text();
          const match = zkHtml.match(/window\.__P\s*=\s*"([^"]+)"/);
          if (match && match[1]) {
            const payload = deobfuscateZoko(match[1]);
            if (payload?.src) {
              return {
                streamUrl: payload.src,
                isHls: true,
                headers: {
                  'Referer': 'https://zokoanime.video/',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                subtitles: (payload.subtitles || []).map((s: any) => ({
                  file: s.src,
                  label: s.label || s.lang || 'English',
                  default: !!s.default,
                })),
              };
            }
          }
        }
      } catch (zkErr) {
        console.warn('ZokoAnime extraction failed:', zkErr);
      }
    }

    throw new Error('Unable to resolve playable video stream for this episode');
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
