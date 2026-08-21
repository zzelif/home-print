<template>
  <div class="min-h-screen bg-slate-100 p-4 md:p-6">
    <!-- Header -->
    <header class="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div class="flex items-center gap-3">
        <router-link to="/" class="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </router-link>
        <div>
          <h1 class="text-xl font-bold text-slate-900">Shop Analytics & Job History</h1>
          <p class="text-xs text-slate-500 font-medium">Daily Revenue Tracking, Product Breakdown & 1-Click Reprint Log</p>
        </div>
      </div>
    </header>

    <!-- Top KPI Cards Grid -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      <!-- KPI 1: Today's Revenue -->
      <div class="rounded-3xl bg-emerald-600 p-5 text-white shadow-lg shadow-emerald-600/20">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-200">Today's Revenue</span>
          <span class="rounded-full bg-white/20 p-1.5">
            <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>
        <div class="mt-3 text-3xl font-black">₱{{ totalRevenueToday.toFixed(2) }}</div>
        <span class="text-[11px] font-medium text-emerald-100">From completed cash & paid jobs</span>
      </div>

      <!-- KPI 2: Completed Orders -->
      <div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Orders</span>
          <span class="rounded-full bg-blue-50 p-1.5 text-blue-600">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        </div>
        <div class="mt-3 text-3xl font-black text-slate-900">{{ completedJobsCount }}</div>
        <span class="text-[11px] font-medium text-slate-400">Successfully printed & paid</span>
      </div>

      <!-- KPI 3: Average Ticket -->
      <div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Average Order Value</span>
          <span class="rounded-full bg-purple-50 p-1.5 text-purple-600">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </span>
        </div>
        <div class="mt-3 text-3xl font-black text-slate-900">₱{{ averageTicket.toFixed(2) }}</div>
        <span class="text-[11px] font-medium text-slate-400">Average revenue per customer</span>
      </div>

      <!-- KPI 4: Active Queue -->
      <div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Pending in Queue</span>
          <span class="rounded-full bg-amber-50 p-1.5 text-amber-600">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>
        <div class="mt-3 text-3xl font-black text-slate-900">{{ pendingJobsCount }}</div>
        <span class="text-[11px] font-medium text-slate-400">Awaiting layout or printing</span>
      </div>
    </div>

    <!-- Completed Orders & History Table with Reprint Action -->
    <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 class="text-base font-bold text-slate-900">Recent Job Orders History</h3>
          <p class="text-xs text-slate-500 font-medium">Audit trail of all walk-in and online print orders</p>
        </div>
        <button @click="jobStore.fetchJobs" class="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600">
          <thead class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400">
            <tr>
              <th class="py-2.5">Customer</th>
              <th class="py-2.5">Channel</th>
              <th class="py-2.5">Time</th>
              <th class="py-2.5">Amount (₱)</th>
              <th class="py-2.5">Status</th>
              <th class="py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="job in jobStore.jobs" :key="job.id" class="hover:bg-slate-50">
              <td class="py-3">
                <div class="font-extrabold text-slate-900">{{ job.customer_name || 'Walk-in Customer' }}</div>
                <div class="text-[11px] text-slate-400 font-mono">ID: {{ job.id }}</div>
              </td>
              <td class="py-3">
                <span class="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  {{ job.source }}
                </span>
              </td>
              <td class="py-3 text-xs text-slate-500 font-medium">
                {{ new Date(job.created_at).toLocaleTimeString() }}
              </td>
              <td class="py-3 font-black text-slate-900">
                ₱{{ (job.final_amount || job.selling_price || 40).toFixed(2) }}
              </td>
              <td class="py-3">
                <span
                  :class="job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'"
                  class="rounded-full px-2.5 py-0.5 text-xs font-bold"
                >
                  {{ job.status }}
                </span>
              </td>
              <td class="py-3 text-right">
                <button
                  @click="reprintJob(job)"
                  class="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-600 transition shadow-sm"
                >
                  Instant Reprint
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useJobStore, PrintJob } from '../stores/jobStore';

const jobStore = useJobStore();

onMounted(() => {
  jobStore.fetchJobs();
});

const completedJobsCount = computed(() => {
  return jobStore.jobs.filter((j) => j.status === 'COMPLETED').length;
});

const pendingJobsCount = computed(() => {
  return jobStore.jobs.filter((j) => j.status !== 'COMPLETED').length;
});

const totalRevenueToday = computed(() => {
  return jobStore.jobs
    .filter((j) => j.status === 'COMPLETED')
    .reduce((sum, j) => sum + (j.final_amount || j.selling_price || 40), 0);
});

const averageTicket = computed(() => {
  if (completedJobsCount.value === 0) return 0;
  return totalRevenueToday.value / completedJobsCount.value;
});

async function reprintJob(job: PrintJob) {
  try {
    const res = await fetch('/api/operator/print/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        state: {
          product: { paperSize: '4R' },
          inputFiles: job.files || [],
        },
      }),
      credentials: 'include',
    });
    if (res.ok) {
      alert(`Instant reprint dispatched for ${job.customer_name || 'Job'}!`);
    }
  } catch {
    alert('Reprint failed.');
  }
}
</script>
