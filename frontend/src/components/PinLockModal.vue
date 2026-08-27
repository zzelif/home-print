<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md">
    <div class="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-slate-200 text-center space-y-6">
      <!-- Icon & Brand -->
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-600/30">
        <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      <div>
        <h2 class="text-xl font-black text-slate-900 tracking-tight">Operator Station Locked</h2>
        <p class="mt-1 text-xs font-medium text-slate-500">Enter 4-Digit Security PIN (Default: 1234)</p>
      </div>

      <!-- PIN Dot Indicators (4 circles) -->
      <div class="flex items-center justify-center gap-4 py-2">
        <div
          v-for="i in 4"
          :key="i"
          :class="[
            pinDigits.length >= i ? 'bg-blue-600 scale-110 shadow-md shadow-blue-600/30 ring-2 ring-blue-600' : 'bg-slate-200',
            'h-4 w-4 rounded-full transition-all duration-150'
          ]"
        ></div>
      </div>

      <!-- Error Message Banner -->
      <div v-if="errorMessage" class="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-bold text-rose-600 animate-bounce">
        {{ errorMessage }}
      </div>

      <!-- Giant Numeric Keypad -->
      <div class="grid grid-cols-3 gap-3 pt-2">
        <button
          v-for="num in [1, 2, 3, 4, 5, 6, 7, 8, 9]"
          :key="num"
          type="button"
          @click="appendDigit(num.toString())"
          class="flex h-14 items-center justify-center rounded-2xl bg-slate-100 text-xl font-extrabold text-slate-800 shadow-sm transition active:scale-95 active:bg-blue-100 hover:bg-slate-200 select-none"
        >
          {{ num }}
        </button>

        <!-- Clear Button -->
        <button
          type="button"
          @click="clearPin"
          class="flex h-14 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-500 transition active:scale-95 active:bg-slate-200 hover:bg-slate-200 select-none uppercase tracking-wider"
        >
          Clear
        </button>

        <!-- Zero Button -->
        <button
          type="button"
          @click="appendDigit('0')"
          class="flex h-14 items-center justify-center rounded-2xl bg-slate-100 text-xl font-extrabold text-slate-800 shadow-sm transition active:scale-95 active:bg-blue-100 hover:bg-slate-200 select-none"
        >
          0
        </button>

        <!-- Backspace Button -->
        <button
          type="button"
          @click="deleteDigit"
          class="flex h-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition active:scale-95 active:bg-slate-200 hover:bg-slate-200 select-none"
          title="Backspace"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-7.172a2 2 0 00-1.414.586L3 12z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useJobStore } from '../stores/jobStore';

const authStore = useAuthStore();
const jobStore = useJobStore();

const pinDigits = ref('');
const errorMessage = ref<string | null>(null);
const isSubmitting = ref(false);

function appendDigit(digit: string) {
  if (pinDigits.value.length < 4) {
    pinDigits.value += digit;
    errorMessage.value = null;

    if (pinDigits.value.length === 4) {
      submitPin();
    }
  }
}

function deleteDigit() {
  if (pinDigits.value.length > 0) {
    pinDigits.value = pinDigits.value.slice(0, -1);
    errorMessage.value = null;
  }
}

function clearPin() {
  pinDigits.value = '';
  errorMessage.value = null;
}

async function submitPin() {
  if (pinDigits.value.length !== 4 || isSubmitting.value) return;

  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    const success = await authStore.login(pinDigits.value);
    if (success) {
      pinDigits.value = '';
      await jobStore.fetchJobs();
      await jobStore.fetchPrinterStatus();
    } else {
      errorMessage.value = 'Incorrect PIN. Default is 1234.';
      pinDigits.value = '';
    }
  } catch {
    errorMessage.value = 'Connection error. Please try again.';
    pinDigits.value = '';
  } finally {
    isSubmitting.value = false;
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (/^[0-9]$/.test(event.key)) {
    appendDigit(event.key);
  } else if (event.key === 'Backspace') {
    deleteDigit();
  } else if (event.key === 'Escape' || event.key === 'c' || event.key === 'C') {
    clearPin();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>
