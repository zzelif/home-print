<template>
  <aside
    :class="[
      'flex flex-col justify-between border-r border-slate-200 bg-white shadow-sm shrink-0 h-screen transition-transform duration-300 ease-in-out',
      'fixed inset-y-0 left-0 z-50 w-72 p-5 lg:static lg:w-64 lg:translate-x-0 lg:z-auto',
      isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    ]"
  >
    <div class="space-y-6 overflow-y-auto">
      <!-- Brand Logo Header & Mobile Close Button -->
      <div class="flex items-center justify-between px-2">
        <router-link to="/" @click="$emit('close')" class="flex items-center gap-3 cursor-pointer">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30 shrink-0">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </div>
          <div>
            <h1 class="text-lg font-black tracking-tight text-slate-900 leading-none">HomePrint</h1>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Operator OS</span>
          </div>
        </router-link>

        <!-- Close Button (Mobile Only) -->
        <button
          type="button"
          @click="$emit('close')"
          class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden transition"
          aria-label="Close Navigation"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation Links -->
      <nav class="space-y-1.5">
        <router-link
          to="/"
          @click="$emit('close')"
          exact-active-class="bg-blue-50/80 text-blue-700 font-black"
          class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition min-h-[48px]"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span>Live Queue</span>
        </router-link>

        <router-link
          to="/studio"
          @click="$emit('close')"
          exact-active-class="bg-blue-50/80 text-blue-700 font-black"
          class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition min-h-[48px]"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Layout Studio</span>
        </router-link>

        <router-link
          to="/document"
          @click="$emit('close')"
          exact-active-class="bg-blue-50/80 text-blue-700 font-black"
          class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition min-h-[48px]"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Document Print</span>
        </router-link>

        <router-link
          to="/costing"
          @click="$emit('close')"
          exact-active-class="bg-blue-50/80 text-blue-700 font-black"
          class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition min-h-[48px]"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span>Product Costing</span>
        </router-link>

        <router-link
          to="/settings"
          @click="$emit('close')"
          exact-active-class="bg-blue-50/80 text-blue-700 font-black"
          class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition min-h-[48px]"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Printer Discovery</span>
        </router-link>

        <router-link
          to="/analytics"
          @click="$emit('close')"
          exact-active-class="bg-blue-50/80 text-blue-700 font-black"
          class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition min-h-[48px]"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Analytics & History</span>
        </router-link>

        <a
          href="/drop"
          target="_blank"
          @click="$emit('close')"
          class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition min-h-[48px]"
        >
          <svg class="h-5 w-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Customer QR Drop</span>
        </a>
      </nav>
    </div>

    <!-- Sticky Footer Operator Card with Truthful Real-Time Hardware Status -->
    <router-link
      to="/settings"
      @click="$emit('close')"
      class="rounded-2xl p-3.5 ring-1 transition block"
      :class="jobStore.printerStatus.isOnline ? 'bg-emerald-50/70 ring-emerald-200 hover:bg-emerald-100/80' : 'bg-rose-50/70 ring-rose-200 hover:bg-rose-100/80'"
    >
      <div class="flex items-center gap-2.5">
        <span
          :class="jobStore.printerStatus.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"
          class="h-3 w-3 rounded-full shrink-0 shadow-xs"
        ></span>
        <div class="min-w-0">
          <div class="text-xs font-black truncate" :class="jobStore.printerStatus.isOnline ? 'text-emerald-950' : 'text-rose-950'">
            {{ jobStore.printerStatus.activePrinterName || (jobStore.printerStatus.isOnline ? 'Printer Ready' : 'Printer Offline') }}
          </div>
          <div class="text-[10px] font-bold uppercase tracking-wider" :class="jobStore.printerStatus.isOnline ? 'text-emerald-700' : 'text-rose-700'">
            {{ jobStore.printerStatus.isOnline ? 'Online (Ready to Print)' : 'Offline (Check Cable / Power)' }}
          </div>
        </div>
      </div>
    </router-link>
  </aside>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useJobStore } from '../stores/jobStore';

defineProps<{
  isOpen?: boolean;
}>();

defineEmits(['close']);

const jobStore = useJobStore();

onMounted(() => {
  jobStore.fetchPrinterStatus();
});
</script>
