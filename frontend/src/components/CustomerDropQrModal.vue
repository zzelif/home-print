<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-4 backdrop-blur-sm print:p-0 print:bg-white overflow-y-auto">
    <div class="relative w-full max-w-sm sm:max-w-md max-h-[88vh] overflow-y-auto rounded-3xl bg-white p-4 sm:p-6 shadow-2xl space-y-3.5 print:shadow-none print:max-w-none print:p-8 print:w-full print:max-h-none">
      
      <!-- Modal Header (Hidden on print) -->
      <div class="flex items-center justify-between print:hidden border-b border-slate-100 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30 shrink-0">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-black text-slate-900 leading-tight">Customer Upload QR</h2>
            <p class="text-[11px] text-slate-500 font-medium">Scan to send photos & docs directly</p>
          </div>
        </div>

        <button
          @click="$emit('close')"
          class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition shrink-0"
          aria-label="Close Modal"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Standee Card Container (Rendered on screen & formatted on print) -->
      <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-center space-y-3 print:border-2 print:border-slate-900 print:bg-white print:p-8">
        <div>
          <span class="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-800">
            Self-Service Upload
          </span>
          <h1 class="mt-1 text-lg sm:text-xl font-black tracking-tight text-slate-900 print:text-3xl">Scan to Send Files</h1>
          <p class="text-[11px] font-medium text-slate-500 print:text-sm">Rush ID • Documents • Photo Prints</p>
        </div>

        <!-- High-Contrast Vector QR Canvas -->
        <div class="relative mx-auto flex h-44 w-44 sm:h-48 sm:w-48 items-center justify-center rounded-2xl bg-white p-2.5 shadow-xs ring-1 ring-slate-200 print:h-72 print:w-72">
          <canvas ref="qrCanvas" class="h-full w-full object-contain"></canvas>
        </div>

        <!-- 3-Step Simple Guide -->
        <div class="grid grid-cols-3 gap-1.5 rounded-xl bg-white p-2 text-center border border-slate-200/80 text-[10px] sm:text-xs text-slate-700 font-medium">
          <div class="flex flex-col items-center">
            <span class="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-black text-white mb-0.5">1</span>
            <span>Scan QR</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-black text-white mb-0.5">2</span>
            <span>Select File</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-black text-white mb-0.5">3</span>
            <span>Tell Counter</span>
          </div>
        </div>

        <!-- Direct Web Link Chip with Copy Button -->
        <div class="flex items-center justify-between gap-2 rounded-xl bg-slate-900 px-3 py-2 text-left text-white">
          <div class="min-w-0 flex-1">
            <span class="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Direct Link</span>
            <p class="truncate font-mono text-xs font-bold text-blue-300">{{ activeDropUrl }}</p>
          </div>
          <button
            type="button"
            @click="copyUrlToClipboard"
            class="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[10px] font-bold text-slate-200 transition shrink-0 print:hidden"
            title="Copy portal link to clipboard"
          >
            <svg v-if="!copied" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span v-if="copied" class="text-green-400 font-bold">Copied!</span>
            <span v-else>Copy</span>
          </button>
        </div>
      </div>

      <!-- Collapsible Public Tunnel / Custom URL Section (Hidden on print) -->
      <div class="rounded-2xl border border-slate-200 bg-slate-50/50 p-2.5 print:hidden">
        <button
          type="button"
          @click="isTunnelConfigOpen = !isTunnelConfigOpen"
          class="flex w-full items-center justify-between text-left text-xs font-bold text-slate-700 hover:text-slate-900 transition"
        >
          <span class="flex items-center gap-1.5">
            <svg class="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Public Tunnel URL (Optional)</span>
          </span>
          <span class="text-[10px] text-blue-600 font-bold">{{ isTunnelConfigOpen ? 'Hide' : (customUrl ? 'Customized' : 'Configure') }}</span>
        </button>

        <div v-if="isTunnelConfigOpen" class="mt-2.5 space-y-2 pt-2 border-t border-slate-200/70">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-slate-500">Cloudflare Tunnel / Custom Domain:</span>
            <button
              v-if="customUrl"
              @click="resetToDefaultUrl"
              class="text-[10px] font-bold text-rose-600 hover:underline"
            >
              Reset to Local IP
            </button>
          </div>
          <input
            v-model="customUrl"
            @input="onCustomUrlChanged"
            type="text"
            class="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            placeholder="e.g. https://drop.myprintshop.com"
          />
          <p class="text-[10px] text-slate-400">Allows customer uploads over cellular data without connecting to Wi-Fi.</p>
        </div>
      </div>

      <!-- Action Footer (Hidden on print) -->
      <div class="grid grid-cols-2 gap-2.5 pt-1 print:hidden">
        <button
          type="button"
          @click="printStandee"
          class="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-900 py-3 px-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-slate-800 transition min-h-[46px]"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>Print Standee</span>
        </button>

        <button
          type="button"
          @click="$emit('close')"
          class="flex items-center justify-center rounded-2xl border border-slate-300 py-3 px-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition min-h-[46px]"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import QRCode from 'qrcode';

const props = defineProps<{
  isOpen: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const qrCanvas = ref<HTMLCanvasElement | null>(null);
const customUrl = ref(localStorage.getItem('homeprint_custom_drop_url') || '');
const isTunnelConfigOpen = ref(false);
const copied = ref(false);

const activeDropUrl = computed(() => {
  if (customUrl.value && customUrl.value.trim()) {
    const raw = customUrl.value.trim();
    return raw.endsWith('/drop') ? raw : `${raw.replace(/\/$/, '')}/drop`;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/drop`;
  }
  return 'http://192.168.1.61:5000/drop';
});

function onCustomUrlChanged() {
  localStorage.setItem('homeprint_custom_drop_url', customUrl.value.trim());
  renderQrCode();
}

function resetToDefaultUrl() {
  customUrl.value = '';
  localStorage.removeItem('homeprint_custom_drop_url');
  renderQrCode();
}

async function copyUrlToClipboard() {
  try {
    await navigator.clipboard.writeText(activeDropUrl.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy URL to clipboard:', err);
  }
}

async function renderQrCode() {
  await nextTick();
  if (!qrCanvas.value) return;

  try {
    await QRCode.toCanvas(qrCanvas.value, activeDropUrl.value, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate QR code canvas:', err);
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      renderQrCode();
    }
  }
);

onMounted(() => {
  if (props.isOpen) {
    renderQrCode();
  }
});

function printStandee() {
  window.print();
}
</script>

