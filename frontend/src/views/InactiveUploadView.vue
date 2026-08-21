<template>
  <div class="min-h-screen bg-slate-900 px-4 py-8 text-white md:px-6">
    <div class="mx-auto max-w-md">
      <!-- Shop Header -->
      <div class="mb-8 text-center">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 shadow-xl shadow-blue-600/30">
          <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 class="mt-4 text-2xl font-black tracking-tight">HomePrint Drop Portal</h1>
        <p class="text-xs font-medium text-slate-400">Send photos & documents directly to the shop operator</p>
      </div>

      <!-- Upload Form Card -->
      <div v-if="!isSubmitted" class="rounded-3xl bg-slate-800 p-6 shadow-2xl ring-1 ring-slate-700">
        <form @submit.prevent="submitUpload" class="space-y-5">
          <!-- Customer Name -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-400">Your Name</label>
            <input
              v-model="customerName"
              type="text"
              required
              class="mt-1 block w-full rounded-2xl border border-slate-600 bg-slate-900/80 px-4 py-3 text-base text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Maria Clara"
            />
          </div>

          <!-- Service Type -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-400">Print Service</label>
            <select
              v-model="service"
              class="mt-1 block w-full rounded-2xl border border-slate-600 bg-slate-900/80 px-4 py-3 text-base text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="RUSH_ID">Rush ID Photo (2x2 / 1x1 / Passport)</option>
              <option value="DOCUMENT">Document Printing (Homework, Thesis, Forms)</option>
              <option value="PHOTO_4R">4R Full Photo Print</option>
            </select>
          </div>

          <!-- File Upload Zone -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-400">Select File(s)</label>
            <div
              @click="triggerFileInput"
              class="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900/50 p-6 text-center transition hover:border-blue-500 hover:bg-slate-900"
            >
              <input ref="fileInput" type="file" required class="hidden" @change="onFileSelected" />
              <svg class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span class="mt-2 text-sm font-semibold text-slate-300">
                {{ selectedFile ? selectedFile.name : 'Tap to Choose Photo or Document' }}
              </span>
              <span class="text-xs text-slate-500">PDF, DOCX, JPG, PNG (Max 50MB)</span>
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isUploading || !selectedFile"
            class="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-50"
          >
            <span>{{ isUploading ? 'Uploading...' : 'Send to Operator' }}</span>
          </button>
        </form>
      </div>

      <!-- Success Confirmation Card -->
      <div v-else class="rounded-3xl bg-slate-800 p-8 text-center shadow-2xl ring-1 ring-slate-700">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-400">
          <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="mt-4 text-xl font-bold">Files Received!</h2>
        <p class="mt-2 text-sm text-slate-300">
          Your file has been transferred to the shop counter. Please tell the operator your name:
        </p>
        <div class="mt-4 rounded-2xl bg-slate-900/80 p-4 font-mono text-lg font-bold text-blue-400">
          {{ customerName }}
        </div>
        <button
          @click="resetForm"
          class="mt-6 w-full rounded-2xl border border-slate-600 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700"
        >
          Upload Another File
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const customerName = ref('');
const service = ref('RUSH_ID');
const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const isSubmitted = ref(false);

function triggerFileInput() {
  fileInput.value?.click();
}

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0];
  }
}

async function submitUpload() {
  if (!selectedFile.value || !customerName.value) return;

  isUploading.value = true;
  const formData = new FormData();
  formData.append('customerName', customerName.value);
  formData.append('service', service.value);
  formData.append('file', selectedFile.value);

  try {
    const res = await fetch('/api/public/upload', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      isSubmitted.value = true;
    } else {
      alert('Upload failed. Please try again or inform the operator.');
    }
  } catch (err) {
    alert('Network error. Please check your connection.');
  } finally {
    isUploading.value = false;
  }
}

function resetForm() {
  selectedFile.value = null;
  isSubmitted.value = false;
}
</script>
