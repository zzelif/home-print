<template>
  <div class="min-h-screen bg-slate-100 p-4 md:p-6">
    <!-- Top Header -->
    <header class="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div class="flex items-center gap-3">
        <router-link to="/" class="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </router-link>
        <div>
          <h1 class="text-xl font-bold text-slate-900">Advanced Product Costing & Pricing Engine</h1>
          <p class="text-xs text-slate-500 font-medium">Itemized Materials, Operational Overhead, Labor, & Margin Matrices</p>
        </div>
      </div>

      <!-- Product Selector & Size Header -->
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">PRODUCT:</span>
          <input
            v-model="productName"
            type="text"
            class="rounded-lg border-0 bg-transparent text-sm font-bold text-slate-900 focus:outline-none focus:ring-0"
            placeholder="Product Name"
          />
        </div>
        <div class="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">SIZE:</span>
          <select v-model="productSize" class="rounded-lg border-0 bg-transparent text-sm font-bold text-slate-900 focus:outline-none focus:ring-0">
            <option value="4R">4R (4x6")</option>
            <option value="A4">A4 (8.3x11.7")</option>
            <option value="Letter">Letter (8.5x11")</option>
          </select>
        </div>
      </div>
    </header>

    <!-- 3-Column Top Grid (Material, Operation, Labor) -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- 1. MATERIAL COST CARD (Blue Header) -->
      <div class="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between bg-blue-600 px-5 py-3.5 text-white">
            <div class="flex items-center gap-2 font-bold text-sm">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>MATERIAL COST</span>
            </div>
            <button @click="addMaterial" class="rounded-lg bg-blue-500/40 px-2 py-1 text-xs font-bold hover:bg-blue-500/60">
              + Add Material
            </button>
          </div>

          <!-- Material List Table -->
          <div class="p-4 space-y-2.5">
            <div class="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase text-slate-400 px-1">
              <span class="col-span-6">Material Name</span>
              <span class="col-span-2 text-center">Qty</span>
              <span class="col-span-3 text-right">Price (₱)</span>
              <span class="col-span-1"></span>
            </div>
            <div v-for="(item, idx) in materials" :key="idx" class="grid grid-cols-12 items-center gap-2">
              <input v-model="item.name" type="text" class="col-span-6 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-800" />
              <input v-model.number="item.qty" type="number" min="1" class="col-span-2 rounded-xl border border-slate-200 px-1.5 py-1.5 text-center text-xs font-semibold text-slate-800" />
              <input v-model.number="item.unitPrice" type="number" step="0.25" min="0" class="col-span-3 rounded-xl border border-slate-200 px-2 py-1.5 text-right text-xs font-bold text-slate-800" />
              <button @click="removeMaterial(idx)" class="col-span-1 text-slate-400 hover:text-red-500">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Material Footer -->
        <div class="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-slate-500">TOTAL MATERIAL</span>
          <span class="text-base font-black text-blue-600">₱{{ totalMaterialCost.toFixed(2) }}</span>
        </div>
      </div>

      <!-- 2. OPERATION COST CARD (Orange Header) -->
      <div class="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between bg-orange-600 px-5 py-3.5 text-white">
            <div class="flex items-center gap-2 font-bold text-sm">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>OPERATION COST</span>
            </div>
            <button @click="addOperation" class="rounded-lg bg-orange-500/40 px-2 py-1 text-xs font-bold hover:bg-orange-500/60">
              + Add Item
            </button>
          </div>

          <!-- Operation List Table -->
          <div class="p-4 space-y-2.5">
            <div class="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase text-slate-400 px-1">
              <span class="col-span-7">Operation Item</span>
              <span class="col-span-4 text-right">Amount (₱)</span>
              <span class="col-span-1"></span>
            </div>
            <div v-for="(op, idx) in operations" :key="idx" class="grid grid-cols-12 items-center gap-2">
              <input v-model="op.item" type="text" class="col-span-7 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-800" />
              <input v-model.number="op.amount" type="number" step="0.5" min="0" class="col-span-4 rounded-xl border border-slate-200 px-2 py-1.5 text-right text-xs font-bold text-slate-800" />
              <button @click="removeOperation(idx)" class="col-span-1 text-slate-400 hover:text-red-500">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Operation Footer -->
        <div class="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-slate-500">TOTAL OPERATION</span>
          <span class="text-base font-black text-orange-600">₱{{ totalOperationCost.toFixed(2) }}</span>
        </div>
      </div>

      <!-- 3. LABOR COST CARD (Slate Header) -->
      <div class="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between bg-slate-800 px-5 py-3.5 text-white">
            <div class="flex items-center gap-2 font-bold text-sm">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>LABOR COST</span>
            </div>
          </div>

          <!-- Labor Parameters -->
          <div class="p-5 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500">Rate / Hour (₱)</label>
              <input v-model.number="labor.ratePerHour" type="number" min="0" class="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-500">Hours</label>
                <input v-model.number="labor.hours" type="number" min="0" class="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500">Minutes</label>
                <input v-model.number="labor.minutes" type="number" min="0" max="59" class="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800" />
              </div>
            </div>
          </div>
        </div>

        <!-- Labor Footer -->
        <div class="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-slate-500">LABOR TOTAL</span>
          <span class="text-base font-black text-slate-800">₱{{ totalLaborCost.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- BASE COST SUMMARY BANNER (Green Banner) -->
    <div class="my-6 rounded-3xl bg-emerald-600 p-6 text-white shadow-lg shadow-emerald-600/20 flex flex-wrap items-center justify-between gap-4">
      <div>
        <div class="text-xs font-bold uppercase tracking-wider text-emerald-200">BASE COST SUMMARY</div>
        <div class="mt-1 flex items-center gap-4 text-xs font-medium text-emerald-100">
          <span>Material: ₱{{ totalMaterialCost.toFixed(2) }}</span>
          <span>•</span>
          <span>Operation: ₱{{ totalOperationCost.toFixed(2) }}</span>
          <span>•</span>
          <span>Labor: ₱{{ totalLaborCost.toFixed(2) }}</span>
        </div>
      </div>
      <div class="text-right">
        <div class="text-xs font-bold uppercase tracking-wider text-emerald-200">TOTAL BASE COST</div>
        <div class="text-4xl font-black text-white">₱{{ totalBaseCost.toFixed(2) }}</div>
      </div>
    </div>

    <!-- Bottom 3 Cards: Margin Matrix, Target Selling Price, Bulk Order -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <!-- Margin Matrix (5 cols) -->
      <div class="lg:col-span-5 rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div class="bg-purple-700 px-5 py-3.5 text-white font-bold text-sm flex items-center gap-2">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <span>MARGIN MATRIX</span>
        </div>
        <div class="p-4 overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="border-b border-slate-100 font-bold uppercase text-slate-400">
              <tr>
                <th class="py-2">Base Cost</th>
                <th class="py-2">Margin</th>
                <th class="py-2">Profit</th>
                <th class="py-2 font-black text-slate-800">Selling Price</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="m in [5, 25, 50, 75, 100]" :key="m" class="hover:bg-slate-50 font-medium">
                <td class="py-2.5">₱{{ totalBaseCost.toFixed(2) }}</td>
                <td class="py-2.5 font-bold text-purple-700">{{ m }}%</td>
                <td class="py-2.5 text-green-600 font-semibold">+₱{{ (totalBaseCost * (m / 100)).toFixed(2) }}</td>
                <td class="py-2.5 font-black text-slate-900">₱{{ (totalBaseCost * (1 + m / 100)).toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Target Selling Price (4 cols) -->
      <div class="lg:col-span-4 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 p-6 text-white shadow-xl shadow-orange-500/20 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-orange-100">TARGET SELLING PRICE</span>
            <div class="flex items-center gap-1 rounded-xl bg-black/20 px-2.5 py-1 text-xs font-bold">
              <span>Margin:</span>
              <input v-model.number="targetMargin" type="number" class="w-10 rounded border-0 bg-transparent text-center font-bold text-white focus:outline-none" />
              <span>%</span>
            </div>
          </div>
          <div class="my-6 text-5xl font-black">₱{{ targetSellingPrice.toFixed(2) }}</div>
        </div>
        <div>
          <input v-model.number="targetMargin" type="range" min="5" max="200" step="5" class="w-full accent-white" />
        </div>
      </div>

      <!-- Bulk Order (3 cols) -->
      <div class="lg:col-span-3 rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col justify-between">
        <div>
          <div class="bg-red-600 px-5 py-3.5 text-white font-bold text-sm flex items-center gap-2">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span>BULK ORDER</span>
          </div>
          <div class="p-4 space-y-3 text-xs font-semibold text-slate-600">
            <div class="flex justify-between items-center">
              <span>Base Price:</span>
              <span class="font-bold text-slate-800">₱{{ targetSellingPrice.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span>Discount (₱):</span>
              <input v-model.number="bulkDiscount" type="number" min="0" class="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right font-bold text-slate-800" />
            </div>
            <div class="flex justify-between items-center">
              <span>Quantity:</span>
              <input v-model.number="bulkQuantity" type="number" min="1" class="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right font-bold text-slate-800" />
            </div>
          </div>
        </div>
        <div class="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-slate-500">FINAL TOTAL</span>
          <span class="text-xl font-black text-slate-900">₱{{ bulkFinalTotal.toFixed(2) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const productName = ref('4R Rush ID Package (Set 1)');
const productSize = ref('4R');

// Materials
const materials = ref([
  { name: '4R Glossy 230gsm Photo Paper', qty: 1, unitPrice: 8.75 },
  { name: 'Plastic Sleeve (Optional)', qty: 1, unitPrice: 16.00 },
  { name: 'Photo Coating Seal', qty: 1, unitPrice: 3.50 },
]);

// Operations
const operations = ref([
  { item: 'Electricity', amount: 1.00 },
  { item: 'Internet', amount: 1.00 },
  { item: 'Ink Consumption', amount: 5.00 },
  { item: 'Printer Maintenance', amount: 3.00 },
  { item: 'Other Tools', amount: 5.00 },
]);

// Labor
const labor = ref({
  ratePerHour: 90.0,
  hours: 0,
  minutes: 15,
});

// Calculations
const totalMaterialCost = computed(() => {
  return materials.value.reduce((sum, m) => sum + (m.qty * m.unitPrice), 0);
});

const totalOperationCost = computed(() => {
  return operations.value.reduce((sum, o) => sum + o.amount, 0);
});

const totalLaborCost = computed(() => {
  const mins = (labor.value.hours * 60) + labor.value.minutes;
  return (labor.value.ratePerHour / 60) * mins;
});

const totalBaseCost = computed(() => {
  return totalMaterialCost.value + totalOperationCost.value + totalLaborCost.value;
});

// Target Margin & Price
const targetMargin = ref(50);
const targetSellingPrice = computed(() => {
  return totalBaseCost.value * (1 + targetMargin.value / 100);
});

// Bulk Order
const bulkDiscount = ref(10.0);
const bulkQuantity = ref(1);
const bulkFinalTotal = computed(() => {
  return Math.max(0, (targetSellingPrice.value * bulkQuantity.value) - bulkDiscount.value);
});

// Add / Remove Handlers
function addMaterial() {
  materials.value.push({ name: 'New Material', qty: 1, unitPrice: 5.0 });
}

function removeMaterial(idx: number) {
  materials.value.splice(idx, 1);
}

function addOperation() {
  operations.value.push({ item: 'New Expense', amount: 2.0 });
}

function removeOperation(idx: number) {
  operations.value.splice(idx, 1);
}
</script>
