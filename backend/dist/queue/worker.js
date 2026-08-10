"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorker = startWorker;
const bullmq_1 = require("bullmq");
const queue_1 = require("./queue");
const client_1 = require("../db/client");
const extraction_1 = require("../services/extraction");
const metrics_1 = require("../metrics");
const logger_1 = require("../logger");
const MAX_ATTEMPTS = 3;
async function processInvoice(job) {
    const { invoiceId } = job.data;
    const invoice = await client_1.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    await client_1.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "PROCESSING", attempts: { increment: 1 } },
    });
    try {
        const result = await (0, extraction_1.extractInvoiceData)(invoice.rawText);
        await client_1.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status: "EXTRACTED",
                vendor: result.data.vendor,
                amount: result.data.amount,
                currency: result.data.currency,
                dueDate: new Date(result.data.dueDate),
                category: result.data.category,
                llmModel: result.model,
                llmLatencyMs: result.latencyMs,
                llmCostUsd: result.costUsd,
                errorReason: null,
            },
        });
        metrics_1.invoicesProcessedTotal.inc({ outcome: "extracted" });
        logger_1.logger.info({ invoiceId }, "invoice extraction succeeded");
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger_1.logger.error({ invoiceId, err: message }, "invoice extraction failed");
        await client_1.prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: "FAILED", errorReason: message },
        });
        metrics_1.invoicesProcessedTotal.inc({ outcome: "failed" });
        throw err; // let BullMQ apply its retry/backoff policy
    }
}
function startWorker() {
    const worker = new bullmq_1.Worker(queue_1.INVOICE_QUEUE_NAME, processInvoice, {
        connection: queue_1.connection,
        concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
    });
    worker.on("failed", (job, err) => {
        logger_1.logger.error({ jobId: job?.id, attemptsMade: job?.attemptsMade, err: err.message }, "job failed");
    });
    worker.on("completed", (job) => {
        logger_1.logger.info({ jobId: job.id }, "job completed");
    });
    return worker;
}
if (require.main === module) {
    logger_1.logger.info("invoice-triage worker starting");
    startWorker();
}
//# sourceMappingURL=worker.js.map