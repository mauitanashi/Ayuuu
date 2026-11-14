import { registerPlugin } from '@capacitor/core';

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

export const NewPipeExtractor = registerPlugin<NewPipeExtractorPlugin>('NewPipeExtractor');
export const MediaSession = registerPlugin<MediaSessionPlugin>('MediaSession');
export const VideoPlayer = registerPlugin<VideoPlayerPlugin>('VideoPlayer');
