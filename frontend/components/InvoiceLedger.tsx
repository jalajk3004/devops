"use client";

import { useEffect, useState, useCallback } from "react";
import type { Invoice } from "@/lib/types";
import { listInvoices, ApiError } from "@/lib/api";
import StatusBadge from "./StatusBadge";
import styles from "./InvoiceLedger.module.css";

function formatAmount(invoice: Invoice) {
  if (invoice.amount == null) return "—";
  return `${invoice.currency ?? ""} ${invoice.amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
  })}`;
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  return `${diffHr}h ago`;
}

export default function InvoiceLedger({
  onSelect,
  refreshSignal,
}: {
  onSelect: (invoice: Invoice) => void;
  refreshSignal: number;
}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    try {
      const data = await listInvoices();
      setInvoices(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices, refreshSignal]);

  useEffect(() => {
    const hasActiveJobs = invoices.some(
      (inv) => inv.status === "PENDING" || inv.status === "PROCESSING"
    );
    if (!hasActiveJobs) return;
    const interval = setInterval(fetchInvoices, 3000);
    return () => clearInterval(interval);
  }, [invoices, fetchInvoices]);

  if (loading) {
    return <p className={styles.emptyState}>Loading ledger…</p>;
  }

  if (error) {
    return <p className={`${styles.emptyState} ${styles.errorState}`}>{error}</p>;
  }

  if (invoices.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No invoices yet.</p>
        <p className={styles.emptyHint}>Submit one on the left to see it move through the pipeline.</p>
      </div>
    );
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>id</th>
          <th>status</th>
          <th>vendor</th>
          <th>amount</th>
          <th>category</th>
          <th>updated</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((invoice) => (
          <tr key={invoice.id} onClick={() => onSelect(invoice)} className={styles.row}>
            <td className={`${styles.idCell} mono`}>{invoice.id.slice(0, 8)}</td>
            <td>
              <StatusBadge status={invoice.status} />
            </td>
            <td>{invoice.vendor ?? <span className={styles.dim}>—</span>}</td>
            <td className="mono">{formatAmount(invoice)}</td>
            <td>{invoice.category ?? <span className={styles.dim}>—</span>}</td>
            <td className={styles.dim}>{relativeTime(invoice.updatedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
