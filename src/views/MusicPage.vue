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
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
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
} from "@ionic/vue";
import { playOutline, pauseOutline } from "ionicons/icons";
import { TrackItem } from "../plugins";
import { MusicService } from "../services/musicService";
import {
  activeTrack,
  isPlaying,
  playTrack,
  togglePlayPause,
} from "../services/playerService";

const searchQuery = ref("");
const isSearching = ref(false);
const isLoading = ref(true);
const tracks = ref<TrackItem[]>([]);

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
    playTrack(track, tracks.value);
  }
};

onMounted(() => {
  loadFeatured();
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
  padding: 0 0 96px 0; /* Bottom clearance so tracks aren't covered by bottom player */
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
</style>
