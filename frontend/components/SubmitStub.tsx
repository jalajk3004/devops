"use client";

import { useState } from "react";
import { submitInvoice, ApiError } from "@/lib/api";
import styles from "./SubmitStub.module.css";

const SAMPLE_INVOICES = [
  `INVOICE #4471
From: Notion Labs Inc.
Bill To: Aurex Studio
Description: Notion Team Plan - Annual
Amount Due: $960.00 USD
Due Date: 2026-10-01`,
  `BSES Rajdhani Power Ltd - Electricity Bill
Consumer: Aurex Studio Office
Total Payable: INR 8,450.75
Due on or before 20-Sep-2026`,
];

export default function SubmitStub({ onSubmitted }: { onSubmitted: (id: string) => void }) {
  const [rawText, setRawText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rawText.trim().length < 10) {
      setError("Paste the full invoice text before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitInvoice(rawText);
      onSubmitted(result.id);
      setRawText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.stub}>
      <div className={styles.stubHeader}>
        <span className={styles.eyebrow}>submit for extraction</span>
        <button
          type="button"
          className={styles.sampleLink}
          onClick={() =>
            setRawText(SAMPLE_INVOICES[Math.floor(Math.random() * SAMPLE_INVOICES.length)])
          }
        >
          load sample
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <textarea
          className={styles.textarea}
          placeholder="Paste raw invoice text here..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={10}
        />

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.perforation} />

        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? "queuing…" : "queue for extraction →"}
        </button>
      </form>
    </div>
  );
}
