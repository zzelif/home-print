<template>
  <div class="min-h-screen bg-slate-100 p-4 md:p-6">
    <!-- Document Print Header -->
    <header class="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div class="flex items-center gap-3">
        <router-link to="/" class="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </router-link>
        <div>
          <h1 class="text-xl font-bold text-slate-900">Document Printing Station</h1>
          <p class="text-xs text-slate-500 font-medium">Homework, Resumes, Thesis & Official Documents (DOCX, PDF, PPTX)</p>
        </div>
      </div>

      <!-- Spool Button -->
      <button
        @click="dispatchDocumentPrint"
        :disabled="isPrinting || !documentFile"
        class="flex items-center gap-2 rounded-2xl bg-emerald-600 px-7 py-3 text-base font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 disabled:opacity-50"
      >
        <svg
          :class="{ 'animate-spin': isPrinting }"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        <span>{{ isPrinting ? 'Spooling to Printer...' : 'PRINT DOCUMENT' }}</span>
      </button>
    </header>

    <!-- Live Spool Alert Banner (When Job Active) -->
    <div v-if="spoolNotification" class="mb-6 rounded-3xl bg-blue-600 p-4 text-white shadow-lg shadow-blue-600/20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <svg class="h-6 w-6 text-blue-200 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-blue-200">Active Spool Status</span>
          <p class="text-sm font-bold">{{ spoolNotification }}</p>
        </div>
      </div>
      <button @click="spoolNotification = null" class="text-xs font-bold text-blue-200 hover:text-white">Dismiss</button>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <!-- Left Config Controls (6 cols) -->
      <div class="space-y-6 lg:col-span-6">
        <!-- File Dropzone -->
        <div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Document File</h3>
          <div
            @click="triggerDocInput"
            class="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/50 p-6 text-center transition hover:bg-emerald-50"
          >
            <input ref="docInput" type="file" accept=".pdf,.docx,.doc,.pptx,.txt" class="hidden" @change="onDocSelected" />
            <svg class="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="mt-2 text-sm font-bold text-emerald-800">
              {{ documentFile ? documentFile.name : 'Select or Drop Document (PDF / DOCX)' }}
            </span>
            <span class="text-xs text-slate-500">
              {{ documentFile ? `${totalDocPages} page(s) detected • ${(documentFile.size / 1024).toFixed(1)} KB` : 'PDF, Word DOCX, PPTX supported' }}
            </span>
          </div>
        </div>

        <!-- Color Mode & Page Range -->
        <div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Print Options & Color</h3>

          <!-- Color Mode -->
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Color Mode</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="colorMode = 'BW'"
                :class="[
                  colorMode === 'BW' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  'rounded-xl py-2.5 text-xs font-bold transition'
                ]"
              >
                Black & White (₱3/page)
              </button>
              <button
                type="button"
                @click="colorMode = 'COLOR'"
                :class="[
                  colorMode === 'COLOR' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  'rounded-xl py-2.5 text-xs font-bold transition'
                ]"
              >
                Full Color (₱10/page)
              </button>
            </div>
          </div>

          <!-- Page Range -->
          <div>
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-slate-600">Page Range</label>
              <span class="text-[11px] font-bold text-emerald-700">
                Selected: {{ effectivePageCount }} of {{ totalDocPages }} page(s)
              </span>
            </div>
            <input
              v-model="pageRangeInput"
              type="text"
              class="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800"
              placeholder="e.g. 1 or 1-5 or 1,3,5 or all"
            />
            <div class="mt-1 flex gap-2">
              <button @click="pageRangeInput = 'all'" class="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">
                All Pages
              </button>
              <button @click="pageRangeInput = '1'" class="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">
                Page 1 Only
              </button>
              <button v-if="totalDocPages > 1" @click="pageRangeInput = `1-${Math.min(totalDocPages, 5)}`" class="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">
                First {{ Math.min(totalDocPages, 5) }} Pages
              </button>
            </div>
          </div>

          <!-- Copies & Paper Size -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Copies</label>
              <input v-model.number="copies" type="number" min="1" class="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Paper Size</label>
              <select v-model="paperSize" class="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800">
                <option value="A4">A4 Standard</option>
                <option value="Letter">Short / Letter</option>
                <option value="Legal">Long / Legal</option>
              </select>
            </div>
          </div>
        </div>

        <!-- HP Style Layout & Fit Options -->
        <div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Fit & Page Layout</h3>

          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              @click="fitMode = 'FIT_PRINTABLE'"
              :class="[
                fitMode === 'FIT_PRINTABLE' ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600' : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                'flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition'
              ]"
            >
              <span class="text-xs font-bold">Fit to Page</span>
              <span class="text-[10px] text-slate-500">Shrink margins</span>
            </button>

            <button
              type="button"
              @click="fitMode = 'FILL_PAGE'"
              :class="[
                fitMode === 'FILL_PAGE' ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600' : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                'flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition'
              ]"
            >
              <span class="text-xs font-bold">Fill Page</span>
              <span class="text-[10px] text-slate-500">Borderless bleed</span>
            </button>

            <button
              type="button"
              @click="fitMode = 'SCALE_100'"
              :class="[
                fitMode === 'SCALE_100' ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600' : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                'flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition'
              ]"
            >
              <span class="text-xs font-bold">Actual Size</span>
              <span class="text-[10px] text-slate-500">100% Scale</span>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Orientation</label>
              <select v-model="orientation" class="block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800">
                <option value="AUTO">Auto Detect</option>
                <option value="PORTRAIT">Portrait</option>
                <option value="LANDSCAPE">Landscape</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Duplex (Two-Sided)</label>
              <select v-model="duplexMode" class="block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800">
                <option value="ONE_SIDED">1-Sided (Single)</option>
                <option value="TWO_SIDED_LONG">2-Sided (Long Edge)</option>
                <option value="TWO_SIDED_SHORT">2-Sided (Short Edge)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Document Details & Visual Page Preview (6 cols) -->
      <div class="space-y-6 lg:col-span-6">
        <!-- Live Total Price Card -->
        <div class="rounded-3xl bg-slate-900 p-6 text-white shadow-xl flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">TOTAL PRICE CALCULATION</span>
            <span class="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
              {{ colorMode === 'BW' ? 'Black & White' : 'Color' }} • {{ duplexMode === 'ONE_SIDED' ? 'Single Sided' : 'Duplex' }}
            </span>
          </div>

          <div class="my-5">
            <div class="text-5xl font-black text-emerald-400">₱{{ calculatedTotal.toFixed(2) }}</div>
            <div class="mt-2 text-xs text-slate-300 font-semibold">
              {{ effectivePageCount }} page(s) × ₱{{ (colorMode === 'BW' ? 3.0 : 10.0).toFixed(2) }} × {{ copies }} copy(ies)
            </div>
          </div>

          <div class="border-t border-slate-800 pt-3 text-xs text-slate-400 space-y-1">
            <div class="flex justify-between">
              <span>Paper & Size:</span>
              <span class="font-bold text-white">{{ paperSize }} ({{ fitMode }})</span>
            </div>
            <div class="flex justify-between">
              <span>Target Hardware:</span>
              <span class="font-bold text-emerald-400">{{ jobStore.printerStatus.activePrinterName || 'Assigned Default Printer' }}</span>
            </div>
          </div>
        </div>

        <!-- Visual Live Page Preview Frame -->
        <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-sm font-bold text-slate-800">Visual Page Inspection</h3>
            <div v-if="documentFile" class="flex items-center gap-2 text-xs font-bold">
              <button
                @click="currentPageIndex = Math.max(1, currentPageIndex - 1)"
                :disabled="currentPageIndex <= 1"
                class="rounded-lg border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-30"
              >
                ‹ Prev
              </button>
              <span class="text-slate-600">Page {{ currentPageIndex }} of {{ totalDocPages }}</span>
              <button
                @click="currentPageIndex = Math.min(totalDocPages, currentPageIndex + 1)"
                :disabled="currentPageIndex >= totalDocPages"
                class="rounded-lg border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-30"
              >
                Next ›
              </button>
            </div>
          </div>

          <!-- Document Preview Canvas / Sheet View -->
          <div class="flex items-center justify-center p-4 bg-slate-50 rounded-2xl">
            <div
              :class="[
                orientation === 'LANDSCAPE' ? 'w-80 h-56' : 'w-56 h-80',
                'relative bg-white shadow-xl border border-slate-300 rounded-sm p-4 flex flex-col justify-between overflow-hidden transition-all'
              ]"
            >
              <!-- Simulated Document Content -->
              <div v-if="documentFile" class="space-y-2">
                <div class="flex items-center justify-between border-b border-slate-200 pb-1">
                  <span class="text-[10px] font-bold text-slate-800 truncate">{{ documentFile.name }}</span>
                  <span class="text-[9px] font-bold text-slate-400">P.{{ currentPageIndex }}</span>
                </div>
                <div class="space-y-1 pt-1">
                  <div class="h-2 bg-slate-200 rounded w-3/4"></div>
                  <div class="h-1.5 bg-slate-200 rounded w-full"></div>
                  <div class="h-1.5 bg-slate-200 rounded w-5/6"></div>
                  <div class="h-1.5 bg-slate-200 rounded w-full"></div>
                  <div class="h-1.5 bg-slate-200 rounded w-2/3"></div>
                </div>
                <div class="space-y-1 pt-3">
                  <div class="h-1.5 bg-slate-200 rounded w-full"></div>
                  <div class="h-1.5 bg-slate-200 rounded w-4/5"></div>
                  <div class="h-1.5 bg-slate-200 rounded w-full"></div>
                </div>
              </div>
              <!-- Placeholder when empty -->
              <div v-else class="h-full flex flex-col items-center justify-center text-center p-4">
                <svg class="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span class="mt-2 text-xs font-semibold text-slate-400">Upload document to preview layout</span>
              </div>

              <!-- Footer Stamp -->
              <div v-if="documentFile" class="text-[8px] font-mono text-slate-400 text-right">
                {{ fitMode }} • {{ colorMode }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useJobStore } from '../stores/jobStore';

