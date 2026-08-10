import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { invoiceQueue } from "../queue/queue";

export const invoiceRouter = Router();

const SubmitSchema = z.object({
  rawText: z.string().min(10, "rawText looks too short to be a real invoice"),
});

invoiceRouter.post("/invoices", async (req, res) => {
  const parseResult = SubmitSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const invoice = await prisma.invoice.create({
    data: { rawText: parseResult.data.rawText, status: "PENDING" },
  });

  await invoiceQueue.add(
    "extract",
    { invoiceId: invoice.id },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 500,
      removeOnFail: 1000,
    }
  );

  res.status(202).json({ id: invoice.id, status: invoice.status });
});

invoiceRouter.get("/invoices/:id", async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) return res.status(404).json({ error: "not found" });
  res.json(invoice);
});

invoiceRouter.get("/invoices", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const invoices = await prisma.invoice.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(invoices);
});
