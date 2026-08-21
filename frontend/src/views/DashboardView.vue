<template>
  <div class="flex min-h-screen bg-slate-100 font-sans text-slate-800 antialiased">
    <!-- Left Navigation Sidebar -->
    <aside class="flex w-64 flex-col justify-between border-r border-slate-200 bg-white p-5 shadow-sm shrink-0">
      <div class="space-y-6">
        <!-- Brand Logo -->
        <div class="flex items-center gap-3 px-2">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </div>
          <div>
            <h1 class="text-lg font-black tracking-tight text-slate-900 leading-none">HomePrint</h1>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Operator OS</span>
          </div>
        </div>

        <!-- Navigation Links (Vector SVG Icons, NO Emojis) -->
        <nav class="space-y-1.5">
          <router-link
            to="/"
            class="flex items-center gap-3 rounded-2xl bg-blue-50/80 px-4 py-3 text-sm font-bold text-blue-700 transition"
          >
            <svg class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>Live Queue</span>
          </router-link>

          <router-link
            to="/studio"
            class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Layout Studio</span>
          </router-link>

          <router-link
            to="/document"
            class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Document Print</span>
          </router-link>

          <router-link
            to="/costing"
            class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>Product Costing</span>
          </router-link>

          <router-link
            to="/settings"
            class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Printer Discovery</span>
          </router-link>

          <router-link
            to="/analytics"
            class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Analytics & History</span>
          </router-link>

          <a
            href="/drop"
            target="_blank"
            class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Customer QR Drop</span>
          </a>
        </nav>
      </div>

      <!-- Footer Operator Card with Real-Time Hardware Status -->
      <router-link to="/settings" class="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200 block hover:bg-slate-100 transition">
        <div class="flex items-center gap-2">
          <span
            :class="jobStore.printerStatus.isOnline ? 'bg-green-500' : 'bg-amber-500'"
            class="h-2.5 w-2.5 rounded-full shrink-0"
          ></span>
          <span class="text-xs font-bold text-slate-700 truncate">{{ jobStore.printerStatus.message }}</span>
        </div>
      </router-link>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 p-6 space-y-6 overflow-y-auto">
      <!-- Top Action Bar -->
      <div class="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div>
          <h2 class="text-xl font-extrabold text-slate-900">Job Orders & Incoming Inbox</h2>
          <p class="text-xs text-slate-500 font-medium">Customer drops, Messenger uploads, and walk-in requests</p>
        </div>

        <div class="flex items-center gap-3">
          <router-link
            to="/studio"
            class="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Rush ID</span>
          </router-link>

          <router-link
            to="/document"
            class="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Print Document</span>
          </router-link>

          <button
            @click="jobStore.fetchJobs"
            class="rounded-2xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
            title="Refresh Queue"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Operator Fast Ingestion Dropzone Banner -->
      <div
        @click="triggerOperatorUpload"
        class="flex cursor-pointer items-center justify-between rounded-3xl border-2 border-dashed border-blue-400 bg-blue-50/60 p-5 transition hover:bg-blue-50"
      >
        <input ref="operatorFileInput" type="file" multiple class="hidden" @change="onOperatorFilesSelected" />
        <div class="flex items-center gap-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <h4 class="text-sm font-extrabold text-blue-900">Operator Fast Ingestion Dropzone</h4>
            <p class="text-xs text-blue-700 font-medium">Drag attachments from Facebook Messenger, Gmail, Bluetooth, or USB here</p>
          </div>
        </div>
        <span class="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm">
          + Add to Queue
        </span>
      </div>

      <!-- Main Column Job Queue -->
      <div class="space-y-4">
        <!-- Single Job Card in Column -->
        <div
          v-for="job in jobStore.jobs"
          :key="job.id"
          class="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
        >
          <!-- Left Job Info -->
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-black text-sm">
              {{ job.customer_name ? job.customer_name.charAt(0).toUpperCase() : 'W' }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-extrabold text-slate-900">{{ job.customer_name || 'Walk-in Customer' }}</h3>
                <span class="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  {{ job.source }}
                </span>
              </div>
              <div class="mt-0.5 flex items-center gap-3 text-xs text-slate-400 font-medium">
                <span>ID: {{ job.id }}</span>
                <span>•</span>
                <span>{{ new Date(job.created_at).toLocaleTimeString() }}</span>
                <span v-if="job.files && job.files.length > 0">• {{ job.files[0].originalName }}</span>
              </div>
            </div>
          </div>

          <!-- Middle Status & Price -->
          <div class="flex items-center gap-6">
            <span
              :class="[
                job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                job.status === 'PRINTING' ? 'bg-purple-100 text-purple-800' :
                job.status === 'IN_LAYOUT' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800',
                'rounded-full px-3.5 py-1 text-xs font-bold'
              ]"
            >
              {{ job.status }}
            </span>

            <div class="text-right">
              <div class="text-xs font-bold uppercase tracking-wider text-slate-400">Total</div>
              <div class="text-lg font-black text-slate-900">
                ₱{{ (job.final_amount || job.selling_price || 40).toFixed(2) }}
              </div>
            </div>
          </div>

          <!-- Right Action Buttons -->
          <div class="flex items-center gap-2.5">
            <router-link
              to="/studio"
              class="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Open in Studio
            </router-link>

            <button
              v-if="job.status !== 'COMPLETED'"
              @click="openCheckout(job)"
              class="rounded-xl bg-green-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-green-700"
            >
              Checkout (₱)
            </button>
            <span v-else class="rounded-xl bg-green-50 px-3.5 py-2 text-xs font-bold text-green-700">
              Paid & Finished
            </span>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="jobStore.jobs.length === 0" class="rounded-3xl bg-white p-12 text-center ring-1 ring-slate-200">
          <svg class="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 class="mt-4 text-base font-bold text-slate-700">No Orders in Queue</h3>
          <p class="mt-1 text-xs text-slate-400">Customer uploads from the QR counter or messaging apps will appear here live.</p>
        </div>
      </div>
    </main>

    <!-- Checkout Modal -->
    <CheckoutModal
      :is-open="isCheckoutOpen"
      :job="selectedJob"
      @close="isCheckoutOpen = false"
      @complete="handleCheckoutComplete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useJobStore, PrintJob } from '../stores/jobStore';
import CheckoutModal from '../components/CheckoutModal.vue';

const jobStore = useJobStore();
const isCheckoutOpen = ref(false);
const selectedJob = ref<PrintJob | null>(null);
const operatorFileInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
  jobStore.fetchJobs();
  jobStore.fetchPrinterStatus();
  jobStore.initWebSocket();
});

function openCheckout(job: PrintJob) {
  selectedJob.value = job;
  isCheckoutOpen.value = true;
}

async function handleCheckoutComplete(payload: { jobId: string; cashTendered: number; changeGiven: number }) {
  await jobStore.completeCheckout(payload.jobId, payload.cashTendered, payload.changeGiven);
  isCheckoutOpen.value = false;
}

function triggerOperatorUpload() {
  operatorFileInput.value?.click();
}

async function onOperatorFilesSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    for (let i = 0; i < target.files.length; i++) {
      const file = target.files[i];
      const formData = new FormData();
      formData.append('customerName', 'Counter Operator Job');
      formData.append('service', file.type.startsWith('image/') ? 'RUSH_ID' : 'DOCUMENT');
      formData.append('file', file);

      await fetch('/api/public/upload', {
        method: 'POST',
        body: formData,
      });
    }
    await jobStore.fetchJobs();
  }
}
</script>
