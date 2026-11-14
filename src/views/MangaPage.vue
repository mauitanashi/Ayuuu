<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Manga</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="ion-padding">
        <h2 class="section-title">Trending Manga</h2>
        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="4" v-for="manga in mangaList" :key="manga.id">
              <ion-card class="manga-card" @click="openManga(manga)">
                <img :src="manga.coverUrl" class="manga-cover" />
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
          <ion-list>
            <ion-item
              v-for="ch in 10"
              :key="ch"
              button
              @click="readChapter(ch)"
            >
              <ion-label>Chapter {{ ch }}</ion-label>
              <ion-icon :icon="bookOutline" slot="end"></ion-icon>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
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

interface MangaItem {
  id: string;
  title: string;
  coverUrl: string;
  latestChapter: string;
}

const router = useRouter();
const selectedManga = ref<MangaItem | null>(null);

const mangaList = ref<MangaItem[]>([
  {
    id: 'solo-leveling',
    title: 'Solo Leveling',
    coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80',
    latestChapter: 'Ch. 200',
  },
  {
    id: 'one-piece',
    title: 'One Piece',
    coverUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80',
    latestChapter: 'Ch. 1120',
  },
  {
    id: 'spy-family',
    title: 'Spy x Family',
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80',
    latestChapter: 'Ch. 95',
  },
]);

const openManga = (manga: MangaItem) => {
  selectedManga.value = manga;
};

const readChapter = (chapterNumber: number) => {
  if (!selectedManga.value) return;
  const mangaId = selectedManga.value.id;
  selectedManga.value = null;
  router.push(`/manga/${mangaId}/chapter/${chapterNumber}`);
};
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
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #f4f4f5;
  margin-top: 4px;
}
</style>
