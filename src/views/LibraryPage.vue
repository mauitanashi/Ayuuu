<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar class="brand-toolbar">
        <ion-buttons slot="start">
          <img src="/logo.png" alt="Ayuuu" class="header-logo" />
        </ion-buttons>
        <ion-title>My Library</ion-title>

        <!-- Supabase Cloud Sync Status Button -->
        <ion-buttons slot="end">
          <ion-button
            fill="clear"
            @click="isAuthModalOpen = true"
            class="sync-pill-btn"
          >
            <span
              class="sync-dot"
              :class="{
                'dot-synced': currentUser && !syncError,
                'dot-syncing': isSyncing,
                'dot-local': !currentUser,
              }"
            ></span>
            <ion-icon
              :icon="currentUser ? cloudDoneOutline : cloudOfflineOutline"
              class="sync-icon"
            ></ion-icon>
            <span class="sync-text">
              {{
                isSyncing
                  ? 'Syncing...'
                  : currentUser
                  ? 'Synced'
                  : 'Local'
              }}
            </span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Segment Tabs (All, Music, Anime, Manga) -->
      <ion-toolbar class="segment-toolbar">
        <ion-segment v-model="selectedTab" class="custom-segment">
          <ion-segment-button value="ALL">
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="MUSIC">
            <ion-label>Music</ion-label>
          </ion-segment-button>
          <ion-segment-button value="ANIME">
            <ion-label>Anime</ion-label>
          </ion-segment-button>
          <ion-segment-button value="MANGA">
            <ion-label>Manga</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>

      <!-- Searchbar & Filter Chips -->
      <ion-toolbar class="filter-toolbar">
        <ion-searchbar
          v-model="searchQuery"
          placeholder="Filter library..."
          class="custom-searchbar"
          :debounce="200"
        ></ion-searchbar>

        <div class="filter-chips">
          <ion-chip
            :outline="activeFilter !== 'all'"
            @click="activeFilter = 'all'"
            class="filter-chip"
          >
            <ion-label>All ({{ counts.all }})</ion-label>
          </ion-chip>
          <ion-chip
            :outline="activeFilter !== 'favorites'"
            @click="activeFilter = 'favorites'"
            class="filter-chip"
          >
            <ion-icon :icon="heart" color="danger"></ion-icon>
            <ion-label>Favorites ({{ counts.favorites }})</ion-label>
          </ion-chip>
          <ion-chip
            :outline="activeFilter !== 'in_progress'"
            @click="activeFilter = 'in_progress'"
            class="filter-chip"
          >
            <ion-label>In Progress ({{ counts.inProgress }})</ion-label>
          </ion-chip>
          <ion-chip
            :outline="activeFilter !== 'completed'"
            @click="activeFilter = 'completed'"
            class="filter-chip"
          >
            <ion-label>Completed ({{ counts.completed }})</ion-label>
          </ion-chip>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="library-content">
      <!-- Loading indicator -->
      <div v-if="isSyncing && filteredEntries.length === 0" class="ion-text-center ion-padding">
        <ion-spinner name="crescent"></ion-spinner>
        <p class="loading-text">Syncing with Supabase...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredEntries.length === 0" class="empty-state ion-padding ion-text-center">
        <div class="empty-icon-wrap">
          <ion-icon :icon="bookmarkOutline" class="empty-icon"></ion-icon>
        </div>
        <h3 class="empty-title">
          {{
            searchQuery
              ? 'No matching titles found'
              : selectedTab === 'ALL'
              ? 'Your Library is Empty'
              : `No ${selectedTab.toLowerCase()} in your library`
          }}
        </h3>
        <p class="empty-desc">
          Add titles from the Music, Anime, and Manga tabs to track progress and sync across devices with Supabase.
        </p>

        <div class="empty-actions">
          <ion-button
            fill="solid"
            color="primary"
            class="action-btn"
            @click="seedDemoData"
          >
            <ion-icon :icon="sparklesOutline" slot="start"></ion-icon>
            Load Sample Titles
          </ion-button>

          <div class="browse-shortcuts">
            <ion-button fill="outline" size="small" @click="goTo('/tabs/music')">
              <ion-icon :icon="musicalNotesOutline" slot="start"></ion-icon>
              Music
            </ion-button>
            <ion-button fill="outline" size="small" @click="goTo('/tabs/anime')">
              <ion-icon :icon="tvOutline" slot="start"></ion-icon>
              Anime
            </ion-button>
            <ion-button fill="outline" size="small" @click="goTo('/tabs/manga')">
              <ion-icon :icon="bookOutline" slot="start"></ion-icon>
              Manga
            </ion-button>
          </div>
        </div>
      </div>

      <!-- Library Grid List -->
      <div v-else class="library-grid ion-padding">
        <div
          v-for="item in filteredEntries"
          :key="item.id"
          class="library-card"
          @click="handleItemClick(item)"
        >
          <!-- Cover Thumbnail -->
          <div class="card-thumb-wrap">
            <img
              :src="item.artwork_url || fallbackArt(item.media_type)"
              :alt="item.title"
              class="card-thumb"
              loading="lazy"
            />
            <div class="card-badges">
              <span class="type-pill" :class="`pill-${item.media_type.toLowerCase()}`">
                {{ item.media_type }}
              </span>
              <span
                v-if="item.status === 'COMPLETED'"
                class="status-pill pill-completed"
              >
                Done
              </span>
            </div>

            <!-- Favorite Heart Toggle -->
            <button
              class="fav-btn"
              :class="{ 'is-fav': item.is_favorite }"
              @click.stop="toggleFav(item)"
            >
              <ion-icon :icon="item.is_favorite ? heart : heartOutline"></ion-icon>
            </button>
          </div>

          <!-- Card Info -->
          <div class="card-info">
            <h4 class="card-title">{{ item.title }}</h4>
            <p class="card-subtitle">{{ item.subtitle || item.author || item.genres.join(', ') || 'Various' }}</p>

            <!-- Progress Bar & Text -->
            <div class="progress-wrap">
              <div class="progress-bar-bg">
                <div
                  class="progress-bar-fill"
                  :style="{ width: `${Math.round(item.progress * 100)}%` }"
                ></div>
              </div>
              <div class="progress-meta">
                <span class="unit-text">
                  {{ formatProgressLabel(item) }}
                </span>
                <span class="percent-text">
                  {{ Math.round(item.progress * 100) }}%
                </span>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="card-bottom-actions">
              <ion-button
                fill="clear"
                size="small"
                class="play-resume-btn"
                @click.stop="handleItemClick(item)"
              >
                <ion-icon :icon="playCircleOutline" slot="start"></ion-icon>
                Resume
              </ion-button>

              <ion-button
                fill="clear"
                size="small"
                color="medium"
                class="delete-btn"
                @click.stop="confirmDelete(item)"
              >
                <ion-icon :icon="trashOutline"></ion-icon>
              </ion-button>
            </div>
          </div>
        </div>
      </div>
    </ion-content>

    <!-- Supabase Auth & Cloud Sync Modal -->
    <ion-modal :is-open="isAuthModalOpen" @didDismiss="isAuthModalOpen = false">
      <ion-header>
        <ion-toolbar class="brand-toolbar">
          <ion-title>Cloud Sync (Supabase)</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="isAuthModalOpen = false">
              <ion-icon :icon="closeOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding auth-modal-content">
        <!-- Logged-in view -->
        <div v-if="currentUser" class="logged-in-box">
          <div class="user-avatar-wrap">
            <ion-icon :icon="cloudDone" color="success" class="cloud-large-icon"></ion-icon>
          </div>
          <h3>Connected to Supabase</h3>
          <p class="user-email-text">{{ currentUser.email || 'Authenticated User' }}</p>
          <p class="user-id-text">User ID: {{ currentUser.id.slice(0, 16) }}...</p>

          <div class="sync-actions-box">
            <ion-button
              expand="block"
              color="primary"
              :disabled="isSyncing"
              @click="syncNow"
            >
              <ion-spinner v-if="isSyncing" name="crescent" slot="start"></ion-spinner>
              <ion-icon v-else :icon="refreshOutline" slot="start"></ion-icon>
              {{ isSyncing ? 'Syncing Now...' : 'Sync Library Now' }}
            </ion-button>

            <ion-button
              expand="block"
              fill="outline"
              color="danger"
              class="ion-margin-top"
              @click="handleSignOut"
            >
              <ion-icon :icon="logOutOutline" slot="start"></ion-icon>
              Sign Out
            </ion-button>
          </div>

          <p v-if="lastSyncTime" class="sync-time-label">
            Last synced: {{ lastSyncTime.toLocaleTimeString() }}
          </p>
        </div>

        <!-- Logged-out / Sign In Form -->
        <div v-else class="auth-form-box">
          <div class="auth-header ion-text-center">
            <ion-icon :icon="cloudOutline" class="cloud-large-icon"></ion-icon>
            <h3>Sync Your Library</h3>
            <p class="auth-desc">
              Sign in with your Supabase account to sync your Anime, Manga, and Music library across all devices.
            </p>
          </div>

          <form @submit.prevent="handleAuthSubmit" class="auth-inputs">
            <ion-item class="custom-input-item">
              <ion-label position="stacked">Email</ion-label>
              <ion-input
                v-model="authEmail"
                type="email"
                placeholder="you@example.com"
                required
              ></ion-input>
            </ion-item>

            <ion-item class="custom-input-item ion-margin-top">
              <ion-label position="stacked">Password</ion-label>
              <ion-input
                v-model="authPassword"
                type="password"
                placeholder="••••••••"
                required
              ></ion-input>
            </ion-item>

            <div v-if="authErrorMsg" class="auth-error ion-margin-top">
              {{ authErrorMsg }}
            </div>

            <div class="auth-btn-row ion-margin-top">
              <ion-button
                type="submit"
                expand="block"
                color="primary"
                :disabled="isSubmittingAuth"
              >
                <ion-spinner v-if="isSubmittingAuth" name="crescent" slot="start"></ion-spinner>
                {{ isRegisterMode ? 'Create Account' : 'Sign In' }}
              </ion-button>
            </div>

            <div class="auth-switch ion-text-center ion-margin-top">
              <a href="#" @click.prevent="isRegisterMode = !isRegisterMode">
                {{
                  isRegisterMode
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Sign Up"
                }}
              </a>
            </div>

            <div class="guest-mode-box ion-text-center ion-margin-top">
              <p class="divider-text">OR</p>
              <ion-button
                fill="clear"
                size="small"
                @click="continueAsGuest"
              >
                Continue Offline (Local Storage)
              </ion-button>
            </div>
          </form>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonButtons,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonChip,
  IonSpinner,
  IonModal,
  IonItem,
  IonInput,
} from '@ionic/vue';
import {
  bookmarkOutline,
  heart,
  heartOutline,
  sparklesOutline,
  musicalNotesOutline,
  tvOutline,
  bookOutline,
  playCircleOutline,
  trashOutline,
  cloudDoneOutline,
  cloudOfflineOutline,
  cloudDone,
  cloudOutline,
  refreshOutline,
  logOutOutline,
  closeOutline,
} from 'ionicons/icons';
import {
  LibraryService,
  libraryEntries,
  isSyncing,
  lastSyncTime,
  syncError,
  LibraryEntry,
  MediaType,
} from '../services/libraryService';
import {
  currentUser,
  SupabaseService,
} from '../services/supabaseService';
import { playTrack } from '../services/playerService';
import { VideoPlayer } from '../plugins';

