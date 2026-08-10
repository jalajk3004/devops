"use client";

import { useEffect, useState } from "react";
import { checkApiHealth } from "@/lib/api";
import styles from "./TopBar.module.css";

export default function TopBar() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const ok = await checkApiHealth();
      if (!cancelled) setOnline(ok);
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className={styles.bar}>
      <div className={styles.wordmark}>
        <span className={styles.wordmarkMain}>INVOICE TRIAGE</span>
        <span className={styles.wordmarkSub}>ledger console</span>
      </div>
      <div
        className={styles.pill}
        data-state={online === null ? "checking" : online ? "up" : "down"}
      >
        <span className={styles.dot} />
        {online === null ? "checking api" : online ? "api online" : "api unreachable"}
      </div>
    </header>
  );
}
