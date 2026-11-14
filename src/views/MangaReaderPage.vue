<template>
  <ion-page>
    <!-- Overlay Header -->
    <ion-header class="reader-header" :class="{ 'overlay-visible': showOverlay }">
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/manga"></ion-back-button>
        </ion-buttons>
        <ion-title>Chapter {{ chapterId }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="toggleReadingMode">
            <ion-icon :icon="isLongStrip ? documentOutline : albumsOutline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- Reader Content -->
    <ion-content :fullscreen="true" class="reader-content" @click="toggleOverlay">
      <!-- Long-strip mode -->
      <div v-if="isLongStrip" class="long-strip-container">
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
            @load="onPageLoaded(index)"
          />
        </div>
      </div>

      <!-- Paged mode -->
      <div v-else class="paged-container">
        <div class="paged-slide">
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
          <ion-button :disabled="Number(chapterId) <= 1" @click.stop="navigateChapter(-1)">
            Prev
          </ion-button>
        </ion-buttons>

        <div class="page-indicator">
          {{ isLongStrip ? `Total Pages: ${pages.length}` : `Page ${currentPage + 1} / ${pages.length}` }}
        </div>

        <ion-buttons slot="end">
          <ion-button @click.stop="navigateChapter(1)">
            Next
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
} from '@ionic/vue';
import { documentOutline, albumsOutline } from 'ionicons/icons';

const route = useRoute();
const router = useRouter();

const mangaId = route.params.id as string;
const chapterId = ref(route.params.chapterId as string);

const showOverlay = ref(true);
const isLongStrip = ref(true);
const currentPage = ref(0);

// Demo pages matching vertical strip manhwa/manga
const pages = ref<string[]>([
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
]);

const toggleOverlay = () => {
  showOverlay.value = !showOverlay.value;
};

const toggleReadingMode = () => {
  isLongStrip.value = !isLongStrip.value;
};

const onPageLoaded = (index: number) => {
  // Page load event
};

const navigateChapter = (offset: number) => {
  const nextCh = Number(chapterId.value) + offset;
  if (nextCh < 1) return;
  chapterId.value = String(nextCh);
  currentPage.value = 0;
  router.replace(`/manga/${mangaId}/chapter/${nextCh}`);
};
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
