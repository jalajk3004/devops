import { describe, it, expect, beforeAll } from "vitest";
import { extractInvoiceData, ExtractionSchema } from "../src/services/extraction";

describe("extractInvoiceData", () => {
  beforeAll(() => {
    process.env.LLM_PROVIDER = "mock";
  });

  it("returns data matching the extraction schema", async () => {
    const result = await extractInvoiceData("Invoice from Acme Supplies Inc. Amount: $1240.50");
    expect(() => ExtractionSchema.parse(result.data)).not.toThrow();
  });

  it("records latency and a non-negative cost estimate", async () => {
    const result = await extractInvoiceData("From: Test Vendor\nAmount Due: $100.00\n");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.costUsd).toBeGreaterThanOrEqual(0);
  });
});
