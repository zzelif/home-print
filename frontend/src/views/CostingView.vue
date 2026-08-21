<template>
  <div class="min-h-screen bg-slate-100 p-4 md:p-6">
    <!-- Header with Tab Switcher -->
    <header class="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div class="flex items-center gap-3">
        <router-link to="/" class="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </router-link>
        <div>
          <h1 class="text-xl font-bold text-slate-900">Costing & Margin Engine</h1>
          <p class="text-xs text-slate-500 font-medium">Unit Economics from Purchase Batches & Product Margin Calculator</p>
        </div>
      </div>

      <!-- Tab Buttons -->
      <div class="flex items-center gap-2 rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          @click="activeTab = 'PRODUCT_MARGINS'"
          :class="[
            activeTab === 'PRODUCT_MARGINS' ? 'bg-white text-blue-700 shadow-sm font-black' : 'text-slate-600 font-bold hover:text-slate-900',
            'rounded-xl px-4 py-2 text-xs transition'
          ]"
        >
          Product Margins & Pricing
        </button>

        <button
          type="button"
          @click="activeTab = 'UNIT_ECONOMICS'"
          :class="[
            activeTab === 'UNIT_ECONOMICS' ? 'bg-white text-blue-700 shadow-sm font-black' : 'text-slate-600 font-bold hover:text-slate-900',
            'rounded-xl px-4 py-2 text-xs transition'
          ]"
        >
          Material Batches & Unit Economics
        </button>
      </div>
    </header>

    <!-- TAB 1: PRODUCT MARGINS & PRICING -->
    <div v-if="activeTab === 'PRODUCT_MARGINS'" class="space-y-6">
      <!-- Product Selector Banner -->
      <div class="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div class="flex items-center gap-3">
          <label class="text-xs font-bold uppercase tracking-wider text-slate-400">Select Product:</label>
          <select v-model="selectedProduct" class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 focus:ring-blue-500">
            <option value="RUSH_ID_4R">Rush ID Photo Package (Set 1 4R)</option>
            <option value="PASSPORT_4R">Passport Package (6x 35x45mm)</option>
            <option value="DOC_BW_A4">Document Print (A4 B&W)</option>
            <option value="DOC_COLOR_A4">Document Print (A4 Full Color)</option>
            <option value="PHOTO_4R_FULL">4R Full Glossy Photo</option>
          </select>
        </div>

        <div class="flex items-center gap-4 text-xs font-semibold text-slate-600">
          <span>Derived Material Unit Cost: <strong class="text-blue-600">₱{{ currentProductMaterialCost.toFixed(2) }}</strong></span>
          <span>•</span>
          <span>Derived Operational Overhead: <strong class="text-orange-600">₱{{ currentProductOpCost.toFixed(2) }}</strong></span>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <!-- Left: Labor Input & Base Cost Breakdown (5 cols) -->
        <div class="space-y-6 lg:col-span-5">
          <!-- Labor Cost Card -->
          <div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 class="text-sm font-bold text-slate-900">Labor Time & Rate</h3>
              <span class="text-xs font-bold text-slate-500">₱{{ laborCost.toFixed(2) }}</span>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">Hourly Labor Rate (₱/hr)</label>
              <input v-model.number="laborRatePerHour" type="number" min="0" class="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1">Hours</label>
                <input v-model.number="laborHours" type="number" min="0" class="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1">Minutes</label>
                <input v-model.number="laborMinutes" type="number" min="0" max="59" class="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800" />
              </div>
            </div>
          </div>

          <!-- Total Base Cost Summary Card -->
          <div class="rounded-3xl bg-emerald-600 p-6 text-white shadow-lg shadow-emerald-600/20">
            <div class="text-xs font-bold uppercase tracking-wider text-emerald-200">TOTAL BASE COST</div>
            <div class="my-2 text-4xl font-black">₱{{ currentTotalBaseCost.toFixed(2) }}</div>
            <div class="mt-4 space-y-1 text-xs text-emerald-100 border-t border-emerald-500/50 pt-3">
              <div class="flex justify-between">
                <span>Materials (from Unit Economics):</span>
                <span class="font-bold">₱{{ currentProductMaterialCost.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Operational Overhead:</span>
                <span class="font-bold">₱{{ currentProductOpCost.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Labor:</span>
                <span class="font-bold">₱{{ laborCost.toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: 5-Tier Margin Matrix Table (7 cols) -->
        <div class="lg:col-span-7 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-base font-bold text-slate-900">5-Tier Margin Matrix Table</h3>
              <p class="text-xs text-slate-500 font-medium">Clear benchmark multipliers to prevent over- or under-charging</p>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400">
                <tr>
                  <th class="py-2.5">Margin Markup</th>
                  <th class="py-2.5">Base Cost</th>
                  <th class="py-2.5">Profit</th>
                  <th class="py-2.5 font-bold text-slate-900">Selling Price</th>
                  <th class="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="tier in marginTiers" :key="tier.marginPercent" class="hover:bg-slate-50">
                  <td class="py-3 font-bold text-purple-700">{{ tier.marginPercent }}%</td>
                  <td class="py-3">₱{{ currentTotalBaseCost.toFixed(2) }}</td>
                  <td class="py-3 font-semibold text-green-600">+₱{{ (currentTotalBaseCost * (tier.marginPercent / 100)).toFixed(2) }}</td>
                  <td class="py-3 font-black text-slate-900 text-base">₱{{ (currentTotalBaseCost * (1 + tier.marginPercent / 100)).toFixed(2) }}</td>
                  <td class="py-3 text-right">
                    <button
                      @click="savePrice(currentTotalBaseCost * (1 + tier.marginPercent / 100))"
                      class="rounded-xl bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
                    >
                      Use Price
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: MATERIAL BATCHES & UNIT ECONOMICS (Purchase Calculator Module) -->
    <div v-else class="space-y-6">
      <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-base font-bold text-slate-900">Raw Material Purchase Batches (Reams & Packs)</h3>
            <p class="text-xs text-slate-500 font-medium">Input your store's purchase invoices to automatically calculate unit price per sheet</p>
          </div>
          <button @click="addBatch" class="rounded-2xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700">
            + Add Material Batch
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="border-b border-slate-100 text-xs font-bold uppercase text-slate-400">
              <tr>
                <th class="py-2.5">Material Name</th>
                <th class="py-2.5">Batch / Pack Price (₱)</th>
                <th class="py-2.5">Units per Pack</th>
                <th class="py-2.5 font-bold text-blue-600">Calculated Unit Cost</th>
                <th class="py-2.5 text-right"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(batch, idx) in materialBatches" :key="idx" class="hover:bg-slate-50">
                <td class="py-2.5">
                  <input v-model="batch.name" type="text" class="w-full rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800" />
                </td>
                <td class="py-2.5">
                  <input v-model.number="batch.packPrice" type="number" step="0.5" class="w-28 rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800" />
                </td>
                <td class="py-2.5">
                  <input v-model.number="batch.unitsPerPack" type="number" min="1" class="w-24 rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800" />
                </td>
                <td class="py-2.5 font-black text-blue-600 text-sm">
                  ₱{{ (batch.packPrice / (batch.unitsPerPack || 1)).toFixed(3) }} / unit
                </td>
                <td class="py-2.5 text-right">
                  <button @click="materialBatches.splice(idx, 1)" class="text-slate-400 hover:text-red-500">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Operational Overhead Allocation -->
      <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 class="text-base font-bold text-slate-900 mb-1">Monthly Operational Overhead Allocation</h3>
        <p class="text-xs text-slate-500 font-medium mb-4">Estimated shop monthly overhead distributed over projected volume</p>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">Monthly Electricity (₱)</label>
            <input v-model.number="opOverhead.electricity" type="number" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">Monthly Internet (₱)</label>
            <input v-model.number="opOverhead.internet" type="number" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">Maintenance Buffer (₱)</label>
            <input v-model.number="opOverhead.maintenance" type="number" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">Projected Monthly Jobs</label>
            <input v-model.number="opOverhead.projectedJobs" type="number" min="1" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800" />
          </div>
        </div>

        <div class="mt-4 rounded-2xl bg-orange-50 p-3.5 text-xs font-bold text-orange-800 flex items-center justify-between">
          <span>Calculated Overhead per Job:</span>
          <span class="text-sm font-black">₱{{ calculatedOverheadPerJob.toFixed(2) }} / job</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const activeTab = ref<'PRODUCT_MARGINS' | 'UNIT_ECONOMICS'>('PRODUCT_MARGINS');
const selectedProduct = ref('RUSH_ID_4R');

// Labor Inputs
const laborRatePerHour = ref(90.0);
const laborHours = ref(0);
const laborMinutes = ref(10);

const laborCost = computed(() => {
  const mins = laborHours.value * 60 + laborMinutes.value;
  return (laborRatePerHour.value / 60) * mins;
});

// Material Batches (Unit Economics)
const materialBatches = ref([
  { name: '4R Glossy 230gsm Photo Paper (20 pack)', packPrice: 175.0, unitsPerPack: 20 },
  { name: 'A4 Copier Paper 70gsm (500 sheet ream)', packPrice: 250.0, unitsPerPack: 500 },
  { name: 'HP GT53 Black Ink Bottle', packPrice: 380.0, unitsPerPack: 4000 },
  { name: 'HP GT52 Cyan/Magenta/Yellow Ink Set', packPrice: 1050.0, unitsPerPack: 8000 },
  { name: 'Photo Plastic Sleeves (100 pack)', packPrice: 150.0, unitsPerPack: 100 },
]);

// Operational Overhead
const opOverhead = ref({
  electricity: 1500.0,
  internet: 1000.0,
  maintenance: 500.0,
  projectedJobs: 600,
});

const calculatedOverheadPerJob = computed(() => {
  const total = opOverhead.value.electricity + opOverhead.value.internet + opOverhead.value.maintenance;
  return total / (opOverhead.value.projectedJobs || 1);
});

// Derived Costs based on selected product
const currentProductMaterialCost = computed(() => {
  if (selectedProduct.value === 'RUSH_ID_4R' || selectedProduct.value === 'PASSPORT_4R' || selectedProduct.value === 'PHOTO_4R_FULL') {
    // 1 sheet of 4R Photo Paper (₱8.75) + Color Ink (₱0.25)
    return 8.75 + 0.25;
  }
  if (selectedProduct.value === 'DOC_BW_A4') {
    // 1 sheet of Plain Paper (₱0.50) + Black Ink (₱0.10)
    return 0.50 + 0.10;
  }
  if (selectedProduct.value === 'DOC_COLOR_A4') {
    return 0.50 + 0.35;
  }
  return 5.0;
});

const currentProductOpCost = computed(() => {
  return calculatedOverheadPerJob.value;
});

const currentTotalBaseCost = computed(() => {
  return currentProductMaterialCost.value + currentProductOpCost.value + laborCost.value;
});

const marginTiers = [
  { marginPercent: 25 },
  { marginPercent: 50 },
  { marginPercent: 75 },
  { marginPercent: 100 },
  { marginPercent: 150 },
];

function addBatch() {
  materialBatches.value.push({ name: 'New Material Batch', packPrice: 100.0, unitsPerPack: 10 });
}

function savePrice(price: number) {
  alert(`Active price for ${selectedProduct.value} updated to ₱${price.toFixed(2)}.`);
}
</script>
