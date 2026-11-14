<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Anime</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          placeholder="Search Kitsu Anime..."
          @keyup.enter="handleSearch"
          :debounce="500"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="isLoading" class="ion-text-center ion-padding">
        <ion-spinner name="crescent"></ion-spinner>
      </div>

      <div v-else class="ion-padding">
        <h2 class="section-title">{{ isSearching ? 'Search Results' : 'Trending Anime' }}</h2>
        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="4" v-for="item in animeList" :key="item.id">
              <ion-card class="anime-card" button @click="selectAnime(item)">
                <img :src="item.thumbnail" class="anime-poster" loading="lazy" />
                <ion-card-header>
                  <ion-card-subtitle>{{ item.episodes }} Episodes <span v-if="item.rating">· {{ item.rating }}</span></ion-card-subtitle>
                  <ion-card-title class="card-title">{{ item.name }}</ion-card-title>
                </ion-card-header>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>

      <!-- Episode Modal -->
      <ion-modal :is-open="selectedAnime !== null" @didDismiss="selectedAnime = null">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ selectedAnime?.name }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="selectedAnime = null">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p class="anime-synopsis">{{ selectedAnime?.synopsis }}</p>
          
          <h3>Episodes</h3>
          <div v-if="isLoadingEpisodes" class="ion-text-center ion-padding">
            <ion-spinner name="crescent"></ion-spinner>
          </div>

          <ion-list v-else>
            <ion-item
              v-for="ep in episodes"
              :key="ep.id"
              button
              @click="playEpisode(ep)"
            >
              <ion-label>
                <h3>{{ ep.title }}</h3>
              </ion-label>
              <ion-icon :icon="playOutline" slot="end" color="primary"></ion-icon>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-modal>
    </ion-content>
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
  IonSpinner,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonModal,
  IonButtons,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
} from '@ionic/vue';
import { playOutline } from 'ionicons/icons';
import { VideoPlayer } from '../plugins';
import { AnimeService, AnimeItem, AnimeEpisodeItem } from '../services/animeService';

const searchQuery = ref('');
const isSearching = ref(false);
const isLoading = ref(true);
const isLoadingEpisodes = ref(false);

const animeList = ref<AnimeItem[]>([]);
const episodes = ref<AnimeEpisodeItem[]>([]);
const selectedAnime = ref<AnimeItem | null>(null);

const loadTrending = async () => {
  isLoading.value = true;
  isSearching.value = false;
  try {
    animeList.value = await AnimeService.getTrendingAnime();
  } catch (err) {
    console.error('Failed to load trending anime:', err);
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
    animeList.value = await AnimeService.searchAnime(searchQuery.value);
  } catch (err) {
    console.error('Failed to search anime:', err);
  } finally {
    isLoading.value = false;
  }
};

const selectAnime = async (item: AnimeItem) => {
  selectedAnime.value = item;
  isLoadingEpisodes.value = true;
  try {
    episodes.value = await AnimeService.getEpisodes(item.id);
  } catch (err) {
    console.error('Failed to load episodes:', err);
  } finally {
    isLoadingEpisodes.value = false;
  }
};

const playEpisode = async (ep: AnimeEpisodeItem) => {
  if (!selectedAnime.value) return;

  // Real HLS stream URL for native ExoPlayer
  const sampleHlsStream = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

  try {
    await VideoPlayer.playVideo({
      url: sampleHlsStream,
      title: `${selectedAnime.value.name} - ${ep.title}`,
      headers: {
        'Referer': 'https://allanime.to',
        'User-Agent': 'Mozilla/5.0 (Android; Mobile)',
      },
      positionMs: 0,
    });
  } catch (err) {
    console.error('VideoPlayer launch error:', err);
  }
};

onMounted(() => {
  loadTrending();
});
</script>

<style scoped>
.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.anime-card {
  --background: #18181c;
  margin: 0;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.anime-poster {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  display: block;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.2;
  color: #f4f4f5;
  margin-top: 4px;
}

.anime-synopsis {
  font-size: 0.9rem;
  color: #a1a1aa;
  margin-bottom: 16px;
  line-height: 1.4;
  max-height: 140px;
  overflow-y: auto;
}
</style>
