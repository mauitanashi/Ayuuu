<template>
  <ion-page>
    <!-- Overlay Header -->
    <ion-header class="reader-header" :class="{ 'overlay-visible': showOverlay }">
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/manga"></ion-back-button>
        </ion-buttons>
        <ion-title>Reader</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="toggleReadingMode">
            <ion-icon :icon="isLongStrip ? documentOutline : albumsOutline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- Reader Content -->
    <ion-content :fullscreen="true" class="reader-content" @click="toggleOverlay">
      <!-- Loading state -->
      <div v-if="isLoading" class="center-content">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p class="loading-text">Loading chapter pages...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="center-content">
        <p class="error-text">{{ error }}</p>
        <ion-button fill="outline" color="primary" @click="loadPages">Retry</ion-button>
      </div>

      <!-- Long-strip mode -->
      <div v-else-if="isLongStrip" class="long-strip-container">
        <div
          v-for="(pageUrl, index) in pages"
          :key="index"
          class="page-wrapper"
          :data-page="index + 1"
        >
          <img
            :src="pageUrl"
            :alt="'Page ' + (index + 1)"
            class="manga-page-img"
            loading="lazy"
          />
        </div>
      </div>

      <!-- Paged mode -->
      <div v-else class="paged-container">
        <div class="paged-slide" @click.stop="nextPage">
          <img
            :src="pages[currentPage]"
            :alt="'Page ' + (currentPage + 1)"
            class="manga-page-img paged-img"
          />
        </div>
      </div>
    </ion-content>

    <!-- Overlay Footer Toolbar -->
    <ion-footer class="reader-footer" :class="{ 'overlay-visible': showOverlay }">
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-button :disabled="currentPage <= 0" @click.stop="prevPage">
            Prev
          </ion-button>
        </ion-buttons>

        <div class="page-indicator">
          {{ isLongStrip ? `Total Pages: ${pages.length}` : `Page ${currentPage + 1} / ${pages.length}` }}
        </div>

        <ion-buttons slot="end">
          <ion-button :disabled="currentPage >= pages.length - 1" @click.stop="nextPage">
            Next
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonSpinner,
} from '@ionic/vue';
import { documentOutline, albumsOutline } from 'ionicons/icons';
import { MangaService } from '../services/mangaService';

const route = useRoute();
const chapterId = ref(decodeURIComponent(route.params.chapterId as string));

const showOverlay = ref(true);
const isLongStrip = ref(true);
const currentPage = ref(0);
const isLoading = ref(true);
const error = ref<string | null>(null);
const pages = ref<string[]>([]);

const loadPages = async () => {
  if (!chapterId.value) return;
  isLoading.value = true;
  error.value = null;
  try {
    pages.value = await MangaService.getChapterPages(chapterId.value);
    if (pages.value.length === 0) {
      error.value = 'No pages available for this chapter.';
    }
  } catch (err: any) {
    console.error('Failed to load chapter pages:', err);
    error.value = 'Failed to load chapter images. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

const toggleOverlay = () => {
  showOverlay.value = !showOverlay.value;
};

const toggleReadingMode = () => {
  isLongStrip.value = !isLongStrip.value;
};

const nextPage = () => {
  if (currentPage.value < pages.value.length - 1) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--;
  }
};

onMounted(() => {
  loadPages();
});
</script>

<style scoped>
.reader-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  transition: transform 0.25s ease-in-out;
  transform: translateY(-100%);
  z-index: 1000;
}

.reader-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  transition: transform 0.25s ease-in-out;
  transform: translateY(100%);
  z-index: 1000;
}

.overlay-visible {
  transform: translateY(0);
}

.reader-content {
  --background: #000000;
}

.center-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
  text-align: center;
  padding: 24px;
}

.loading-text {
  margin-top: 16px;
  color: #a1a1aa;
  font-size: 0.95rem;
}

.error-text {
  color: #f43f5e;
  margin-bottom: 16px;
}

.long-strip-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #000000;
  min-height: 100%;
}

.page-wrapper {
  width: 100%;
  max-width: 900px;
  display: flex;
  justify-content: center;
}

.manga-page-img {
  width: 100%;
  height: auto;
  display: block;
}

.paged-container {
  display: flex;
  height: 100%;
  justify-content: center;
  align-items: center;
}

.paged-slide {
  max-width: 100%;
  max-height: 100%;
  cursor: pointer;
}

.paged-img {
  max-height: 100vh;
  object-fit: contain;
}

.page-indicator {
  width: 100%;
  text-align: center;
  font-size: 0.85rem;
  color: #a1a1aa;
}
</style>
