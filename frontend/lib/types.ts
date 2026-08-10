export type InvoiceStatus = "PENDING" | "PROCESSING" | "EXTRACTED" | "FAILED";

export interface Invoice {
  id: string;
  rawText: string;
  status: InvoiceStatus;
  vendor: string | null;
  amount: number | null;
  currency: string | null;
  dueDate: string | null;
  category: string | null;
  llmModel: string | null;
  llmLatencyMs: number | null;
  llmCostUsd: number | null;
  attempts: number;
  errorReason: string | null;
  createdAt: string;
  updatedAt: string;
}
