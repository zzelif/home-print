<template>
  <div class="min-h-screen bg-slate-100 p-4 md:p-6">
    <!-- Studio Header -->
    <header class="mb-4 flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div class="flex items-center gap-3">
        <router-link to="/" class="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </router-link>
        <div>
          <h1 class="text-xl font-bold text-slate-900">Layout Studio (Rush ID Mode)</h1>
          <p class="text-xs text-slate-500">4R Photo Paper (101.6mm × 152.4mm)</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3">
        <!-- Big Green Print Button -->
        <button
          @click="handlePrint"
          :disabled="isPrinting"
          class="flex items-center gap-2 rounded-2xl bg-green-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-green-600/30 transition hover:bg-green-700 disabled:opacity-50"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>{{ isPrinting ? 'Printing...' : 'PRINT NOW' }}</span>
        </button>
      </div>
    </header>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Left Controls Panel -->
      <div class="space-y-6">
        <!-- Photo Upload & Face Helper -->
        <div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Customer Photo</h3>
          <div
            @click="triggerFileInput"
            class="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/50 p-6 text-center transition hover:bg-blue-50"
          >
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileSelected" />
            <svg class="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="mt-2 text-sm font-bold text-blue-700">Click or Drag Photo Here</span>
            <span class="text-xs text-slate-500">JPG, PNG, WebP supported</span>
          </div>

          <!-- DPI Quality Traffic Light -->
          <div class="mt-4 rounded-xl p-3 text-xs font-semibold" :class="{
            'bg-green-50 text-green-800 border border-green-200': layoutStore.dpiQuality === 'CRISP',
            'bg-amber-50 text-amber-800 border border-amber-200': layoutStore.dpiQuality === 'ACCEPTABLE',
            'bg-red-50 text-red-800 border border-red-200': layoutStore.dpiQuality === 'BLURRY'
          }">
            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full" :class="{
                'bg-green-500': layoutStore.dpiQuality === 'CRISP',
                'bg-amber-500': layoutStore.dpiQuality === 'ACCEPTABLE',
                'bg-red-500': layoutStore.dpiQuality === 'BLURRY'
              }"></span>
              <span>
                {{ layoutStore.dpiQuality === 'CRISP' ? 'Crisp & Clear (~' + layoutStore.effectiveDpi + ' DPI)' :
                   layoutStore.dpiQuality === 'ACCEPTABLE' ? 'Acceptable Quality (WhatsApp Photo)' : 'Photo is too blurry for official ID' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Preset Selection Cards -->
        <div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Standard Presets (4R)</h3>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="layoutStore.activePreset = 'SET_1'"
              :class="[
                layoutStore.activePreset === 'SET_1' ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600' : 'border-slate-200 hover:border-slate-300',
                'flex flex-col items-start rounded-2xl border p-3.5 text-left transition'
              ]"
            >
              <span class="text-xs font-black text-blue-700 uppercase">SET 1 (Standard)</span>
              <span class="text-sm font-bold text-slate-800">4x 2x2 + 8x 1x1</span>
            </button>

            <button
              type="button"
              @click="layoutStore.activePreset = 'SET_2'"
              :class="[
                layoutStore.activePreset === 'SET_2' ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600' : 'border-slate-200 hover:border-slate-300',
                'flex flex-col items-start rounded-2xl border p-3.5 text-left transition'
              ]"
            >
              <span class="text-xs font-black text-blue-700 uppercase">SET 2 (PRC / Visa)</span>
              <span class="text-sm font-bold text-slate-800">6x 2x2 Inches</span>
            </button>

            <button
              type="button"
              @click="layoutStore.activePreset = 'SET_4'"
              :class="[
                layoutStore.activePreset === 'SET_4' ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600' : 'border-slate-200 hover:border-slate-300',
                'flex flex-col items-start rounded-2xl border p-3.5 text-left transition'
              ]"
            >
              <span class="text-xs font-black text-blue-700 uppercase">SET 4 (Passport)</span>
              <span class="text-sm font-bold text-slate-800">6x 35x45mm</span>
            </button>

            <button
              type="button"
              @click="layoutStore.activePreset = 'FREE'"
              :class="[
                layoutStore.activePreset === 'FREE' ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600' : 'border-slate-200 hover:border-slate-300',
                'flex flex-col items-start rounded-2xl border p-3.5 text-left transition'
              ]"
            >
              <span class="text-xs font-black text-blue-700 uppercase">Full 4R Photo</span>
              <span class="text-sm font-bold text-slate-800">1x 4x6 Inches</span>
            </button>
          </div>
        </div>

        <!-- Toggles -->
        <div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Studio Options</h3>
          <div class="space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" v-model="layoutStore.showCutLines" class="h-5 w-5 rounded text-blue-600 focus:ring-blue-500" />
              <span class="text-sm font-semibold text-slate-700">Show Scissor Cut Lines</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" v-model="layoutStore.zeroGap" class="h-5 w-5 rounded text-blue-600 focus:ring-blue-500" />
              <span class="text-sm font-semibold text-slate-700">Zero-Gap Mode (Fast Slicing)</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" v-model="layoutStore.mirrorFlip" class="h-5 w-5 rounded text-blue-600 focus:ring-blue-500" />
              <span class="text-sm font-semibold text-slate-700">Sublimation Mirror Flip</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Right 4R Canvas Preview (100% Real-Time) -->
      <div class="lg:col-span-2 flex flex-col items-center justify-center rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <!-- 4R Aspect Ratio Card (4x6 in) -->
        <div
          class="relative flex items-center justify-center border-4 border-slate-300 bg-slate-50 shadow-2xl overflow-hidden rounded-lg"
          style="width: 320px; height: 480px;"
        >
          <!-- Grid of Photo Boxes -->
          <div class="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-0">
            <div
              v-for="box in layoutStore.boxes"
              :key="box.id"
              class="relative flex items-center justify-center overflow-hidden border border-dashed border-slate-400 bg-white"
            >
              <img
                v-if="layoutStore.photoUrl"
                :src="layoutStore.photoUrl"
                :class="{ '-scale-x-100': layoutStore.mirrorFlip }"
                class="h-full w-full object-cover"
                alt="ID Photo"
              />
              <span v-else class="text-xs font-bold text-slate-400 uppercase">{{ box.label }}</span>
            </div>
          </div>
        </div>
        <p class="mt-4 text-xs font-semibold text-slate-500">Live 4R Photo Paper Preview (300 DPI Vector Output)</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useLayoutStore } from '../stores/layoutStore';

const layoutStore = useLayoutStore();
const fileInput = ref<HTMLInputElement | null>(null);
const isPrinting = ref(false);

function triggerFileInput() {
  fileInput.value?.click();
}

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    layoutStore.photoUrl = URL.createObjectURL(file);
  }
}

async function handlePrint() {
  isPrinting.value = true;
  try {
    const res = await fetch('/api/operator/print/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: `job_${Date.now()}`,
        state: {
          product: { paperSize: '4R', paperType: 'GLOSSY_PHOTO', isDuplex: false },
          inputFiles: [{ filePath: '/tmp/sample.jpg', mimeType: 'image/jpeg' }],
          layout: {
            presetId: layoutStore.activePreset,
            copies: 1,
            showCutLines: layoutStore.showCutLines,
            zeroGap: layoutStore.zeroGap,
            mirrorFlip: layoutStore.mirrorFlip,
            boxes: layoutStore.boxes,
          },
        },
      }),
    });
    if (res.ok) {
      alert('Print job sent directly to HP Smart Tank 670!');
    }
  } finally {
    isPrinting.value = false;
  }
}
</script>
