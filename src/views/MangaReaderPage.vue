<template>
  <ion-page>
    <!-- Overlay Header -->
    <ion-header
      class="reader-header"
      :class="{ 'overlay-visible': showOverlay }"
    >
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-button @click.stop="handleBack">
            <ion-icon :icon="arrowBack" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title class="reader-title">{{ currentChapter?.title || 'Reader' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="toggleReadingMode">
            <ion-icon
              :icon="isLongStrip ? documentOutline : albumsOutline"
              slot="icon-only"
            ></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- Reader Content -->
    <ion-content
      ref="contentRef"
      :fullscreen="true"
      class="reader-content"
      @click="toggleOverlay"
    >
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
            @error="onPageError(index, $event)"
          />
        </div>

        <!-- End of chapter section -->
        <div class="chapter-end-section ion-padding" v-if="pages.length > 0">
          <p class="end-msg">End of {{ currentChapter?.title || 'Chapter' }}</p>
          <ion-button
            v-if="nextChapter"
            expand="block"
            color="primary"
            size="large"
            class="next-chapter-btn"
            @click.stop="goToChapter(nextChapter)"
          >
            Next: {{ nextChapter.title }}
            <ion-icon :icon="arrowForward" slot="end"></ion-icon>
          </ion-button>
          <p v-else class="caught-up-text">You have reached the latest chapter.</p>
        </div>
      </div>

      <!-- Paged mode -->
      <div v-else class="paged-container">
        <div class="paged-slide" @click.stop="nextPage">
          <img
            v-if="pages[currentPage]"
            :src="pages[currentPage]"
            :alt="'Page ' + (currentPage + 1)"
            class="manga-page-img paged-img"
            @error="onPageError(currentPage, $event)"
          />

          <!-- End of chapter button shown on last page in paged mode -->
          <div v-if="currentPage === pages.length - 1" class="paged-last-page-action">
            <ion-button
              v-if="nextChapter"
              expand="block"
              color="primary"
              size="default"
              class="next-chapter-btn"
              @click.stop="goToChapter(nextChapter)"
            >
              Next: {{ nextChapter.title }}
              <ion-icon :icon="arrowForward" slot="end"></ion-icon>
            </ion-button>
            <p v-else class="caught-up-text">You have reached the latest chapter.</p>
          </div>
        </div>
      </div>
    </ion-content>

    <!-- Overlay Footer Toolbar -->
    <ion-footer
      class="reader-footer"
      :class="{ 'overlay-visible': showOverlay }"
    >
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-button
            :disabled="currentPage <= 0 && !prevChapter"
            @click.stop="prevPage"
          >
            {{ currentPage > 0 ? 'Prev' : (prevChapter ? 'Prev Ch.' : 'Prev') }}
          </ion-button>
        </ion-buttons>

        <div class="page-indicator">
          {{ pages.length > 0 ? `Page ${currentPage + 1} / ${pages.length}` : '' }}
        </div>

        <ion-buttons slot="end">
          <ion-button
            :disabled="currentPage >= pages.length - 1 && !nextChapter"
            @click.stop="nextPage"
          >
            {{ currentPage < pages.length - 1 ? 'Next' : (nextChapter ? 'Next Ch.' : 'Next') }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonSpinner,
  useBackButton,
} from '@ionic/vue';
import { documentOutline, albumsOutline, arrowBack, arrowForward } from 'ionicons/icons';
import { MangaService, ChapterItem } from '../services/mangaService';

const route = useRoute();
const router = useRouter();

const mangaId = computed(() => (route.params.id as string) || '');
const chapterId = ref(decodeURIComponent((route.params.chapterId as string) || ''));

const contentRef = ref<any>(null);
const showOverlay = ref(true);
const isLongStrip = ref(true);
const currentPage = ref(0);
const isLoading = ref(true);
const error = ref<string | null>(null);
const pages = ref<string[]>([]);
const chapterList = ref<ChapterItem[]>([]);

let observer: IntersectionObserver | null = null;

const currentChapterIndex = computed(() => {
  const currentId = chapterId.value.trim();
  const idx = chapterList.value.findIndex(
    (c) => c.id === currentId || decodeURIComponent(c.id) === currentId || c.id === decodeURIComponent(currentId)
  );
  if (idx !== -1) return idx;

  const matchNum = currentId.match(/(\d+(?:\.\d+)?)/);
  if (matchNum) {
    return chapterList.value.findIndex((c) => c.chapter === matchNum[1]);
  }
  return -1;
});

const currentChapter = computed(() => {
  return chapterList.value[currentChapterIndex.value] || null;
});

const nextChapter = computed(() => {
  if (currentChapterIndex.value >= 0 && currentChapterIndex.value < chapterList.value.length - 1) {
    return chapterList.value[currentChapterIndex.value + 1];
  }
  return null;
});

const prevChapter = computed(() => {
  if (currentChapterIndex.value > 0) {
    return chapterList.value[currentChapterIndex.value - 1];
  }
  return null;
});

const setupObserver = () => {
  if (observer) {
    observer.disconnect();
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const pageNum = Number(entry.target.getAttribute('data-page'));
          if (!isNaN(pageNum) && pageNum > 0) {
            currentPage.value = pageNum - 1;
          }
        }
      }
    },
    { threshold: 0.3 }
  );

  document.querySelectorAll('.page-wrapper').forEach((el) => {
    observer?.observe(el);
  });
};

