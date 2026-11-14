import { registerPlugin, WebPlugin } from '@capacitor/core';

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
    this.notifyListeners('playbackStateChange', {
      isPlaying,
      positionMs: Math.round((this.audio?.currentTime || 0) * 1000),
      durationMs: Math.round((this.audio?.duration || 0) * 1000) || this.currentTrack?.durationMs || 30000,
      currentTrack: this.currentTrack,
    });
  }
}

export const NewPipeExtractor = registerPlugin<NewPipeExtractorPlugin>('NewPipeExtractor');
export const MediaSession = registerPlugin<MediaSessionPlugin>('MediaSession', {
  web: () => new MediaSessionWeb(),
});
export const VideoPlayer = registerPlugin<VideoPlayerPlugin>('VideoPlayer');
