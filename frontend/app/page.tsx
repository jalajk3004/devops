"use client";

import { useState } from "react";
import type { Invoice } from "@/lib/types";
import TopBar from "@/components/TopBar";
import SubmitStub from "@/components/SubmitStub";
import InvoiceLedger from "@/components/InvoiceLedger";
import InvoiceDetail from "@/components/InvoiceDetail";
import styles from "./page.module.css";

export default function Home() {
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <>
      <TopBar />
      <main className={styles.main}>
        <section className={styles.submitCol}>
          <SubmitStub onSubmitted={() => setRefreshSignal((n) => n + 1)} />
        </section>

        <section className={styles.ledgerCol}>
          <div className={styles.ledgerHeader}>
            <span className={styles.ledgerTitle}>ledger</span>
            <span className={styles.ledgerHint}>click a row for extraction detail</span>
          </div>
          <InvoiceLedger onSelect={setSelected} refreshSignal={refreshSignal} />
        </section>
      </main>

      {selected && <InvoiceDetail invoice={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