const loadPages = async () => {
  if (!chapterId.value) return;
  isLoading.value = true;
  error.value = null;
  try {
    pages.value = await MangaService.getChapterPages(chapterId.value);
    if (pages.value.length === 0) {
      error.value = 'No pages available for this chapter.';
    } else {
      await nextTick();
      setupObserver();
    }
  } catch (err: any) {
    console.error('Failed to load chapter pages:', err);
    error.value = 'Failed to load chapter images. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

const loadChapterList = async () => {
  if (!mangaId.value) return;
  try {
    chapterList.value = await MangaService.getChapters(mangaId.value);
  } catch (err) {
    console.warn('Could not load chapter list for navigation:', err);
  }
};

const toggleOverlay = () => {
  showOverlay.value = !showOverlay.value;
};

const toggleReadingMode = () => {
  isLongStrip.value = !isLongStrip.value;
  if (isLongStrip.value) {
    nextTick(() => {
      scrollToPage(currentPage.value);
      setupObserver();
    });
  }
};

const scrollToPage = (idx: number) => {
  const el = document.querySelector(`[data-page="${idx + 1}"]`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const goToChapter = (ch: ChapterItem) => {
  chapterId.value = ch.id;
  currentPage.value = 0;
  pages.value = [];
  router.replace(`/manga/${mangaId.value}/chapter/${encodeURIComponent(ch.id)}`);
  contentRef.value?.$el?.scrollToTop?.(0);
  loadPages();
};

const nextPage = () => {
  if (currentPage.value < pages.value.length - 1) {
    currentPage.value++;
    if (isLongStrip.value) {
      scrollToPage(currentPage.value);
    }
  } else if (nextChapter.value) {
    goToChapter(nextChapter.value);
  }
};

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--;
    if (isLongStrip.value) {
      scrollToPage(currentPage.value);
    }
  } else if (prevChapter.value) {
    goToChapter(prevChapter.value);
  }
};

const handleBack = () => {
  if (currentPage.value > 0) {
    currentPage.value--;
    if (isLongStrip.value) {
      scrollToPage(currentPage.value);
    }
  } else {
    router.back();
  }
};

useBackButton(10, () => {
  handleBack();
});

const onPageError = (index: number, event: Event) => {
  const img = event.target as HTMLImageElement;
  if (!img) return;
  if (!img.src.includes('/proxy-img') && img.src.includes('readdetectiveconan.com')) {
    img.src = `/proxy-img?url=${encodeURIComponent(img.src)}`;
  }
};

onMounted(() => {
  loadPages();
  loadChapterList();
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
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

.reader-title {
  font-size: 0.95rem;
  font-weight: 600;
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
  width: 100%;
}

.page-wrapper {
  width: 100%;
  max-width: 900px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 250px;
  background-color: #0d0d10;
  margin-bottom: 4px;
}

.manga-page-img {
  width: 100%;
  height: auto;
  min-height: 200px;
  display: block;
  object-fit: contain;
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
  display: flex;
  flex-direction: column;
  align-items: center;
}

.paged-img {
  max-height: 100vh;
  object-fit: contain;
}

.paged-last-page-action {
  margin-top: 16px;
  width: 90%;
  max-width: 400px;
  text-align: center;
}

.page-indicator {
  width: 100%;
  text-align: center;
  font-size: 0.85rem;
  color: #a1a1aa;
}

.chapter-end-section {
  width: 100%;
  max-width: 600px;
  margin: 32px auto 64px auto;
  text-align: center;
}

.end-msg {
  color: #a1a1aa;
  margin-bottom: 16px;
  font-size: 0.95rem;
}

.next-chapter-btn {
  font-weight: 600;
}

.caught-up-text {
  color: #71717a;
  font-size: 0.9rem;
  margin-top: 8px;
}
</style>
