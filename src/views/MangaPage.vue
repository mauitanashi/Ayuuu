<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar class="brand-toolbar">
        <ion-buttons slot="start">
          <img src="/logo.png" alt="Ayuuu" class="header-logo" />
        </ion-buttons>
        <ion-title>Manga</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          :value="searchQuery"
          placeholder="Search manga by title..."
          @ionInput="onSearchInput($event)"
          @keydown.enter="onSearchEnter($event)"
          @ionClear="onSearchClear"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="isLoading" class="center-spinner ion-padding">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p class="status-msg">Loading catalog...</p>
      </div>

      <div v-else-if="error" class="center-spinner ion-padding">
        <p class="error-msg">{{ error }}</p>
        <ion-button fill="outline" color="primary" @click="loadPopular">Retry</ion-button>
      </div>

      <div v-else class="ion-padding">
        <h2 class="section-title">{{ isSearching ? 'Search Results' : 'Popular Manga' }}</h2>
        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="4" v-for="manga in mangaList" :key="manga.id">
              <ion-card class="manga-card" button @click="openManga(manga)">
                <img
                  :src="manga.coverUrl"
                  class="manga-cover"
                  loading="lazy"
                  @error="onCoverError($event)"
                />
                <ion-card-header>
                  <ion-card-subtitle>{{ manga.latestChapter }}</ion-card-subtitle>
                  <ion-card-title class="card-title">{{ manga.title }}</ion-card-title>
                </ion-card-header>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>

        <!-- Next Page / Infinite Scroll -->
        <ion-infinite-scroll :disabled="!hasMore" @ionInfinite="loadNextPage($event)">
          <ion-infinite-scroll-content
            loading-spinner="crescent"
            loading-text="Loading more manga..."
          ></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </div>

      <!-- Chapter Selection Modal -->
      <ion-modal :is-open="selectedManga !== null" @didDismiss="closeModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ selectedManga?.title }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeModal">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p class="manga-desc">{{ selectedManga?.description || 'No description available.' }}</p>

          <div v-if="isLoadingChapters" class="center-spinner ion-padding">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p class="status-msg">Loading chapters...</p>
          </div>

          <div v-else-if="chapters.length === 0" class="center-spinner ion-padding">
            <p class="status-msg">No readable chapters available for this title.</p>
          </div>

          <div v-else>
            <!-- Chapter Search & Sort Controls -->
            <div class="chapter-toolbar">
              <ion-searchbar
                v-model="chapterFilter"
                placeholder="Filter chapter (e.g. 1000)..."
                :debounce="150"
                class="chapter-searchbar"
              ></ion-searchbar>
              <ion-button
                fill="outline"
                size="small"
                class="sort-toggle-btn"
                @click="toggleSortOrder"
              >
                <ion-icon :icon="swapVerticalOutline" slot="start"></ion-icon>
                {{ isSortAsc ? 'Oldest' : 'Newest' }}
              </ion-button>
            </div>

            <!-- Chapter List (10 per page) -->
            <ion-list>
              <ion-item
                v-for="ch in paginatedChapters"
                :key="ch.id"
                button
                @click="readChapter(ch)"
              >
                <ion-label>
                  <h3>{{ ch.title }}</h3>
                </ion-label>
                <ion-icon :icon="bookOutline" slot="end" color="primary"></ion-icon>
              </ion-item>
            </ion-list>

            <div v-if="filteredChapters.length === 0" class="no-chapters-msg ion-padding">
              <p>No chapters found matching "{{ chapterFilter }}".</p>
            </div>

            <!-- Pagination Bar (10 per page) -->
            <div class="chapter-pagination" v-if="filteredChapters.length > 0">
              <div class="page-controls">
                <ion-button
                  size="small"
                  fill="outline"
                  :disabled="chapterPage <= 1"
                  @click="goToChapterPage(chapterPage - 1)"
                >
                  Prev
                </ion-button>

                <span class="page-number-text">
                  Page {{ chapterPage }} / {{ totalChapterPages }}
                  <span class="total-chapter-count">({{ filteredChapters.length }} chapters)</span>
                </span>

                <ion-button
                  size="small"
                  fill="outline"
                  :disabled="chapterPage >= totalChapterPages"
                  @click="goToChapterPage(chapterPage + 1)"
                >
                  Next
                </ion-button>
              </div>

              <!-- Quick jump buttons for long manga (e.g. One Piece) -->
              <div class="quick-jump-actions" v-if="totalChapterPages > 2">
                <ion-button
                  size="small"
                  fill="clear"
                  :disabled="chapterPage === 1"
                  @click="goToChapterPage(1)"
                >
                  First Page
                </ion-button>
                <ion-button
                  size="small"
                  fill="clear"
                  :disabled="chapterPage === totalChapterPages"
                  @click="goToChapterPage(totalChapterPages)"
                >
                  Last Page
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
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
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
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  onIonViewDidEnter,
} from '@ionic/vue';
import { bookOutline, swapVerticalOutline } from 'ionicons/icons';
import { MangaService, MangaItem, ChapterItem } from '../services/mangaService';

