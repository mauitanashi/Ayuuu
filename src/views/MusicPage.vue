<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar class="brand-toolbar">
        <ion-buttons slot="start">
          <img src="/logo.png" alt="Ayuuu" class="header-logo" />
        </ion-buttons>
        <ion-title>Music</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          placeholder="Search songs, artists..."
          @keyup.enter="handleSearch"
          :debounce="500"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="isLoading" class="ion-text-center ion-padding">
        <ion-spinner name="crescent"></ion-spinner>
      </div>

      <div v-else class="ion-padding-horizontal">
        <h2 class="section-title">
          {{ isSearching ? "Search Results" : "Featured Tracks" }}
        </h2>
        <ion-list lines="none" class="track-list">
          <ion-item
            v-for="track in tracks"
            :key="track.videoId"
            button
            @click="handleTrackClick(track)"
            class="track-item"
          >
            <ion-thumbnail slot="start" class="track-thumb">
              <img
                :src="track.artworkUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80'"
                alt="cover"
                loading="lazy"
              />
            </ion-thumbnail>
            <ion-label>
              <h3 class="track-title">{{ track.title }}</h3>
              <p class="track-artist">{{ track.artist }}</p>
            </ion-label>
            <ion-button
              fill="clear"
              slot="end"
              class="track-play-btn"
              @click.stop="handleTrackClick(track)"
            >
              <ion-icon
                :icon="
                  activeTrack?.videoId === track.videoId && isPlaying
                    ? pauseOutline
                    : playOutline
                "
                class="playback-icon"
                :class="{ 'is-active': activeTrack?.videoId === track.videoId }"
              ></ion-icon>
            </ion-button>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>

    <!-- Mini Player Footer (Floating above dock per DESIGN.md) -->
    <div v-if="activeTrack" class="mini-player" @click="openFullPlayer">
      <img :src="activeTrack.artworkUrl" class="mini-thumb" />
      <div class="mini-info">
        <div class="mini-title">{{ activeTrack.title }}</div>
        <div class="mini-artist">{{ activeTrack.artist }}</div>
      </div>
      <ion-button fill="clear" @click.stop="togglePlayPause" class="mini-play-btn">
        <ion-icon
          :icon="isPlaying ? pauseOutline : playOutline"
          slot="icon-only"
        ></ion-icon>
      </ion-button>
    </div>

    <!-- Full Music Player Modal (Look-alike to UI/music-player-UI.jpg) -->
    <ion-modal
      :is-open="isFullPlayerOpen"
      @didDismiss="isFullPlayerOpen = false"
      class="full-player-modal"
      :initial-breakpoint="1"
      :breakpoints="[0, 1]"
    >
      <div class="now-playing-container" v-if="activeTrack">
        <!-- Dismiss Handle Bar -->
        <div class="drag-handle-bar" @click="isFullPlayerOpen = false">
          <span class="handle-bar"></span>
        </div>

        <!-- Album Artwork (centered square with rounded corners & drop shadow) -->
        <div class="cover-wrapper">
          <img
            :src="activeTrack.artworkUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80'"
            alt="Album Art"
            class="artwork-img"
            :class="{ 'is-playing': isPlaying }"
          />
        </div>

        <!-- Scrubber Progress Bar & Timestamps -->
        <div class="scrubber-section">
          <div class="seek-bar-track" @click="handleSeekClick">
            <div
              class="seek-bar-fill"
              :style="{ width: progressPercent + '%' }"
            ></div>
          </div>
          <div class="timestamps-row">
            <span class="time-text">{{ formatTime(currentPositionMs) }}</span>
            <span class="time-text">{{ formatTime(totalDurationMs) }}</span>
          </div>
        </div>

        <!-- Track Metadata -->
        <div class="metadata-section">
          <h1 class="main-track-title">{{ activeTrack.title }}</h1>
          <p class="main-track-artist">
            {{ activeTrack.artist }}{{ activeTrack.album ? ' - ' + activeTrack.album : '' }}
          </p>

          <!-- Audio Quality Badge Pill -->
          <div class="quality-badge-pill">
            <span>24 bit 48 kHz 1594 kbps flac</span>
          </div>
        </div>

        <!-- Secondary Utilities Row (EQ, Timer, Repeat, Shuffle) -->
        <div class="utilities-row">
          <button
            class="util-btn"
            :class="{ 'is-active': isEqActive }"
            @click="isEqActive = !isEqActive"
            aria-label="Equalizer"
          >
            <ion-icon :icon="pulseOutline"></ion-icon>
          </button>
          <button
            class="util-btn"
            :class="{ 'is-active': isTimerActive }"
            @click="isTimerActive = !isTimerActive"
            aria-label="Timer"
          >
            <ion-icon :icon="timeOutline"></ion-icon>
          </button>
          <button
            class="util-btn"
            :class="{ 'is-active': isRepeat }"
            @click="isRepeat = !isRepeat"
            aria-label="Repeat"
          >
            <ion-icon :icon="repeatOutline"></ion-icon>
          </button>
          <button
            class="util-btn"
            :class="{ 'is-active': isShuffle }"
            @click="isShuffle = !isShuffle"
            aria-label="Shuffle"
          >
            <ion-icon :icon="shuffleOutline"></ion-icon>
          </button>
        </div>

        <!-- Primary Playback Transport Controls -->
        <div class="playback-controls-row">
          <button class="dot-btn">•</button>

          <button class="transport-btn skip-btn" @click="skipPrevious" aria-label="Previous">
            <ion-icon :icon="playBack"></ion-icon>
          </button>

          <!-- Center Play / Pause: Solid White Bars matching reference screenshot -->
          <button class="transport-btn main-play-btn" @click="togglePlayPause" aria-label="Play/Pause">
            <div v-if="isPlaying" class="pause-bars-icon">
              <span class="pause-bar"></span>
              <span class="pause-bar"></span>
            </div>
            <ion-icon v-else :icon="play" class="solid-play-icon"></ion-icon>
          </button>

          <button class="transport-btn skip-btn" @click="skipNext" aria-label="Next">
            <ion-icon :icon="playForward"></ion-icon>
          </button>

          <button class="dot-btn">•</button>
        </div>

        <!-- Volume Slider Row -->
        <div class="volume-slider-row">
          <ion-icon :icon="volumeLow" class="vol-icon"></ion-icon>
          <div class="vol-track" @click="handleVolumeClick">
            <div
              class="vol-fill"
              :style="{ width: (volume * 100) + '%' }"
            ></div>
          </div>
          <ion-icon :icon="volumeHigh" class="vol-icon"></ion-icon>
        </div>

        <!-- Bottom Floating Dock -->
        <div class="player-bottom-dock">
          <button class="dock-action-btn" @click="isFullPlayerOpen = false">
            <ion-icon :icon="gridOutline"></ion-icon>
          </button>
          <button
            class="dock-action-btn"
            :class="{ 'dock-active': isEqActive }"
            @click="isEqActive = !isEqActive"
          >
            <ion-icon :icon="barChartOutline"></ion-icon>
          </button>
          <button class="dock-action-btn" @click="isFullPlayerOpen = false">
            <ion-icon :icon="searchOutline"></ion-icon>
          </button>
          <button class="dock-action-btn" @click="isFullPlayerOpen = false">
            <ion-icon :icon="menuOutline"></ion-icon>
          </button>
        </div>
      </div>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonThumbnail,
  IonLabel,
  IonIcon,
  IonSpinner,
  IonButton,
  IonButtons,
  IonModal,
} from "@ionic/vue";
import {
  playOutline,
  pauseOutline,
  play,
  playBack,
  playForward,
  volumeLow,
  volumeHigh,
  pulseOutline,
  timeOutline,
  repeatOutline,
  shuffleOutline,
  gridOutline,
  barChartOutline,
  searchOutline,
  menuOutline,
} from "ionicons/icons";
import { NewPipeExtractor, MediaSession, TrackItem } from "../plugins";
import { MusicService } from "../services/musicService";

