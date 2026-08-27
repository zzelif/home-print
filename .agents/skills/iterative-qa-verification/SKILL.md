---
name: iterative-qa-verification
description: >-
  Use this skill to execute multi-pass iterative verification, adversarial edge-case testing, and quality assurance audits across HomePrint OS.
---

# Iterative QA & Adversarial Verification Protocol

## Overview
This skill enforces structured, multi-pass validation to prevent premature task completion and guarantee production readiness on 4GB RAM hardware.

---

## 1. Multi-Pass Verification Cycle

```
┌────────────────────────────────────────────────────────────────────────┐
│                      5-STAGE VERIFICATION LOOP                         │
├────────────────────────────────────────────────────────────────────────┤
│ Pass 1: Type Checking & Compilation (`npm run build` in backend/front) │
│ Pass 2: Unit Mathematics & Transformation Tests (Vitest)               │
│ Pass 3: End-to-End Pipeline & Graph Integration Tests                  │
│ Pass 4: Adversarial Edge Case Probing (Corrupt, Password, High Load)   │
│ Pass 5: Memory & Resource Audit (Memory under 400MB on 4GB RAM)        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Adversarial Edge Case Checklist

Before marking any milestone or feature complete, explicitly test against these edge cases:

- [ ] **iPhone HEIC Photo Upload**: Ensure HEIC/HEIF photos are converted or accepted without unhandled exceptions.
- [ ] **Password-Protected PDF**: Ensure locked PDFs return a clear operator message instead of crashing `pdf-lib`.
- [ ] **Corrupted / 0-Byte Input File**: Ensure `FileValidationNode` cleanly catches empty files.
- [ ] **Zero-Gap Imposition Math**: Ensure bounding box coordinates have zero overlap and exact physical millimeter boundaries.
- [ ] **Frontend Canvas Preset Parity**: Verify Set 1, Set 2, Set 3, Set 4, and Polaroid all render distinct visual grids matching `PdfBuilderService`.
- [ ] **Anti-Stubbing Check**: Verify no placeholder `alert()` calls or mocked buttons remain in actionable user paths.
- [ ] **Printer Disconnect / Offline**: Ensure print dispatch returns a graceful `isOffline: true` payload without throwing 500 unhandled errors.
- [ ] **Sudden Power Disconnect Resilience**: Verify SQLite database operates with `WAL` mode and atomic transactions.
- [ ] **Unauthenticated Route Isolation**: Ensure `/api/operator/*` returns 401 when unauthenticated and `/drop` remains open.
- [ ] **Edge Host Resource Envelope**: Ensure idle memory stays $< 150\text{MB}$ and peak stays $< 400\text{MB}$ (verifiable on Raspberry Pi 4 / 4GB RAM).

---

## 3. Test Execution Runbook

1. Run all backend tests:
   ```bash
   cd backend && npm test
   ```
2. Build backend TypeScript:
   ```bash
   cd backend && npm run build
   ```
3. Build frontend Vite bundle:
   ```bash
   cd frontend && npm run build
   ```
4. Verify all tests pass with 0 warnings or unhandled rejections.
