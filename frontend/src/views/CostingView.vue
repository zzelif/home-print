<template>
  <div class="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
    <!-- Costing Header -->
    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200">
      <div class="flex items-center gap-3">
        <router-link to="/" class="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 shrink-0">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </router-link>
        <div class="min-w-0">
          <h1 class="text-lg sm:text-xl font-bold text-slate-900 truncate">Advanced Product Costing & Unit Economics</h1>
          <p class="text-xs text-slate-500 font-medium truncate">Calibrated Consumables, Itemized Overhead & 5-Tier Margin Matrix</p>
        </div>
      </div>

      <!-- Tab Switcher -->
      <div class="grid grid-cols-2 sm:flex rounded-2xl bg-slate-100 p-1 w-full sm:w-auto">
        <button
          type="button"
          @click="activeTab = 'PRICING_MARGINS'"
          :class="[
            activeTab === 'PRICING_MARGINS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900',
            'rounded-xl px-3 sm:px-4 py-2 text-xs font-bold transition text-center min-h-[40px]'
          ]"
        >
          Product Margins
        </button>
        <button
          type="button"
          @click="activeTab = 'UNIT_ECONOMICS'"
          :class="[
            activeTab === 'UNIT_ECONOMICS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900',
            'rounded-xl px-3 sm:px-4 py-2 text-xs font-bold transition text-center min-h-[40px]'
          ]"
        >
          Unit Economics
        </button>
      </div>
    </header>

    <!-- Feedback Notification Banner -->
    <div v-if="toastMessage" class="rounded-3xl bg-emerald-600 p-4 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <svg class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span class="text-sm font-bold">{{ toastMessage }}</span>
      </div>
      <button @click="toastMessage = null" class="text-xs font-bold opacity-80 hover:opacity-100">Dismiss</button>
    </div>

    <!-- TAB 1: Product Margins & Pricing Engine -->
    <div v-if="activeTab === 'PRICING_MARGINS'" class="space-y-6">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <!-- Left: Product Base Cost Breakdown (5 cols) -->
        <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-5 lg:col-span-5">
          <div class="border-b border-slate-100 pb-3">
            <h3 class="text-sm font-bold text-slate-900">Product Selection & Base Cost</h3>
            <p class="text-xs text-slate-500">Select product to pull live material unit costs</p>
          </div>

          <!-- Product Picker -->
          <div>
            <label class="block text-xs font-bold text-slate-600 mb-1">Select Catalogue Product</label>
            <select
              v-model="selectedProductId"
              @change="onProductChange"
              class="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="prod_rush_id_4r">4R Rush ID Package (Set 1: 4x 2x2 + 8x 1x1)</option>
              <option value="prod_rush_id_2x2">4R 2x2 Package (Set 2: 6x 2x2)</option>
              <option value="prod_passport_4r">4R Passport Package (Set 4: 6x 35x45mm)</option>
              <option value="prod_doc_bw_a4">A4 Document Print (Black & White)</option>
              <option value="prod_doc_color_a4">A4 Document Print (Full Color)</option>
            </select>
          </div>

          <!-- Cost Breakdown List -->
          <div class="space-y-3 rounded-2xl bg-slate-50 p-4 text-xs font-medium text-slate-700">
            <div class="flex justify-between border-b border-slate-200/60 pb-2">
              <span>Paper / Substrate Cost:</span>
              <span class="font-bold text-slate-900 font-mono">₱{{ currentPaperCost.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between border-b border-slate-200/60 pb-2">
              <span>Estimated Ink Cost:</span>
              <span class="font-bold text-slate-900 font-mono">₱{{ currentInkCost.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between border-b border-slate-200/60 pb-2">
              <span>Overhead / Electricity / Wear:</span>
              <span class="font-bold text-slate-900 font-mono">₱{{ currentOverheadCost.toFixed(2) }}</span>
            </div>
            <div class="flex items-center justify-between pt-1">
              <span>Labor / Operator Time:</span>
              <div class="flex items-center gap-1">
                <span>₱</span>
                <input
                  v-model.number="currentLaborCost"
                  type="number"
                  step="0.5"
                  class="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right font-mono font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          <!-- Total Base Cost Banner -->
          <div class="flex items-center justify-between rounded-2xl bg-blue-50/80 p-4 border border-blue-200 text-blue-900">
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">Calculated Base Cost</span>
              <div class="text-2xl font-black font-mono">₱{{ calculatedBaseCost.toFixed(2) }}</div>
            </div>
            <span class="rounded-xl bg-blue-600 px-3 py-1 text-xs font-bold text-white">Cost Basis</span>
          </div>
        </div>

        <!-- Right: 5-Tier Margin Multiplier Table (7 cols) -->
        <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4 lg:col-span-7">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Profit Margin Multipliers (5 Tiers)</h3>
              <p class="text-xs text-slate-500">Pick margin percentage to automatically set shop selling price</p>
            </div>
            <span class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">Live Matrix</span>
          </div>

          <!-- Margins Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-600">
              <thead class="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
                <tr>
                  <th class="py-2">Tier Level</th>
                  <th class="py-2">Profit Margin</th>
                  <th class="py-2">Net Profit (₱)</th>
                  <th class="py-2">Recommended Price</th>
                  <th class="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="tier in marginTiers" :key="tier.marginPercent" class="hover:bg-slate-50">
                  <td class="py-3 font-bold text-slate-800">{{ tier.name }}</td>
                  <td class="py-3 font-bold text-blue-600">+{{ tier.marginPercent }}%</td>
                  <td class="py-3 font-mono text-emerald-600 font-bold">₱{{ (calculatedBaseCost * (tier.marginPercent / 100)).toFixed(2) }}</td>
                  <td class="py-3 font-mono font-black text-slate-900 text-sm">
                    ₱{{ (calculatedBaseCost * (1 + tier.marginPercent / 100)).toFixed(2) }}
                  </td>
                  <td class="py-3 text-right">
                    <button
                      type="button"
                      @click="applyPrice(calculatedBaseCost * (1 + tier.marginPercent / 100))"
                      class="rounded-xl bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-blue-600 transition"
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

    <!-- TAB 2: Material Batches & Unit Economics Calculator -->
    <div v-else class="space-y-6">
      <!-- Section 1: Paper & Media Batches -->
      <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
        <div class="border-b border-slate-100 pb-3">
          <h3 class="text-sm font-bold text-slate-900">1. Paper & Sheet Substrate Batches</h3>
          <p class="text-xs text-slate-500">Input ream and pack purchase invoices to compute exact cost per sheet</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
              <tr>
                <th class="py-2">Material Name</th>
                <th class="py-2">Pack / Ream Price (₱)</th>
                <th class="py-2">Quantity in Pack</th>
                <th class="py-2">Unit Type</th>
                <th class="py-2">Calculated Unit Cost</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in paperBatches" :key="item.id" class="hover:bg-slate-50">
                <td class="py-3 font-bold text-slate-800">{{ item.name }}</td>
                <td class="py-3 font-mono font-bold text-slate-900">₱{{ item.packPrice.toFixed(2) }}</td>
                <td class="py-3 font-mono font-bold text-slate-700">{{ item.unitsPerPack }}</td>
                <td class="py-3 text-slate-500 font-bold uppercase text-[10px]">{{ item.unitType }}</td>
                <td class="py-3 font-mono font-black text-emerald-600 text-sm">
                  ₱{{ (item.packPrice / item.unitsPerPack).toFixed(3) }} / {{ item.unitType }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 2: Ink Bottle Tanks (Yield Economics) -->
      <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
        <div class="border-b border-slate-100 pb-3">
          <h3 class="text-sm font-bold text-slate-900">2. Ink Bottle Tank Refills (HP GT53 & GT52 ISO Yields)</h3>
          <p class="text-xs text-slate-500">Divided by manufacturer ISO/IEC 24712 rated page yield</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
              <tr>
                <th class="py-2">Ink Bottle Model</th>
                <th class="py-2">Bottle Price (₱)</th>
                <th class="py-2">ISO Rated Page Yield</th>
                <th class="py-2">Yield Metric</th>
                <th class="py-2">Calculated Cost per Page</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in inkBatches" :key="item.id" class="hover:bg-slate-50">
                <td class="py-3 font-bold text-slate-800">{{ item.name }}</td>
                <td class="py-3 font-mono font-bold text-slate-900">₱{{ item.packPrice.toFixed(2) }}</td>
                <td class="py-3 font-mono font-bold text-slate-700">{{ item.unitsPerPack.toLocaleString() }} pages</td>
                <td class="py-3 text-slate-500 font-bold uppercase text-[10px]">ISO Standard Pages</td>
                <td class="py-3 font-mono font-black text-emerald-600 text-sm">
                  ₱{{ (item.packPrice / item.unitsPerPack).toFixed(3) }} / printed page
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 3: Finishing & Packaging Supplies -->
      <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
        <div class="border-b border-slate-100 pb-3">
          <h3 class="text-sm font-bold text-slate-900">3. Laminating Pouches & Packaging Supplies</h3>
          <p class="text-xs text-slate-500">Unit cost for ID pouches, document sleeves, and packaging</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
              <tr>
                <th class="py-2">Supply Item</th>
                <th class="py-2">Package Price (₱)</th>
                <th class="py-2">Pieces in Pack</th>
                <th class="py-2">Unit Type</th>
                <th class="py-2">Calculated Unit Cost</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in finishingBatches" :key="item.id" class="hover:bg-slate-50">
                <td class="py-3 font-bold text-slate-800">{{ item.name }}</td>
                <td class="py-3 font-mono font-bold text-slate-900">₱{{ item.packPrice.toFixed(2) }}</td>
                <td class="py-3 font-mono font-bold text-slate-700">{{ item.unitsPerPack }}</td>
                <td class="py-3 text-slate-500 font-bold uppercase text-[10px]">{{ item.unitType }}</td>
                <td class="py-3 font-mono font-black text-emerald-600 text-sm">
                  ₱{{ (item.packPrice / item.unitsPerPack).toFixed(3) }} / {{ item.unitType }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 4: Itemized Overhead & Machine Wear Allocations -->
      <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-4">
        <div class="border-b border-slate-100 pb-3">
          <h3 class="text-sm font-bold text-slate-900">4. Itemized Operational Overhead & Machine Wear</h3>
          <p class="text-xs text-slate-500">Real overhead derivations per product category (eliminates unexplained fees)</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
              <tr>
                <th class="py-2">Overhead Category</th>
                <th class="py-2">Applies To</th>
                <th class="py-2">Allocation Basis</th>
                <th class="py-2">Itemized Rate</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in overheadBatches" :key="item.id" class="hover:bg-slate-50">
                <td class="py-3 font-bold text-slate-800">{{ item.name }}</td>
                <td class="py-3 font-semibold text-slate-600">{{ item.appliesTo }}</td>
                <td class="py-3 text-slate-500">{{ item.basis }}</td>
                <td class="py-3 font-mono font-black text-emerald-600 text-sm">₱{{ item.rate.toFixed(2) }} / unit</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const activeTab = ref<'PRICING_MARGINS' | 'UNIT_ECONOMICS'>('PRICING_MARGINS');
const selectedProductId = ref('prod_rush_id_4r');
const toastMessage = ref<string | null>(null);

const currentPaperCost = ref(3.50); // 4R Glossy (₱350/100 pack)
const currentInkCost = ref(3.00); // 4R Photo CMYK ink
const currentOverheadCost = ref(1.50); // Photo packaging sleeve + trimming wear
const currentLaborCost = ref(7.50); // 5 min operator time @ ₱90/hr

const paperBatches = ref([
  { id: 'mat_4r_glossy', name: '4R Glossy Photo Paper 230gsm (Pack of 100)', packPrice: 350.0, unitsPerPack: 100, unitType: 'sheets' },
  { id: 'mat_a4_70gsm', name: 'A4 Copier Paper 70gsm (1 Ream / 500 sheets)', packPrice: 250.0, unitsPerPack: 500, unitType: 'sheets' },
  { id: 'mat_letter_70gsm', name: 'Short / Letter Copier Paper 70gsm (1 Ream)', packPrice: 240.0, unitsPerPack: 500, unitType: 'sheets' },
  { id: 'mat_legal_70gsm', name: 'Long / Legal Copier Paper 70gsm (1 Ream)', packPrice: 275.0, unitsPerPack: 500, unitType: 'sheets' },
]);

const inkBatches = ref([
  { id: 'ink_gt53_black', name: 'HP GT53 Black Pigment Ink Bottle (90ml)', packPrice: 380.0, unitsPerPack: 4000 },
  { id: 'ink_gt52_color', name: 'HP GT52 Cyan/Magenta/Yellow Inks (70ml x 3)', packPrice: 1050.0, unitsPerPack: 8000 },
]);

const finishingBatches = ref([
  { id: 'mat_id_pouch', name: 'ID Laminating Film Pouches (100-Pack)', packPrice: 150.0, unitsPerPack: 100, unitType: 'pouches' },
  { id: 'mat_a4_pouch', name: 'A4 Laminating Film Pouches (100-Pack)', packPrice: 350.0, unitsPerPack: 100, unitType: 'pouches' },
  { id: 'mat_sleeves', name: 'Clear Document & Photo Sleeves (100-Pack)', packPrice: 60.0, unitsPerPack: 100, unitType: 'sleeves' },
]);

const overheadBatches = ref([
  { id: 'oh_doc_bw', name: 'Document B&W Printing Electricity & Head Wear', appliesTo: 'A4 B&W Documents', basis: 'Amortized wear per page', rate: 0.20 },
  { id: 'oh_doc_color', name: 'Document Color Printing & Maintenance Reserve', appliesTo: 'A4 Color Documents', basis: 'Color nozzle wear per page', rate: 0.30 },
  { id: 'oh_photo_4r', name: 'Rush ID Packaging Sleeve & Die-Cutter Wear', appliesTo: '4R Rush ID / Passport', basis: 'Photo packaging & blade wear', rate: 1.50 },
]);

const calculatedBaseCost = computed(() => {
  return currentPaperCost.value + currentInkCost.value + currentOverheadCost.value + currentLaborCost.value;
});

const marginTiers = [
  { name: 'Economy / Student', marginPercent: 25 },
  { name: 'Standard Neighborhood', marginPercent: 50 },
  { name: 'Commercial Grade', marginPercent: 75 },
  { name: 'Premium / Rush', marginPercent: 100 },
  { name: 'VIP / Instant Delivery', marginPercent: 150 },
];

function onProductChange() {
  if (selectedProductId.value.includes('rush_id') || selectedProductId.value.includes('passport')) {
    currentPaperCost.value = 3.50;
    currentInkCost.value = 3.00;
    currentOverheadCost.value = 1.50;
    currentLaborCost.value = 7.50;
  } else if (selectedProductId.value.includes('doc_bw')) {
    currentPaperCost.value = 0.50;
    currentInkCost.value = 0.10;
    currentOverheadCost.value = 0.20;
    currentLaborCost.value = 0.50;
  } else if (selectedProductId.value.includes('doc_color')) {
    currentPaperCost.value = 0.50;
    currentInkCost.value = 1.30;
    currentOverheadCost.value = 0.30;
    currentLaborCost.value = 0.80;
  }
}

function applyPrice(price: number) {
  toastMessage.value = `Updated catalogue price to ₱${price.toFixed(2)} for ${selectedProductId.value}!`;
}
</script>
