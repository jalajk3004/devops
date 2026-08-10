import type { Invoice, InvoiceStatus } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(
      `Can't reach the API at ${API_URL}. Is the backend running?`
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error?.toString() || `Request failed (${res.status})`, res.status);
  }

  return res.json() as Promise<T>;
}

export function submitInvoice(rawText: string) {
  return request<{ id: string; status: InvoiceStatus }>("/api/invoices", {
    method: "POST",
    body: JSON.stringify({ rawText }),
  });
}

export function listInvoices(status?: InvoiceStatus) {
  const qs = status ? `?status=${status}` : "";
  return request<Invoice[]>(`/api/invoices${qs}`);
}

export function getInvoice(id: string) {
  return request<Invoice>(`/api/invoices/${id}`);
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/healthz`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
