import type { OptimizerInput, OptimizerResult } from "../model";

export interface OptimizationRequest {
  promise: Promise<OptimizerResult>;
  cancel: () => void;
}

let nextRequestId = 1;

export function requestOptimization(
  input: OptimizerInput,
): OptimizationRequest {
  const worker = new Worker(new URL("./optimizer.worker.ts", import.meta.url), {
    type: "module",
  });
  const requestId = nextRequestId++;
  let settled = false;
  let resolveResult!: (result: OptimizerResult) => void;
  const promise = new Promise<OptimizerResult>((resolve) => {
    resolveResult = resolve;
  });
  const finish = (result: OptimizerResult) => {
    if (settled) return;
    settled = true;
    worker.terminate();
    resolveResult(result);
  };
  worker.onmessage = (
    event: MessageEvent<{ requestId: number; result: OptimizerResult }>,
  ) => {
    if (event.data.requestId === requestId) finish(event.data.result);
  };
  worker.onerror = () => finish({ type: "error", message: "optimizer.worker" });
  worker.postMessage({ requestId, input });
  return {
    promise,
    cancel: () => finish({ type: "cancelled" }),
  };
}
