<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Anime</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="ion-padding">
        <h2 class="section-title">Popular Anime</h2>
        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="4" v-for="item in animeList" :key="item.id">
              <ion-card class="anime-card" @click="selectAnime(item)">
                <img :src="item.thumbnail" class="anime-poster" />
                <ion-card-header>
                  <ion-card-subtitle>{{ item.episodes }} Episodes</ion-card-subtitle>
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
          <p>{{ selectedAnime?.synopsis }}</p>
          <h3>Episodes</h3>
          <ion-list>
            <ion-item
              v-for="ep in 12"
              :key="ep"
              button
              @click="playEpisode(ep)"
            >
              <ion-label>Episode {{ ep }}</ion-label>
              <ion-icon :icon="playOutline" slot="end"></ion-icon>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
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
import { playOutline } from 'ionicons/icons';
import { VideoPlayer } from '../plugins';

interface AnimeItem {
  id: string;
  name: string;
  thumbnail: string;
  episodes: number;
  synopsis: string;
}

const selectedAnime = ref<AnimeItem | null>(null);

const animeList = ref<AnimeItem[]>([
  {
    id: 'frieren',
    name: 'Frieren: Beyond Journey\'s End',
    thumbnail: 'https://cdn.myanimelist.net/images/anime/1015/138006.jpg',
    episodes: 28,
    synopsis: 'During their decade-long quest to defeat the Demon King, the members of the hero\'s party forge deep bonds.',
  },
  {
    id: 'jujutsu',
    name: 'Jujutsu Kaisen Season 2',
    thumbnail: 'https://cdn.myanimelist.net/images/anime/1792/138100.jpg',
    episodes: 23,
    synopsis: 'Past and present collide as the Shibuya Incident begins.',
  },
  {
    id: 'chainsaw-man',
    name: 'Chainsaw Man',
    thumbnail: 'https://cdn.myanimelist.net/images/anime/1806/126216.jpg',
    episodes: 12,
    synopsis: 'Denji is a teenage boy living with a Chainsaw Devil named Pochita.',
  },
  {
    id: 'bocchi',
    name: 'Bocchi the Rock!',
    thumbnail: 'https://cdn.myanimelist.net/images/anime/1448/127956.jpg',
    episodes: 12,
    synopsis: 'Hitori Gotou is a lonely and anxious high school girl who dreams of playing in a rock band.',
  },
]);

const selectAnime = (item: AnimeItem) => {
  selectedAnime.value = item;
};

const playEpisode = async (epNumber: number) => {
  if (!selectedAnime.value) return;

  // Real HLS test stream for native ExoPlayer playback
  const sampleHlsStream = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

  try {
    await VideoPlayer.playVideo({
      url: sampleHlsStream,
      title: `${selectedAnime.value.name} - Episode ${epNumber}`,
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
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.2;
  color: #f4f4f5;
  margin-top: 4px;
}
</style>
