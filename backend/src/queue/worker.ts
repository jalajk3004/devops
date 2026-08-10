import { Worker, Job } from "bullmq";
import { connection, INVOICE_QUEUE_NAME, InvoiceJobData } from "./queue";
import { prisma } from "../db/client";
import { extractInvoiceData } from "../services/extraction";
import { invoicesProcessedTotal } from "../metrics";
import { logger } from "../logger";

const MAX_ATTEMPTS = 3;

async function processInvoice(job: Job<InvoiceJobData>) {
  const { invoiceId } = job.data;
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "PROCESSING", attempts: { increment: 1 } },
  });

  try {
    const result = await extractInvoiceData(invoice.rawText);

    await prisma.invoice.update({
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

    invoicesProcessedTotal.inc({ outcome: "extracted" });
    logger.info({ invoiceId }, "invoice extraction succeeded");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ invoiceId, err: message }, "invoice extraction failed");

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "FAILED", errorReason: message },
    });

    invoicesProcessedTotal.inc({ outcome: "failed" });
    throw err; // let BullMQ apply its retry/backoff policy
  }
}

export function startWorker() {
  const worker = new Worker<InvoiceJobData>(INVOICE_QUEUE_NAME, processInvoice, {
    connection,
    concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, attemptsMade: job?.attemptsMade, err: err.message },
      "job failed"
    );
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "job completed");
  });

  return worker;
}

if (require.main === module) {
  logger.info("invoice-triage worker starting");
  startWorker();
}
