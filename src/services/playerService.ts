import { ref, computed } from "vue";
import { MediaSession, NewPipeExtractor, TrackItem } from "../plugins";

export const activeTrack = ref<TrackItem | null>(null);
export const trackList = ref<TrackItem[]>([]);
export const isPlaying = ref(false);
export const isFullPlayerOpen = ref(false);
export const currentPositionMs = ref(0);
export const totalDurationMs = ref(30000);
export const volume = ref(0.75);

export const isEqActive = ref(false);
export const isTimerActive = ref(false);
export const isRepeat = ref(false);
export const isShuffle = ref(false);

let ticker: any = null;

export const progressPercent = computed(() => {
  if (!totalDurationMs.value) return 0;
  return Math.min(
    100,
    Math.max(0, (currentPositionMs.value / totalDurationMs.value) * 100)
  );
});

export const formatTime = (ms: number): string => {
  if (!ms || isNaN(ms)) return "0:00";
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const startTicker = () => {
  stopTicker();
  ticker = setInterval(() => {
    if (isPlaying.value) {
      if (currentPositionMs.value < totalDurationMs.value) {
        currentPositionMs.value += 250;
      } else {
        if (isRepeat.value && activeTrack.value) {
          currentPositionMs.value = 0;
          playTrack(activeTrack.value);
        } else {
          skipNext();
        }
      }
    }
  }, 250);
};

const stopTicker = () => {
  if (ticker) {
    clearInterval(ticker);
    ticker = null;
  }
};

export const playTrack = async (track: TrackItem, queue?: TrackItem[]) => {
  activeTrack.value = track;
  if (queue && queue.length) {
    trackList.value = queue;
  }
  isPlaying.value = true;
  currentPositionMs.value = 0;
  totalDurationMs.value = track.durationMs || 30000;
  startTicker();

  try {
    let streamUrl = track.streamUrl;
    if (!streamUrl) {
      const resolved = await NewPipeExtractor.resolveAudio({
        videoId: track.videoId,
      });
      streamUrl = resolved?.streamUrl;
    }

    if (!streamUrl) {
      console.error("No valid audio stream resolved for:", track.title);
      return;
    }

    await MediaSession.playTrack({
      track: {
        ...track,
        streamUrl,
      },
    });
  } catch (err) {
    console.error("Playback resolution failed:", err);
    isPlaying.value = false;
    stopTicker();
  }
};

export const togglePlayPause = async () => {
  if (isPlaying.value) {
    isPlaying.value = false;
    stopTicker();
    await MediaSession.pause();
  } else {
    isPlaying.value = true;
    startTicker();
    await MediaSession.resume();
  }
};

export const seekTo = async (posMs: number) => {
  currentPositionMs.value = posMs;
  await MediaSession.seekTo({ positionMs: posMs });
};

export const setVolume = (val: number) => {
  volume.value = Math.max(0, Math.min(1, val));
  const audioEls = document.querySelectorAll("audio");
  audioEls.forEach((a) => (a.volume = volume.value));
};

export const skipNext = () => {
  if (!trackList.value.length) return;
  const currentIndex = trackList.value.findIndex(
    (t) => t.videoId === activeTrack.value?.videoId
  );
  let nextIndex = currentIndex + 1;
  if (isShuffle.value) {
    nextIndex = Math.floor(Math.random() * trackList.value.length);
  } else if (nextIndex >= trackList.value.length) {
    nextIndex = 0;
  }
  playTrack(trackList.value[nextIndex]);
};

export const skipPrevious = () => {
  if (!trackList.value.length) return;
  const currentIndex = trackList.value.findIndex(
    (t) => t.videoId === activeTrack.value?.videoId
  );
  let prevIndex = currentIndex - 1;
  if (prevIndex < 0) {
    prevIndex = trackList.value.length - 1;
  }
  playTrack(trackList.value[prevIndex]);
};

export const openFullPlayer = () => {
  isFullPlayerOpen.value = true;
};

export const closeFullPlayer = () => {
  isFullPlayerOpen.value = false;
};

// Listen to playback state changes
MediaSession.addListener("playbackStateChange", (state: any) => {
  isPlaying.value = state.isPlaying;
  if (state.positionMs !== undefined) {
    currentPositionMs.value = state.positionMs;
  }
  if (state.durationMs && state.durationMs > 0) {
    totalDurationMs.value = state.durationMs;
  }
  if (state.isPlaying) {
    startTicker();
  } else {
    stopTicker();
  }
});