const searchQuery = ref("");
const isSearching = ref(false);
const isLoading = ref(true);
const isPlaying = ref(false);
const isFullPlayerOpen = ref(false);

const activeTrack = ref<TrackItem | null>(null);
const tracks = ref<TrackItem[]>([]);

// Playback state
const currentPositionMs = ref(0);
const totalDurationMs = ref(30000);
const volume = ref(0.75);

// Utilities state
const isEqActive = ref(false);
const isTimerActive = ref(false);
const isRepeat = ref(false);
const isShuffle = ref(false);

let ticker: any = null;

const progressPercent = computed(() => {
  if (!totalDurationMs.value) return 0;
  return Math.min(100, Math.max(0, (currentPositionMs.value / totalDurationMs.value) * 100));
});

const formatTime = (ms: number): string => {
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
        if (isRepeat.value) {
          currentPositionMs.value = 0;
          if (activeTrack.value) {
            playTrack(activeTrack.value);
          }
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

const loadFeatured = async () => {
  isLoading.value = true;
  isSearching.value = false;
  try {
    tracks.value = await MusicService.getTrendingMusic();
  } catch (e) {
    console.error("Failed to load featured tracks:", e);
  } finally {
    isLoading.value = false;
  }
};

const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    loadFeatured();
    return;
  }
  isLoading.value = true;
  isSearching.value = true;
  try {
    tracks.value = await MusicService.searchMusic(searchQuery.value);
  } catch (e) {
    console.error("Music search failed:", e);
  } finally {
    isLoading.value = false;
  }
};

