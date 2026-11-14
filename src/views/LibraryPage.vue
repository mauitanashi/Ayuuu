<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar class="brand-toolbar">
        <ion-buttons slot="start">
          <img src="/logo.png" alt="Ayuuu" class="header-logo" />
        </ion-buttons>
        <ion-title>Library</ion-title>
      </ion-toolbar>
      <ion-toolbar class="segment-toolbar">
        <ion-segment v-model="selectedTab" class="custom-segment">
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
            <ion-icon :icon="bookmark" slot="start" class="lib-icon"></ion-icon>
            <ion-label>
              <h3 class="lib-title">Favorites & History</h3>
              <p class="lib-sub">Synchronized via local SQLite & Supabase</p>
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
  IonButtons,
} from '@ionic/vue';
import { bookmark } from 'ionicons/icons';

const selectedTab = ref('music');
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

.segment-toolbar {
  --background: #000000;
  padding: 0 12px;
}

.custom-segment {
  --background: #1c1c1e;
  border-radius: 12px;
}

ion-segment-button {
  --color: #a1a1a6;
  --color-checked: #f5f5f7;
  --indicator-color: #2c2c2e;
  --indicator-box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  font-weight: 600;
  font-size: 0.85rem;
  min-height: 36px;
}

.library-list {
  background: transparent;
}

.library-item {
  --background: #1c1c1e;
  border-radius: 12px;
  margin-bottom: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.lib-icon {
  color: #f0f0f2;
}

.lib-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #f5f5f7;
}

.lib-sub {
  font-size: 0.8rem;
  color: #a1a1a6;
}
</style>
