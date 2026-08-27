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
          <h1 class="text-lg sm:text-xl font-bold text-slate-900 truncate">Hardware & Network Printer Discovery</h1>
          <p class="text-xs text-slate-500 font-medium truncate">Authentic Subnet ARP & Hardware Bus Scanning (HP Smart Tank 670, Direct USB, Wi-Fi IPP)</p>
        </div>
      </div>

      <!-- 1-Click Auto Discovery Button -->
      <button
        @click="scanPrinters"
        :disabled="isScanning"
        class="flex items-center justify-center gap-2.5 rounded-2xl bg-blue-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-50 w-full sm:w-auto min-h-[48px]"
      >
        <svg
          :class="{ 'animate-spin': isScanning }"
          class="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>{{ isScanning ? 'Scanning Network ARP & USB...' : '1-Click Scan for Printers' }}</span>
      </button>
    </header>

    <div class="space-y-4 sm:space-y-6">
      <!-- Active Default Banner -->
      <div class="rounded-3xl bg-slate-900 p-4 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="min-w-0">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned System Default Printer</span>
          <h2 class="mt-1 text-xl sm:text-2xl font-black text-white flex flex-wrap items-center gap-2 sm:gap-3">
            <span class="truncate">{{ activeDefaultPrinter || 'HP Smart Tank 660-670 series [28C379]' }}</span>
            <span class="rounded-full bg-green-500/20 px-3 py-0.5 text-xs font-bold text-green-400 shrink-0">ACTIVE TARGET</span>
          </h2>
          <p class="mt-1 text-xs text-slate-400">All print jobs from Layout Studio and Document Station automatically route to this printer.</p>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <button
            @click="testPrintSwatch"
            :disabled="isPrintingSwatch"
            class="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition disabled:opacity-50 w-full sm:w-auto min-h-[48px]"
          >
            <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>{{ isPrintingSwatch ? 'Sending to Hardware...' : 'Print Swatch (Real Hardware)' }}</span>
          </button>
        </div>
      </div>

      <!-- Physical Printers Section -->
      <div class="rounded-3xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-100 pb-4">
          <div>
            <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Physical Hardware Printers</span>
              <span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-700">{{ physicalPrinters.length }}</span>
            </h3>
            <p class="text-xs text-slate-500 font-medium">Scanned via local ARP table, TCP port 631/9100 probe, and USB hardware buses</p>
          </div>
          <span v-if="lastScannedAt" class="text-xs text-slate-400 font-medium">Last scanned: {{ new Date(lastScannedAt).toLocaleTimeString() }}</span>
        </div>

        <!-- Physical Printers List -->
        <div class="space-y-3">
          <div
            v-for="p in physicalPrinters"
            :key="p.id"
            :class="[
              p.isDefault ? 'border-2 border-green-500 bg-green-50/20' : 'border border-slate-200 bg-white hover:border-slate-300',
              'flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-4 transition shadow-sm'
            ]"
          >
            <!-- Left Info -->
            <div class="flex items-center gap-3 sm:gap-4 min-w-0">
              <div
                :class="[
                  p.connectionType === 'USB' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700',
                  'flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl shrink-0'
                ]"
              >
                <!-- USB Icon -->
                <svg v-if="p.connectionType === 'USB'" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <!-- Wi-Fi Icon -->
                <svg v-else class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              </div>

              <!-- Printer Details -->
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h4 class="text-sm sm:text-base font-extrabold text-slate-900 truncate">{{ p.name }}</h4>
                  <span
                    :class="[
                      p.connectionType === 'USB' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700',
                      'rounded-lg px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shrink-0'
                    ]"
                  >
                    {{ p.connectionType === 'USB' ? 'Direct USB' : 'Wi-Fi / Network IPP' }}
                  </span>
                  <span v-if="p.isDefault" class="rounded-lg bg-green-600 px-2 py-0.5 text-[10px] font-black text-white uppercase tracking-wider shrink-0">
                    DEFAULT
                  </span>
                </div>

                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                  <span v-if="p.ipAddress" class="font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                    {{ p.ipAddress }}
                  </span>
                  <span v-else class="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    {{ p.portName || 'USB' }}
                  </span>
                  <span>•</span>
                  <span class="text-slate-500 truncate max-w-xs">{{ p.makeAndModel }}</span>
                </div>
              </div>
            </div>

            <!-- Right Status & Action -->
            <div class="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-slate-100 sm:border-t-0">
              <span
                :class="[
                  p.status === 'ONLINE' ? 'bg-green-100 text-green-800' :
                  p.status === 'OFFLINE' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600',
                  'rounded-full px-3 py-1 text-xs font-bold shrink-0'
                ]"
              >
                {{ p.status === 'ONLINE' ? 'ONLINE (Ready)' : p.status === 'DISCONNECTED' ? 'DISCONNECTED (Unplugged / Off)' : p.status }}
              </span>

              <!-- Set Default Button -->
              <button
                v-if="!p.isDefault"
                @click="assignDefault(p)"
                class="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-600 transition shadow-sm min-h-[40px]"
              >
                Set as Default
              </button>
              <div v-else class="flex items-center gap-1 text-xs font-black text-green-600 px-2 py-1">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Active</span>
              </div>

              <!-- Remove Manual Printer Button -->
              <button
                v-if="p.id.startsWith('manual_')"
                @click="deleteManualPrinter(p.id)"
                class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition min-h-[40px]"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <!-- Add Manual Wi-Fi IP Section -->
        <div class="mt-6 rounded-2xl border border-dashed border-slate-300 p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700">Add Wi-Fi Printer by IP Address</h4>
            <p class="text-xs text-slate-500">Persists network IP to database and actively probes ports 9100/631</p>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <input
              v-model="manualIp"
              type="text"
              placeholder="e.g. 192.168.1.60"
              :disabled="isAddingPrinter"
              class="w-full sm:w-44 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[44px] disabled:opacity-50"
            />
            <button
              @click="addManualNetworkPrinter"
              :disabled="!manualIp || isAddingPrinter"
              class="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition shrink-0 min-h-[44px]"
            >
              <svg v-if="isAddingPrinter" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{{ isAddingPrinter ? 'Probing...' : 'Add Printer' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Feedback Notification Banner -->
      <div v-if="notificationBanner" class="rounded-3xl p-4 text-white shadow-lg flex items-center justify-between" :class="notificationBanner.type === 'success' ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'">
        <div class="flex items-center gap-3">
          <svg class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-sm font-bold">{{ notificationBanner.message }}</span>
        </div>
        <button @click="notificationBanner = null" class="text-xs font-bold opacity-80 hover:opacity-100">Dismiss</button>
      </div>

      <!-- Collapsible Virtual Software Drivers -->
      <div v-if="virtualPrinters.length > 0" class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
        <button
          @click="showVirtual = !showVirtual"
          class="flex w-full items-center justify-between text-left"
        >
          <div>
            <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span>Virtual Software Drivers (PDF / XPS / OneNote)</span>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{{ virtualPrinters.length }}</span>
            </h3>
            <p class="text-xs text-slate-400">Virtual print-to-file software drivers installed in Windows</p>
          </div>
          <span class="text-xs font-bold text-blue-600">{{ showVirtual ? 'Hide' : 'Show' }}</span>
        </button>

        <div v-if="showVirtual" class="space-y-2 pt-2 border-t border-slate-100">
          <div
            v-for="p in virtualPrinters"
            :key="p.id"
            class="flex items-center justify-between rounded-xl p-3 border border-slate-100 bg-slate-50/50 text-xs"
          >
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-800">{{ p.name }}</span>
              <span class="text-slate-400">({{ p.portName }})</span>
            </div>
            <button
              v-if="!p.isDefault"
              @click="assignDefault(p)"
              class="rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-300"
            >
              Set as Default
            </button>
            <span v-else class="text-green-600 font-bold">Active Default</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useJobStore } from '../stores/jobStore';

export interface DiscoveredPrinter {
  id: string;
  name: string;
  makeAndModel?: string;
  connectionType: 'USB' | 'WIFI_NETWORK' | 'IPP' | 'VIRTUAL';
  uri: string;
  ipAddress: string | null;
  portName: string;
  status: 'ONLINE' | 'OFFLINE' | 'DISCONNECTED';
  isDefault: boolean;
  isVirtual?: boolean;
}

const jobStore = useJobStore();
const printers = ref<DiscoveredPrinter[]>([]);
const activeDefaultPrinter = ref('HP Smart Tank 660-670 series [28C379]');
const isScanning = ref(false);
const isAddingPrinter = ref(false);
const isPrintingSwatch = ref(false);
const lastScannedAt = ref<string | null>(null);
const manualIp = ref('');
const showVirtual = ref(false);
const notificationBanner = ref<{ type: 'success' | 'error'; message: string } | null>(null);

const physicalPrinters = computed(() => printers.value.filter((p) => !p.isVirtual));
const virtualPrinters = computed(() => printers.value.filter((p) => p.isVirtual));

onMounted(() => {
  fetchPrinters();
});

async function fetchPrinters() {
  try {
    const res = await fetch('/api/operator/printers', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      printers.value = data.printers || [];
      activeDefaultPrinter.value = data.defaultPrinter || 'HP Smart Tank 660-670 series [28C379]';
    }
  } catch (err) {
    console.error('Failed to fetch printers:', err);
  }
}

async function scanPrinters() {
  isScanning.value = true;
  notificationBanner.value = null;
  try {
    const res = await fetch('/api/operator/printers/scan', {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      printers.value = data.printers || [];
      lastScannedAt.value = data.scannedAt;
      const def = printers.value.find((p) => p.isDefault);
      if (def) activeDefaultPrinter.value = def.name;
      jobStore.fetchPrinterStatus();
      notificationBanner.value = {
        type: 'success',
        message: `Hardware scan completed: Found ${printers.value.length} printer(s) on USB and local subnet.`,
      };
    }
  } catch (err) {
    notificationBanner.value = { type: 'error', message: 'Failed to scan for printers. Please verify network/USB connection.' };
  } finally {
    isScanning.value = false;
  }
}

async function assignDefault(printer: DiscoveredPrinter) {
  try {
    const res = await fetch('/api/operator/printers/set-default', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerName: printer.name }),
      credentials: 'include',
    });
    if (res.ok) {
      activeDefaultPrinter.value = printer.name;
      printers.value.forEach((p) => {
        p.isDefault = p.id === printer.id;
      });
      await jobStore.fetchPrinterStatus();
      notificationBanner.value = { type: 'success', message: `Assigned default printer to "${printer.name}"!` };
    }
  } catch (err) {
    notificationBanner.value = { type: 'error', message: 'Failed to assign default printer.' };
  }
}

