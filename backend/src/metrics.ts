import client from "prom-client";

// Default Node process metrics (CPU, memory, event loop lag) - "saturation" signal
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

export const invoicesProcessedTotal = new client.Counter({
  name: "invoices_processed_total",
  help: "Total invoices processed by outcome",
  labelNames: ["outcome"], // extracted | failed
  registers: [registry],
});

export const llmCallDuration = new client.Histogram({
  name: "llm_call_duration_seconds",
  help: "Duration of LLM extraction calls",
  labelNames: ["model", "outcome"],
  buckets: [0.5, 1, 2, 4, 8, 15, 30],
  registers: [registry],
});

export const llmCostTotal = new client.Counter({
  name: "llm_cost_usd_total",
  help: "Cumulative estimated LLM spend in USD",
  labelNames: ["model"],
  registers: [registry],
});

export const queueDepthGauge = new client.Gauge({
  name: "invoice_queue_depth",
  help: "Current number of jobs waiting in the invoice extraction queue",
  registers: [registry],
});
