<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm"
  >
    <div
      class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-6 shadow-2xl ring-1 ring-slate-200"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between border-b border-slate-100 pb-4"
      >
        <div>
          <h3 class="text-xl font-bold text-slate-800">
            Checkout & Change Counter
          </h3>
          <p class="text-sm text-slate-500">
            Order: {{ job?.customer_name || "Customer" }} ({{ job?.id }})
          </p>
        </div>
        <button
          @click="$emit('close')"
          aria-label="Close Checkout Modal"
          class="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <svg
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Bill Amount -->
      <div class="my-6 rounded-2xl bg-slate-50 p-4 text-center">
        <span
          class="text-sm font-semibold uppercase tracking-wider text-slate-500"
          >Total Amount Due</span
        >
        <div class="text-4xl font-extrabold text-slate-900">
          ₱{{ totalDue.toFixed(2) }}
        </div>
      </div>

      <!-- Quick Tender Banknote Buttons -->
      <div class="space-y-2">
        <label class="text-xs font-bold uppercase tracking-wider text-slate-600"
          >Quick Cash Tendered (₱)</label
        >
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="amt in [totalDue, 50, 100, 200, 500, 1000]"
            :key="amt"
            type="button"
            @click="setTender(amt)"
            :class="[
              cashTendered === amt
                ? 'bg-blue-600 text-white ring-2 ring-blue-600'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200',
              'rounded-xl py-3 text-base font-bold transition',
            ]"
          >
            {{ amt === totalDue ? "Exact: ₱" + amt.toFixed(0) : "₱" + amt }}
          </button>
        </div>
      </div>

      <!-- Custom Cash Input -->
      <div class="mt-4">
        <div class="relative rounded-xl shadow-sm">
          <div
            class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
          >
            <span class="text-slate-500 font-bold">₱</span>
          </div>
          <input
            v-model.number="cashTendered"
            type="number"
            min="0"
            step="1"
            class="block w-full rounded-xl border border-slate-300 py-3 pl-8 pr-3 text-lg font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Other cash amount"
          />
        </div>
      </div>

      <!-- Giant Change Counter Display -->
      <div
        class="my-6 rounded-2xl border-2 border-green-500 bg-green-50/80 p-5 text-center"
      >
        <span class="text-xs font-bold uppercase tracking-wider text-green-800"
          >Customer Change Due</span
        >
        <div class="text-5xl font-black text-green-600">
          ₱{{ changeDue > 0 ? changeDue.toFixed(2) : "0.00" }}
        </div>
        <div
          v-if="cashTendered < totalDue"
          class="mt-1 text-xs font-semibold text-red-600"
        >
          Amount tendered is less than total bill.
        </div>
      </div>

      <!-- Privacy Purge Option -->
      <div class="mb-6 rounded-2xl bg-slate-50 p-3 flex items-center gap-3">
        <input
          id="purge-cb"
          v-model="purgeFiles"
          type="checkbox"
          class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <label
          for="purge-cb"
          class="text-xs text-slate-700 font-medium cursor-pointer"
        >
          <span class="font-bold text-slate-900"
            >Purge customer uploaded files from disk</span
          >
          (Recommended for data privacy)
        </label>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
        <button
          type="button"
          @click="$emit('close')"
          class="w-full sm:w-1/3 rounded-2xl border border-slate-300 py-3.5 px-4 text-sm sm:text-base font-bold text-slate-700 hover:bg-slate-50 transition min-h-[48px]"
        >
          Cancel
        </button>
        <button
          type="button"
          :disabled="cashTendered < totalDue"
          @click="confirmPayment"
          class="flex w-full sm:w-2/3 items-center justify-center gap-2 rounded-2xl bg-green-600 py-3.5 px-4 text-sm sm:text-base font-black text-white shadow-lg shadow-green-600/30 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 min-h-[48px]"
        >
          <svg
            class="h-5 w-5 shrink-0"
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
          <span class="truncate">Mark Complete & Paid</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { PrintJob } from "../stores/jobStore";

const props = defineProps<{
  isOpen: boolean;
  job: PrintJob | null;
}>();

const emit = defineEmits(["close", "complete"]);

const totalDue = computed(
  () => props.job?.final_amount || props.job?.selling_price || 40.0,
);
const cashTendered = ref<number>(totalDue.value);
const purgeFiles = ref(true);

watch(
  () => props.job,
  () => {
    cashTendered.value = totalDue.value;
  },
);

const changeDue = computed(() => {
  return Math.max(0, (cashTendered.value || 0) - totalDue.value);
});

function setTender(amount: number) {
  cashTendered.value = amount;
}

function confirmPayment() {
  if (cashTendered.value >= totalDue.value && props.job) {
    emit("complete", {
      jobId: props.job.id,
      cashTendered: cashTendered.value,
      changeGiven: changeDue.value,
      purgeFiles: purgeFiles.value,
    });
  }
}
</script>
