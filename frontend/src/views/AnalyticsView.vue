<template>
  <div class="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
    <!-- Header -->
    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200">
      <div class="flex items-center gap-3">
        <router-link to="/" class="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 shrink-0">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </router-link>
        <div class="min-w-0">
          <h1 class="text-lg sm:text-xl font-bold text-slate-900 truncate">Shop Analytics & Financial Ledger</h1>
          <p class="text-xs text-slate-500 font-medium truncate">Permanent Revenue, Profit Margins, Order Volumes & Privacy Audit Trail</p>
        </div>
      </div>

      <!-- Timeframe Filter Buttons -->
      <div class="grid grid-cols-4 sm:flex items-center gap-1.5 sm:gap-2 rounded-2xl bg-slate-100 p-1 w-full sm:w-auto">
        <button
          v-for="tf in timeframes"
          :key="tf.id"
          @click="selectTimeframe(tf.id)"
          :class="[
            selectedTimeframe === tf.id ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900 font-semibold',
            'rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs transition text-center min-h-[36px] sm:min-h-0'
          ]"
        >
          {{ tf.label }}
        </button>
      </div>
    </header>

    <!-- Top KPI Cards (4 cols) -->
    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <!-- Gross Revenue -->
      <div class="rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Gross Sales</span>
          <div class="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="mt-2 text-2xl sm:text-3xl font-black text-slate-900 font-mono">₱{{ metrics.grossRevenue.toFixed(2) }}</div>
        <div class="mt-1 text-[11px] text-slate-500 font-medium">{{ metrics.completedOrders }} paid / completed orders</div>
      </div>

      <!-- Net Profit -->
      <div class="rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Net Profit</span>
          <div class="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <div class="mt-2 text-2xl sm:text-3xl font-black text-emerald-600 font-mono">₱{{ metrics.netProfit.toFixed(2) }}</div>
        <div class="mt-1 text-[11px] text-slate-500 font-medium">After paper & ink materials</div>
      </div>

      <!-- Cash Total -->
      <div class="rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Cash Drawer</span>
          <div class="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <div class="mt-2 text-2xl sm:text-3xl font-black text-slate-900 font-mono">₱{{ metrics.cashTotal.toFixed(2) }}</div>
        <div class="mt-1 text-[11px] text-slate-500 font-medium">Physical cash tendered</div>
      </div>

      <!-- GCash Total -->
      <div class="rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">GCash / Digital</span>
          <div class="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <div class="mt-2 text-2xl sm:text-3xl font-black text-sky-600 font-mono">₱{{ metrics.gcashTotal.toFixed(2) }}</div>
        <div class="mt-1 text-[11px] text-slate-500 font-medium">Direct QR transfers</div>
      </div>
    </div>

    <!-- Product Breakdown & Privacy Actions Row -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <!-- Product Sales Breakdown (6 cols) -->
      <div class="rounded-3xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-200 space-y-4 lg:col-span-6">
        <h3 class="text-sm font-bold text-slate-900">Product Revenue Breakdown</h3>
        <div v-if="productBreakdown.length > 0" class="space-y-3">
          <div
            v-for="item in productBreakdown"
            :key="item.product_name"
            class="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 border border-slate-100"
          >
            <div class="min-w-0">
              <div class="text-xs sm:text-sm font-bold text-slate-800 truncate">{{ item.product_name }}</div>
              <div class="text-[11px] text-slate-500 font-medium">{{ item.count }} orders completed</div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-sm font-black text-slate-900 font-mono">₱{{ (item.revenue || 0).toFixed(2) }}</div>
              <div class="text-[10px] text-emerald-600 font-bold">
                {{ metrics.grossRevenue > 0 ? (((item.revenue || 0) / metrics.grossRevenue) * 100).toFixed(0) : 0 }}% of total
              </div>
            </div>
          </div>
        </div>
        <div v-else class="py-6 text-center text-xs text-slate-400 font-medium">
          No completed sales in this timeframe.
        </div>
      </div>

      <!-- Payment & Privacy Controls (6 cols) -->
      <div class="rounded-3xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-200 space-y-4 lg:col-span-6">
        <h3 class="text-sm font-bold text-slate-900">Privacy & Financial Actions</h3>
        
        <div class="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <svg class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Customer Privacy Auto-Purge
            </span>
            <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">ACTIVE</span>
          </div>
          <p class="text-[11px] text-slate-500 font-medium leading-relaxed">
            Customer files (PDFs/photos) are unlinked from disk to protect privacy. Permanent revenue, time, and accounting ledgers are preserved.
          </p>
          <button
            @click="purgeCompletedFiles"
            class="mt-2 w-full rounded-xl bg-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-300 transition min-h-[40px]"
          >
            Purge Disk Files of All Completed Orders
          </button>
        </div>
      </div>
    </div>

    <!-- Permanent Audit Ledger (Responsive: Mobile Cards + Desktop Table) -->
    <div class="rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 class="text-base font-bold text-slate-900">Permanent Accounting & Audit Ledger</h3>
          <p class="text-xs text-slate-500 font-medium">Immutable record of all shop transactions</p>
        </div>
        <button @click="fetchAnalytics" class="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 min-h-[38px] min-w-[38px] flex items-center justify-center">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <!-- Mobile Ledger Cards (< sm) -->
      <div class="space-y-2.5 sm:hidden">
        <div
          v-for="job in recentAuditLog"
          :key="job.id"
          class="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80 space-y-2"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="font-extrabold text-slate-900 text-sm truncate">{{ job.customer_name || 'Walk-in Customer' }}</div>
              <div class="text-[11px] text-slate-400 font-mono">#{{ job.id }} • {{ job.source }}</div>
            </div>
            <div class="text-right shrink-0">
              <div class="font-black text-slate-900 font-mono text-base">₱{{ (job.final_amount || job.selling_price || 0).toFixed(2) }}</div>
              <div class="text-[10px] text-slate-400">{{ formatLocalTime(job.created_at) }}</div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-xs">
            <span
              :class="job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : job.status === 'PURGED' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'"
              class="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
            >
              {{ job.status }}
            </span>

            <span v-if="job.payment_status === 'PAID'" class="rounded-lg bg-green-50 px-2 py-0.5 text-green-700 font-bold text-[11px]">
              PAID ({{ job.payment_method || 'CASH' }})
            </span>
            <span v-else class="rounded-lg bg-amber-50 px-2 py-0.5 text-amber-700 font-bold text-[11px]">
              UNPAID
            </span>

            <span v-if="job.files_purged" class="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
              <svg class="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Purged
            </span>
            <span v-else class="text-[10px] font-semibold text-blue-600 flex items-center gap-1">
              <span class="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              On Disk
            </span>
          </div>
        </div>

        <div v-if="recentAuditLog.length === 0" class="py-6 text-center text-xs text-slate-400 font-medium">
          No transactions recorded yet.
        </div>
      </div>

      <!-- Desktop / Tablet Table (>= sm) -->
      <div class="hidden sm:block overflow-x-auto">
        <table class="w-full min-w-[650px] text-left text-sm text-slate-600">
          <thead class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400">
            <tr>
              <th class="py-2.5">Customer & Job ID</th>
              <th class="py-2.5">Source</th>
              <th class="py-2.5">Date & Time</th>
              <th class="py-2.5">Amount (₱)</th>
              <th class="py-2.5">Status</th>
              <th class="py-2.5">Payment</th>
              <th class="py-2.5 text-right">Privacy Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="job in recentAuditLog" :key="job.id" class="hover:bg-slate-50">
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
                {{ formatLocalDateTime(job.created_at) }}
              </td>
              <td class="py-3 font-black text-slate-900 font-mono">
                ₱{{ (job.final_amount || job.selling_price || 0).toFixed(2) }}
              </td>
              <td class="py-3">
                <span
                  :class="job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : job.status === 'PURGED' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800'"
                  class="rounded-full px-2.5 py-0.5 text-xs font-bold"
                >
                  {{ job.status }}
                </span>
              </td>
              <td class="py-3 font-semibold text-xs text-slate-700">
                <span v-if="job.payment_status === 'PAID'" class="rounded-lg bg-green-50 px-2 py-1 text-green-700 font-bold">
                  PAID ({{ job.payment_method || 'CASH' }})
                </span>
                <span v-else class="rounded-lg bg-amber-50 px-2 py-1 text-amber-700 font-bold">
                  UNPAID
                </span>
              </td>
              <td class="py-3 text-right text-xs font-semibold">
                <span v-if="job.files_purged" class="rounded-lg bg-slate-100 px-2 py-1 text-slate-600 font-bold inline-flex items-center gap-1">
                  <svg class="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Files Purged
                </span>
                <span v-else class="rounded-lg bg-blue-50 px-2 py-1 text-blue-700 font-bold inline-flex items-center gap-1">
                  <span class="h-2 w-2 rounded-full bg-blue-500"></span>
                  Files On Disk
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { formatLocalDateTime, formatLocalTime } from '../utils/date';

