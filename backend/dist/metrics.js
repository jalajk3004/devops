"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueDepthGauge = exports.llmCostTotal = exports.llmCallDuration = exports.invoicesProcessedTotal = exports.httpRequestDuration = exports.registry = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
// Default Node process metrics (CPU, memory, event loop lag) - "saturation" signal
exports.registry = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({ register: exports.registry });
exports.httpRequestDuration = new prom_client_1.default.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [exports.registry],
});
exports.invoicesProcessedTotal = new prom_client_1.default.Counter({
    name: "invoices_processed_total",
    help: "Total invoices processed by outcome",
    labelNames: ["outcome"], // extracted | failed
    registers: [exports.registry],
});
exports.llmCallDuration = new prom_client_1.default.Histogram({
    name: "llm_call_duration_seconds",
    help: "Duration of LLM extraction calls",
    labelNames: ["model", "outcome"],
    buckets: [0.5, 1, 2, 4, 8, 15, 30],
    registers: [exports.registry],
});
exports.llmCostTotal = new prom_client_1.default.Counter({
    name: "llm_cost_usd_total",
    help: "Cumulative estimated LLM spend in USD",
    labelNames: ["model"],
    registers: [exports.registry],
});
exports.queueDepthGauge = new prom_client_1.default.Gauge({
    name: "invoice_queue_depth",
    help: "Current number of jobs waiting in the invoice extraction queue",
    registers: [exports.registry],
});
//# sourceMappingURL=metrics.js.map