const router = useRouter();
const route = useRoute();

const mangaList = ref<MangaItem[]>([]);
const chapters = ref<ChapterItem[]>([]);
const selectedManga = ref<MangaItem | null>(null);

const searchQuery = ref('');
const isSearching = ref(false);
const isLoading = ref(true);
const isLoadingChapters = ref(false);
const error = ref<string | null>(null);

const offset = ref(0);
const hasMore = ref(true);

// Chapter pagination & filtering state (10 per page)
const chapterPage = ref(1);
const chapterPageSize = 10;
const chapterFilter = ref('');
const isSortAsc = ref(false); // default Newest First

const fallbackCover = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80';

const onCoverError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  if (target && target.src !== fallbackCover) {
    target.src = fallbackCover;
  }
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
  loadPopular();
};

const loadPopular = async () => {
  isLoading.value = true;
  isSearching.value = false;
  error.value = null;
  offset.value = 0;
  hasMore.value = true;
  try {
    mangaList.value = await MangaService.getPopularManga(24, 0);
    if (mangaList.value.length < 24) {
      hasMore.value = false;
    }
  } catch (err: any) {
    console.error('Failed to load manga:', err);
    error.value = 'Failed to load catalog. Please check your connection.';
  } finally {
    isLoading.value = false;
  }
};