const router = useRouter();

const selectedTab = ref<'ALL' | MediaType>('ALL');
const searchQuery = ref('');
const activeFilter = ref<'all' | 'favorites' | 'in_progress' | 'completed'>('all');

// Auth Modal
const isAuthModalOpen = ref(false);
const isRegisterMode = ref(false);
const authEmail = ref('');
const authPassword = ref('');
const authErrorMsg = ref('');
const isSubmittingAuth = ref(false);

// Counts for filter chips
const counts = computed(() => {
  const list =
    selectedTab.value === 'ALL'
      ? libraryEntries.value
      : libraryEntries.value.filter((e) => e.media_type === selectedTab.value);

  return {
    all: list.length,
    favorites: list.filter((e) => e.is_favorite).length,
    inProgress: list.filter((e) => e.status === 'IN_PROGRESS').length,
    completed: list.filter((e) => e.status === 'COMPLETED').length,
  };
});

// Filtered and searched entries
const filteredEntries = computed(() => {
  let list = libraryEntries.value;

  if (selectedTab.value !== 'ALL') {
    list = list.filter((e) => e.media_type === selectedTab.value);
  }

  if (activeFilter.value === 'favorites') {
    list = list.filter((e) => e.is_favorite);
  } else if (activeFilter.value === 'in_progress') {
    list = list.filter((e) => e.status === 'IN_PROGRESS');
  } else if (activeFilter.value === 'completed') {
    list = list.filter((e) => e.status === 'COMPLETED');
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.subtitle && e.subtitle.toLowerCase().includes(q)) ||
        (e.author && e.author.toLowerCase().includes(q)) ||
        (e.genres && e.genres.some((g) => g.toLowerCase().includes(q)))
    );
  }

  return list;
});

