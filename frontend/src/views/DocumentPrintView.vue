<template>
  <div class="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
    <!-- Document Print Header -->
    <header
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200"
    >
      <div class="flex items-center gap-3">
        <router-link
          to="/"
          class="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 shrink-0"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </router-link>
        <div class="min-w-0">
          <h1 class="text-lg sm:text-xl font-bold text-slate-900 truncate">
            Document Printing Station
          </h1>
          <p class="text-xs text-slate-500 font-medium truncate">
            Adaptive Ink Pricing (B&W ₱3, Spot ₱8, Medium ₱15, Full Color ₱20)
          </p>
        </div>
      </div>

      <!-- Header Actions: Cancel / Discard & Spool Print -->
      <div class="flex items-center gap-2.5 w-full sm:w-auto">
        <button
          v-if="currentJobId"
          type="button"
          @click="confirmCancelDocumentOrder"
          class="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs sm:text-sm font-bold text-rose-700 hover:bg-rose-100 transition min-h-[44px]"
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
          <span>Cancel Order</span>
        </button>

        <button
          @click="dispatchDocumentPrint"
          :disabled="isPrinting || !documentName"
          class="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 disabled:opacity-50 min-h-[44px]"
        >
          <svg
            :class="{ 'animate-spin': isPrinting }"
            class="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          <span>{{ isPrinting ? "Spooling..." : "PRINT DOCUMENT" }}</span>
        </button>
      </div>
    </header>

    <!-- Live Spool Alert Banner (When Job Active) -->
    <div
      v-if="spoolNotification"
      class="rounded-3xl bg-emerald-600 p-4 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <svg
          class="h-6 w-6 text-emerald-200 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <div>
          <span
            class="text-xs font-bold uppercase tracking-wider text-emerald-200"
            >Active Spool Status</span
          >
          <p class="text-sm font-bold">{{ spoolNotification }}</p>
        </div>
      </div>
      <button
        @click="spoolNotification = null"
        class="text-xs font-bold text-emerald-200 hover:text-white"
      >
        Dismiss
      </button>
    </div>

    <!-- Friendly Error / Offline Modal -->
    <div
      v-if="errorMessage"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
    >
      <div
        class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4"
      >
        <div class="flex items-center gap-3 text-amber-600">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 shrink-0"
          >
            <svg
              class="h-7 w-7 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-black text-slate-900">Printer Notice</h3>
            <p class="text-xs text-slate-500 font-medium">
              Hardware & Spooler Notification
            </p>
          </div>
        </div>

        <div
          class="rounded-2xl bg-amber-50/70 p-4 border border-amber-200 text-xs text-amber-900 leading-relaxed font-medium"
        >
          {{ errorMessage }}
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            @click="errorMessage = null"
            class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 min-h-[40px]"
          >
            Close
          </button>
          <router-link
            to="/settings"
            class="flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 min-h-[40px]"
          >
            Open Printer Discovery
          </router-link>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <!-- Left Config Controls (6 cols) -->
      <div class="space-y-6 lg:col-span-6">
        <!-- File Dropzone (Multi-File Enabled) -->
        <div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3
            class="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400"
          >
            Document / Image Files
          </h3>
          <div
            @click="triggerDocInput"
            class="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/50 p-6 text-center transition hover:bg-emerald-50"
          >
            <input
              ref="docInput"
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.pptx,.txt,image/*"
              class="hidden"
              @change="onDocSelected"
            />
            <svg
              class="h-10 w-10 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.75"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span
              class="mt-2 text-sm font-bold text-emerald-800 break-all px-2"
            >
              {{
                documentName ||
                "Select or Drop Files (PDF, Word DOCX, or Multiple Images)"
              }}
            </span>
            <span class="text-xs text-slate-500 font-medium">
              {{
                documentName
                  ? `${totalDocPages} page(s) • ${documentSizeKb} KB`
                  : "Batch multi-image selection supported (e.g. 15 photos in 1 order)"
              }}
            </span>
          </div>
        </div>

        <!-- 2026 Adaptive Pricing Mode Selector -->
        <div
          class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4"
        >
          <div class="flex items-center justify-between">
            <h3
              class="text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              Pricing & Color Strategy
            </h3>
            <!-- <span class="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black text-blue-700">2026 ADAPTIVE ENGINE</span> -->
          </div>

          <!-- Strategy Tabs -->
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              @click="pricingMode = 'ADAPTIVE'"
              :class="[
                pricingMode === 'ADAPTIVE'
                  ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-600'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                'flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition min-h-[52px]',
              ]"
            >
              <span class="text-xs font-black flex items-center gap-1">
                <!-- <svg
                  class="h-3.5 w-3.5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg> -->
                Adaptive
              </span>
              <span class="text-[10px] text-slate-500 font-medium"
                >Per-page pixel tiers</span
              >
            </button>

            <button
              type="button"
              @click="pricingMode = 'FLAT_BW'"
              :class="[
                pricingMode === 'FLAT_BW'
                  ? 'border-slate-800 bg-slate-800 text-white ring-2 ring-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                'flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition min-h-[52px]',
              ]"
            >
              <span class="text-xs font-bold flex items-center gap-1">
                <!-- <svg
                  class="h-3.5 w-3.5"
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
                </svg> -->
                Flat B&W
              </span>
              <span class="text-[10px] opacity-75">₱3.00 / page</span>
            </button>

            <button
              type="button"
              @click="pricingMode = 'FLAT_COLOR'"
              :class="[
                pricingMode === 'FLAT_COLOR'
                  ? 'border-emerald-600 bg-emerald-600 text-white ring-2 ring-emerald-600'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                'flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition min-h-[52px]',
              ]"
            >
              <span class="text-xs font-bold flex items-center gap-1">
                <!-- <svg
                  class="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M7 21a4 4 0 01-4-4 5 5 0 015-5 4 4 0 014 4v1a2 2 0 002 2h2a2 2 0 002-2v-1a4 4 0 014-4 5 5 0 015 5 4 4 0 01-4 4H7z"
                  />
                </svg> -->
                Flat Color
              </span>
              <span class="text-[10px] opacity-75">₱20.00 / page</span>
            </button>
          </div>

          <!-- Adaptive Smart Breakdown Details (Calculated for SELECTED pages only) -->
          <div
            v-if="pricingMode === 'ADAPTIVE' && pageBreakdown.length > 0"
            class="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-2.5 text-xs"
          >
            <div
              class="flex items-center justify-between font-bold text-slate-700 border-b border-slate-200/60 pb-2"
            >
              <span>Automatic Selected Breakdown:</span>
              <span class="text-emerald-700 font-black font-mono"
                >₱{{ singleCopyAdaptiveSum.toFixed(2) }} / copy</span
              >
            </div>

            <div class="space-y-1.5 text-slate-600">
              <div
                v-if="monochromeCount > 0"
                class="flex justify-between items-center"
              >
                <span class="flex items-center gap-1.5">
                  <span class="h-2 w-2 rounded-full bg-slate-400"></span>
                  {{ tierLabels.tier0 }}
                </span>
                <span class="font-mono font-bold"
                  >{{ monochromeCount }} page(s) • ₱{{
                    (monochromeCount * pricingConfig.prices.tier0).toFixed(2)
                  }}</span
                >
              </div>
              <div
                v-if="accentColorCount > 0"
                class="flex justify-between items-center"
              >
                <span class="flex items-center gap-1.5">
                  <span class="h-2 w-2 rounded-full bg-blue-500"></span>
                  {{ tierLabels.tier1 }}
                </span>
                <span class="font-mono font-bold"
                  >{{ accentColorCount }} page(s) • ₱{{
                    (accentColorCount * pricingConfig.prices.tier1).toFixed(2)
                  }}</span
                >
              </div>
              <div
                v-if="mediumColorCount > 0"
                class="flex justify-between items-center"
              >
                <span class="flex items-center gap-1.5">
                  <span class="h-2 w-2 rounded-full bg-amber-500"></span>
                  {{ tierLabels.tier2 }}
                </span>
                <span class="font-mono font-bold"
                  >{{ mediumColorCount }} page(s) • ₱{{
                    (mediumColorCount * pricingConfig.prices.tier2).toFixed(2)
                  }}</span
                >
              </div>
              <div
                v-if="heavyColorCount > 0"
                class="flex justify-between items-center"
              >
                <span class="flex items-center gap-1.5">
                  <span class="h-2 w-2 rounded-full bg-rose-500"></span>
                  {{ tierLabels.tier3 }}
                </span>
                <span class="font-mono font-bold"
                  >{{ heavyColorCount }} page(s) • ₱{{
                    (heavyColorCount * pricingConfig.prices.tier3).toFixed(2)
                  }}</span
                >
              </div>
            </div>

            <!-- Customer Savings Highlight -->
            <div
              v-if="customerSavingsSingle > 0"
              class="rounded-xl bg-emerald-100/80 p-2.5 text-emerald-900 flex items-center justify-between font-bold"
            >
              <span class="flex items-center gap-1">
                <svg
                  class="h-4 w-4 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                Customer Saved vs Flat Color:
              </span>
              <span class="font-mono text-sm text-emerald-800"
                >₱{{ (customerSavingsSingle * copies).toFixed(2) }}</span
              >
            </div>
          </div>
        </div>

        <!-- Page Range & Print Specifications -->
        <div
          class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4"
        >
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">
            Page Selection & Copies
          </h3>

          <!-- Page Range Input -->
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">
              Pages to Print (e.g.
              <span class="font-mono text-slate-800">all</span>,
              <span class="font-mono text-slate-800">1-3</span>,
              <span class="font-mono text-slate-800">1,4,5</span>)
            </label>
            <input
              v-model="pageRangeInput"
              type="text"
              class="block w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold text-slate-800 min-h-[44px]"
              placeholder="all"
            />
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <button
                @click="pageRangeInput = 'all'"
                class="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition min-h-[34px]"
              >
                All Pages ({{ totalDocPages }})
              </button>
              <button
                @click="pageRangeInput = '1'"
                class="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition min-h-[34px]"
              >
                Page 1 Only
              </button>
              <button
                v-if="totalDocPages > 1"
                @click="pageRangeInput = `1-${Math.min(totalDocPages, 5)}`"
                class="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition min-h-[34px]"
              >
                First {{ Math.min(totalDocPages, 5) }} Pages
              </button>
            </div>
          </div>

          <!-- Copies, Paper Size & Orientation -->
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1"
                >Copies</label
              >
              <input
                v-model.number="copies"
                type="number"
                min="1"
                class="block w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold text-slate-800 min-h-[44px]"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1"
                >Paper Size</label
              >
              <select
                v-model="paperSize"
                data-testid="paper-size-select"
                class="block w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold text-slate-800 min-h-[44px]"
              >
                <option value="A4">A4 (210 x 297 mm)</option>
                <option value="Letter">Short / Letter (8.5 x 11 in)</option>
                <option value="Long">Long / Folio F4 (8.5 x 13 in)</option>
                <option value="Legal">US Legal (8.5 x 14 in)</option>
                <option value="4R">4R Photo (4 x 6 in)</option>
                <option value="5R">5R Photo (5 x 7 in)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1"
                >Orientation</label
              >
              <select
                v-model="orientation"
                class="block w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold text-slate-800 min-h-[44px]"
              >
                <option value="AUTO">Auto-Detect (Per Page)</option>
                <option value="PORTRAIT">Portrait (All)</option>
                <option value="LANDSCAPE">Landscape (All)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- HP Style Layout & Fit Options -->
        <div
          class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4"
        >
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">
            Fit & Page Scaling
          </h3>

          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="fitMode = 'FIT_PRINTABLE'"
              :class="[
                fitMode === 'FIT_PRINTABLE'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                'flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition min-h-[48px]',
              ]"
            >
              <span class="text-xs font-bold">Fit to Printable Page</span>
              <span class="text-[10px] text-slate-500"
                >Maintains 8mm margin</span
              >
            </button>

            <button
              type="button"
              @click="fitMode = 'FILL_PAGE'"
              :class="[
                fitMode === 'FILL_PAGE'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                'flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition min-h-[48px]',
              ]"
            >
              <span class="text-xs font-bold">Fill Page (Full Bleed)</span>
              <span class="text-[10px] text-slate-500"
                >100% full paper scale</span
              >
            </button>
          </div>
        </div>
      </div>

      <!-- Right Preview Container (6 cols) -->
      <div class="space-y-6 lg:col-span-6">
        <!-- Live Document Preview -->
        <div
          class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-4"
        >
          <div class="flex items-center justify-between">
            <h3
              class="text-xs font-bold uppercase tracking-wider text-slate-400"
            >
              Page Preview
            </h3>
            <span
              v-if="pageBreakdown[currentPageIndex - 1]"
              class="rounded-full px-2.5 py-0.5 text-xs font-bold"
              :class="[
                pageBreakdown[currentPageIndex - 1].tier === 3
                  ? 'bg-rose-100 text-rose-800'
                  : pageBreakdown[currentPageIndex - 1].tier === 2
                    ? 'bg-amber-100 text-amber-800'
                    : pageBreakdown[currentPageIndex - 1].tier === 1
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-700',
              ]"
            >
              Page {{ currentPageIndex }}:
              {{ pageBreakdown[currentPageIndex - 1].tierName }} (₱{{
                pageBreakdown[currentPageIndex - 1].unitPrice.toFixed(2)
              }}
              •
              {{
                (
                  (pageBreakdown[currentPageIndex - 1].chromaticRatio || 0) *
                  100
                ).toFixed(1)
              }}% ink area)
            </span>
          </div>

          <div
            class="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 border border-slate-200 min-h-[420px]"
          >
            <div
              v-if="isRenderingPdf"
              class="flex flex-col items-center justify-center py-16 space-y-2"
            >
              <svg
                class="h-8 w-8 animate-spin text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span class="text-xs font-bold text-slate-500"
                >Rendering preview...</span
              >
            </div>

            <canvas
              ref="previewCanvas"
              class="max-w-full rounded shadow-md border border-slate-300"
              :class="{ hidden: isRenderingPdf || !isPdfLoaded }"
            ></canvas>

            <div
              v-if="!documentName && !isRenderingPdf"
              class="text-center py-16 text-slate-400"
            >
              <svg
                class="mx-auto h-12 w-12 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p class="mt-2 text-xs font-bold">No document loaded yet.</p>
            </div>
          </div>

          <!-- Page Navigation Bar -->
          <div
            v-if="totalDocPages > 1"
            class="flex items-center justify-between px-2 pt-1"
          >
            <button
              type="button"
              @click="changePage(currentPageIndex - 1)"
              :disabled="currentPageIndex <= 1"
              class="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-h-[40px]"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Previous</span>
            </button>
            <span class="text-xs font-bold text-slate-700">
              Page {{ currentPageIndex }} of {{ totalDocPages }}
            </span>
            <button
              type="button"
              @click="changePage(currentPageIndex + 1)"
              :disabled="currentPageIndex >= totalDocPages"
              class="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-h-[40px]"
            >
              <span>Next</span>
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Big Mother-Centric Price Counter Card -->
        <div
          class="rounded-3xl bg-slate-900 p-6 text-white shadow-xl space-y-4"
        >
          <div
            class="flex items-center justify-between border-b border-slate-800 pb-3"
          >
            <span
              class="text-xs font-bold uppercase tracking-wider text-slate-400"
              >Total Print Amount Due</span
            >
            <span
              class="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400"
            >
              {{ copies }} copy/copies • {{ effectivePageCount }} page(s)
            </span>
          </div>

          <div class="text-center py-2">
            <span
              class="text-4xl sm:text-5xl font-black font-mono text-emerald-400 tracking-tight"
            >
              ₱{{ calculatedTotal.toFixed(2) }}
            </span>
            <p class="mt-1 text-xs text-slate-400 font-medium">
              {{
                pricingMode === "ADAPTIVE"
                  ? "Adaptive Pixel Math"
                  : pricingMode === "FLAT_BW"
                    ? "Flat B&W Rate"
                    : "Flat Color Rate"
              }}
            </p>
          </div>

          <button
            @click="dispatchDocumentPrint"
            :disabled="isPrinting || !documentName"
            class="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-base font-black text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-50 transition"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            <span>{{
              isPrinting ? "SPOOLING PRINT JOB..." : "PRINT NOW (1-CLICK)"
            }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.js?url";
import { useJobStore } from "../stores/jobStore";
import {
  DEFAULT_PRICING_CONFIG,
  getTierDisplayLabels,
  PricingCoverageConfig,
} from "../config/pricing-tiers.config";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PageColorAnalysis {
  pageNumber: number;
  tier: 0 | 1 | 2 | 3;
  tierName: string;
  unitPrice: number;
  estimatedCoverage: string;
  chromaticRatio?: number;
}

const route = useRoute();
const router = useRouter();
const jobStore = useJobStore();

const pricingConfig = ref<PricingCoverageConfig>(DEFAULT_PRICING_CONFIG);
const tierLabels = computed(() => getTierDisplayLabels(pricingConfig.value));

const docInput = ref<HTMLInputElement | null>(null);
const previewCanvas = ref<HTMLCanvasElement | null>(null);

const documentName = ref<string | null>(null);
const documentSizeKb = ref<string>("0");
const isPdfLoaded = ref(false);
const isImageLoaded = ref(false);
const isRenderingPdf = ref(false);
let loadedPdfDoc: any = null;

const pricingMode = ref<"ADAPTIVE" | "FLAT_BW" | "FLAT_COLOR">("ADAPTIVE");
const pageRangeInput = ref("all");
const copies = ref(1);
const paperSize = ref<"A4" | "Letter" | "Long" | "Legal" | "4R" | "5R">("A4");
const fitMode = ref<"FIT_PRINTABLE" | "FILL_PAGE">("FIT_PRINTABLE");
const duplexMode = ref<"ONE_SIDED" | "DUPLEX_LONG" | "DUPLEX_SHORT">(
  "ONE_SIDED",
);
const orientation = ref<"AUTO" | "PORTRAIT" | "LANDSCAPE">("AUTO");

const totalDocPages = ref(1);
const currentPageIndex = ref(1);
const isPrinting = ref(false);
const spoolNotification = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const currentJobId = ref<string | null>(null);
const uploadedFileState = ref<any>(null);
const pageBreakdown = ref<PageColorAnalysis[]>([]);

onMounted(async () => {
  jobStore.fetchPrinterStatus();

  // Load configurable pricing tiers dynamically
  try {
    const cfgRes = await fetch("/api/operator/config/pricing-tiers", {
      credentials: "include",
    });
    if (cfgRes.ok) {
      const cfgData = await cfgRes.json();
      if (cfgData.config) {
        pricingConfig.value = cfgData.config;
      }
    }
  } catch {}
  const jobId = route.query.jobId as string;
  if (jobId) {
    currentJobId.value = jobId;
    try {
      const res = await fetch(`/api/operator/jobs/${jobId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.job && data.job.files && data.job.files.length > 0) {
          const file = data.job.files[0];
          documentName.value =
            data.job.files.length > 1
              ? `${file.originalName} (+${data.job.files.length - 1} more)`
              : file.originalName;
          documentSizeKb.value = ((file.fileSize || 0) / 1024).toFixed(1);
          totalDocPages.value = file.pageCount || data.job.files.length || 1;
          pageRangeInput.value = "all";
          copies.value = data.job.copies || 1;
          uploadedFileState.value = file;

          // Restore persisted page analysis breakdown
          if (
            data.job.pageBreakdown &&
            Array.isArray(data.job.pageBreakdown) &&
            data.job.pageBreakdown.length > 0
          ) {
            pageBreakdown.value = data.job.pageBreakdown;
          } else if (data.job.page_breakdown) {
            try {
              pageBreakdown.value =
                typeof data.job.page_breakdown === "string"
                  ? JSON.parse(data.job.page_breakdown)
                  : data.job.page_breakdown;
            } catch {}
          }

          // If still missing, request fresh analysis from backend
          if (!pageBreakdown.value || pageBreakdown.value.length === 0) {
            try {
              const aRes = await fetch(`/api/operator/jobs/${jobId}/analyze`, {
                credentials: "include",
              });
              if (aRes.ok) {
                const aData = await aRes.json();
                if (aData.analysis?.pageBreakdown) {
                  pageBreakdown.value = aData.analysis.pageBreakdown;
                }
              }
            } catch (aErr) {
              console.warn("Failed restoring on-demand analysis:", aErr);
            }
          }

          isPdfLoaded.value = true;
          isImageLoaded.value = false;
          await loadPdfFromUrl(
            `/api/operator/jobs/${jobId}/pdf?paperSize=${paperSize.value}&orientation=${orientation.value}`,
          );
        }
      }
    } catch (err) {
      console.error("Failed to load document into station:", err);
    }
  }
});

// Reload PDF preview when paper size or orientation changes
watch([paperSize, orientation, fitMode], async () => {
  if (currentJobId.value && isPdfLoaded.value) {
    await loadPdfFromUrl(
      `/api/operator/jobs/${currentJobId.value}/pdf?paperSize=${paperSize.value}&orientation=${orientation.value}&fitMode=${fitMode.value}`,
    );
  }
});

// Selected Page Indices based strictly on Page Range Input
const selectedPageIndices = computed<number[]>(() => {
  const range = pageRangeInput.value.trim().toLowerCase();
  if (!range || range === "all") {
    return Array.from(
      { length: Math.max(1, totalDocPages.value) },
      (_, i) => i + 1,
    );
  }
  const parts = range.split(",").map((s) => s.trim());
  const pages = new Set<number>();

  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (
          let p = Math.max(1, start);
          p <= Math.min(totalDocPages.value, end);
          p++
        ) {
          pages.add(p);
        }
      }
    } else {
      const p = Number(part);
      if (!isNaN(p) && p >= 1 && p <= totalDocPages.value) {
        pages.add(p);
      }
    }
  }
  const result = Array.from(pages).sort((a, b) => a - b);
  return result.length > 0 ? result : [1];
});

const effectivePageCount = computed(() => selectedPageIndices.value.length);

// Selected Page Breakdown
const selectedPageBreakdown = computed<PageColorAnalysis[]>(() => {
  const selectedSet = new Set(selectedPageIndices.value);
  if (pageBreakdown.value.length === 0) {
    return selectedPageIndices.value.map((pageNum) => ({
      pageNumber: pageNum,
      tier: 0,
      tierName: "Monochrome (B&W)",
      unitPrice: 3.0,
      estimatedCoverage: "0% Color",
    }));
  }
  return pageBreakdown.value.filter((p) => selectedSet.has(p.pageNumber));
});

const monochromeCount = computed(
  () => selectedPageBreakdown.value.filter((p) => p.tier === 0).length,
);
const accentColorCount = computed(
  () => selectedPageBreakdown.value.filter((p) => p.tier === 1).length,
);
const mediumColorCount = computed(
  () => selectedPageBreakdown.value.filter((p) => p.tier === 2).length,
);
const heavyColorCount = computed(
  () => selectedPageBreakdown.value.filter((p) => p.tier === 3).length,
);

// Adaptive Sum for a single copy of SELECTED pages
const singleCopyAdaptiveSum = computed(() => {
  if (selectedPageBreakdown.value.length === 0) {
    return effectivePageCount.value * 3.0;
  }
  return selectedPageBreakdown.value.reduce((sum, p) => sum + p.unitPrice, 0);
});

// Customer Savings vs Flat Color (₱20/page) for SELECTED pages
const customerSavingsSingle = computed(() => {
  const flatColor = effectivePageCount.value * 20.0;
  return Math.max(0, flatColor - singleCopyAdaptiveSum.value);
});

// Total Calculated Price
const calculatedTotal = computed(() => {
  const numCopies = copies.value || 1;
  if (pricingMode.value === "FLAT_BW") {
    return effectivePageCount.value * 3.0 * numCopies;
  }
  if (pricingMode.value === "FLAT_COLOR") {
    return effectivePageCount.value * 20.0 * numCopies;
  }
  return singleCopyAdaptiveSum.value * numCopies;
});

function triggerDocInput() {
  docInput.value?.click();
}

async function onDocSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const files = Array.from(target.files);
    currentPageIndex.value = 1;
    pageRangeInput.value = "all";

    if (files.length > 1) {
      documentName.value = `${files[0].name} (+${files.length - 1} more images)`;
      const totalBytes = files.reduce((s, f) => s + f.size, 0);
      documentSizeKb.value = (totalBytes / 1024).toFixed(1);
    } else {
      documentName.value = files[0].name;
      documentSizeKb.value = (files[0].size / 1024).toFixed(1);
    }

    try {
      isRenderingPdf.value = true;
      const formData = new FormData();

      if (files.length > 1) {
        for (const f of files) {
          formData.append("files", f);
        }
        const res = await fetch(
          `/api/operator/upload-batch?paperSize=${paperSize.value}&orientation=${orientation.value}&fitMode=${fitMode.value}`,
          {
            method: "POST",
            body: formData,
            credentials: "include",
          },
        );

        if (res.ok) {
          const data = await res.json();
          currentJobId.value = data.jobId;
          uploadedFileState.value = data.file;
          totalDocPages.value = data.file.pageCount || files.length;

          if (data.analysis && data.analysis.pageBreakdown) {
            pageBreakdown.value = data.analysis.pageBreakdown;
          }

          isPdfLoaded.value = true;
          isImageLoaded.value = false;
          await loadPdfFromUrl(
            data.previewPdfUrl ||
              `/api/operator/jobs/${data.jobId}/pdf?paperSize=${paperSize.value}`,
          );
        }
      } else {
        const file = files[0];
        formData.append("file", file);
        const res = await fetch(
          `/api/operator/upload?paperSize=${paperSize.value}&orientation=${orientation.value}&fitMode=${fitMode.value}`,
          {
            method: "POST",
            body: formData,
            credentials: "include",
          },
        );

        if (res.ok) {
          const data = await res.json();
          currentJobId.value = data.jobId;
          uploadedFileState.value = data.file;
          totalDocPages.value = data.file.pageCount || 1;

          if (data.analysis && data.analysis.pageBreakdown) {
            pageBreakdown.value = data.analysis.pageBreakdown;
          }

          isPdfLoaded.value = true;
          isImageLoaded.value = false;
          await loadPdfFromUrl(
            data.previewPdfUrl ||
              `/api/operator/jobs/${data.jobId}/pdf?paperSize=${paperSize.value}`,
          );
        }
      }
    } catch (err) {
      console.warn("Could not upload document/images to server:", err);
    } finally {
      isRenderingPdf.value = false;
    }
  }
}

async function loadPdfFromUrl(url: string) {
  try {
    isRenderingPdf.value = true;
    const loadingTask = pdfjsLib.getDocument({ url, withCredentials: true });
    loadedPdfDoc = await loadingTask.promise;
    totalDocPages.value = loadedPdfDoc.numPages;
    await renderCurrentPdfPage();
  } catch (err) {
    console.warn("PDF.js URL loading error:", err);
  } finally {
    isRenderingPdf.value = false;
  }
}

async function renderCurrentPdfPage() {
  if (!loadedPdfDoc) return;
  await nextTick();
  const canvas = previewCanvas.value;
  if (!canvas) return;

  try {
    const page = await loadedPdfDoc.getPage(currentPageIndex.value);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const maxTargetWidth = Math.min(380, window.innerWidth - 64);
    const maxTargetHeight = 520;
    const scale = Math.min(
      maxTargetWidth / unscaledViewport.width,
      maxTargetHeight / unscaledViewport.height,
    );
    const viewport = page.getViewport({ scale });

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };
    await page.render(renderContext).promise;
  } catch (err) {
    console.warn("Failed rendering PDF page:", err);
  }
}

async function changePage(newPage: number) {
  if (newPage >= 1 && newPage <= totalDocPages.value) {
    currentPageIndex.value = newPage;
    if (isPdfLoaded.value) {
      await renderCurrentPdfPage();
    }
  }
}

async function confirmCancelDocumentOrder() {
  if (!currentJobId.value) {
    router.push("/");
    return;
  }
  if (
    confirm(
      `Cancel and discard order #${currentJobId.value}? Uploaded files will be purged from disk.`,
    )
  ) {
    await jobStore.cancelJob(currentJobId.value);
    router.push("/");
  }
}

async function dispatchDocumentPrint() {
  if (!documentName.value) return;
  isPrinting.value = true;
  errorMessage.value = null;
  spoolNotification.value = null;

  try {
    const inputFiles = uploadedFileState.value ? [uploadedFileState.value] : [];

    const res = await fetch("/api/operator/print/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: currentJobId.value || `doc_${Date.now()}`,
        state: {
          inputFiles,
          product: {
            paperSize: paperSize.value,
            isDuplex: duplexMode.value !== "ONE_SIDED",
          },
          layout: {
            copies: copies.value,
            pageRange: pageRangeInput.value,
            fitMode: fitMode.value,
            orientation: orientation.value,
          },
          options: {
            pricingMode: pricingMode.value,
            pageRange: pageRangeInput.value,
            copies: copies.value,
            fitMode: fitMode.value,
            orientation: orientation.value,
          },
          costing: {
            calculatedPrice: calculatedTotal.value,
            finalPrice: calculatedTotal.value,
          },
        },
      }),
      credentials: "include",
    });

    const data = await res.json();
    if (res.ok && data.success) {
      spoolNotification.value = `Document "${documentName.value}" (${effectivePageCount.value} pages, ₱${calculatedTotal.value.toFixed(2)}) dispatched directly to printer!`;
    } else {
      errorMessage.value =
        data.error ||
        "Failed to dispatch document. Please verify the printer is turned on and connected.";
    }
  } catch (err) {
    errorMessage.value = "Network error communicating with the print server.";
  } finally {
    isPrinting.value = false;
  }
}
</script>
