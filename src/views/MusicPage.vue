<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Music</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          placeholder="Search YouTube Music..."
          @keyup.enter="handleSearch"
          :debounce="500"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="isLoading" class="ion-text-center ion-padding">
        <ion-spinner name="crescent"></ion-spinner>
      </div>

      <ion-list v-else lines="full" class="track-list">
        <ion-item
          v-for="track in tracks"
          :key="track.videoId"
          button
          @click="playTrack(track)"
          class="track-item"
        >
          <ion-thumbnail slot="start" class="track-thumb">
            <img :src="track.artworkUrl || 'https://via.placeholder.com/64'" alt="cover" />
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

const searchQuery = ref('');
const isLoading = ref(false);
const isPlaying = ref(false);
const activeTrack = ref<TrackItem | null>(null);

const tracks = ref<TrackItem[]>([
  {
    videoId: 'kJQP7kiw5Fk',
    title: 'Despacito',
    artist: 'Luis Fonsi ft. Daddy Yankee',
    artworkUrl: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
  },
  {
    videoId: 'fJ9rUzIMcZQ',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    artworkUrl: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
  },
  {
    videoId: 'OPf0YbXqDm0',
    title: 'Uptown Funk',
    artist: 'Mark Ronson ft. Bruno Mars',
    artworkUrl: 'https://i.ytimg.com/vi/OPf0YbXqDm0/hqdefault.jpg',
  },
]);

const handleSearch = async () => {
  if (!searchQuery.value.trim()) return;
  isLoading.value = true;
  try {
    // Basic YouTube Music query mock or InnerTube search
    tracks.value = [
      {
        videoId: 'dQw4w9WgXcQ',
        title: `${searchQuery.value} - Result 1`,
        artist: 'Popular Artist',
        artworkUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      },
      {
        videoId: '9bZkp7q19f0',
        title: `${searchQuery.value} - Result 2`,
        artist: 'Featured Musician',
        artworkUrl: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
      },
    ];
  } finally {
    isLoading.value = false;
  }
};

const playTrack = async (track: TrackItem) => {
  activeTrack.value = track;
  isLoading.value = true;
  try {
    // 1. Resolve on-device via NewPipeExtractor native plugin
    let streamUrl = track.streamUrl;
    try {
      const resolved = await NewPipeExtractor.resolveAudio({ videoId: track.videoId });
      if (resolved && resolved.streamUrl) {
        streamUrl = resolved.streamUrl;
      }
    } catch (e) {
      console.warn('Native NewPipe extractor fallback/error:', e);
    }

    // 2. Play through native MediaSession foreground service
    await MediaSession.playTrack({
      track: {
        ...track,
        streamUrl: streamUrl || '',
      },
    });

    isPlaying.value = true;
  } catch (err) {
    console.error('Failed to play track:', err);
  } finally {
    isLoading.value = false;
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
.track-list {
  background: transparent;
}

.track-item {
  --background: #111114;
  --border-color: #1a1a20;
  margin-bottom: 4px;
  border-radius: 8px;
}

.track-thumb {
  --border-radius: 6px;
  width: 52px;
  height: 52px;
}

.track-title {
  font-size: 1rem;
  font-weight: 600;
  color: #f4f4f5;
  margin: 0;
}

.track-artist {
  font-size: 0.85rem;
  color: #a1a1aa;
  margin-top: 4px;
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