const handleTrackClick = (track: TrackItem) => {
  if (activeTrack.value?.videoId === track.videoId) {
    togglePlayPause();
  } else {
    playTrack(track);
  }
};

const openFullPlayer = () => {
  isFullPlayerOpen.value = true;
};

const playTrack = async (track: TrackItem) => {
  activeTrack.value = track;
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

const togglePlayPause = async () => {
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

const handleSeekClick = async (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
  const newPos = Math.round(ratio * totalDurationMs.value);
  currentPositionMs.value = newPos;
  await MediaSession.seekTo({ positionMs: newPos });
};

const handleVolumeClick = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const newVol = Math.max(0, Math.min(1, clickX / rect.width));
  volume.value = newVol;
  const audioEls = document.querySelectorAll("audio");
  audioEls.forEach((a) => (a.volume = newVol));
};

const skipNext = () => {
  if (!tracks.value.length) return;
  const currentIndex = tracks.value.findIndex(
    (t) => t.videoId === activeTrack.value?.videoId
  );
  let nextIndex = currentIndex + 1;
  if (isShuffle.value) {
    nextIndex = Math.floor(Math.random() * tracks.value.length);
  } else if (nextIndex >= tracks.value.length) {
    nextIndex = 0;
  }
  playTrack(tracks.value[nextIndex]);
};

const skipPrevious = () => {
  if (!tracks.value.length) return;
  const currentIndex = tracks.value.findIndex(
    (t) => t.videoId === activeTrack.value?.videoId
  );
  let prevIndex = currentIndex - 1;
  if (prevIndex < 0) {
    prevIndex = tracks.value.length - 1;
  }
  playTrack(tracks.value[prevIndex]);
};

onMounted(() => {
  loadFeatured();

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
});

onUnmounted(() => {
  stopTicker();
});
</script>

<style scoped>
.brand-toolbar {
  --background: #000000;
}

.header-logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  margin-left: 12px;
  object-fit: cover;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.4px;
  color: #f5f5f7;
  margin: 20px 0 14px;
}

.track-list {
  background: transparent;
  padding: 0;
}

.track-item {
  --background: #1c1c1e;
  --border-color: rgba(255, 255, 255, 0.05);
  margin-bottom: 8px;
  border-radius: 12px;
  overflow: hidden;
}

.track-thumb {
  --border-radius: 8px;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
}

.track-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #f5f5f7;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 0.8rem;
  color: #a1a1a6;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-play-btn {
  --padding-start: 8px;
  --padding-end: 8px;
}

.playback-icon {
  color: #a1a1a6;
  font-size: 20px;
}

.playback-icon.is-active {
  color: #bccbbb; /* DESIGN.md active-playback muted sage */
}

/* Mini Player */
.mini-player {
  position: fixed;
  bottom: 84px;
  left: 16px;
  right: 16px;
  height: 60px;
  background: #1c1c1e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  z-index: 99;
  cursor: pointer;
}

