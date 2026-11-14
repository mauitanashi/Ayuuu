<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar class="brand-toolbar">
        <ion-buttons slot="start">
          <img src="/logo.png" alt="Ayuuu" class="header-logo" />
        </ion-buttons>
        <ion-title>Anime</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          :value="searchQuery"
          placeholder="Search anime by title..."
          @ionInput="onSearchInput($event)"
          @keydown.enter="onSearchEnter($event)"
          @ionClear="onSearchClear"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="isLoading" class="ion-text-center ion-padding">
        <ion-spinner name="crescent"></ion-spinner>
      </div>

      <div v-else class="ion-padding">
        <h2 class="section-title">{{ isSearching ? 'Search Results' : 'Trending Anime' }}</h2>
        <ion-grid class="anime-grid">
          <ion-row>
            <ion-col size="6" size-md="4" v-for="item in animeList" :key="item.id">
              <ion-card class="anime-card" button @click="selectAnime(item)">
                <img :src="item.thumbnail" class="anime-poster" loading="lazy" />
                <ion-card-header>
                  <ion-card-subtitle class="card-subtitle">{{ item.episodes }} Episodes <span v-if="item.rating">· {{ item.rating }}</span></ion-card-subtitle>
                  <ion-card-title class="card-title">{{ item.name }}</ion-card-title>
                </ion-card-header>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>

      <!-- Episode Modal -->
      <ion-modal :is-open="selectedAnime !== null" @didDismiss="selectedAnime = null" class="episode-modal">
        <ion-header>
          <ion-toolbar class="modal-toolbar">
            <ion-title>{{ selectedAnime?.name }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="selectedAnime = null">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p class="anime-synopsis">{{ selectedAnime?.synopsis }}</p>
          
          <h3 class="modal-section-title">Episodes</h3>
          <div v-if="isLoadingEpisodes" class="ion-text-center ion-padding">
            <ion-spinner name="crescent"></ion-spinner>
          </div>

          <div v-else>
            <ion-list lines="none" class="episode-list">
              <ion-item
                v-for="ep in paginatedEpisodes"
                :key="ep.id"
                button
                @click="playEpisode(ep)"
                class="episode-item"
              >
                <ion-label>
                  <h3>{{ ep.title }}</h3>
                </ion-label>
                <ion-spinner v-if="resolvingEpId === ep.id" name="crescent" slot="end" class="ep-spinner"></ion-spinner>
                <ion-icon v-else :icon="playCircleOutline" slot="end" class="ep-play-icon"></ion-icon>
              </ion-item>
            </ion-list>

            <div v-if="episodes.length === 0" class="no-episodes-msg ion-padding">
              <p>No episodes available for this anime.</p>
            </div>

            <!-- Pagination Bar (10 per page) -->
            <div class="episode-pagination" v-if="episodes.length > 0">
              <div class="page-controls">
                <ion-button
                  size="small"
                  fill="outline"
                  :disabled="episodePage <= 1"
                  @click="goToEpisodePage(episodePage - 1)"
                >
                  Prev
                </ion-button>

                <span class="page-number-text">
                  Page {{ episodePage }} / {{ totalEpisodePages }}
                  <span class="total-count">({{ episodes.length }} eps)</span>
                </span>

                <ion-button
                  size="small"
                  fill="outline"
                  :disabled="episodePage >= totalEpisodePages"
                  @click="goToEpisodePage(episodePage + 1)"
                >
                  Next
                </ion-button>
              </div>

              <!-- Quick jump buttons if more than 2 pages -->
              <div class="quick-jump-actions" v-if="totalEpisodePages > 2">
                <ion-button
                  size="small"
                  fill="clear"
                  :disabled="episodePage === 1"
                  @click="goToEpisodePage(1)"
                >
                  « First
                </ion-button>
                <ion-button
                  size="small"
                  fill="clear"
                  :disabled="episodePage === totalEpisodePages"
                  @click="goToEpisodePage(totalEpisodePages)"
                >
                  Last »
                </ion-button>
              </div>
            </div>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
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
  IonSpinner,
} from '@ionic/vue';
import { playCircleOutline } from 'ionicons/icons';
import { VideoPlayer } from '../plugins';
import { AnimeService, AnimeItem, AnimeEpisodeItem } from '../services/animeService';

