<template>
  <div class="min-h-screen bg-slate-950 px-4 py-8 text-white sm:py-12 flex flex-col justify-center items-center">
    <div class="w-full max-w-md space-y-6">
      <!-- Shop Header -->
      <div class="text-center space-y-2">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-600/30 ring-4 ring-blue-500/20">
          <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white">HomePrint Drop Portal</h1>
        <p class="text-xs sm:text-sm font-medium text-slate-400">Direct Local Wi-Fi File Upload to Print Counter</p>
      </div>

      <!-- Upload Form Card -->
      <div v-if="!isSubmitted" class="rounded-3xl bg-slate-900/90 p-5 sm:p-7 shadow-2xl ring-1 ring-slate-800 backdrop-blur-md space-y-5">
        <form @submit.prevent="submitUpload" class="space-y-4 sm:space-y-5">
          <!-- Customer Name Input -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-400">Your Name / Nickname</label>
            <input
              v-model="customerName"
              type="text"
              required
              maxlength="40"
              class="mt-1.5 block w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm sm:text-base text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
              placeholder="e.g. Maria Clara"
            />
          </div>

          <!-- Service Type Selector -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-400">Print Service</label>
            <div class="mt-1.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                @click="setService('RUSH_ID')"
                :class="[
                  service === 'RUSH_ID'
                    ? 'border-blue-500 bg-blue-600/20 text-white font-bold ring-2 ring-blue-500/30'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700',
                  'rounded-2xl border p-2.5 sm:p-3 text-center transition min-h-[56px] flex flex-col items-center justify-center'
                ]"
              >
                <span class="text-xs font-bold leading-tight">Rush ID</span>
                <span class="text-[10px] text-slate-400 mt-0.5">2x2 / 1x1</span>
              </button>

              <button
                type="button"
                @click="setService('DOCUMENT')"
                :class="[
                  service === 'DOCUMENT'
                    ? 'border-blue-500 bg-blue-600/20 text-white font-bold ring-2 ring-blue-500/30'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700',
                  'rounded-2xl border p-2.5 sm:p-3 text-center transition min-h-[56px] flex flex-col items-center justify-center'
                ]"
              >
                <span class="text-xs font-bold leading-tight">Document</span>
                <span class="text-[10px] text-slate-400 mt-0.5">PDF / Word</span>
              </button>

              <button
                type="button"
                @click="setService('PHOTO')"
                :class="[
                  service === 'PHOTO'
                    ? 'border-blue-500 bg-blue-600/20 text-white font-bold ring-2 ring-blue-500/30'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700',
                  'rounded-2xl border p-2.5 sm:p-3 text-center transition min-h-[56px] flex flex-col items-center justify-center'
                ]"
              >
                <span class="text-xs font-bold leading-tight">Photo Print</span>
                <span class="text-[10px] text-slate-400 mt-0.5">4R / Glossy</span>
              </button>
            </div>
          </div>

          <!-- File Upload Zone -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-400">Select File</label>
            <div
              @click="triggerFileInput"
              class="mt-1.5 relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/70 p-6 text-center transition hover:border-blue-500 hover:bg-slate-950 group"
            >
              <input
                ref="fileInput"
                type="file"
                multiple
                :accept="acceptedMimeTypes"
                class="hidden"
                @change="onFileSelected"
              />

              <!-- Preview if image is selected -->
              <div v-if="previewUrl && (service === 'RUSH_ID' || service === 'PHOTO')" class="mb-3">
                <img :src="previewUrl" alt="File preview" class="h-24 w-24 object-cover rounded-xl shadow-md ring-2 ring-blue-500/50" />
              </div>

              <div v-else class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              <span class="mt-2 text-sm font-bold text-white group-hover:text-blue-400 transition">
                {{ selectedFileCount > 0 ? selectedFileNameText : 'Tap to Browse & Select Files' }}
              </span>
              <span class="text-xs text-slate-500">
                {{ selectedFileSizeText || 'Select one or more files to upload' }}
              </span>
            </div>
            <p v-if="validationError" class="mt-2 text-xs font-medium text-rose-400">
              {{ validationError }}
            </p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isUploading || selectedFileCount === 0 || !customerName.trim()"
            class="w-full rounded-2xl bg-blue-600 py-4 text-sm sm:text-base font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 flex items-center justify-center gap-2 min-h-[56px]"
          >
            <svg v-if="isUploading" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ isUploading ? 'Uploading to Counter...' : `SEND ${selectedFileCount > 1 ? `${selectedFileCount} FILES ` : ''}TO COUNTER` }}</span>
          </button>
        </form>
      </div>

      <!-- Success Confirmation View -->
      <div v-else class="rounded-3xl bg-slate-900/90 p-6 sm:p-8 text-center shadow-2xl ring-1 ring-slate-800 backdrop-blur-md space-y-6">
        <div class="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/20 text-emerald-400 ring-4 ring-emerald-500/10">
          <svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div class="space-y-1">
          <h2 class="text-xl sm:text-2xl font-black text-white">Files Received!</h2>
          <p class="text-xs sm:text-sm text-slate-400 font-medium">Please approach the counter operator with your code</p>
        </div>

        <!-- Tracking Code Badge -->
        <div class="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-5 space-y-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Your Counter Pickup Code</span>
          <div class="font-mono text-3xl sm:text-4xl font-black tracking-wider text-emerald-300">
            {{ submittedTrackingCode }}
          </div>
          <p class="text-xs text-slate-400 pt-1">
            Customer: <strong class="text-white">{{ customerName }}</strong>
          </p>
        </div>

        <button
          @click="resetForm"
          class="w-full rounded-2xl border border-slate-700 bg-slate-800/50 py-3.5 text-xs sm:text-sm font-bold text-slate-200 hover:bg-slate-800 transition min-h-[48px]"
        >
          Send Another File
        </button>
      </div>

      <!-- Footer Privacy Assurance -->
      <div class="text-center text-[11px] text-slate-500 space-y-1">
        <p>Direct Ingestion • Files Auto-Purged after 1 Hour</p>
        <p class="text-slate-600">HomePrint OS Local-First Zero-Cloud Architecture</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const customerName = ref('');