async function testPrintSwatch() {
  isPrintingSwatch.value = true;
  notificationBanner.value = null;
  try {
    const res = await fetch('/api/operator/printers/test-swatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerName: activeDefaultPrinter.value }),
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      notificationBanner.value = {
        type: 'success',
        message: data.message || `Calibration swatch dispatched directly to ${activeDefaultPrinter.value}!`,
      };
    } else {
      notificationBanner.value = { type: 'error', message: 'Failed to dispatch test swatch.' };
    }
  } catch {
    notificationBanner.value = { type: 'error', message: 'Network error while dispatching calibration swatch.' };
  } finally {
    isPrintingSwatch.value = false;
  }
}

async function addManualNetworkPrinter() {
  if (!manualIp.value.trim()) return;
  const ip = manualIp.value.trim();
  isAddingPrinter.value = true;
  notificationBanner.value = null;

  try {
    const res = await fetch('/api/operator/printers/add-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipAddress: ip }),
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok && data.success) {
      await fetchPrinters();
      await jobStore.fetchPrinterStatus();
      notificationBanner.value = {
        type: data.isOnline ? 'success' : 'error',
        message: data.message,
      };
      manualIp.value = '';
    } else {
      notificationBanner.value = {
        type: 'error',
        message: data.error || 'Failed to add manual printer.',
      };
    }
  } catch (err: any) {
    notificationBanner.value = {
      type: 'error',
      message: `Network error: ${err.message}`,
    };
  } finally {
    isAddingPrinter.value = false;
  }
}

async function deleteManualPrinter(id: string) {
  try {
    const res = await fetch(`/api/operator/printers/manual/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      await fetchPrinters();
      await jobStore.fetchPrinterStatus();
      notificationBanner.value = { type: 'success', message: 'Manual printer removed.' };
    }
  } catch (err) {
    notificationBanner.value = { type: 'error', message: 'Failed to remove manual printer.' };
  }
}
</script>
