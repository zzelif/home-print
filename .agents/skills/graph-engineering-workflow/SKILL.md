---
name: graph-engineering-workflow
description: >-
  Use this skill when developing, refactoring, or testing graph-based execution pipelines, state machines, and node workflows in HomePrint OS.
---

# Graph Engineering & Node Pipeline Workflow

## Overview
HomePrint OS processes all print jobs through a directed, stateful pipeline. Every operation (file ingestion, validation, document conversion, costing freeze, 300 DPI vector PDF rasterization, preflight verification, CUPS dispatch, and auto-purge) is modeled as a discrete, testable `GraphNode` operating on `SharedPrintJobState`.

---

## 1. Node Execution Contract

Every graph node must implement the `GraphNode<SharedPrintJobState, SharedPrintJobState>` interface:

```typescript
export interface GraphNode<TInput, TOutput> {
  name: string;
  execute(input: TInput, context?: GraphExecutionContext): Promise<TOutput>;
}
```

### Node Rules:
1. **Purity of State**: Read from `state`, mutate strictly defined fields, and return `state`.
2. **Preflight Error Trapping**: If a validation or execution fails, push descriptive, user-friendly messages to `state.preflightVerdict.errors` and set `state.preflightVerdict.passed = false`.
3. **No Uncaught Exceptions**: Handle internal exceptions gracefully within `execute()`, recording telemetry and error logs before propagating to the graph runner.
4. **Compensation / Rollback**: If a downstream node fails (e.g. CUPS rejects spool file), the graph runner must execute cleanup on temporary generated files.
5. **Gated Lifecycle & Purge**: Auto-purge nodes must manage ephemeral file cleanup and respect the 1-hour reprint grace period.
6. **Frontend-Backend Preset Parity**: All presets defined in `PdfBuilderService` (`SET_1`, `SET_2`, `SET_3`, `SET_4`, `POLAROID`) must have exact 1:1 visual slot representations in the frontend canvas.
7. **Anti-Stubbing Standard**: Graph nodes must never be empty passthroughs without executing their designated purpose or logging structured status.

---

## 2. Standard Print Pipeline DAG Structure

```
[ Ingest & Public Drop ]
          │
          ▼
[ 1. FileValidationNode ] ──► (Invalid / Corrupted?) ──► [ Reject & Prompt ]
          │ (Valid)
          ▼
[ 2. DocumentConversionNode ] (LibreOffice Headless / Sharp Image Normalizer)
          │
          ▼
[ 3. OrderFreezeGateNode ] (Freezes reactive pricing & locks transaction amount)
          │
          ▼
[ 4. PdfCompositorNode ] (300 DPI Vector PDF Engine with Millimeter Math & Crop Offsets)
          │
          ▼
[ 5. PreflightVerifierNode ] (Size, bounds, and corrupt file gate)
          │
          ├──► (Failed Preflight) ──► [ Halt & Notify Operator ]
          │
          ▼ (Passed)
[ 6. CupsDispatchNode ] (Direct CUPS / Windows Hardware Spooler)
          │
          ▼
[ 7. SpoolMonitorLoop ] (Live telemetry polling until COMPLETED)
          │
          ▼
[ 8. GatedPurgeNode ] (1-Hour Privacy Grace Period & 1-Click Reprint Resilience)
```

---

## 3. Step-by-Step Implementation Procedure

1. **Define/Update State Fields**: Update `backend/src/nodes/types.ts` if new properties are needed.
2. **Implement Node Class**: Create or update node in `backend/src/nodes/print-graph.ts`.
3. **Wire Node into Graph Orchestrator**: Ensure the node is registered and executed within `PrintWorkflowGraph`.
4. **Connect Graph to Fastify Route**: Update route handlers in `backend/src/routes/` to invoke the graph runner.
5. **Add Vitest Integration Test**: Add an end-to-end test in `backend/tests/` exercising the full graph pipeline.
6. **Verify WebSocket Broadcast**: Verify that state changes emit `JOB_STATE_CHANGED` events to the frontend.
