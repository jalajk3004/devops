import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const INVOICE_QUEUE_NAME = "invoice-extraction";

export const invoiceQueue = new Queue(INVOICE_QUEUE_NAME, { connection });

export interface InvoiceJobData {
  invoiceId: string;
}
