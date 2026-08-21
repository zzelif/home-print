<template>
  <div class="min-h-screen bg-slate-50 p-4 md:p-6">
    <header class="mb-6 flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div class="flex items-center gap-3">
        <router-link to="/" class="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </router-link>
        <div>
          <h1 class="text-xl font-bold text-slate-900">Costing Matrix & Catalogue</h1>
          <p class="text-xs text-slate-500">Two-Tier Pricing (Commodity Documents & Advanced Costing)</p>
        </div>
      </div>
    </header>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Left Column: Two-Tier Selector & Base Breakdown -->
      <div class="space-y-6">
        <!-- Tier Toggle -->
        <div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Pricing Tier</h3>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="costingStore.costingTier = 'COMMODITY_DOCUMENT'"
              :class="[
                costingStore.costingTier === 'COMMODITY_DOCUMENT' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700',
                'rounded-2xl py-3 text-xs font-bold transition'
              ]"
            >
              Document Fixed Rate
            </button>
            <button
              type="button"
              @click="costingStore.costingTier = 'ADVANCED_COSTING'"
              :class="[
                costingStore.costingTier === 'ADVANCED_COSTING' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700',
                'rounded-2xl py-3 text-xs font-bold transition'
              ]"
            >
              Advanced Costing
            </button>
          </div>
        </div>

        <!-- Tier 1 Inputs -->
        <div v-if="costingStore.costingTier === 'COMMODITY_DOCUMENT'" class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4">
          <h3 class="text-sm font-bold text-slate-800">Document Page Pricing</h3>
          <div>
            <label class="block text-xs font-semibold text-slate-500">Black & White Pages (₱{{ costingStore.bwRate }}/page)</label>
            <input v-model.number="costingStore.bwPages" type="number" min="0" class="mt-1 block w-full rounded-xl border border-slate-200 p-2.5 text-sm font-bold" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500">Color Pages (₱{{ costingStore.colorRate }}/page)</label>
            <input v-model.number="costingStore.colorPages" type="number" min="0" class="mt-1 block w-full rounded-xl border border-slate-200 p-2.5 text-sm font-bold" />
          </div>
        </div>

        <!-- Tier 2 Base Breakdown -->
        <div v-else class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4">
          <h3 class="text-sm font-bold text-slate-800">Base Cost Breakdown</h3>
          <div class="space-y-2 text-xs font-semibold text-slate-600">
            <div class="flex justify-between">
              <span>Materials (Paper + Consumables):</span>
              <span class="font-bold text-slate-900">₱{{ costingStore.materials.reduce((s, m) => s + (m.qty * m.unitPrice), 0).toFixed(2) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Operations (Ink + Power + Maintenance):</span>
              <span class="font-bold text-slate-900">₱{{ costingStore.operations.reduce((s, o) => s + o.amount, 0).toFixed(2) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Labor (5 mins editing @ ₱90/hr):</span>
              <span class="font-bold text-slate-900">₱7.50</span>
            </div>
            <div class="border-t border-slate-100 pt-2 flex justify-between text-sm font-black text-slate-900">
              <span>Total Base Cost:</span>
              <span class="text-blue-600">₱{{ costingStore.totalBaseCost.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right 2 Columns: Margin Matrix Table & Target Price Slider -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 5-Tier Margin Matrix Table -->
        <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 class="mb-4 text-base font-bold text-slate-900">5-Tier Margin Multiplier Table</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="border-b border-slate-100 text-xs uppercase text-slate-400">
                <tr>
                  <th class="py-2.5">Margin Markup</th>
                  <th class="py-2.5">Base Cost</th>
                  <th class="py-2.5">Profit (₱)</th>
                  <th class="py-2.5 font-bold text-slate-900">Selling Price</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="row in costingStore.marginMatrix" :key="row.marginPercent" class="hover:bg-slate-50">
                  <td class="py-3 font-bold text-purple-700">{{ row.marginPercent }}%</td>
                  <td class="py-3">₱{{ row.baseCost.toFixed(2) }}</td>
                  <td class="py-3 font-semibold text-green-600">+₱{{ row.profit.toFixed(2) }}</td>
                  <td class="py-3 font-black text-slate-900">₱{{ row.sellingPrice.toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Target Selling Price Card -->
        <div class="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-xl shadow-orange-500/20">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-amber-100">Calculated Final Price</span>
            <span class="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">Margin: {{ costingStore.targetMarginPercent }}%</span>
          </div>
          <div class="my-4 text-5xl font-black">₱{{ costingStore.calculatedFinalPrice.toFixed(2) }}</div>
          <div class="mt-4">
            <label class="block text-xs font-semibold text-amber-100">Adjust Profit Margin Slider (10% – 200%)</label>
            <input
              v-model.number="costingStore.targetMarginPercent"
              type="range"
              min="10"
              max="200"
              step="5"
              class="mt-2 w-full accent-white"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCostingStore } from '../stores/costingStore';

const costingStore = useCostingStore();
</script>
