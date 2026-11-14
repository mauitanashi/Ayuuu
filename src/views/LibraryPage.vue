<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Library</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment v-model="selectedTab">
          <ion-segment-button value="music">
            <ion-label>Music</ion-label>
          </ion-segment-button>
          <ion-segment-button value="anime">
            <ion-label>Anime</ion-label>
          </ion-segment-button>
          <ion-segment-button value="manga">
            <ion-label>Manga</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="ion-padding">
        <ion-list lines="none" class="library-list">
          <ion-item class="library-item">
            <ion-icon :icon="bookmark" slot="start" color="primary"></ion-icon>
            <ion-label>
              <h3>Favorites & History</h3>
              <p>Synchronized via local SQLite & Supabase</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>
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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonIcon,
} from '@ionic/vue';
import { bookmark } from 'ionicons/icons';

const selectedTab = ref('music');
</script>

<style scoped>
.library-list {
  background: transparent;
}

.library-item {
  --background: #18181c;
  border-radius: 8px;
  margin-bottom: 8px;
}
</style>
