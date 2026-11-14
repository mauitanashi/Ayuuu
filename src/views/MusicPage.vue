<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
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
        <h2 class="section-title">{{ isSearching ? 'Search Results' : 'Featured Tracks' }}</h2>
        <ion-list lines="full" class="track-list">
          <ion-item
            v-for="track in tracks"
            :key="track.videoId"
            button
            @click="playTrack(track)"
            class="track-item"
          >
            <ion-thumbnail slot="start" class="track-thumb">
              <img :src="track.artworkUrl || 'https://via.placeholder.com/64'" alt="cover" loading="lazy" />
            </ion-thumbnail>
            <ion-label>
              <h3 class="track-title">{{ track.title }}</h3>
              <p class="track-artist">{{ track.artist }}</p>
            </ion-label>
            <ion-icon
              slot="end"
              :icon="activeTrack?.videoId === track.videoId && isPlaying ? pauseOutline : playOutline"
              color="primary"
            ></ion-icon>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>

    <!-- Mini Player Footer -->
    <div v-if="activeTrack" class="mini-player">
      <img :src="activeTrack.artworkUrl" class="mini-thumb" />
      <div class="mini-info">
        <div class="mini-title">{{ activeTrack.title }}</div>
        <div class="mini-artist">{{ activeTrack.artist }}</div>
      </div>
      <ion-button fill="clear" @click="togglePlayPause">
        <ion-icon :icon="isPlaying ? pauseOutline : playOutline" slot="icon-only"></ion-icon>
      </ion-button>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
} from '@ionic/vue';
import { playOutline, pauseOutline } from 'ionicons/icons';
import { NewPipeExtractor, MediaSession, TrackItem } from '../plugins';
import { MusicService } from '../services/musicService';

const searchQuery = ref('');
const isSearching = ref(false);
const isLoading = ref(true);
const isPlaying = ref(false);
const activeTrack = ref<TrackItem | null>(null);
const tracks = ref<TrackItem[]>([]);

const loadTrending = async () => {
  isLoading.value = true;
  isSearching.value = false;
  try {
    tracks.value = await MusicService.getTrendingMusic();
  } catch (err) {
    console.error('Failed to load trending music:', err);
  } finally {
    isLoading.value = false;
  }
};

const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    loadTrending();
    return;
  }
  isLoading.value = true;
  isSearching.value = true;
  try {
    tracks.value = await MusicService.searchMusic(searchQuery.value);
  } catch (err) {
    console.error('Failed to search music:', err);
  } finally {
    isLoading.value = false;
  }
};

const playTrack = async (track: TrackItem) => {
  activeTrack.value = track;
  isLoading.value = true;
  try {
    let streamUrl = track.streamUrl;

    // Try resolving with NewPipeExtractor native plugin
    try {
      const resolved = await NewPipeExtractor.resolveAudio({ videoId: track.videoId });
      if (resolved && resolved.streamUrl) {
        streamUrl = resolved.streamUrl;
      }
    } catch (e) {
      console.warn('Native NewPipe extractor fallback/preview stream used:', e);
    }

    // Play through native MediaSession foreground service (or HTML5 audio fallback)
    try {
      await MediaSession.playTrack({
        track: {
          ...track,
          streamUrl: streamUrl || '',
        },
      });
    } catch (e) {
      // Web browser preview audio fallback
      if (streamUrl) {
        const audio = new Audio(streamUrl);
        audio.play();
      }
    }

    isPlaying.value = true;
  } catch (err) {
    console.error('Failed to play track:', err);
  } finally {
    isLoading.value = false;
  }
};

const togglePlayPause = async () => {
  if (isPlaying.value) {
    try {
      await MediaSession.pause();
    } catch (e) {}
    isPlaying.value = false;
  } else {
    try {
      await MediaSession.resume();
    } catch (e) {}
    isPlaying.value = true;
  }
};

onMounted(() => {
  loadTrending();
  try {
    MediaSession.addListener('playbackStateChange', (state) => {
      isPlaying.value = state.isPlaying;
      if (state.currentTrack) {
        activeTrack.value = state.currentTrack;
      }
    });
  } catch (e) {
    // Web fallback
  }
});
</script>

<style scoped>
.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 16px 0 12px;
}

.track-list {
  background: transparent;
}

.track-item {
  --background: #111114;
  --border-color: #1a1a20;
  margin-bottom: 6px;
  border-radius: 8px;
}

.track-thumb {
  --border-radius: 6px;
  width: 52px;
  height: 52px;
}

.track-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #f4f4f5;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 0.8rem;
  color: #a1a1aa;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-player {
  position: fixed;
  bottom: 56px;
  left: 0;
  right: 0;
  height: 60px;
  background: #18181c;
  border-top: 1px solid #27272a;
  display: flex;
  align-items: center;
  padding: 0 16px;
  z-index: 100;
}

.mini-thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-artist {
  font-size: 0.75rem;
  color: #a1a1aa;
}
</style>
