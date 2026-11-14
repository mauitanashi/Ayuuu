<template>
  <ion-page>
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
  --background: #0d0d10;
  border-top: 1px solid #1c1c21;
}

ion-tab-button {
  --color: #888892;
  --color-selected: #f43f5e;
}
</style>
