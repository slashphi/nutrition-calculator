/// <reference lib="webworker" />

import type { OptimizerInput } from "../model";
import { optimizePlan } from "./optimizePlan";

interface Request {
  requestId: number;
  input: OptimizerInput;
}

self.onmessage = (event: MessageEvent<Request>) => {
  const { requestId, input } = event.data;
  self.postMessage({ requestId, result: optimizePlan(input) });
};

export {};