const timeframes = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: '7 Days' },
  { id: 'month', label: '30 Days' },
  { id: 'all', label: 'All' },
];

const selectedTimeframe = ref('today');

const metrics = ref({
  grossRevenue: 0,
  estimatedCost: 0,
  netProfit: 0,
  completedOrders: 0,
  pendingOrders: 0,
  averageOrderValue: 0,
  cashTotal: 0,
  gcashTotal: 0,
});

const productBreakdown = ref<Array<{ product_name: string; count: number; revenue: number }>>([]);
const recentAuditLog = ref<any[]>([]);

onMounted(() => {
  fetchAnalytics();
});

async function fetchAnalytics() {
  try {
    const res = await fetch(`/api/operator/analytics?timeframe=${selectedTimeframe.value}`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      metrics.value = data.metrics;
      productBreakdown.value = data.productBreakdown || [];
      recentAuditLog.value = data.recentAuditLog || [];
    }
  } catch (err) {
    console.error('Failed to fetch analytics:', err);
  }
}

function selectTimeframe(tf: string) {
  selectedTimeframe.value = tf;
  fetchAnalytics();
}

async function purgeCompletedFiles() {
  if (confirm('Permanently purge customer files on disk for all completed orders? Sales ledger will be retained.')) {
    try {
      const res = await fetch('/api/operator/jobs/purge-completed', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        await fetchAnalytics();
      }
    } catch (err) {
      console.error('Failed to purge completed files:', err);
    }
  }
}
</script>
