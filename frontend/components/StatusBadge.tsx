import type { InvoiceStatus } from "@/lib/types";
import styles from "./StatusBadge.module.css";

const LABELS: Record<InvoiceStatus, string> = {
  PENDING: "pending",
  PROCESSING: "processing",
  EXTRACTED: "extracted",
  FAILED: "failed",
};

export default function StatusBadge({ status }: { status: InvoiceStatus }) {
  const isStamped = status === "EXTRACTED" || status === "FAILED";
  return (
    <span
      className={`${styles.badge} ${isStamped ? styles.stamped : ""}`}
      data-status={status}
    >
      {LABELS[status]}
    </span>
  );
}