function fallbackArt(mediaType: MediaType): string {
  if (mediaType === 'ANIME') {
    return 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80';
  }
  if (mediaType === 'MANGA') {
    return 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80';
  }
  return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80';
}

function formatProgressLabel(item: LibraryEntry): string {
  if (item.media_type === 'ANIME') {
    return item.total_units > 0
      ? `Ep ${item.current_unit_index} of ${item.total_units}`
      : `Ep ${item.current_unit_index || 1}`;
  }
  if (item.media_type === 'MANGA') {
    return item.total_units > 0
      ? `Ch ${item.current_unit_index} of ${item.total_units}`
      : `Ch ${item.current_unit_index || 1}`;
  }
  return item.current_unit_title || 'Music Track';
}

async function toggleFav(item: LibraryEntry) {
  await LibraryService.toggleFavorite(item.id);
}

async function confirmDelete(item: LibraryEntry) {
  if (confirm(`Remove "${item.title}" from your library?`)) {
    await LibraryService.deleteEntry(item.id);
  }
}

async function handleItemClick(item: LibraryEntry) {
  if (item.media_type === 'MUSIC') {
    playTrack({
      videoId: item.source_key,
      title: item.title,
      artist: item.subtitle || item.author || 'Unknown Artist',
      artworkUrl: item.artwork_url,
      streamUrl: undefined,
      durationMs: item.last_position_ms || 180000,
    });
  } else if (item.media_type === 'ANIME') {
    if (item.remote_media_id) {
      VideoPlayer.playVideo({
        url: item.remote_media_id,
        title: `${item.title} - ${item.current_unit_title || 'Episode ' + (item.current_unit_index || 1)}`,
      });
    } else {
      router.push('/tabs/anime');
    }
  } else if (item.media_type === 'MANGA') {
    router.push({
      path: `/manga/${encodeURIComponent(item.source_key)}/chapter/1`,
      query: { title: item.title, provider: item.source_id },
    });
  }
}

