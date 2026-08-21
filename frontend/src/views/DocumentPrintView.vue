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
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        <span>{{ isPrinting ? 'Spooling...' : 'PRINT DOCUMENT' }}</span>
      </button>
    </header>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <!-- Left Config Controls (5 cols) -->
      <div class="space-y-6 lg:col-span-5">
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
            <span class="text-xs text-slate-500">PDF, Word DOCX, PPTX supported</span>
          </div>
        </div>

        <!-- Page Range & Color Mode -->
        <div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Print Options</h3>

          <!-- Color vs B&W -->
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Color Mode</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="colorMode = 'BW'"
                :class="[
                  colorMode === 'BW' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700',
                  'rounded-xl py-2.5 text-xs font-bold'
                ]"
              >
                Black & White (₱3/page)
              </button>
              <button
                type="button"
                @click="colorMode = 'COLOR'"
                :class="[
                  colorMode === 'COLOR' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700',
                  'rounded-xl py-2.5 text-xs font-bold'
                ]"
              >
                Full Color (₱10/page)
              </button>
            </div>
          </div>

          <!-- Page Range -->
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Page Range</label>
            <input
              v-model="pageRange"
              type="text"
              class="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800"
              placeholder="e.g. 1-5 or all"
            />
          </div>

          <!-- Copies & Duplex -->
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

          <!-- Duplex Checkbox -->
          <label class="flex items-center gap-3 cursor-pointer pt-2">
            <input type="checkbox" v-model="isDuplex" class="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <span class="text-sm font-bold text-slate-800">Two-Sided Printing (Duplex)</span>
          </label>
        </div>
      </div>

      <!-- Right Column: Document Details & Total Due (7 cols) -->
      <div class="space-y-6 lg:col-span-7">
        <!-- Live Total Card -->
        <div class="rounded-3xl bg-slate-900 p-6 text-white shadow-xl flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Price Calculation</span>
            <span class="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
              {{ colorMode === 'BW' ? 'Black & White' : 'Color' }} • {{ isDuplex ? 'Duplex' : 'Single Sided' }}
            </span>
          </div>
          <div class="my-6">
            <div class="text-5xl font-black text-emerald-400">₱{{ calculatedTotal.toFixed(2) }}</div>
            <div class="mt-2 text-xs text-slate-400">
              {{ pageCount }} page(s) × ₱{{ colorMode === 'BW' ? '3.00' : '10.00' }} × {{ copies }} copy(ies)
            </div>
          </div>
        </div>

        <!-- Document Preview / Info Card -->
        <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 class="text-sm font-bold text-slate-800 mb-2">Document Details</h3>
          <div v-if="documentFile" class="space-y-2 text-xs font-semibold text-slate-600">
            <div class="flex justify-between"><span>File Name:</span><span class="font-bold text-slate-900">{{ documentFile.name }}</span></div>
            <div class="flex justify-between"><span>File Size:</span><span class="font-bold text-slate-900">{{ (documentFile.size / 1024).toFixed(1) }} KB</span></div>
            <div class="flex justify-between"><span>Detected Format:</span><span class="font-bold uppercase text-emerald-600">{{ documentFile.name.split('.').pop() }}</span></div>
          </div>
          <div v-else class="py-8 text-center text-xs text-slate-400 font-medium">
            No document loaded. Upload a PDF or DOCX file to see preview details.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const documentFile = ref<File | null>(null);
const docInput = ref<HTMLInputElement | null>(null);
const colorMode = ref<'BW' | 'COLOR'>('BW');
const pageRange = ref('all');
const copies = ref(1);
const paperSize = ref('A4');
const isDuplex = ref(false);
const pageCount = ref(1);
const isPrinting = ref(false);

const calculatedTotal = computed(() => {
  const rate = colorMode.value === 'BW' ? 3.0 : 10.0;
  return pageCount.value * rate * (copies.value || 1);
});

function triggerDocInput() {
  docInput.value?.click();
}

function onDocSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    documentFile.value = target.files[0];
    pageCount.value = 3; // Estimated default
  }
}

async function dispatchDocumentPrint() {
  if (!documentFile.value) return;
  isPrinting.value = true;
  try {
    alert(`Document sent to printer! (${pageCount.value} pages, ${colorMode.value})`);
  } finally {
    isPrinting.value = false;
  }
}
</script>
