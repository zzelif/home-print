<template>
  <div class="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
    <!-- Top Action Bar -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200"
    >
      <div>
        <h2
          class="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight"
        >
          Job Orders & Incoming Inbox
        </h2>
        <p class="text-xs text-slate-500 font-medium">
          Customer drops, Messenger uploads, and walk-in requests
        </p>
      </div>

      <div
        class="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto"
      >
        <!-- New Rush ID Button -->
        <router-link
          to="/studio"
          class="flex items-center justify-center gap-1.5 sm:gap-2 rounded-2xl bg-blue-600 px-3.5 sm:px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 min-h-[44px] text-center transition"
        >
          <svg
            class="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>New Rush ID</span>
        </router-link>

        <!-- Print Doc Button -->
        <router-link
          to="/document"
          class="flex items-center justify-center gap-1.5 sm:gap-2 rounded-2xl bg-emerald-600 px-3.5 sm:px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 min-h-[44px] text-center transition"
        >
          <svg
            class="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>Print Doc</span>
        </router-link>

        <!-- Customer Drop QR Code Standee Modal Toggle -->
        <button
          type="button"
          @click="isQrModalOpen = true"
          class="flex items-center justify-center gap-1.5 sm:gap-2 rounded-2xl border border-blue-200 bg-blue-50/70 px-3.5 sm:px-4 py-2.5 text-xs font-bold text-blue-800 hover:bg-blue-100 min-h-[44px] text-center transition shadow-xs"
          title="Display customer upload QR code on screen or print standee"
        >
          <svg
            class="h-4 w-4 text-blue-600 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          <span>Customer QR</span>
        </button>

        <!-- Clean Up Completed Orders & Purge Files -->
        <button
          v-if="hasCompletedJobs"
          @click="confirmPurgeCompleted"
          class="col-span-2 sm:col-auto flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition min-h-[44px]"
          title="Wipe files from disk and remove completed orders from active queue"
        >
          <svg
            class="h-4 w-4 text-rose-600 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <span>Purge Completed</span>
        </button>

        <!-- Refresh Queue Button -->
        <button
          @click="refreshQueueAndSpool"
          class="hidden sm:flex rounded-2xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 shrink-0 min-h-[44px] min-w-[44px] items-center justify-center"
          title="Refresh Queue"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Live Hardware Print Spool Queue Banner -->
    <div class="rounded-3xl bg-slate-900 p-4 text-white shadow-md space-y-3">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <span
            :class="
              spoolJobs.length > 0
                ? 'bg-amber-400 animate-pulse'
                : 'bg-emerald-400'
            "
            class="h-2.5 w-2.5 rounded-full shrink-0"
          ></span>
          <div class="min-w-0">
            <h4 class="text-xs sm:text-sm font-bold text-white">
              Hardware Spooler
            </h4>
            <p class="text-[11px] text-slate-400 truncate">
              {{
                spoolJobs.length > 0
                  ? `${spoolJobs.length} active print job(s) queued`
                  : "Ready • Spooler idle"
              }}
            </p>
          </div>
        </div>

        <button
          @click="fetchSpoolQueue"
          class="flex items-center justify-center rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-white/20 shrink-0 min-h-[40px]"
        >
          Refresh
        </button>
      </div>

      <!-- Active Spool Jobs List -->
      <div
        v-if="spoolJobs.length > 0"
        class="space-y-1.5 pt-2 border-t border-slate-800"
      >
        <div
          v-for="job in spoolJobs"
          :key="job.id"
          class="flex items-center justify-between rounded-xl bg-slate-800/80 px-3 py-1.5 text-xs gap-2"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span
              class="rounded bg-blue-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-400 shrink-0"
            >
              {{ job.id }}
            </span>
            <span class="font-bold text-slate-100 truncate">{{
              job.documentName
            }}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-slate-400 text-[11px]"
              >{{ job.totalPages }}p</span
            >
            <span
              class="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400"
            >
              {{ job.status }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Operator Fast Ingestion Dropzone Banner -->
    <div
      @click="triggerOperatorUpload"
      class="flex cursor-pointer items-center justify-between rounded-3xl border-2 border-dashed border-blue-400 bg-blue-50/60 p-3.5 sm:p-4 transition hover:bg-blue-50 gap-3"
    >
      <input
        ref="operatorFileInput"
        type="file"
        multiple
        class="hidden"
        @change="onOperatorFilesSelected"
      />
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white shrink-0"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <div class="min-w-0">
          <h4 class="text-xs sm:text-sm font-bold text-blue-900">
            Quick Upload Dropzone
          </h4>
          <p class="text-[11px] text-blue-700 truncate">
            Drop files or tap to add to queue
          </p>
        </div>
      </div>
      <span
        class="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shrink-0 min-h-[40px] flex items-center"
      >
        + Add File
      </span>
    </div>

    <!-- Queue Filter Tabs & Count -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex rounded-2xl bg-slate-100 p-1">
        <button
          @click="queueFilter = 'ACTIVE'"
          :class="[
            queueFilter === 'ACTIVE'
              ? 'bg-white text-slate-900 shadow-sm font-black'
              : 'text-slate-600 hover:text-slate-900 font-semibold',
            'rounded-xl px-3 sm:px-4 py-2 text-xs transition min-h-[40px]',
          ]"
        >
          Active Queue ({{ activeJobsCount }})
        </button>
        <button
          @click="queueFilter = 'ALL'"
          :class="[
            queueFilter === 'ALL'
              ? 'bg-white text-slate-900 shadow-sm font-black'
              : 'text-slate-600 hover:text-slate-900 font-semibold',
            'rounded-xl px-3 sm:px-4 py-2 text-xs transition min-h-[40px]',
          ]"
        >
          All Inbox ({{ jobStore.jobs.length }})
        </button>
      </div>

      <span class="text-xs text-slate-400 font-medium hidden sm:inline">
        Live sync enabled
      </span>
    </div>

    <!-- High-Clarity Ergonomic Queue Cards (Zero-Overflow Guaranteed) -->
    <div class="space-y-3">
      <div
        v-for="job in displayedJobs"
        :key="job.id"
        class="rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md space-y-3.5"
      >
        <!-- Row 1: Header (2-Tier Alignment: Line 1 Name <-> Price, Line 2 Metadata <-> Status Badge) -->
        <div class="flex items-start justify-between gap-3">
          <!-- Left: Avatar + (Name on Line 1, Metadata on Line 2) -->
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 font-black text-sm shrink-0 ring-1 ring-blue-100 mt-0.5">
              {{ job.customer_name ? job.customer_name.charAt(0).toUpperCase() : 'W' }}
            </div>
            <div class="min-w-0 flex-1">
              <!-- Line 1 Left: Customer Name -->
              <div class="flex items-center gap-2">
                <h3 class="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                  {{ job.customer_name || 'Walk-in Customer' }}
                </h3>
              </div>
              <!-- Line 2 Left: Metadata (Source, Tracking ID, Local Time, File) -->
              <div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider shrink-0">
                  {{ job.source }}
                </span>
                <span class="font-mono text-[11px] text-slate-500 font-semibold shrink-0">
                  #{{ job.id.replace('job_', '') }}
                </span>
                <span class="text-[11px] text-slate-500 font-medium shrink-0">
                  {{ formatLocalTime(job.created_at) }}
                </span>
                <span v-if="job.files && job.files.length > 0" class="truncate max-w-[130px] sm:max-w-[220px] text-slate-500 font-semibold text-[11px]">
                  • {{ job.files[0].originalName }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right: (Price on Line 1, Status Badge on Line 2) -->
          <div class="text-right shrink-0 flex flex-col items-end justify-between self-stretch min-h-[44px]">
            <!-- Line 1 Right: Price Due -->
            <div class="text-base sm:text-lg font-black text-slate-900 font-mono leading-tight">
              ₱{{ (job.final_amount || job.selling_price || 40).toFixed(2) }}
            </div>
            <!-- Line 2 Right: Status Badge (Aligned with Line 2 metadata on left) -->
            <span
              :class="[
                job.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
                job.status === 'PURGED' ? 'bg-slate-100 text-slate-600 ring-slate-200' :
                job.status === 'PRINTING' ? 'bg-purple-50 text-purple-700 ring-purple-200' :
                job.status === 'IN_LAYOUT' ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-amber-50 text-amber-700 ring-amber-200',
                'rounded-lg px-2 py-0.5 text-[10px] font-bold ring-1 shrink-0 uppercase tracking-wider mt-1'
              ]"
            >
              {{ job.status }}
            </span>
          </div>
        </div>

        <!-- Row 2: Dedicated Full-Width Action Bar (No inline crowding, Zero Horizontal Overflow) -->
        <div
          class="flex items-center gap-2 pt-3 border-t border-slate-100 w-full"
        >
          <!-- Uncompleted Order Actions -->
          <template
            v-if="job.status !== 'COMPLETED' && job.status !== 'PURGED'"
          >
            <router-link
              :to="
                isDocJob(job)
                  ? `/document?jobId=${job.id}`
                  : `/studio?jobId=${job.id}`
              "
              class="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition min-h-[44px] text-center"
            >
              <svg
                class="h-4 w-4 text-slate-500 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              <span class="truncate">{{
                isDocJob(job) ? "Doc Station" : "Layout Studio"
              }}</span>
            </router-link>

            <button
              @click="openCheckout(job)"
              class="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition min-h-[44px] text-center"
            >
              <svg
                class="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>Checkout</span>
            </button>

            <button
              @click="confirmCancelSingle(job)"
              class="flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50/60 p-2.5 text-rose-600 hover:bg-rose-100 transition min-h-[44px] min-w-[44px] shrink-0"
              title="Cancel order and discard files"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </template>

          <!-- Completed / Paid Order Actions -->
          <template v-else>
            <div
              class="flex-1 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200"
            >
              <svg
                class="h-4 w-4 text-emerald-600 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span class="truncate"
                >Paid (₱{{ (job.final_amount || 0).toFixed(2) }})</span
              >
            </div>

            <button
              v-if="job.status !== 'PURGED'"
              @click="confirmPurgeSingle(job)"
              class="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/60 px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition min-h-[44px] shrink-0"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>Purge Files</span>
            </button>
          </template>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="displayedJobs.length === 0"
        class="rounded-3xl bg-white p-8 sm:p-12 text-center ring-1 ring-slate-200"
      >
        <svg
          class="mx-auto h-12 w-12 text-slate-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <h3 class="mt-4 text-base font-bold text-slate-700">
          No Orders in {{ queueFilter === "ACTIVE" ? "Active Queue" : "Inbox" }}
        </h3>
        <p class="mt-1 text-xs text-slate-400">
          Customer uploads from the QR counter or messaging apps will appear
          here live.
        </p>
      </div>
    </div>

    <!-- Customer Drop QR Modal -->
    <CustomerDropQrModal
      :is-open="isQrModalOpen"
      @close="isQrModalOpen = false"
    />

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
import { ref, computed, onMounted } from "vue";
import { useJobStore, PrintJob } from "../stores/jobStore";
import CheckoutModal from "../components/CheckoutModal.vue";
import CustomerDropQrModal from "../components/CustomerDropQrModal.vue";
import { formatLocalTime } from "../utils/date";

