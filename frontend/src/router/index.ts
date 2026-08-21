import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import LayoutStudioView from '../views/LayoutStudioView.vue';
import DocumentPrintView from '../views/DocumentPrintView.vue';
import CostingView from '../views/CostingView.vue';
import InactiveUploadView from '../views/InactiveUploadView.vue';
import SettingsView from '../views/SettingsView.vue';
import AnalyticsView from '../views/AnalyticsView.vue';

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
      path: '/document',
      name: 'document',
      component: DocumentPrintView,
    },
    {
      path: '/costing',
      name: 'costing',
      component: CostingView,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: AnalyticsView,
    },
    {
      path: '/drop',
      name: 'drop',
      component: InactiveUploadView,
    },
  ],
});

export default router;