const service = ref<'RUSH_ID' | 'DOCUMENT' | 'PHOTO'>('RUSH_ID');
const selectedFiles = ref<File[]>([]);
const previewUrl = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const isSubmitted = ref(false);
const submittedTrackingCode = ref('');
const validationError = ref<string | null>(null);

const acceptedMimeTypes = computed(() => {
  if (service.value === 'RUSH_ID' || service.value === 'PHOTO') {
    return 'image/jpeg,image/png,image/webp';
  }
  return '.pdf,.docx,.doc,.pptx,image/*';
});

const selectedFileCount = computed(() => selectedFiles.value.length);

const selectedFileNameText = computed(() => {
  if (selectedFiles.value.length === 0) return '';
  if (selectedFiles.value.length === 1) return selectedFiles.value[0].name;
  return `${selectedFiles.value[0].name} (+${selectedFiles.value.length - 1} more)`;
});

const selectedFileSizeText = computed(() => {
  if (selectedFiles.value.length === 0) return null;
  const bytes = selectedFiles.value.reduce((s, f) => s + f.size, 0);
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
});

function setService(newService: 'RUSH_ID' | 'DOCUMENT' | 'PHOTO') {
  service.value = newService;
}

function triggerFileInput() {
  fileInput.value?.click();
}

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFiles.value = Array.from(target.files);
    validationError.value = null;
    const first = selectedFiles.value[0];
    if (first.type.startsWith('image/')) {
      previewUrl.value = URL.createObjectURL(first);
    } else {
      previewUrl.value = null;
    }
  }
}

async function submitUpload() {
  if (selectedFiles.value.length === 0 || !customerName.value.trim()) return;

  isUploading.value = true;
  const formData = new FormData();
  formData.append('customerName', customerName.value.trim());
  formData.append('service', service.value);

  if (selectedFiles.value.length > 1) {
    for (const f of selectedFiles.value) {
      formData.append('files', f);
    }
  } else {
    formData.append('file', selectedFiles.value[0]);
  }

  try {
    const endpoint = selectedFiles.value.length > 1 ? '/api/public/upload-batch' : '/api/public/upload';
    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      submittedTrackingCode.value = data.trackingCode || (data.jobId ? data.jobId.replace('job_', '') : '');
      isSubmitted.value = true;
    } else {
      validationError.value = 'Upload failed on server. Please ask the counter operator for assistance.';
    }
  } catch (err) {
    validationError.value = 'Network error reaching the counter print server. Please check your Wi-Fi connection.';
  } finally {
    isUploading.value = false;
  }
}

function resetForm() {
  selectedFiles.value = [];
  previewUrl.value = null;
  validationError.value = null;
  isSubmitted.value = false;
}
</script>
