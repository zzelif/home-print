<template>
  <div class="min-h-screen bg-slate-50 p-4 md:p-6">
    <!-- Header Bar -->
    <header class="mb-6 flex flex-col justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 md:flex-row md:items-center">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">HomePrint Station</h1>
        <p class="text-sm font-medium text-slate-500">Operator: Mother (Neighborhood Print & Layout Studio)</p>
      </div>

      <!-- Printer Health Status Banner -->
      <div class="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div class="flex h-3 w-3 relative">
          <span :class="jobStore.printerStatus.isOnline ? 'bg-green-500' : 'bg-red-500'" class="h-3 w-3 rounded-full animate-ping absolute opacity-75"></span>
          <span :class="jobStore.printerStatus.isOnline ? 'bg-green-600' : 'bg-red-600'" class="h-3 w-3 rounded-full relative"></span>
        </div>
        <div>
          <div class="text-xs font-bold uppercase tracking-wider text-slate-500">HP Smart Tank 670</div>
          <div class="text-sm font-bold text-slate-800">{{ jobStore.printerStatus.isOnline ? 'Ready to Print' : 'Printer Offline' }}</div>
        </div>
      </div>
    </header>

    <!-- Fast Action Grid -->
    <section class="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
      <!-- 1. New Rush ID -->
      <router-link
        to="/studio"
        class="flex flex-col items-start justify-between rounded-3xl bg-blue-600 p-6 text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
      >
        <div class="rounded-2xl bg-white/10 p-3">
          <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div class="mt-6">
          <h2 class="text-xl font-bold">New Rush ID</h2>
          <p class="text-xs font-medium text-blue-100">4R Presets, 2x2, Passport</p>
        </div>
      </router-link>

      <!-- 2. Print Document -->
      <router-link
        to="/studio"
        class="flex flex-col items-start justify-between rounded-3xl bg-emerald-600 p-6 text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
      >
        <div class="rounded-2xl bg-white/10 p-3">
          <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div class="mt-6">
          <h2 class="text-xl font-bold">Document Print</h2>
          <p class="text-xs font-medium text-emerald-100">DOCX, PDF, B&W / Color</p>
        </div>
      </router-link>

      <!-- 3. Costing & Prices -->
      <router-link
        to="/costing"
        class="flex flex-col items-start justify-between rounded-3xl bg-indigo-600 p-6 text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
      >
        <div class="rounded-2xl bg-white/10 p-3">
          <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div class="mt-6">
          <h2 class="text-xl font-bold">Costing Matrix</h2>
          <p class="text-xs font-medium text-indigo-100">Pricing & Margins</p>
        </div>
      </router-link>

      <!-- 4. QR Drop Link -->
      <a
        href="/drop"
        target="_blank"
        class="flex flex-col items-start justify-between rounded-3xl bg-slate-800 p-6 text-white shadow-lg shadow-slate-800/20 transition hover:bg-slate-900"
      >
        <div class="rounded-2xl bg-white/10 p-3">
          <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div class="mt-6">
          <h2 class="text-xl font-bold">Counter Drop</h2>
          <p class="text-xs font-medium text-slate-300">Open Customer QR Page</p>
        </div>
      </a>
    </section>

    <!-- Active Job Queue Table -->
    <section class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Live Orders & Inbox Queue</h2>
          <p class="text-xs text-slate-500">Incoming uploads from QR, Messenger, Telegram, and walk-ins</p>
        </div>
        <button
          @click="jobStore.fetchJobs"
          class="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Refresh Queue
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600">
          <thead class="border-b border-slate-100 text-xs uppercase text-slate-400">
            <tr>
              <th class="py-3">Customer</th>
              <th class="py-3">Source</th>
              <th class="py-3">Status</th>
              <th class="py-3">Amount</th>
              <th class="py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="job in jobStore.jobs" :key="job.id" class="hover:bg-slate-50/80">
              <td class="py-4 font-bold text-slate-900">
                {{ job.customer_name || 'Walk-in' }}
                <div class="text-xs font-normal text-slate-400">{{ job.id }}</div>
              </td>
              <td class="py-4">
                <span class="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {{ job.source }}
                </span>
              </td>
              <td class="py-4">
                <span
                  :class="[
                    job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    job.status === 'PRINTING' ? 'bg-purple-100 text-purple-800' :
                    job.status === 'IN_LAYOUT' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800',
                    'rounded-full px-3 py-1 text-xs font-bold'
                  ]"
                >
                  {{ job.status }}
                </span>
              </td>
              <td class="py-4 font-bold text-slate-800">
                ₱{{ (job.final_amount || job.selling_price || 40).toFixed(2) }}
              </td>
              <td class="py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    v-if="job.status !== 'COMPLETED'"
                    @click="openCheckout(job)"
                    class="rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-green-700"
                  >
                    Checkout
                  </button>
                  <span v-else class="text-xs font-bold text-green-600">Paid</span>
                </div>
              </td>
            </tr>
            <tr v-if="jobStore.jobs.length === 0">
              <td colspan="5" class="py-8 text-center text-slate-400">
                No active jobs in queue. Customer uploads will appear here automatically.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

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

onMounted(() => {
  jobStore.fetchJobs();
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
</script>