.mini-thumb {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  object-fit: cover;
  margin-right: 12px;
}

.mini-info {
  flex: 1;
  overflow: hidden;
}

.mini-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #f5f5f7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-artist {
  font-size: 0.75rem;
  color: #a1a1a6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-play-btn {
  --color: #f0f0f2;
}

/* Full Music Player Modal (Ref: UI/music-player-UI.jpg) */
.full-player-modal {
  --background: #0e1116;
  --border-radius: 28px 28px 0 0;
}

.now-playing-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px 24px 24px;
  background: #0e1116;
  color: #ffffff;
  position: relative;
  overflow-y: auto;
}

.drag-handle-bar {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 6px 0 12px 0;
  cursor: pointer;
}

.handle-bar {
  width: 38px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.22);
}

.cover-wrapper {
  width: 100%;
  max-width: 320px;
  aspect-ratio: 1 / 1;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
}

.artwork-img {
  width: 100%;
  height: 100%;
  border-radius: 28px;
  object-fit: cover;
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.7);
  transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1);
  transform: scale(0.94);
}

.artwork-img.is-playing {
  transform: scale(1);
}

/* Scrubber / Seek Bar */
.scrubber-section {
  width: 100%;
  max-width: 320px;
  margin: 18px auto 0;
}

.seek-bar-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  position: relative;
  cursor: pointer;
}

.seek-bar-fill {
  height: 100%;
  background: #5b86e5;
  border-radius: 999px;
  transition: width 0.1s linear;
}

.timestamps-row {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #8e8e93;
}

/* Metadata */
.metadata-section {
  width: 100%;
  text-align: center;
  margin: 12px 0 4px;
}

.main-track-title {
  font-size: 23px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 12px;
  letter-spacing: -0.3px;
}

.main-track-artist {
  font-size: 14px;
  font-weight: 400;
  color: #98989e;
  margin: 6px 0 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 12px;
}

.quality-badge-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  color: #a1a1a6;
  letter-spacing: 0.3px;
}

/* Secondary Utilities Row */
.utilities-row {
  width: 100%;
  max-width: 300px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 12px auto 4px;
  padding: 0 6px;
}

.util-btn {
  background: transparent;
  border: none;
  font-size: 21px;
  color: #7c7c82;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  transition: color 0.15s ease;
}

.util-btn.is-active {
  color: #5b86e5;
}

/* Primary Playback Transport Controls */
.playback-controls-row {
  width: 100%;
  max-width: 320px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 12px auto 4px;
}

.dot-btn {
  background: transparent;
  border: none;
  font-size: 22px;
  color: #48484a;
  cursor: pointer;
  line-height: 1;
  padding: 6px;
}

.transport-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skip-btn {
  font-size: 32px;
  color: #ffffff;
  padding: 6px;
  transition: transform 0.1s ease;
}

.skip-btn:active {
  transform: scale(0.9);
}

.main-play-btn {
  width: 52px;
  height: 52px;
  padding: 0;
  transition: transform 0.1s ease;
}

.main-play-btn:active {
  transform: scale(0.92);
}

.pause-bars-icon {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  height: 34px;
}

.pause-bar {
  width: 7px;
  height: 34px;
  background: #ffffff;
  border-radius: 3px;
  display: inline-block;
}

.solid-play-icon {
  font-size: 38px;
  color: #ffffff;
  margin-left: 4px;
}

/* Volume Slider Row */
.volume-slider-row {
  width: 100%;
  max-width: 320px;
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 14px auto 8px;
}

.vol-icon {
  font-size: 18px;
  color: #8e8e93;
}

.vol-track {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  position: relative;
  cursor: pointer;
}

.vol-fill {
  height: 100%;
  background: #5b86e5;
  border-radius: 999px;
  transition: width 0.08s linear;
}

/* Bottom Floating Dock */
.player-bottom-dock {
  width: 100%;
  max-width: 320px;
  height: 56px;
  background: #1c1c1e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 22px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin: 10px auto 4px;
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.45);
}

.dock-action-btn {
  background: transparent;
  border: none;
  font-size: 20px;
  color: #7c7c82;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  transition: color 0.15s ease;
}

.dock-action-btn.dock-active {
  color: #ffffff;
}
</style>
