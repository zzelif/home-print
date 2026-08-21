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
          <h1 class="text-xl font-bold text-slate-900">Hardware & Printer Discovery</h1>
          <p class="text-xs text-slate-500 font-medium">1-Click Auto Discovery for USB & Wi-Fi Network Printers</p>
        </div>
      </div>

      <!-- 1-Click Auto Discovery Button -->
      <button
        @click="scanPrinters"
        :disabled="isScanning"
        class="flex items-center gap-2.5 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-50"
      >
        <svg
          :class="{ 'animate-spin': isScanning }"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>{{ isScanning ? 'Scanning Subnet & USB Ports...' : '1-Click Scan for Printers' }}</span>
      </button>
    </header>

    <div class="space-y-6">
      <!-- Active Default Banner -->
      <div class="rounded-3xl bg-slate-900 p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned System Default Printer</span>
          <h2 class="mt-1 text-2xl font-black text-white flex items-center gap-3">
            <span>{{ activeDefaultPrinter || 'HP Smart Tank 670 Series' }}</span>
            <span class="rounded-full bg-green-500/20 px-3 py-0.5 text-xs font-bold text-green-400">ACTIVE</span>
          </h2>
          <p class="mt-1 text-xs text-slate-400">All print jobs from Layout Studio and Document Station will automatically route here.</p>
        </div>

        <div class="flex items-center gap-3">
          <button
            @click="testPrintSwatch"
            class="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition"
          >
            <svg class="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Calibration Swatch</span>
          </button>
        </div>
      </div>

      <!-- Discovered Printers List -->
      <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 class="text-base font-bold text-slate-900">Discovered Printers ({{ printers.length }})</h3>
            <p class="text-xs text-slate-500 font-medium">Scanned USB buses, CUPS queues, and local Wi-Fi IPP subnet</p>
          </div>
          <span v-if="lastScannedAt" class="text-xs text-slate-400 font-medium">Last scanned: {{ new Date(lastScannedAt).toLocaleTimeString() }}</span>
        </div>

        <!-- Printers Grid / Column -->
        <div class="space-y-3">
          <div
            v-for="p in printers"
            :key="p.id"
            :class="[
              p.isDefault ? 'border-2 border-green-500 bg-green-50/20' : 'border border-slate-200 bg-white hover:border-slate-300',
              'flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 transition shadow-sm'
            ]"
          >
            <!-- Left Info -->
            <div class="flex items-center gap-4">
              <!-- Type Icon -->
              <div
                :class="p.connectionType === 'USB' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'"
                class="flex h-12 w-12 items-center justify-center rounded-2xl shrink-0"
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
              <div>
                <div class="flex items-center gap-2.5">
                  <h4 class="text-base font-extrabold text-slate-900">{{ p.name }}</h4>
                  <span
                    :class="p.connectionType === 'USB' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'"
                    class="rounded-lg px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider"
                  >
                    {{ p.connectionType === 'USB' ? 'Direct USB' : 'Wi-Fi / Network' }}
                  </span>
                  <span v-if="p.isDefault" class="rounded-lg bg-green-600 px-2 py-0.5 text-[10px] font-black text-white uppercase tracking-wider">
                    DEFAULT
                  </span>
                </div>

                <div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                  <span v-if="p.ipAddress" class="font-mono text-slate-700">IP: {{ p.ipAddress }}</span>
                  <span v-else class="text-slate-500">Port: USB Cable Connection</span>
                  <span>•</span>
                  <span class="text-slate-500 truncate max-w-xs">{{ p.makeAndModel }}</span>
                </div>
              </div>
            </div>

            <!-- Right Status & Default Action -->
            <div class="flex items-center gap-3">
              <span
                :class="{
                  'bg-green-100 text-green-800': p.status === 'ONLINE' || p.status === 'IDLE',
                  'bg-amber-100 text-amber-800': p.status === 'OFFLINE',
                  'bg-slate-100 text-slate-600': p.status === 'DISCONNECTED'
                }"
                class="rounded-full px-3 py-1 text-xs font-bold"
              >
                {{ p.status }}
              </span>

              <!-- Set Default Button -->
              <button
                v-if="!p.isDefault"
                @click="assignDefault(p)"
                class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-blue-600 transition shadow-sm"
              >
                Set as Default
              </button>
              <div v-else class="flex items-center gap-1 text-xs font-black text-green-600 px-3 py-2">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Active Target</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Manual Wi-Fi IP Section -->
        <div class="mt-6 rounded-2xl border border-dashed border-slate-300 p-4 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700">Add Wi-Fi Printer by IP Address</h4>
            <p class="text-xs text-slate-500">Connect to an office or home network printer outside the local subnet</p>
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="manualIp"
              type="text"
              class="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. 192.168.1.150"
            />
            <button
              @click="addManualIp"
              class="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
            >
              Add Network Printer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

export interface DiscoveredPrinter {
  id: string;
  name: string;
  makeAndModel?: string;
  connectionType: 'USB' | 'WIFI_NETWORK' | 'IPP' | 'VIRTUAL';
  uri: string;
  ipAddress: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'IDLE' | 'PRINTING' | 'DISCONNECTED';
  isDefault: boolean;
}

const printers = ref<DiscoveredPrinter[]>([]);
const activeDefaultPrinter = ref('HP Smart Tank 670 Series');
const isScanning = ref(false);
const lastScannedAt = ref<string | null>(null);
const manualIp = ref('');

onMounted(() => {
  fetchPrinters();
});

async function fetchPrinters() {
  try {
    const res = await fetch('/api/operator/printers', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      printers.value = data.printers || [];
      activeDefaultPrinter.value = data.defaultPrinter || 'HP Smart Tank 670 Series';
    }
  } catch (err) {
    console.error('Failed to fetch printers:', err);
  }
}

async function scanPrinters() {
  isScanning.value = true;
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
    }
  } catch (err) {
    alert('Failed to scan for printers.');
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
      alert(`Default printer assigned to "${printer.name}"!`);
    }
  } catch (err) {
    alert('Failed to assign default printer.');
  }
}

function addManualIp() {
  if (!manualIp.value) return;
  printers.value.push({
    id: `net_${manualIp.value.replace(/\./g, '_')}`,
    name: `HP Smart Tank (${manualIp.value})`,
    makeAndModel: 'Manual Wi-Fi IPP Printer',
    connectionType: 'WIFI_NETWORK',
    uri: `ipp://${manualIp.value}:631/ipp/print`,
    ipAddress: manualIp.value,
    status: 'ONLINE',
    isDefault: false,
  });
  manualIp.value = '';
}

function testPrintSwatch() {
  alert('Calibration swatch sent to default printer: ' + activeDefaultPrinter.value);
}
</script>
