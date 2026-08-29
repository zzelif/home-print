<template>
  <div class="rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200 space-y-5">
    <!-- Panel Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
      <div class="min-w-0">
        <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
          <svg class="h-5 w-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
          <span>Ink Tank Levels</span>
        </h3>
        <p class="text-xs text-slate-500 font-medium mt-0.5 truncate">
          {{ targetPrinterDisplayName }}
          <span v-if="targetPrinterIp" class="text-slate-400 font-mono">({{ targetPrinterIp }})</span>
          <span class="text-slate-400"> — Hardware Sensors</span>
        </p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Nozzle Check Button -->
        <button
          @click="doNozzleCheck"
          :disabled="isCheckingNozzle"
          class="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/30 hover:bg-amber-600 transition disabled:opacity-50 min-h-[44px]"
        >
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
          </svg>
          <span>{{ isCheckingNozzle ? 'Sending...' : 'Nozzle Check' }}</span>
        </button>

        <!-- Query Sensor Now (Refresh Button) -->
        <button
          @click="fetchInkLevels"
          :disabled="isLoading"
          class="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition disabled:opacity-50 min-h-[44px]"
          title="Query hardware tank sensors immediately"
        >
          <svg :class="{ 'animate-spin': isLoading }" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{{ isLoading ? 'Querying...' : 'Query Sensor' }}</span>
        </button>
      </div>
    </div>

    <!-- Ink Bars -->
    <div v-if="inkLevels && inkLevels.source !== 'unavailable'" class="space-y-3">
      <div v-for="ink in inkBars" :key="ink.label" class="flex items-center gap-3">
        <!-- Color dot -->
        <div class="h-4 w-4 rounded-full shrink-0 shadow-sm" :style="{ backgroundColor: ink.dotColor }" />
        <!-- Label -->
        <span class="text-xs font-bold text-slate-700 w-16 shrink-0">{{ ink.label }}</span>
        <!-- Bar -->
        <div class="flex-1 rounded-full bg-slate-100 h-4 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-700"
            :style="{ width: `${Math.max(0, ink.pct)}%`, backgroundColor: ink.barColor }"
          />
        </div>
        <!-- Percentage -->
        <span
          class="text-xs font-black w-10 text-right shrink-0"
          :class="ink.pct < 15 ? 'text-red-600' : ink.pct < 35 ? 'text-amber-600' : 'text-slate-700'"
        >
          {{ ink.pct < 0 ? '—' : `${ink.pct}%` }}
        </span>
        <!-- Low warning -->
        <span v-if="ink.pct >= 0 && ink.pct < 15" class="text-xs font-bold text-red-600 shrink-0">LOW</span>
      </div>
    </div>

    <!-- Unavailable state -->
    <div v-else-if="!isLoading" class="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500 space-y-1">
      <p class="font-semibold text-slate-700">Sensor Data Unavailable for {{ targetPrinterDisplayName }}</p>
      <p class="text-xs text-slate-500">Ensure the printer is reachable over Wi-Fi/USB and HPLIP/CUPS is configured on the host.</p>
    </div>

    <!-- Loading skeleton -->
    <div v-else class="space-y-3 animate-pulse">
      <div v-for="i in 4" :key="i" class="flex items-center gap-3">
        <div class="h-4 w-4 rounded-full bg-slate-200 shrink-0" />
        <div class="h-3 w-16 rounded bg-slate-200 shrink-0" />
        <div class="flex-1 rounded-full bg-slate-200 h-4" />
        <div class="h-3 w-10 rounded bg-slate-200 shrink-0" />
      </div>
    </div>

    <!-- Source badge & timestamp -->
    <div v-if="inkLevels && inkLevels.source !== 'unavailable'" class="flex items-center justify-between pt-1">
      <div class="flex items-center gap-2">
        <span
          class="rounded-full px-2.5 py-1 text-xs font-bold"
          :class="sourceBadgeClass"
        >
          {{ sourceBadgeLabel }}
        </span>
        <span class="text-xs text-slate-400">Polled on demand & every 5m</span>
      </div>
      <span class="text-xs text-slate-400">Updated {{ readAtLabel }}</span>
    </div>

    <!-- Toast notification -->
    <transition name="fade">
      <div
        v-if="toast"
        class="rounded-2xl px-4 py-3 text-sm font-bold text-white text-center"
        :class="toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'"
      >
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    printerName?: string;
    printerIp?: string;
  }>(),
  {
    printerName: '',
    printerIp: '',
  }
);

