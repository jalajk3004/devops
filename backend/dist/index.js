"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pino_http_1 = __importDefault(require("pino-http"));
const logger_1 = require("./logger");
const invoices_1 = require("./routes/invoices");
const client_1 = require("./db/client");
const queue_1 = require("./queue/queue");
const metrics_1 = require("./metrics");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, pino_http_1.default)({ logger: logger_1.logger }));
// --- request duration metric middleware ---
app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on("finish", () => {
        const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
        metrics_1.httpRequestDuration.observe({ method: req.method, route: req.route?.path || req.path, status_code: String(res.statusCode) }, durationSec);
    });
    next();
});
// --- Kubernetes liveness probe: is the process alive? ---
app.get("/healthz", (_req, res) => res.status(200).json({ status: "ok" }));
// --- Kubernetes readiness probe: can it actually serve traffic? ---
app.get("/readyz", async (_req, res) => {
    try {
        await client_1.prisma.$queryRaw `SELECT 1`;
        const redisStatus = queue_1.connection.status;
        if (redisStatus !== "ready" && redisStatus !== "connecting") {
            throw new Error(`redis status: ${redisStatus}`);
        }
        res.status(200).json({ status: "ready" });
    }
    catch (err) {
        res.status(503).json({ status: "not ready", error: err.message });
    }
});
// --- Prometheus scrape target ---
app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", metrics_1.registry.contentType);
    res.end(await metrics_1.registry.metrics());
});
app.use("/api", invoices_1.invoiceRouter);
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
    logger_1.logger.info({ port }, "invoice-triage-agent API listening");
});
// Graceful shutdown so k8s rolling deploys don't drop in-flight requests
process.on("SIGTERM", async () => {
    logger_1.logger.info("SIGTERM received, shutting down gracefully");
    await client_1.prisma.$disconnect();
    process.exit(0);
});
//# sourceMappingURL=index.js.map