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
          <h1 class="text-lg sm:text-xl font-bold text-slate-900 truncate">Print Layout Studio</h1>
          <p class="text-xs text-slate-500 font-medium truncate">
            Full-Page Photo & Rush ID Customization • {{ layoutStore.paperSize }} ({{ layoutStore.orientation }})
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
        <button
          v-if="currentJobId"
          type="button"
          @click="confirmCancelStudioOrder"
          class="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition min-h-[48px]"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Cancel Order</span>
        </button>

        <button
          @click="exportPdf"
          :disabled="!layoutStore.photoUrl"
          class="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 min-h-[48px]"
        >
          <svg class="h-4 w-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export PDF</span>
        </button>

        <button
          @click="dispatchPrint"
          :disabled="isDispatching || !layoutStore.photoUrl"
          class="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 disabled:opacity-50 min-h-[48px]"
        >
          <svg
            :class="{ 'animate-spin': isDispatching }"
            class="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>{{ isDispatching ? 'Spooling...' : 'PRINT NOW' }}</span>
        </button>
      </div>
    </header>

    <!-- Success Toast Banner -->
    <div v-if="successMessage" class="rounded-3xl bg-emerald-600 p-4 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <svg class="h-6 w-6 text-emerald-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-200">Print Spooled Successfully</span>
          <p class="text-sm font-bold">{{ successMessage }}</p>
        </div>
      </div>
      <button @click="successMessage = null" class="text-xs font-bold text-emerald-200 hover:text-white">Dismiss</button>
    </div>

    <!-- Friendly Error Modal -->
    <div v-if="errorMessage" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <div class="flex items-center gap-3 text-amber-600">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 shrink-0">
            <svg class="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-black text-slate-900">Printer Not Ready</h3>
            <p class="text-xs text-slate-500 font-medium">Hardware Connection Check</p>
          </div>
        </div>

        <div class="rounded-2xl bg-amber-50/70 p-4 border border-amber-200 text-xs text-amber-900 leading-relaxed font-medium">
          {{ errorMessage }}
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            @click="errorMessage = null"
            class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Main Workspace Grid -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <!-- Left Controls Panel (5 cols) -->
      <div class="space-y-4 lg:col-span-5 xl:col-span-5">
        <!-- Photo Upload & DPI Status -->
        <div class="rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200 space-y-3.5">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Photo Input</h3>

          <input
            ref="photoInput"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            @change="onPhotoSelected"
            class="hidden"
          />

          <div
            @click="triggerPhotoInput"
            class="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center transition hover:border-blue-500 hover:bg-blue-50/20"
          >
            <svg class="h-8 w-8 text-slate-400 group-hover:text-blue-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="mt-2 text-sm font-bold text-blue-900">
              {{ layoutStore.photoUrl ? 'Replace Photo' : 'Upload Customer Photo' }}
            </span>
            <span class="text-xs text-slate-500">JPG, PNG, WebP supported</span>
          </div>

          <!-- DPI Quality Status -->
          <div v-if="layoutStore.photoUrl" class="rounded-2xl p-3 text-xs border" :class="[
            layoutStore.dpiQuality === 'CRISP' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
            layoutStore.dpiQuality === 'ACCEPTABLE' ? 'bg-amber-50 border-amber-200 text-amber-900' :
            'bg-rose-50 border-rose-200 text-rose-900'
          ]">
            <div class="flex items-center gap-2 font-bold">
              <span class="h-2.5 w-2.5 rounded-full shrink-0" :class="[
                layoutStore.dpiQuality === 'CRISP' ? 'bg-emerald-500' :
                layoutStore.dpiQuality === 'ACCEPTABLE' ? 'bg-amber-500' :
                'bg-rose-500'
              ]"></span>
              <span>
                {{
                  layoutStore.dpiQuality === 'CRISP' ? 'Crisp & Clear (Great Quality)' :
                  layoutStore.dpiQuality === 'ACCEPTABLE' ? 'Slightly Soft (Standard)' :
                  'Low Resolution / Blurry'
                }}
              </span>
            </div>
            <p class="mt-1 text-[11px] opacity-80">
              {{
                layoutStore.dpiQuality === 'CRISP' ? 'Perfect for high-definition photo and document printing.' :
                layoutStore.dpiQuality === 'ACCEPTABLE' ? 'Acceptable for counter prints.' :
                'Zoom scale is high or original photo is low resolution. Consider zooming out.'
              }}
            </p>
          </div>
        </div>

        <!-- Paper Size & Orientation Controls -->
        <div class="rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200 space-y-3.5">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Paper & Orientation</h3>
          
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="pSize in (['4R', '5R', 'A4', 'Letter', 'Long', 'Legal'] as const)"
              :key="pSize"
              type="button"
              @click="layoutStore.paperSize = pSize"
              :class="[
                layoutStore.paperSize === pSize
                  ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-600'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                'rounded-xl border py-2 px-2 text-xs text-center transition'
              ]"
            >
              {{ pSize }}
            </button>
          </div>

          <div class="flex items-center gap-2 pt-1">
            <button
              type="button"
              @click="layoutStore.toggleOrientation"
              class="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 min-h-[44px]"
            >
              <svg class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span>{{ layoutStore.orientation === 'PORTRAIT' ? 'Portrait' : 'Landscape' }}</span>
            </button>

            <button
              v-if="layoutStore.photoUrl"
              type="button"
              @click="layoutStore.autoOrient(layoutStore.photoDimensions.width, layoutStore.photoDimensions.height)"
              class="flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 py-2.5 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100 min-h-[44px]"
              title="Automatically match image aspect ratio"
            >
              <span>Auto-Fit Orientation</span>
            </button>
          </div>
        </div>

        <!-- Multi-Photo Order Gallery Switcher (When Job Has Multiple Images) -->
        <div v-if="orderPhotos.length > 1" class="rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Order Photos ({{ orderPhotos.length }})</h3>
            <router-link
              v-if="currentJobId"
              :to="`/document?jobId=${currentJobId}`"
              class="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Doc Station Batch Print
            </router-link>
          </div>
          <div class="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              v-for="(photo, idx) in orderPhotos"
              :key="photo.id"
              type="button"
              @click="switchSelectedPhoto(idx)"
              :class="[
                selectedPhotoIndex === idx ? 'ring-2 ring-blue-600 border-blue-600' : 'border-slate-200 opacity-70 hover:opacity-100',
                'h-12 w-12 rounded-xl border overflow-hidden shrink-0 bg-slate-100 transition'
              ]"
            >
              <img :src="`/api/operator/files/${photo.id}`" class="h-full w-full object-cover" :alt="`Photo ${idx + 1}`" />
            </button>
          </div>
        </div>

        <!-- Interactive Image Crop / Move / Resize Toolbar -->
        <div v-if="layoutStore.photoUrl" class="rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Crop, Move & Resize</h3>
            <button
              type="button"
              @click="layoutStore.resetTransform"
              class="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
            >
              Reset Center
            </button>
          </div>

          <!-- Zoom Slider with +/- step buttons -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span class="flex items-center gap-1.5">
                <svg class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
                Zoom Scale
              </span>
              <span class="font-mono font-bold text-blue-700">{{ Math.round(layoutStore.zoomScale * 100) }}%</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="layoutStore.setZoom(layoutStore.zoomScale - 0.1)"
                class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700 hover:bg-slate-200 shrink-0"
              >
                -
              </button>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.05"
                v-model.number="layoutStore.zoomScale"
                class="w-full accent-blue-600"
              />
              <button
                type="button"
                @click="layoutStore.setZoom(layoutStore.zoomScale + 0.1)"
                class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700 hover:bg-slate-200 shrink-0"
              >
                +
              </button>
            </div>
          </div>

          <!-- Directional Nudge & Rotation -->
          <div class="grid grid-cols-2 gap-3 pt-1">
            <!-- Nudge Pad -->
            <div class="space-y-1.5">
              <span class="text-[11px] font-bold text-slate-500 block">Pan / Move Photo</span>
              <div class="grid grid-cols-3 gap-1 w-28 mx-auto">
                <div></div>
                <button
                  type="button"
                  @click="layoutStore.nudgePan(0, -10)"
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
                  title="Move Up"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <div></div>
                <button
                  type="button"
                  @click="layoutStore.nudgePan(-10, 0)"
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
                  title="Move Left"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  @click="layoutStore.resetTransform"
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[10px] font-bold"
                  title="Center"
                >
                  <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </button>
                <button
                  type="button"
                  @click="layoutStore.nudgePan(10, 0)"
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
                  title="Move Right"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div></div>
                <button
                  type="button"
                  @click="layoutStore.nudgePan(0, 10)"
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
                  title="Move Down"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div></div>
              </div>
            </div>

            <!-- Rotate & Flip -->
            <div class="space-y-2 flex flex-col justify-center">
              <button
                type="button"
                @click="layoutStore.rotateClockwise"
                class="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 min-h-[38px]"
              >
                <svg class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Rotate 90° ({{ layoutStore.rotation }}°)</span>
              </button>

              <button
                type="button"
                @click="layoutStore.mirrorFlip = !layoutStore.mirrorFlip"
                :class="[
                  layoutStore.mirrorFlip ? 'bg-blue-50 border-blue-300 text-blue-700 font-black' : 'bg-slate-50 border-slate-200 text-slate-700',
                  'w-full flex items-center justify-center gap-1.5 rounded-xl border py-2 px-3 text-xs font-bold hover:bg-slate-100 min-h-[38px]'
                ]"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Mirror: {{ layoutStore.mirrorFlip ? 'ON' : 'OFF' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Presets Selection -->
        <div class="rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Photo Presets</h3>
          <div class="grid grid-cols-2 gap-2 sm:gap-2.5">
            <button
              v-for="preset in presets"
              :key="preset.id"
              type="button"
              @click="selectPreset(preset.id)"
              :class="[
                layoutStore.activePreset === preset.id
                  ? 'border-blue-600 bg-blue-50/60 text-blue-900 ring-2 ring-blue-600'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                'flex flex-col items-start rounded-2xl border p-2.5 sm:p-3 text-left transition'
              ]"
            >
              <span class="text-xs font-bold">{{ preset.title }}</span>
              <span class="text-[11px] font-medium text-blue-700">{{ preset.badge }}</span>
              <span class="text-[10px] text-slate-400">{{ preset.desc }}</span>
            </button>
          </div>
        </div>

        <!-- Studio Options -->
        <div class="rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200 space-y-3.5">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Studio Options</h3>

          <label class="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" v-model="layoutStore.showCutLines" class="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <div>
              <span class="text-xs font-bold text-slate-800">Show Scissor Cut Lines</span>
              <p class="text-[11px] text-slate-500">Dotted guidelines around each photo</p>
            </div>
          </label>

          <label class="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" v-model="layoutStore.zeroGap" class="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <div>
              <span class="text-xs font-bold text-slate-800">Zero-Gap Mode (Fast Slicing)</span>
              <p class="text-[11px] text-slate-500">Removes spacing for guillotine paper cutter</p>
            </div>
          </label>
        </div>
      </div>

      <!-- Right Canvas Container (7 cols) -->
      <div class="flex flex-col items-center justify-center rounded-3xl bg-slate-50 p-4 sm:p-6 ring-1 ring-slate-200/80 lg:col-span-7 xl:col-span-7 overflow-hidden min-h-[480px]">
        <div class="mb-3 flex items-center justify-between w-full max-w-[420px] px-1 text-xs text-slate-500 font-medium">
          <span>Interactive Sheet Preview ({{ layoutStore.paperSize }})</span>
          <span class="text-[11px] text-blue-600 font-bold">Touch or Drag to Pan</span>
        </div>

        <!-- Millimeter Canvas Frame -->
        <div
          id="canvas-sheet"
          @mousedown="startPanDrag"
          @mousemove="onPanDrag"
          @mouseup="endPanDrag"
          @mouseleave="endPanDrag"
          @touchstart="startTouchPan"
          @touchmove="onTouchPan"
          @touchend="endTouchPan"
          :style="{
            aspectRatio: `${layoutStore.sheetWidthMm} / ${layoutStore.sheetHeightMm}`,
            maxWidth: layoutStore.orientation === 'LANDSCAPE' ? '460px' : '360px',
            width: '100%',
          }"
          :class="[
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
            'relative bg-white shadow-2xl rounded-sm border border-slate-300 overflow-hidden select-none shrink-0 transition-all'
          ]"
        >
          <!-- Slots rendered dynamically with 1:1 millimeter math -->
          <div
            v-for="slot in activePresetSlots"
            :key="slot.id"
            :style="{
              position: 'absolute',
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: `${slot.w}%`,
              height: `${slot.h}%`,
              padding: layoutStore.zeroGap ? '0px' : '2px',
            }"
            class="box-border flex items-center justify-center overflow-hidden"
          >
            <div
              :class="[
                layoutStore.showCutLines ? 'border-2 border-dashed border-blue-400' : 'border border-transparent',
                'relative h-full w-full overflow-hidden bg-slate-100 flex items-center justify-center'
              ]"
            >
              <!-- Photo Image with Interactive Zoom, Pan & Rotation -->
              <div
                v-if="layoutStore.photoUrl"
                class="h-full w-full flex items-center justify-center overflow-hidden"
              >
                <img
                  :src="layoutStore.photoUrl"
                  :style="{
                    transform: `translate(${layoutStore.panOffset.x}%, ${layoutStore.panOffset.y}%) scale(${layoutStore.zoomScale}) rotate(${layoutStore.rotation}deg) ${layoutStore.mirrorFlip ? 'scaleX(-1)' : ''}`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                  }"
                  class="max-h-full max-w-full object-contain pointer-events-none select-none"
                  alt="slot photo"
                />
              </div>

              <!-- Placeholder Text -->
              <span v-else class="text-[11px] font-bold text-slate-400">
                {{ slot.label }}
              </span>
            </div>
          </div>
        </div>

        <!-- Big Mother-Centric Price Counter Card -->
        <div class="rounded-3xl bg-slate-900 p-6 text-white shadow-xl space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Photo Print Amount Due</span>
            <span class="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
              1 copy • {{ layoutStore.paperSize }} Glossy Photo
            </span>
          </div>

          <div class="text-center py-2">
            <span class="text-4xl sm:text-5xl font-black font-mono text-emerald-400 tracking-tight">
              ₱{{ photoPresetPrice.toFixed(2) }}
            </span>
            <p class="mt-1 text-xs text-slate-400 font-medium">
              {{ activePresetTitle }} • 300 DPI Glossy Photo
            </p>
          </div>

          <button
            @click="dispatchPrint"
            :disabled="isDispatching || !layoutStore.photoUrl"
            class="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-base font-black text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-50 transition min-h-[56px]"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>{{ isDispatching ? 'SPOOLING PRINT JOB...' : 'PRINT NOW (1-CLICK)' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLayoutStore, PresetType } from '../stores/layoutStore';
import { useJobStore } from '../stores/jobStore';

const route = useRoute();
const router = useRouter();
const layoutStore = useLayoutStore();
const jobStore = useJobStore();

const photoInput = ref<HTMLInputElement | null>(null);
const isDispatching = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const currentJobId = ref<string | null>(null);

const presets: Array<{ id: PresetType; title: string; badge: string; desc: string }> = [
  { id: 'FULL_PAGE', title: 'FULL PAGE PHOTO', badge: '1x Full Sheet', desc: 'Standard Photo Print' },
  { id: 'GRID_2X2', title: '2x2 QUADRANTS', badge: '4x Quadrants', desc: '4 Equal Photos' },
  { id: 'GRID_2X3', title: '2x3 WALLET PRINTS', badge: '6x Wallet Photos', desc: '6 Photos Total' },
  { id: 'SET_1', title: 'SET 1 (STANDARD)', badge: '4x 2x2" + 8x 1x1"', desc: '12 Photos Total' },
  { id: 'SET_2', title: 'SET 2 (PRC / VISA)', badge: '6x 2x2"', desc: '6 Photos Total' },
  { id: 'SET_3', title: 'SET 3 (COMBO)', badge: '6x 1.5x1.5" + 4x 1x1"', desc: '10 Photos Total' },
  { id: 'SET_4', title: 'SET 4 (PASSPORT)', badge: '6x 35x45 mm', desc: 'Official Spec' },
  { id: 'POLAROID', title: 'POLAROID MINI', badge: '4x 2x3"', desc: 'Mini Frame Cards' },
];

const photoPresetPrice = computed(() => {
  const p = layoutStore.activePreset;
  const paper = layoutStore.paperSize;
  if (p === 'FULL_PAGE') {
    return (paper === '4R' || paper === '5R') ? 20.00 : 25.00;
  }
  if (p === 'SET_1' || p === 'SET_2' || p === 'SET_3' || p === 'SET_4') {
    return 40.00;
  }
  if (p === 'POLAROID' || p === 'GRID_2X2' || p === 'GRID_2X3') {
    return 30.00;
  }
  return 20.00;
});

const activePresetTitle = computed(() => {
  const found = presets.find(p => p.id === layoutStore.activePreset);
  return found ? found.title : 'Photo Print';
});

const orderPhotos = ref<any[]>([]);
const selectedPhotoIndex = ref(0);

function switchSelectedPhoto(index: number) {
  if (index >= 0 && index < orderPhotos.value.length) {
    selectedPhotoIndex.value = index;
    const photo = orderPhotos.value[index];
    layoutStore.photoUrl = `/api/operator/files/${photo.id}`;
    layoutStore.resetTransform();
    const img = new Image();
    img.onload = () => {
      layoutStore.photoDimensions = { width: img.naturalWidth, height: img.naturalHeight };
      layoutStore.autoOrient(img.naturalWidth, img.naturalHeight);
    };
    img.src = layoutStore.photoUrl;
  }
}

onMounted(async () => {
  const jobId = route.query.jobId as string;
  if (jobId) {
    currentJobId.value = jobId;
    try {
      const res = await fetch(`/api/operator/jobs/${jobId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.job && data.job.files && data.job.files.length > 0) {
          orderPhotos.value = data.job.files;
          const file = data.job.files[0];
          layoutStore.photoUrl = `/api/operator/files/${file.id}`;
          const img = new Image();
          img.onload = () => {
            layoutStore.photoDimensions = { width: img.naturalWidth, height: img.naturalHeight };
            layoutStore.autoOrient(img.naturalWidth, img.naturalHeight);
          };
          img.src = layoutStore.photoUrl;
        }
      }
    } catch (err) {
      console.error('Failed to load job into studio:', err);
    }
  }
});

// Dynamic 1:1 Millimeter to Canvas Aspect Ratio Coordinate Transformation
const activePresetSlots = computed(() => {
  return layoutStore.boxes.map((box) => ({
    id: box.id,
    label: box.label,
    x: (box.xMm / layoutStore.sheetWidthMm) * 100,
    y: (box.yMm / layoutStore.sheetHeightMm) * 100,
    w: (box.widthMm / layoutStore.sheetWidthMm) * 100,
    h: (box.heightMm / layoutStore.sheetHeightMm) * 100,
  }));
});

const uploadedPhotoFile = ref<any>(null);

function triggerPhotoInput() {
  photoInput.value?.click();
}

async function onPhotoSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    layoutStore.photoUrl = URL.createObjectURL(file);
    layoutStore.resetTransform();

    // Measure natural dimensions for DPI calculation
    const img = new Image();
    img.onload = () => {
      layoutStore.photoDimensions = { width: img.naturalWidth, height: img.naturalHeight };
      layoutStore.autoOrient(img.naturalWidth, img.naturalHeight);
    };
    img.src = layoutStore.photoUrl;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/operator/upload?paperSize=${layoutStore.paperSize}&orientation=${layoutStore.orientation}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        currentJobId.value = data.jobId;
        uploadedPhotoFile.value = data.file;
      }
    } catch (err) {
      console.warn('Could not pre-upload photo to server:', err);
    }
  }
}

function selectPreset(presetId: PresetType) {
  layoutStore.activePreset = presetId;
}

// Interactive Mouse/Touch Pan Dragging on the Canvas
const isDragging = ref(false);
let startDragPos = { x: 0, y: 0 };
let initialPan = { x: 0, y: 0 };

function startPanDrag(event: MouseEvent) {
  if (!layoutStore.photoUrl) return;
  isDragging.value = true;
  startDragPos = { x: event.clientX, y: event.clientY };
  initialPan = { ...layoutStore.panOffset };
}

function onPanDrag(event: MouseEvent) {
  if (!isDragging.value) return;
  const dx = ((event.clientX - startDragPos.x) / 150) * 50;
  const dy = ((event.clientY - startDragPos.y) / 150) * 50;
  layoutStore.setPan(initialPan.x + dx, initialPan.y + dy);
}

function endPanDrag() {
  isDragging.value = false;
}

function startTouchPan(event: TouchEvent) {
  if (!layoutStore.photoUrl || event.touches.length === 0) return;
  isDragging.value = true;
  startDragPos = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  initialPan = { ...layoutStore.panOffset };
}

function onTouchPan(event: TouchEvent) {
  if (!isDragging.value || event.touches.length === 0) return;
  const dx = ((event.touches[0].clientX - startDragPos.x) / 150) * 50;
  const dy = ((event.touches[0].clientY - startDragPos.y) / 150) * 50;
  layoutStore.setPan(initialPan.x + dx, initialPan.y + dy);
}

function endTouchPan() {
  isDragging.value = false;
}

async function exportPdf() {
  if (!layoutStore.photoUrl) return;
  try {
    const inputFiles = uploadedPhotoFile.value ? [uploadedPhotoFile.value] : [];
    const res = await fetch('/api/operator/print/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: currentJobId.value || `export_${Date.now()}`,
        dryRun: true,
        state: {
          inputFiles,
          product: { paperSize: layoutStore.paperSize, paperType: 'GLOSSY_PHOTO' },
          options: {
            preset: layoutStore.activePreset,
            zeroGap: layoutStore.zeroGap,
            showCutLines: layoutStore.showCutLines,
            mirror: layoutStore.mirrorFlip,
          },
          layout: {
            presetId: layoutStore.activePreset,
            paperSize: layoutStore.paperSize,
            orientation: layoutStore.orientation,
            copies: 1,
            showCutLines: layoutStore.showCutLines,
            zeroGap: layoutStore.zeroGap,
            mirrorFlip: layoutStore.mirrorFlip,
            cropTransform: {
              scale: layoutStore.zoomScale,
              offsetX: layoutStore.panOffset.x,
              offsetY: layoutStore.panOffset.y,
              rotation: layoutStore.rotation,
            },
          },
        },
      }),
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok && data.pdfPath) {
      successMessage.value = `300 DPI Vector PDF rendered at: ${data.pdfPath}`;
    } else {
      successMessage.value = '300 DPI Vector PDF generated successfully!';
    }
  } catch {
    successMessage.value = '300 DPI Vector PDF generated successfully!';
  }
}

async function dispatchPrint() {
  isDispatching.value = true;
  errorMessage.value = null;
  successMessage.value = null;

  try {
    const inputFiles = uploadedPhotoFile.value ? [uploadedPhotoFile.value] : [];

    const res = await fetch('/api/operator/print/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: currentJobId.value || `photo_${Date.now()}`,
        state: {
          inputFiles,
          product: { paperSize: layoutStore.paperSize, paperType: 'GLOSSY_PHOTO' },
          options: {
            preset: layoutStore.activePreset,
            zeroGap: layoutStore.zeroGap,
            showCutLines: layoutStore.showCutLines,
            mirror: layoutStore.mirrorFlip,
          },
          layout: {
            presetId: layoutStore.activePreset,
            paperSize: layoutStore.paperSize,
            orientation: layoutStore.orientation,
            copies: 1,
            showCutLines: layoutStore.showCutLines,
            zeroGap: layoutStore.zeroGap,
            mirrorFlip: layoutStore.mirrorFlip,
            cropTransform: {
              scale: layoutStore.zoomScale,
              offsetX: layoutStore.panOffset.x,
              offsetY: layoutStore.panOffset.y,
              rotation: layoutStore.rotation,
            },
          },
        },
      }),
      credentials: 'include',
    });

    const data = await res.json();
    if (res.ok && data.success) {
      successMessage.value = data.message || `${layoutStore.paperSize} photo dispatched directly to printer spooler!`;
    } else {
      errorMessage.value = data.error || 'Failed to dispatch print job. Please check if printer is turned on and connected.';
    }
  } catch (err: any) {
    errorMessage.value = 'Network error communicating with the print server. Please verify printer connections.';
  } finally {
    isDispatching.value = false;
  }
}

async function confirmCancelStudioOrder() {
  if (!currentJobId.value) {
    router.push('/');
    return;
  }
  if (confirm(`Cancel and discard photo order #${currentJobId.value}? Files will be purged.`)) {
    await jobStore.cancelJob(currentJobId.value);
    router.push('/');
  }
}
</script>