interface InkLevels {
  black: number;
  cyan: number;
  magenta: number;
  yellow: number;
  readAt: string;
  source: 'hplip' | 'snmp' | 'ipp' | 'cached' | 'unavailable';
  printerName?: string;
  printerIp?: string | null;
}

const inkLevels = ref<InkLevels | null>(null);
const isLoading = ref(false);
const isCheckingNozzle = ref(false);
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null);
let pollInterval: ReturnType<typeof setInterval> | null = null;

const targetPrinterDisplayName = computed(() => {
  if (props.printerName) return props.printerName;
  if (inkLevels.value?.printerName) return inkLevels.value.printerName;
  return 'Active Default Printer';
});

const targetPrinterIp = computed(() => {
  if (props.printerIp) return props.printerIp;
  if (inkLevels.value?.printerIp) return inkLevels.value.printerIp;
  return null;
});

const inkBars = computed(() => {
  if (!inkLevels.value) return [];
  return [
    { label: 'Black', pct: inkLevels.value.black, dotColor: '#1e1e1e', barColor: '#1e293b' },
    { label: 'Cyan', pct: inkLevels.value.cyan, dotColor: '#06b6d4', barColor: '#0891b2' },
    { label: 'Magenta', pct: inkLevels.value.magenta, dotColor: '#ec4899', barColor: '#db2777' },
    { label: 'Yellow', pct: inkLevels.value.yellow, dotColor: '#eab308', barColor: '#ca8a04' },
  ];
});

const sourceBadgeClass = computed(() => {
  const src = inkLevels.value?.source;
  if (src === 'hplip') return 'bg-emerald-100 text-emerald-700';
  if (src === 'ipp') return 'bg-blue-100 text-blue-700';
  if (src === 'cached') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-500';
});

const sourceBadgeLabel = computed(() => {
  const src = inkLevels.value?.source;
  if (src === 'hplip') return '🟢 Hardware HPLIP';
  if (src === 'ipp') return '🔵 Hardware IPP';
  if (src === 'cached') return '🟡 Cached Sensor';
  return '⚪ Unknown';
});

const readAtLabel = computed(() => {
  if (!inkLevels.value?.readAt) return '';
  const d = new Date(inkLevels.value.readAt);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});

async function fetchInkLevels() {
  isLoading.value = true;
  try {
    const params = new URLSearchParams();
    if (props.printerName) params.set('printerName', props.printerName);
    if (props.printerIp) params.set('ip', props.printerIp);

    const url = `/api/operator/printers/ink-levels${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.success && data.inkLevels && data.inkLevels.source !== 'unavailable') {
      inkLevels.value = data.inkLevels;
    } else {
      inkLevels.value = data.inkLevels || null;
    }
  } catch {
    inkLevels.value = null;
  } finally {
    isLoading.value = false;
  }
}

async function doNozzleCheck() {
  isCheckingNozzle.value = true;
  try {
    const res = await fetch('/api/operator/printers/nozzle-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerName: props.printerName || undefined,
        printerIp: props.printerIp || undefined,
      }),
    });
    const data = await res.json();
    showToast(
      data.success ? 'success' : 'error',
      data.message || (data.success ? 'Nozzle check page sent to hardware!' : 'Nozzle check failed.')
    );
  } catch {
    showToast('error', 'Unable to contact printer service.');
  } finally {
    isCheckingNozzle.value = false;
  }
}

function showToast(type: 'success' | 'error', message: string) {
  toast.value = { type, message };
  setTimeout(() => { toast.value = null; }, 4000);
}

// Re-fetch when target printer changes
watch(
  () => [props.printerName, props.printerIp],
  () => {
    fetchInkLevels();
  }
);

onMounted(() => {
  fetchInkLevels();
  // Periodic polling every 5 minutes
  pollInterval = setInterval(fetchInkLevels, 5 * 60 * 1000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