function goTo(path: string) {
  router.push(path);
}

async function seedDemoData() {
  await LibraryService.seedDemoLibrary();
}

async function syncNow() {
  await LibraryService.syncWithSupabase();
}

async function handleAuthSubmit() {
  authErrorMsg.value = '';
  isSubmittingAuth.value = true;
  try {
    if (isRegisterMode.value) {
      const { error } = await SupabaseService.signUp(
        authEmail.value,
        authPassword.value
      );
      if (error) throw error;
      alert('Registration successful! Please check your email or sign in.');
    } else {
      const { error } = await SupabaseService.signIn(
        authEmail.value,
        authPassword.value
      );
      if (error) throw error;
      isAuthModalOpen.value = false;
      await LibraryService.syncWithSupabase();
    }
  } catch (err: any) {
    authErrorMsg.value = err.message || 'Authentication error';
  } finally {
    isSubmittingAuth.value = false;
  }
}

async function handleSignOut() {
  await SupabaseService.signOut();
  isAuthModalOpen.value = false;
}

function continueAsGuest() {
  isAuthModalOpen.value = false;
}

onMounted(() => {
  LibraryService.init();
});
</script>

<style scoped>
.brand-toolbar {
  --background: #000000;
  --color: #ffffff;
}

.header-logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  margin-left: 12px;
  object-fit: cover;
}

.sync-pill-btn {
  --color: #ffffff;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 4px 10px;
  margin-right: 8px;
}

