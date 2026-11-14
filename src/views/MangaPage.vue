<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Manga</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          placeholder="Search MangaDex..."
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
        <h2 class="section-title">{{ isSearching ? 'Search Results' : 'Popular on MangaDex' }}</h2>
        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="4" v-for="manga in mangaList" :key="manga.id">
              <ion-card class="manga-card" button @click="openManga(manga)">
                <img :src="manga.coverUrl" class="manga-cover" loading="lazy" />
                <ion-card-header>
                  <ion-card-subtitle>{{ manga.latestChapter }}</ion-card-subtitle>
                  <ion-card-title class="card-title">{{ manga.title }}</ion-card-title>
                </ion-card-header>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>

      <!-- Chapter Selection Modal -->
      <ion-modal :is-open="selectedManga !== null" @didDismiss="selectedManga = null">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ selectedManga?.title }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="selectedManga = null">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p class="manga-desc">{{ selectedManga?.description }}</p>

          <div v-if="isLoadingChapters" class="ion-text-center ion-padding">
            <ion-spinner name="crescent"></ion-spinner>
          </div>

          <ion-list v-else>
            <ion-item
              v-for="ch in chapters"
              :key="ch.id"
              button
              @click="readChapter(ch)"
            >
              <ion-label>
                <h3>{{ ch.title }}</h3>
              </ion-label>
              <ion-icon :icon="bookOutline" slot="end"></ion-icon>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
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
import { bookOutline } from 'ionicons/icons';
import { MangaService, MangaItem, ChapterItem } from '../services/mangaService';

const router = useRouter();

const mangaList = ref<MangaItem[]>([]);
const chapters = ref<ChapterItem[]>([]);
const selectedManga = ref<MangaItem | null>(null);

const searchQuery = ref('');
const isSearching = ref(false);
const isLoading = ref(true);
const isLoadingChapters = ref(false);

const loadPopular = async () => {
  isLoading.value = true;
  isSearching.value = false;
  try {
    mangaList.value = await MangaService.getPopularManga();
  } catch (err) {
    console.error('Failed to load MangaDex popular:', err);
  } finally {
    isLoading.value = false;
  }
};

const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    loadPopular();
    return;
  }
  isLoading.value = true;
  isSearching.value = true;
  try {
    mangaList.value = await MangaService.searchManga(searchQuery.value);
  } catch (err) {
    console.error('Failed to search MangaDex:', err);
  } finally {
    isLoading.value = false;
  }
};

const openManga = async (manga: MangaItem) => {
  selectedManga.value = manga;
  isLoadingChapters.value = true;
  try {
    chapters.value = await MangaService.getChapters(manga.id);
  } catch (err) {
    console.error('Failed to fetch chapters:', err);
  } finally {
    isLoadingChapters.value = false;
  }
};

const readChapter = (ch: ChapterItem) => {
  if (!selectedManga.value) return;
  const mangaId = selectedManga.value.id;
  selectedManga.value = null;
  router.push(`/manga/${mangaId}/chapter/${ch.id}`);
};

onMounted(() => {
  loadPopular();
});
</script>

<style scoped>
.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.manga-card {
  --background: #18181c;
  margin: 0;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.manga-cover {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  display: block;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #f4f4f5;
  margin-top: 4px;
}

.manga-desc {
  font-size: 0.9rem;
  color: #a1a1aa;
  margin-bottom: 16px;
  line-height: 1.4;
  max-height: 120px;
  overflow-y: auto;
}
</style>
