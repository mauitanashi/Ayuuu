<template>
  <ion-page class="tabs-container-page">
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom" class="custom-tab-bar">
        <ion-tab-button tab="music" href="/tabs/music">
          <ion-icon :icon="musicalNotes" />
          <ion-label>Music</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="anime" href="/tabs/anime">
          <ion-icon :icon="tvOutline" />
          <ion-label>Anime</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="manga" href="/tabs/manga">
          <ion-icon :icon="bookOutline" />
          <ion-label>Manga</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="library" href="/tabs/library">
          <ion-icon :icon="bookmarkOutline" />
          <ion-label>Library</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonLabel,
  IonIcon,
  IonPage,
  IonRouterOutlet,
} from '@ionic/vue';
import { musicalNotes, tvOutline, bookOutline, bookmarkOutline } from 'ionicons/icons';
</script>

<style scoped>
.custom-tab-bar {
  --background: #1c1c1e;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 0 12px 10px 12px;
  border-radius: 16px;
  height: 64px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  contain: content;
}

ion-tab-button {
  --color: #a1a1a6;
  --color-selected: #f0f0f2;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: -0.2px;
  transition: all 0.2s ease-in-out;
}

ion-tab-button.tab-selected ion-icon {
  transform: scale(1.08);
}
</style>