.sync-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.dot-synced {
  background: #34c759;
  box-shadow: 0 0 8px #34c759;
}

.dot-syncing {
  background: #ff9500;
  box-shadow: 0 0 8px #ff9500;
  animation: pulse 1s infinite alternate;
}

.dot-local {
  background: #8e8e93;
}

@keyframes pulse {
  from { opacity: 0.4; }
  to { opacity: 1; }
}

.sync-icon {
  font-size: 1rem;
}

.sync-text {
  font-size: 0.75rem;
  color: #d1d1d6;
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

.filter-toolbar {
  --background: #000000;
  padding: 4px 12px 8px 12px;
}

.custom-searchbar {
  --background: #1c1c1e;
  --color: #ffffff;
  --placeholder-color: #8e8e93;
  --icon-color: #8e8e93;
  --border-radius: 10px;
  padding: 0;
  min-height: 38px;
}

.filter-chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-top: 6px;
  scrollbar-width: none;
}
.filter-chips::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  font-size: 0.78rem;
  font-weight: 600;
  --background: #1c1c1e;
  --color: #f5f5f7;
  height: 28px;
  margin: 0;
}

.library-content {
  --background: #000000;
}

/* Empty State */
.empty-state {
  margin-top: 40px;
}

.empty-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #1c1c1e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.empty-icon {
  font-size: 2.2rem;
  color: #ff375f;
}

.empty-title {
  color: #ffffff;
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.empty-desc {
  color: #8e8e93;
  font-size: 0.9rem;
  max-width: 320px;
  margin: 0 auto 20px auto;
  line-height: 1.4;
}

.empty-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.browse-shortcuts {
  display: flex;
  gap: 8px;
}

/* Library Grid */
.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
}

.library-card {
  background: #1c1c1e;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.15s ease;
}

.library-card:active {
  transform: scale(0.98);
}

.card-thumb-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #2c2c2e;
  overflow: hidden;
}

.card-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-badges {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.type-pill {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  text-transform: uppercase;
  color: #ffffff;
}

.pill-anime {
  background: rgba(255, 55, 95, 0.9);
}

.pill-manga {
  background: rgba(90, 200, 250, 0.9);
}

.pill-music {
  background: rgba(175, 82, 222, 0.9);
}

.status-pill {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(52, 199, 89, 0.9);
  color: #ffffff;
}

.fav-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 1.1rem;
}

.fav-btn.is-fav {
  color: #ff375f;
}

.card-info {
  padding: 10px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.card-title {
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0 0 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-subtitle {
  color: #8e8e93;
  font-size: 0.75rem;
  margin: 0 0 8px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-wrap {
  margin-top: auto;
  margin-bottom: 6px;
}

.progress-bar-bg {
  width: 100%;
  height: 4px;
  background: #2c2c2e;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-bar-fill {
  height: 100%;
  background: #ff375f;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #a1a1a6;
}

.card-bottom-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 4px;
  margin-top: 4px;
}

.play-resume-btn {
  --color: #ff375f;
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0;
  padding: 0;
}

.delete-btn {
  margin: 0;
  padding: 0;
  font-size: 0.9rem;
}

/* Auth Modal */
.auth-modal-content {
  --background: #121214;
  --color: #ffffff;
}

.logged-in-box,
.auth-header {
  text-align: center;
  margin-bottom: 24px;
}

.cloud-large-icon {
  font-size: 3rem;
  margin-bottom: 8px;
}

.user-email-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f5f5f7;
  margin-bottom: 4px;
}

.user-id-text {
  font-size: 0.75rem;
  color: #8e8e93;
}

.sync-actions-box {
  margin-top: 24px;
}

.sync-time-label {
  font-size: 0.75rem;
  color: #8e8e93;
  text-align: center;
  margin-top: 12px;
}

.custom-input-item {
  --background: #1c1c1e;
  --color: #ffffff;
  border-radius: 10px;
}

.auth-error {
  color: #ff453a;
  font-size: 0.85rem;
  text-align: center;
}

.auth-switch a {
  color: #ff375f;
  text-decoration: none;
  font-size: 0.85rem;
}

.divider-text {
  color: #8e8e93;
  font-size: 0.75rem;
  margin: 12px 0;
}
</style>
