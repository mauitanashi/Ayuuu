import { registerPlugin, WebPlugin } from '@capacitor/core';
import Hls from 'hls.js';

export interface ResolvedAudioResult {
  streamUrl: string;
  format: string;
  bitrate: number;
  durationSeconds: number;
  title?: string;
  artist?: string;
}

export interface NewPipeExtractorPlugin {
  resolveAudio(options: { videoId: string }): Promise<ResolvedAudioResult>;
}

export interface TrackItem {
  videoId: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  streamUrl?: string;
  durationMs?: number;
  album?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  currentTrack?: TrackItem;
}

export interface MediaSessionPlugin {
  playTrack(options: { track: TrackItem }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seekTo(options: { positionMs: number }): Promise<void>;
  skipNext(): Promise<void>;
  skipPrevious(): Promise<void>;
  setQueue(options: { tracks: TrackItem[]; startIndex?: number }): Promise<void>;
  addListener(
    eventName: 'playbackStateChange',
    listenerFunc: (state: PlaybackState) => void
  ): Promise<any>;
}

export interface VideoPlayerPlugin {
  playVideo(options: {
    url: string;
    title?: string;
    headers?: Record<string, string>;
    positionMs?: number;
  }): Promise<void>;
  stopVideo(): Promise<void>;
  addListener(
    eventName: 'videoProgress',
    listenerFunc: (progress: { positionMs: number; durationMs: number }) => void
  ): Promise<any>;
}

export class MediaSessionWeb extends WebPlugin implements MediaSessionPlugin {
  private audio: HTMLAudioElement | null = null;
  private currentTrack?: TrackItem;

  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.addEventListener('play', () => this.emitState(true));
      this.audio.addEventListener('pause', () => this.emitState(false));
      this.audio.addEventListener('ended', () => this.emitState(false));
      this.audio.addEventListener('timeupdate', () => this.emitState(!this.audio?.paused));
      this.audio.addEventListener('loadedmetadata', () => this.emitState(!this.audio?.paused));
      this.audio.addEventListener('durationchange', () => this.emitState(!this.audio?.paused));
    }
    return this.audio;
  }

  async playTrack(options: { track: TrackItem }): Promise<void> {
    const audio = this.getAudio();
    this.currentTrack = options.track;
    if (options.track.streamUrl) {
      audio.src = options.track.streamUrl;
      try {
        await audio.play();
        this.emitState(true);
      } catch (e) {
        console.warn('Web audio play error:', e);
      }
    }
  }

  async pause(): Promise<void> {
    if (this.audio) {
      this.audio.pause();
      this.emitState(false);
    }
  }

  async resume(): Promise<void> {
    if (this.audio) {
      try {
        await this.audio.play();
        this.emitState(true);
      } catch (e) {
        console.warn('Web audio resume error:', e);
      }
    }
  }

  async seekTo(options: { positionMs: number }): Promise<void> {
    if (this.audio) {
      this.audio.currentTime = options.positionMs / 1000;
      this.emitState(!this.audio.paused);
    }
  }

  async skipNext(): Promise<void> {}
  async skipPrevious(): Promise<void> {}
  async setQueue(): Promise<void> {}

  private emitState(isPlaying: boolean) {
    const audioDurationMs = this.audio?.duration && isFinite(this.audio.duration) && !isNaN(this.audio.duration)
      ? Math.round(this.audio.duration * 1000)
      : (this.currentTrack?.durationMs || 180000);

    this.notifyListeners('playbackStateChange', {
      isPlaying,
      positionMs: Math.round((this.audio?.currentTime || 0) * 1000),
      durationMs: audioDurationMs,
      currentTrack: this.currentTrack,
    });
  }
}

export class VideoPlayerWeb extends WebPlugin implements VideoPlayerPlugin {
  private overlay: HTMLElement | null = null;
  private hls: any = null;

  async playVideo(options: {
    url: string;
    title?: string;
    headers?: Record<string, string>;
    positionMs?: number;
  }): Promise<void> {
    this.cleanup();

    try {
      if (window.screen?.orientation && 'lock' in window.screen.orientation) {
        (window.screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch {}

    const overlay = document.createElement('div');
    overlay.id = 'ayuuu-web-video-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #000;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(to bottom, rgba(0,0,0,0.85), transparent);
      z-index: 10;
      color: #fff;
    `;

    const titleEl = document.createElement('div');
    titleEl.textContent = options.title || 'Video Player';
    titleEl.style.cssText = 'font-weight: 600; font-size: 15px; letter-spacing: -0.2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%;';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      background: rgba(255,255,255,0.18);
      border: none;
      color: #fff;
      font-size: 18px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
    `;
    closeBtn.onclick = () => this.cleanup();

    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    overlay.appendChild(header);

    const isEmbed = options.url.includes('/stream/') || options.url.includes('/embed') || options.url.includes('megaplay') || options.url.includes('zokoanime');
    if (isEmbed) {
      const iframe = document.createElement('iframe');
      iframe.src = options.url;
      iframe.style.cssText = 'width: 100%; height: 100%; border: none; flex: 1; padding-top: 54px; box-sizing: border-box; background: #000;';
      iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
      iframe.setAttribute('allowfullscreen', 'true');
      overlay.appendChild(iframe);
      document.body.appendChild(overlay);
      this.overlay = overlay;

      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.cleanup();
          window.removeEventListener('keydown', handleKey);
        }
      };
      window.addEventListener('keydown', handleKey);
      return;
    }

    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.style.cssText = 'width: 100%; height: 100%; max-height: 100vh; object-fit: contain; outline: none;';

    overlay.appendChild(video);
    document.body.appendChild(overlay);
    this.overlay = overlay;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.cleanup();
        window.removeEventListener('keydown', handleKey);
      }
    };
    window.addEventListener('keydown', handleKey);

    const isM3u8 = options.url.includes('.m3u8');
    if (isM3u8 && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
      });
      this.hls = hls;
      hls.loadSource(options.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (options.positionMs) {
          video.currentTime = options.positionMs / 1000;
        }
        video.play().catch(e => console.warn('Autoplay prevented:', e));
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error('HLS Fatal Error:', data);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = options.url;
      if (options.positionMs) video.currentTime = options.positionMs / 1000;
      video.play().catch(e => console.warn('Autoplay prevented:', e));
    } else {
      video.src = options.url;
      if (options.positionMs) video.currentTime = options.positionMs / 1000;
      video.play().catch(e => console.warn('Autoplay prevented:', e));
    }
  }

  async stopVideo(): Promise<void> {
    this.cleanup();
  }

  private cleanup(): void {
    try {
      if (window.screen?.orientation && 'unlock' in window.screen.orientation) {
        window.screen.orientation.unlock();
      }
    } catch {}

    if (this.hls) {
      try {
        this.hls.destroy();
      } catch {}
      this.hls = null;
    }
    if (this.overlay) {
      try {
        const video = this.overlay.querySelector('video');
        if (video) {
          video.pause();
          video.src = '';
        }
        const iframe = this.overlay.querySelector('iframe');
        if (iframe) {
          iframe.src = 'about:blank';
        }
        this.overlay.remove();
      } catch {}
      this.overlay = null;
    }
  }
}

export const NewPipeExtractor = registerPlugin<NewPipeExtractorPlugin>('NewPipeExtractor');
export const MediaSession = registerPlugin<MediaSessionPlugin>('MediaSession', {
  web: () => new MediaSessionWeb(),
});
export const VideoPlayer = registerPlugin<VideoPlayerPlugin>('VideoPlayer', {
  web: () => new VideoPlayerWeb(),
});
