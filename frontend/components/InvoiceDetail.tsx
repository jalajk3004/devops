"use client";

import { useEffect, useState } from "react";
import type { Invoice } from "@/lib/types";
import { getInvoice } from "@/lib/api";
import StatusBadge from "./StatusBadge";
import styles from "./InvoiceDetail.module.css";

export default function InvoiceDetail({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(invoice);

  useEffect(() => {
    setCurrent(invoice);
    if (invoice.status === "PENDING" || invoice.status === "PROCESSING") {
      const interval = setInterval(async () => {
        try {
          const fresh = await getInvoice(invoice.id);
          setCurrent(fresh);
          if (fresh.status === "EXTRACTED" || fresh.status === "FAILED") {
            clearInterval(interval);
          }
        } catch {
          // silent - ledger polling will surface connectivity errors
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [invoice]);

  return (
    <>
      <div className={styles.scrim} onClick={onClose} />
      <div className={styles.drawer}>
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>invoice</span>
            <h2 className={`${styles.id} mono`}>{current.id}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.statusRow}>
          <StatusBadge status={current.status} />
          {current.status === "PROCESSING" && (
            <span className={styles.livePulse}>watching for result…</span>
          )}
        </div>

        {current.status === "FAILED" && current.errorReason && (
          <div className={styles.errorBox}>
            <span className={styles.eyebrow}>error</span>
            <p className="mono">{current.errorReason}</p>
            <p className={styles.attempts}>Attempts: {current.attempts}</p>
          </div>
        )}

        {current.status === "EXTRACTED" && (
          <div className={styles.fields}>
            <Field label="vendor" value={current.vendor} />
            <Field
              label="amount"
              value={
                current.amount != null
                  ? `${current.currency ?? ""} ${current.amount.toFixed(2)}`
                  : null
              }
            />
            <Field
              label="due date"
              value={current.dueDate ? new Date(current.dueDate).toLocaleDateString() : null}
            />
            <Field label="category" value={current.category} />
          </div>
        )}

        {(current.llmModel || current.llmLatencyMs != null) && (
          <div className={styles.llmMeta}>
            <span className={styles.eyebrow}>extraction metadata</span>
            <div className={styles.metaGrid}>
              <MetaItem label="model" value={current.llmModel ?? "—"} />
              <MetaItem
                label="latency"
                value={current.llmLatencyMs != null ? `${current.llmLatencyMs}ms` : "—"}
              />
              <MetaItem
                label="est. cost"
                value={current.llmCostUsd != null ? `$${current.llmCostUsd.toFixed(5)}` : "—"}
              />
              <MetaItem label="attempts" value={String(current.attempts)} />
            </div>
          </div>
        )}

        <div className={styles.rawSection}>
          <span className={styles.eyebrow}>raw text submitted</span>
          <pre className={`${styles.rawText} mono`}>{current.rawText}</pre>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value ?? "—"}</span>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={`${styles.metaValue} mono`}>{value}</span>
    </div>
  );
}
