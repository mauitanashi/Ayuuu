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
            @click="playTrack(track)"
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
            <ion-icon
              slot="end"
              :icon="
                activeTrack?.videoId === track.videoId && isPlaying
                  ? pauseOutline
                  : playOutline
              "
              class="playback-icon"
              :class="{ 'is-active': activeTrack?.videoId === track.videoId }"
            ></ion-icon>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>

    <!-- Mini Player Footer (Floating above dock per DESIGN.md) -->
    <div v-if="activeTrack" class="mini-player">
      <img :src="activeTrack.artworkUrl" class="mini-thumb" />
      <div class="mini-info">
        <div class="mini-title">{{ activeTrack.title }}</div>
        <div class="mini-artist">{{ activeTrack.artist }}</div>
      </div>
      <ion-button fill="clear" @click="togglePlayPause" class="mini-play-btn">
        <ion-icon
          :icon="isPlaying ? pauseOutline : playOutline"
          slot="icon-only"
        ></ion-icon>
      </ion-button>
    </div>
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
import { NewPipeExtractor, MediaSession, TrackItem } from "../plugins";
import { MusicService } from "../services/musicService";

const searchQuery = ref("");
const isSearching = ref(false);
const isLoading = ref(true);
const isPlaying = ref(false);

const activeTrack = ref<TrackItem | null>(null);
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

const playTrack = async (track: TrackItem) => {
  activeTrack.value = track;
  isPlaying.value = true;

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
  }
};

const togglePlayPause = async () => {
  if (isPlaying.value) {
    await MediaSession.pause();
    isPlaying.value = false;
  } else {
    await MediaSession.resume();
    isPlaying.value = true;
  }
};

onMounted(() => {
  loadFeatured();

  MediaSession.addListener("playbackStateChange", (state: any) => {
    isPlaying.value = state.isPlaying;
  });
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

.playback-icon {
  color: #a1a1a6;
  font-size: 20px;
}

.playback-icon.is-active {
  color: #bccbbb; /* DESIGN.md active-playback muted sage */
}

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
</style>