const searchQuery = ref('');
const isSearching = ref(false);
const isLoading = ref(true);
const isLoadingEpisodes = ref(false);
const resolvingEpId = ref<string | null>(null);

const animeList = ref<AnimeItem[]>([]);
const episodes = ref<AnimeEpisodeItem[]>([]);
const selectedAnime = ref<AnimeItem | null>(null);

const episodePage = ref(1);
const episodePageSize = 10;
const totalEpisodePages = computed(() => Math.ceil(episodes.value.length / episodePageSize) || 1);

const paginatedEpisodes = computed(() => {
  const start = (episodePage.value - 1) * episodePageSize;
  return episodes.value.slice(start, start + episodePageSize);
});

const goToEpisodePage = (page: number) => {
  if (page < 1 || page > totalEpisodePages.value) return;
  episodePage.value = page;
};

const onSearchInput = (ev: CustomEvent) => {
  searchQuery.value = (ev.detail?.value as string) || '';
};

const onSearchEnter = (ev: any) => {
  const val = ev?.target?.value !== undefined ? ev.target.value : searchQuery.value;
  searchQuery.value = (val || '').trim();
  handleSearch();
};

const onSearchClear = () => {
  searchQuery.value = '';
  loadTrending();
};

const loadTrending = async () => {
  isLoading.value = true;
  isSearching.value = false;
  try {
    animeList.value = await AnimeService.getTrendingAnime();
  } catch (err) {
    console.error('Failed to load anime:', err);
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
    console.error('Anime search failed:', err);
  } finally {
    isLoading.value = false;
  }
};

const selectAnime = async (anime: AnimeItem) => {
  selectedAnime.value = anime;
  episodePage.value = 1;
  isLoadingEpisodes.value = true;
  episodes.value = [];
  try {
    episodes.value = await AnimeService.getEpisodes(anime.id, anime.name);
  } catch (err) {
    console.error('Failed to fetch episodes:', err);
  } finally {
    isLoadingEpisodes.value = false;
  }
};

const playEpisode = async (ep: AnimeEpisodeItem) => {
  if (!selectedAnime.value || resolvingEpId.value) return;

  resolvingEpId.value = ep.id;
  try {
    const stream = await AnimeService.getEpisodeStream(
      ep.id,
      selectedAnime.value.name,
      ep.number
    );

    const playUrl = stream.embedUrl || stream.streamUrl;

    await VideoPlayer.playVideo({
      url: playUrl,
      title: `${selectedAnime.value.name} - ${ep.title}`,
      headers: stream.headers,
      positionMs: 0,
    });
  } catch (err) {
    console.error('Failed to play episode stream:', err);
  } finally {
    resolvingEpId.value = null;
  }
};

onMounted(() => {
  loadTrending();
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
  margin-bottom: 14px;
}

.anime-grid {
  padding: 0;
}

.anime-card {
  --background: #1c1c1e;
  margin: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  transition: transform 0.15s ease-in-out;
}

.anime-poster {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  display: block;
  background-color: #141416;
}

.card-subtitle {
  font-size: 0.75rem;
  color: #a1a1a6;
  font-weight: 500;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
  color: #f5f5f7;
  margin-top: 4px;
}

.modal-toolbar {
  --background: #1c1c1e;
}

.modal-section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f5f5f7;
  margin: 20px 0 12px;
}

.anime-synopsis {
  font-size: 0.9rem;
  color: #a1a1a6;
  margin-bottom: 16px;
  line-height: 1.5;
  max-height: 140px;
  overflow-y: auto;
}

.episode-list {
  background: transparent;
}

.episode-item {
  --background: #1c1c1e;
  --border-color: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  margin-bottom: 6px;
}

.ep-play-icon {
  color: #f0f0f2;
}

.ep-spinner {
  width: 22px;
  height: 22px;
  color: #5b86e5;
}

.episode-pagination {
  margin-top: 16px;
  padding-bottom: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.page-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 320px;
}

.page-number-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: #f5f5f7;
  text-align: center;
}

.total-count {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  color: #a1a1a6;
}

.quick-jump-actions {
  display: flex;
  gap: 16px;
}

.no-episodes-msg {
  text-align: center;
  color: #a1a1a6;
  font-size: 0.9rem;
}
</style>