const handleSearch = async () => {
  const query = searchQuery.value.trim();
  if (!query) {
    loadPopular();
    return;
  }
  isLoading.value = true;
  isSearching.value = true;
  error.value = null;
  offset.value = 0;
  hasMore.value = true;
  try {
    mangaList.value = await MangaService.searchManga(query, 24, 0);
    if (mangaList.value.length < 24) {
      hasMore.value = false;
    }
  } catch (err: any) {
    console.error('Failed to search manga:', err);
    error.value = 'Search failed. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

const loadNextPage = async (ev: any) => {
  try {
    const nextOffset = offset.value + 24;
    const more = isSearching.value
      ? await MangaService.searchManga(searchQuery.value, 24, nextOffset)
      : await MangaService.getPopularManga(24, nextOffset);

    if (more.length === 0) {
      hasMore.value = false;
    } else {
      offset.value = nextOffset;
      mangaList.value.push(...more);
      if (more.length < 24) {
        hasMore.value = false;
      }
    }
  } catch (err) {
    console.error('Failed to load next page:', err);
  } finally {
    ev.target?.complete();
  }
};

const openManga = async (manga: MangaItem) => {
  selectedManga.value = manga;
  isLoadingChapters.value = true;
  chapters.value = [];
  chapterPage.value = 1;
  chapterFilter.value = '';
  try {
    chapters.value = await MangaService.getChapters(manga.id, manga.title);
  } catch (err) {
    console.error('Failed to fetch chapters:', err);
  } finally {
    isLoadingChapters.value = false;
  }
};

const closeModal = () => {
  selectedManga.value = null;
  chapterFilter.value = '';
  chapterPage.value = 1;
  if (route.query.open) {
    router.replace({ path: '/tabs/manga', query: {} });
  }
};

const readChapter = (ch: ChapterItem) => {
  if (!selectedManga.value) return;
  const mangaId = selectedManga.value.id;
  selectedManga.value = null;
  router.push(`/manga/${mangaId}/chapter/${encodeURIComponent(ch.id)}`);
};

// Chapter Pagination Logic
const toggleSortOrder = () => {
  isSortAsc.value = !isSortAsc.value;
  chapterPage.value = 1;
};

const goToChapterPage = (page: number) => {
  if (page >= 1 && page <= totalChapterPages.value) {
    chapterPage.value = page;
  }
};

const filteredChapters = computed(() => {
  let list = [...chapters.value];
  if (chapterFilter.value.trim()) {
    const q = chapterFilter.value.trim().toLowerCase();
    list = list.filter((ch) => ch.title.toLowerCase().includes(q) || ch.chapter.toLowerCase().includes(q));
  }
  list.sort((a, b) => {
    const numA = parseFloat(a.chapter) || 0;
    const numB = parseFloat(b.chapter) || 0;
    return isSortAsc.value ? numA - numB : numB - numA;
  });
  return list;
});

const totalChapterPages = computed(() => {
  return Math.ceil(filteredChapters.value.length / chapterPageSize) || 1;
});

const paginatedChapters = computed(() => {
  const start = (chapterPage.value - 1) * chapterPageSize;
  return filteredChapters.value.slice(start, start + chapterPageSize);
});

// Watch query ?open=mangaId to re-open chapters on return from reader
watch(
  () => route.query.open,
  async (newMangaId) => {
    if (newMangaId && typeof newMangaId === 'string') {
      if (!selectedManga.value || selectedManga.value.id !== newMangaId) {
        let manga = mangaList.value.find((m) => m.id === newMangaId);
        if (!manga) {
          manga = (await MangaService.getMangaById(newMangaId)) || undefined;
        }
        if (manga) {
          openManga(manga);
        }
      }
    }
  },
  { immediate: true }
);

onIonViewDidEnter(async () => {
  const openId = route.query.open as string;
  if (openId && (!selectedManga.value || selectedManga.value.id !== openId)) {
    let manga = mangaList.value.find((m) => m.id === openId);
    if (!manga) {
      manga = (await MangaService.getMangaById(openId)) || undefined;
    }
    if (manga) {
      openManga(manga);
    }
  }
});

onMounted(() => {
  loadPopular();
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

.center-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  text-align: center;
}

.status-msg {
  color: #a1a1aa;
  margin-top: 12px;
  font-size: 0.95rem;
}

.error-msg {
  color: #f43f5e;
  margin-bottom: 12px;
}

.manga-card {
  --background: #1c1c1e;
  margin: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  transition: transform 0.15s ease-in-out;
}

.manga-cover {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  display: block;
  background-color: #141416;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #f5f5f7;
  margin-top: 4px;
}

.manga-desc {
  font-size: 0.9rem;
  color: #a1a1a6;
  margin-bottom: 16px;
  line-height: 1.4;
  max-height: 120px;
  overflow-y: auto;
}

/* Chapter toolbar & pagination */
.chapter-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.chapter-searchbar {
  --background: #2c2c2e;
  padding: 0;
  flex: 1;
}

.sort-toggle-btn {
  white-space: nowrap;
}

.chapter-pagination {
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

.total-chapter-count {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  color: #a1a1a6;
}

.quick-jump-actions {
  display: flex;
  gap: 16px;
}

.no-chapters-msg {
  text-align: center;
  color: #a1a1a6;
  font-size: 0.9rem;
}
</style>
