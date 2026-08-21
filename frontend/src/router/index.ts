import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import LayoutStudioView from '../views/LayoutStudioView.vue';
import CostingView from '../views/CostingView.vue';
import InactiveUploadView from '../views/InactiveUploadView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/studio',
      name: 'studio',
      component: LayoutStudioView,
    },
    {
      path: '/costing',
      name: 'costing',
      component: CostingView,
    },
    {
      path: '/drop',
      name: 'drop',
      component: InactiveUploadView,
    },
  ],
});

export default router;
