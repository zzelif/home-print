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
        <p class="text-xs font-medium text-slate-400">Send files directly to the print shop counter</p>
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
              @change="onServiceChanged"
              class="mt-1 block w-full rounded-2xl border border-slate-600 bg-slate-900/80 px-4 py-3 text-base text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="RUSH_ID">Rush ID Photo (2x2 / 1x1 / Passport)</option>
              <option value="DOCUMENT">Document Printing (PDF / Word DOCX)</option>
              <option value="PHOTO">Standard Photo Print (4R / Glossy)</option>
            </select>
          </div>

          <!-- File Upload Zone with Strict Validation -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-400">Select File</label>
            <div
              @click="triggerFileInput"
              class="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900/50 p-6 text-center transition hover:border-blue-500 hover:bg-slate-900"
            >
              <input
                ref="fileInput"
                type="file"
                :accept="acceptedMimeTypes"
                class="hidden"
                @change="onFileSelected"
              />
              <svg class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span class="mt-2 text-sm font-semibold text-slate-300">
                {{ selectedFile ? selectedFile.name : 'Tap to Choose File' }}
              </span>
              <span class="text-xs text-slate-500">
                {{ service === 'RUSH_ID' || service === 'PHOTO' ? 'Photos only (JPG, PNG, WebP)' : 'PDF, Word DOCX, PPTX (Max 50MB)' }}
              </span>
            </div>
            <!-- Validation Error message -->
            <div v-if="validationError" class="mt-2 rounded-xl bg-red-500/20 p-2.5 text-xs font-bold text-red-400">
              {{ validationError }}
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isUploading || !selectedFile || !!validationError"
            class="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-50"
          >
            <span>{{ isUploading ? 'Sending...' : 'Send to Print Shop' }}</span>
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
        <h2 class="mt-4 text-xl font-bold">File Sent to Operator!</h2>
        <p class="mt-2 text-sm text-slate-300">
          Your file has been transferred to the queue. Please give this name to the counter:
        </p>
        <div class="mt-4 rounded-2xl bg-slate-900/80 p-4 font-mono text-lg font-bold text-blue-400">
          {{ customerName }}
        </div>
        <button
          @click="resetForm"
          class="mt-6 w-full rounded-2xl border border-slate-600 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700"
        >
          Send Another File
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const customerName = ref('');
const service = ref<'RUSH_ID' | 'DOCUMENT' | 'PHOTO'>('RUSH_ID');
const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const isSubmitted = ref(false);
const validationError = ref<string | null>(null);

const acceptedMimeTypes = computed(() => {
  if (service.value === 'RUSH_ID' || service.value === 'PHOTO') {
    return 'image/jpeg,image/png,image/webp';
  }
  return '.pdf,.docx,.doc,.pptx';
});

function triggerFileInput() {
  fileInput.value?.click();
}

function onServiceChanged() {
  if (selectedFile.value) {
    validateFile(selectedFile.value);
  }
}

function validateFile(file: File): boolean {
  validationError.value = null;
  const isImage = file.type.startsWith('image/');
  const isDoc = file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc') || file.name.endsWith('.pptx');

  if ((service.value === 'RUSH_ID' || service.value === 'PHOTO') && !isImage) {
    validationError.value = 'Rush ID requires a photo (JPG/PNG), not a document.';
    return false;
  }

  if (service.value === 'DOCUMENT' && isImage) {
    validationError.value = 'Please select Document files (.pdf or .docx). For photos, switch service to Photo Print.';
    return false;
  }

  return true;
}

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    if (validateFile(file)) {
      selectedFile.value = file;
    } else {
      selectedFile.value = null;
    }
  }
}

async function submitUpload() {
  if (!selectedFile.value || !customerName.value) return;
  if (!validateFile(selectedFile.value)) return;

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
      alert('Upload failed. Please try again or notify the operator.');
    }
  } catch (err) {
    alert('Network error. Please check connection.');
  } finally {
    isUploading.value = false;
  }
}

function resetForm() {
  selectedFile.value = null;
  validationError.value = null;
  isSubmitted.value = false;
}
</script>
