import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import TabsPage from '../views/TabsPage.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/music'
  },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      {
        path: '',
        redirect: '/tabs/music'
      },
      {
        path: 'music',
        component: () => import('../views/MusicPage.vue')
      },
      {
        path: 'anime',
        component: () => import('../views/AnimePage.vue')
      },
      {
        path: 'manga',
        component: () => import('../views/MangaPage.vue')
      },
      {
        path: 'library',
        component: () => import('../views/LibraryPage.vue')
      }
    ]
  },
  {
    path: '/manga/:id/chapter/:chapterId',
    component: () => import('../views/MangaReaderPage.vue')
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
