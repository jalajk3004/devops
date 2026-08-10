import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./logger";
import { invoiceRouter } from "./routes/invoices";
import { prisma } from "./db/client";
import { connection } from "./queue/queue";
import { registry, httpRequestDuration } from "./metrics";

const app = express();
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

// --- request duration metric middleware ---
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || req.path, status_code: String(res.statusCode) },
      durationSec
    );
  });
  next();
});

// --- Kubernetes liveness probe: is the process alive? ---
app.get("/healthz", (_req, res) => res.status(200).json({ status: "ok" }));

// --- Kubernetes readiness probe: can it actually serve traffic? ---
app.get("/readyz", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisStatus = connection.status;
    if (redisStatus !== "ready" && redisStatus !== "connecting") {
      throw new Error(`redis status: ${redisStatus}`);
    }
    res.status(200).json({ status: "ready" });
  } catch (err) {
    res.status(503).json({ status: "not ready", error: (err as Error).message });
  }
});

// --- Prometheus scrape target ---
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});

app.use("/api", invoiceRouter);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  logger.info({ port }, "invoice-triage-agent API listening");
});

// Graceful shutdown so k8s rolling deploys don't drop in-flight requests
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});
