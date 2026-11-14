<template>
  <ion-page class="tabs-container-page">
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>

      <!-- Persistent Mini Player sitting still at the bottom above the dock -->
      <div
        v-if="activeTrack"
        class="still-mini-player"
        @click="openFullPlayer"
      >
        <!-- Sleek Progress Style Bar on top of mini player -->
        <div class="mini-progress-track">
          <div
            class="mini-progress-bar"
            :style="{ width: progressPercent + '%' }"
          ></div>
        </div>

        <div class="mini-player-body">
          <img
            :src="activeTrack.artworkUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80'"
            class="mini-thumb"
            alt="artwork"
          />
          <div class="mini-info">
            <div class="mini-title">{{ activeTrack.title }}</div>
            <div class="mini-artist">{{ activeTrack.artist }}</div>
          </div>

          <div class="mini-actions" @click.stop>
            <button
              class="mini-action-btn"
              @click="togglePlayPause"
              aria-label="Play or Pause"
            >
              <div v-if="isPlaying" class="mini-pause-icon">
                <span class="mini-pause-bar"></span>
                <span class="mini-pause-bar"></span>
              </div>
              <ion-icon v-else :icon="play" class="mini-play-icon"></ion-icon>
            </button>

            <button
              class="mini-action-btn"
              @click="skipNext"
              aria-label="Next track"
            >
              <ion-icon :icon="playForward" class="mini-next-icon"></ion-icon>
            </button>

            <button
              class="mini-action-btn mini-close-btn"
              @click="stopPlayback"
              aria-label="Close music"
            >
              <ion-icon :icon="closeOutline" class="mini-close-icon"></ion-icon>
            </button>
          </div>
        </div>
      </div>

      <ion-tab-bar slot="bottom" class="custom-tab-bar">
        <ion-tab-button tab="music" href="/tabs/music">
          <ion-icon :icon="musicalNotes" />
          <ion-label>Music</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="anime" href="/tabs/anime">
          <ion-icon :icon="tvOutline" />
          <ion-label>Anime</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="manga" href="/tabs/manga">
          <ion-icon :icon="bookOutline" />
          <ion-label>Manga</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="library" href="/tabs/library">
          <ion-icon :icon="bookmarkOutline" />
          <ion-label>Library</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>

    <!-- Full Music Player Modal (Look-alike to UI/music-player-UI.jpg) -->
    <ion-modal
      :is-open="isFullPlayerOpen"
      @didDismiss="closeFullPlayer"
      class="full-player-modal"
      :initial-breakpoint="1"
      :breakpoints="[0, 1]"
    >
      <div class="now-playing-container" v-if="activeTrack">
        <!-- Top Dismiss & Stop Bar -->
        <div class="full-player-top-bar">
          <button class="top-nav-btn" @click="closeFullPlayer" aria-label="Minimize">
            <ion-icon :icon="chevronDownOutline" class="top-nav-icon"></ion-icon>
          </button>
          <div class="drag-handle-bar" @click="closeFullPlayer">
            <span class="handle-bar"></span>
          </div>
          <button class="top-nav-btn top-close-btn" @click="stopPlayback" aria-label="Stop and close music">
            <ion-icon :icon="closeOutline" class="top-nav-icon"></ion-icon>
          </button>
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
          <button class="dock-action-btn" @click="closeFullPlayer">
            <ion-icon :icon="gridOutline"></ion-icon>
          </button>
          <button
            class="dock-action-btn"
            :class="{ 'dock-active': isEqActive }"
            @click="isEqActive = !isEqActive"
          >
            <ion-icon :icon="barChartOutline"></ion-icon>
          </button>
          <button class="dock-action-btn" @click="closeFullPlayer">
            <ion-icon :icon="searchOutline"></ion-icon>
          </button>
          <button class="dock-action-btn" @click="closeFullPlayer">
            <ion-icon :icon="menuOutline"></ion-icon>
          </button>
        </div>
      </div>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonLabel,
  IonIcon,
  IonPage,
  IonRouterOutlet,
  IonModal,
} from "@ionic/vue";
import {
  musicalNotes,
  tvOutline,
  bookOutline,
  bookmarkOutline,
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
  closeOutline,
  chevronDownOutline,
} from "ionicons/icons";
import {
  activeTrack,
  isPlaying,
  isFullPlayerOpen,
  currentPositionMs,
  totalDurationMs,
  volume,
  isEqActive,
  isTimerActive,
  isRepeat,
  isShuffle,
  progressPercent,
  formatTime,
  togglePlayPause,
  seekTo,
  setVolume,
  skipNext,
  skipPrevious,
  openFullPlayer,
  closeFullPlayer,
  stopPlayback,
} from "../services/playerService";

const handleSeekClick = async (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
  const newPos = Math.round(ratio * totalDurationMs.value);
  await seekTo(newPos);
};

const handleVolumeClick = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const newVol = Math.max(0, Math.min(1, clickX / rect.width));
  setVolume(newVol);
};
</script>

<style scoped>
.custom-tab-bar {
  --background: #1c1c1e;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 0 12px 10px 12px;
  border-radius: 16px;
  height: 64px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  contain: content;
}

ion-tab-button {
  --color: #a1a1a6;
  --color-selected: #f0f0f2;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: -0.2px;
  transition: all 0.2s ease-in-out;
}

ion-tab-button.tab-selected ion-icon {
  transform: scale(1.08);
}

/* Persistent Mini Player sitting still at the bottom */
.still-mini-player {
  position: fixed;
  bottom: 84px;
  left: 12px;
  right: 12px;
  height: 62px;
  background: rgba(28, 28, 30, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.65);
  z-index: 9999;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Sleek Progress Style Bar */
.mini-progress-track {
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.12);
  position: relative;
}

.mini-progress-bar {
  height: 100%;
  background: #5b86e5;
  border-radius: 0 2px 2px 0;
  transition: width 0.15s linear;
}

.mini-player-body {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 12px;
}

.mini-thumb {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.mini-info {
  flex: 1;
  overflow: hidden;
}

.mini-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: #f5f5f7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.2px;
}

.mini-artist {
  font-size: 0.76rem;
  color: #a1a1a6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.mini-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-action-btn {
  background: transparent;
  border: none;
  color: #ffffff;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-pause-icon {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  height: 20px;
}

.mini-pause-bar {
  width: 4px;
  height: 18px;
  background: #ffffff;
  border-radius: 2px;
}

.mini-play-icon {
  font-size: 24px;
  color: #ffffff;
}

.mini-next-icon {
  font-size: 22px;
  color: #a1a1a6;
}

.mini-close-btn {
  color: #8e8e93;
  margin-left: 2px;
}

.mini-close-btn:active {
  color: #ffffff;
}

.mini-close-icon {
  font-size: 20px;
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

.full-player-top-bar {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0 10px 0;
}

.top-nav-btn {
  background: transparent;
  border: none;
  color: #a1a1a6;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.top-nav-btn:active {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.top-nav-icon {
  font-size: 24px;
}

.drag-handle-bar {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 6px 0;
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