export interface SpoolJob {
  id: string;
  documentName: string;
  printerName: string;
  status: string;
  totalPages: number;
  submittedAt: string;
}

const jobStore = useJobStore();
const isCheckoutOpen = ref(false);
const isQrModalOpen = ref(false);
const selectedJob = ref<PrintJob | null>(null);
const operatorFileInput = ref<HTMLInputElement | null>(null);
const spoolJobs = ref<SpoolJob[]>([]);
const queueFilter = ref<"ACTIVE" | "ALL">("ACTIVE");

onMounted(() => {
  jobStore.fetchJobs();
  jobStore.fetchPrinterStatus();
  jobStore.initWebSocket();
  fetchSpoolQueue();
});

const activeJobsCount = computed(() => {
  return jobStore.jobs.filter((j) => j.status !== "PURGED").length;
});

const displayedJobs = computed(() => {
  if (queueFilter.value === "ACTIVE") {
    return jobStore.jobs.filter((j) => j.status !== "PURGED");
  }
  return jobStore.jobs;
});

const hasCompletedJobs = computed(() => {
  return jobStore.jobs.some(
    (j) =>
      (j.status === "COMPLETED" || j.payment_status === "PAID") &&
      j.status !== "PURGED",
  );
});

async function fetchSpoolQueue() {
  try {
    const res = await fetch("/api/operator/print/spool", {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      spoolJobs.value = data.spoolJobs || [];
    }
  } catch {}
}

function refreshQueueAndSpool() {
  jobStore.fetchJobs();
  fetchSpoolQueue();
}

function isDocJob(job: PrintJob): boolean {
  if (!job.files || job.files.length === 0) return false;
  // Multi-file batch orders always route to Document Station for collation and batch print
  if (job.files.length > 1) return true;
  // Jobs with converted batch or document PDF paths
  if ((job as any).pdf_path) return true;
  // Explicit DOCUMENT service tag
  if ((job as any).service_type === 'DOCUMENT' || (job as any).service === 'DOCUMENT' || (job as any).product_id === 'DOCUMENT') return true;

  const fileName = (job.files[0].originalName || '').toLowerCase();
  return (
    fileName.endsWith('.pdf') ||
    fileName.endsWith('.docx') ||
    fileName.endsWith('.doc') ||
    fileName.endsWith('.pptx') ||
    fileName.endsWith('.ppt') ||
    fileName.endsWith('.txt') ||
    fileName.endsWith('.md')
  );
}

function openCheckout(job: PrintJob) {
  selectedJob.value = job;
  isCheckoutOpen.value = true;
}

async function handleCheckoutComplete(payload: {
  jobId: string;
  cashTendered: number;
  changeGiven: number;
  purgeFiles: boolean;
}) {
  await jobStore.completeCheckout(
    payload.jobId,
    payload.cashTendered,
    payload.changeGiven,
    payload.purgeFiles,
  );
  isCheckoutOpen.value = false;
}

async function confirmCancelSingle(job: PrintJob) {
  if (
    confirm(
      `Cancel and discard order "${job.customer_name || job.id}"? Uploaded files will be purged from disk.`,
    )
  ) {
    await jobStore.cancelJob(job.id);
  }
}

async function confirmPurgeSingle(job: PrintJob) {
  if (
    confirm(
      `Purge and delete files for order "${job.customer_name || job.id}"? This frees up disk space and removes customer data.`,
    )
  ) {
    await jobStore.purgeJob(job.id);
  }
}

async function confirmPurgeCompleted() {
  if (
    confirm(
      "Purge all completed job orders and permanently delete customer files from disk?",
    )
  ) {
    await jobStore.purgeCompletedJobs();
  }
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
      formData.append("customerName", "Counter Operator Job");
      formData.append(
        "service",
        file.type.startsWith("image/") ? "RUSH_ID" : "DOCUMENT",
      );
      formData.append("file", file);

      await fetch("/api/public/upload", {
        method: "POST",
        body: formData,
      });
    }
    await jobStore.fetchJobs();
  }
}
</script>
