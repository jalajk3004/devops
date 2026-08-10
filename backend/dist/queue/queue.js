"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceQueue = exports.INVOICE_QUEUE_NAME = exports.connection = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
exports.connection = new ioredis_1.default(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
});
exports.INVOICE_QUEUE_NAME = "invoice-extraction";
exports.invoiceQueue = new bullmq_1.Queue(exports.INVOICE_QUEUE_NAME, { connection: exports.connection });
//# sourceMappingURL=queue.js.map