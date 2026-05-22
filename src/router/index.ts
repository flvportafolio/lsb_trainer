import { createRouter, createWebHistory } from 'vue-router';
import PracticeView from '@/views/PracticeView.vue';
import TrainingView from '@/views/TrainingView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/practicar',
    },
    {
      path: '/practicar',
      name: 'practice',
      component: PracticeView,
    },
    {
      path: '/entrenar',
      name: 'training',
      component: TrainingView,
    },
  ],
});