const jobStore = useJobStore();
const documentFile = ref<File | null>(null);
const docInput = ref<HTMLInputElement | null>(null);
const colorMode = ref<'BW' | 'COLOR'>('BW');
const pageRangeInput = ref('all');
const copies = ref(1);
const paperSize = ref('A4');
const fitMode = ref<'FIT_PRINTABLE' | 'FILL_PAGE' | 'SCALE_100'>('FIT_PRINTABLE');
const orientation = ref<'AUTO' | 'PORTRAIT' | 'LANDSCAPE'>('AUTO');
const duplexMode = ref<'ONE_SIDED' | 'TWO_SIDED_LONG' | 'TWO_SIDED_SHORT'>('ONE_SIDED');
const totalDocPages = ref(3);
const currentPageIndex = ref(1);
const isPrinting = ref(false);
const spoolNotification = ref<string | null>(null);

onMounted(() => {
  jobStore.fetchPrinterStatus();
});

const effectivePageCount = computed(() => {
  const range = pageRangeInput.value.trim().toLowerCase();
  if (!range || range === 'all') {
    return totalDocPages.value;
  }
  const parts = range.split(',').map((s) => s.trim());
  const selectedPages = new Set<number>();

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (let p = Math.max(1, start); p <= Math.min(totalDocPages.value, end); p++) {
          selectedPages.add(p);
        }
      }
    } else {
      const p = Number(part);
      if (!isNaN(p) && p >= 1 && p <= totalDocPages.value) {
        selectedPages.add(p);
      }
    }
  }
  return selectedPages.size > 0 ? selectedPages.size : 1;
});

