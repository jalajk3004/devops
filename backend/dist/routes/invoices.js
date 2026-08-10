"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("../db/client");
const queue_1 = require("../queue/queue");
exports.invoiceRouter = (0, express_1.Router)();
const SubmitSchema = zod_1.z.object({
    rawText: zod_1.z.string().min(10, "rawText looks too short to be a real invoice"),
});
exports.invoiceRouter.post("/invoices", async (req, res) => {
    const parseResult = SubmitSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }
    const invoice = await client_1.prisma.invoice.create({
        data: { rawText: parseResult.data.rawText, status: "PENDING" },
    });
    await queue_1.invoiceQueue.add("extract", { invoiceId: invoice.id }, {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 500,
        removeOnFail: 1000,
    });
    res.status(202).json({ id: invoice.id, status: invoice.status });
});
exports.invoiceRouter.get("/invoices/:id", async (req, res) => {
    const invoice = await client_1.prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice)
        return res.status(404).json({ error: "not found" });
    res.json(invoice);
});
exports.invoiceRouter.get("/invoices", async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const invoices = await client_1.prisma.invoice.findMany({
        where: status ? { status: status } : undefined,
        orderBy: { createdAt: "desc" },
        take: 50,
    });
    res.json(invoices);
});
//# sourceMappingURL=invoices.js.map