<template>
  <div class="flex h-screen bg-slate-100 font-sans text-slate-800 antialiased overflow-hidden">
    <!-- Mobile Drawer Backdrop -->
    <div
      v-if="!isCustomerDropPortal && isMobileSidebarOpen"
      @click="isMobileSidebarOpen = false"
      class="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 lg:hidden"
    ></div>

    <!-- Operator Sidebar (Responsive: drawer on mobile, static on desktop) -->
    <AppSidebar
      v-if="!isCustomerDropPortal"
      :is-open="isMobileSidebarOpen"
      @close="isMobileSidebarOpen = false"
    />

    <!-- Dynamic Content Area -->
    <div class="flex flex-1 flex-col h-screen overflow-hidden min-w-0">
      <!-- Mobile Top Navigation Header (Visible only on < lg screens) -->
      <header
        v-if="!isCustomerDropPortal"
        class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-xs shrink-0 lg:hidden z-30"
      >
        <div class="flex items-center gap-3">
          <!-- Hamburger Menu Toggle Button -->
          <button
            type="button"
            @click="isMobileSidebarOpen = !isMobileSidebarOpen"
            class="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition shadow-xs"
            aria-label="Open Navigation Menu"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <!-- Brand Logo -->
          <router-link to="/" class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </div>
            <span class="text-base font-black tracking-tight text-slate-900">HomePrint</span>
          </router-link>
        </div>

        <!-- Live Printer Status Pill -->
        <router-link
          to="/settings"
          class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition"
          :class="jobStore.printerStatus.isOnline ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-rose-50 text-rose-800 ring-rose-200'"
        >
          <span
            class="h-2 w-2 rounded-full"
            :class="jobStore.printerStatus.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"
          ></span>
          <span>{{ jobStore.printerStatus.isOnline ? 'Ready' : 'Offline' }}</span>
        </router-link>
      </header>

      <!-- Main Viewport Router Container -->
      <main class="flex-1 overflow-y-auto w-full">
        <router-view />
      </main>
    </div>

    <!-- Tactile Operator PIN Padlock Modal -->
    <PinLockModal v-if="!isCustomerDropPortal && !authStore.isAuthenticated" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AppSidebar from './components/AppSidebar.vue';
import PinLockModal from './components/PinLockModal.vue';
import { useAuthStore } from './stores/authStore';
import { useJobStore } from './stores/jobStore';

const route = useRoute();
const authStore = useAuthStore();
const jobStore = useJobStore();
const isMobileSidebarOpen = ref(false);

const isCustomerDropPortal = computed(() => route.path === '/drop');

watch(() => route.fullPath, () => {
  isMobileSidebarOpen.value = false;
});

onMounted(async () => {
  if (!isCustomerDropPortal.value) {
    await authStore.checkAuth();
    jobStore.fetchPrinterStatus();
    jobStore.initWebSocket();
  }
});
</script>