const calculatedTotal = computed(() => {
  const rate = colorMode.value === 'BW' ? 3.0 : 10.0;
  return effectivePageCount.value * rate * (copies.value || 1);
});

function triggerDocInput() {
  docInput.value?.click();
}

function onDocSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    documentFile.value = target.files[0];
    totalDocPages.value = 3;
    currentPageIndex.value = 1;
    pageRangeInput.value = 'all';
  }
}

async function dispatchDocumentPrint() {
  if (!documentFile.value) return;
  isPrinting.value = true;
  try {
    const res = await fetch('/api/operator/print/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: `doc_${Date.now()}`,
        state: {
          product: { paperSize: paperSize.value, isDuplex: duplexMode.value !== 'ONE_SIDED' },
          inputFiles: [{ filePath: documentFile.value.name, mimeType: 'application/pdf' }],
          options: {
            colorMode: colorMode.value,
            pageRange: pageRangeInput.value,
            copies: copies.value,
            fitMode: fitMode.value,
            orientation: orientation.value,
          },
        },
      }),
      credentials: 'include',
    });

    if (res.ok) {
      spoolNotification.value = `Document "${documentFile.value.name}" (${effectivePageCount.value} pages, ${colorMode.value}) dispatched to printer!`;
    }
  } finally {
    isPrinting.value = false;
  }
}
</script>
