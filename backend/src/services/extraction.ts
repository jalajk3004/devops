import { z } from "zod";
import { llmCallDuration, llmCostTotal } from "../metrics";
import { logger } from "../logger";

export const ExtractionSchema = z.object({
  vendor: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  dueDate: z.string(), // ISO date string
  category: z.enum([
    "software",
    "utilities",
    "professional_services",
    "logistics",
    "office_supplies",
    "other",
  ]),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

export interface ExtractionResult {
  data: Extraction;
  model: string;
  latencyMs: number;
  costUsd: number;
}

// PROMPT_VERSION is bumped whenever the extraction prompt changes.
// CI eval-gates any bump against a fixture set before it can deploy (see evals/).
export const PROMPT_VERSION = "v1";

const EXTRACTION_PROMPT = `You are an invoice-extraction engine. Given raw invoice text,
extract vendor name, total amount, currency, due date (ISO 8601), and category
(one of: software, utilities, professional_services, logistics, office_supplies, other).
Respond ONLY with JSON matching this shape:
{"vendor": string, "amount": number, "currency": string, "dueDate": string, "category": string}

Invoice text:
`;

/**
 * Calls the configured LLM provider to extract structured invoice data.
 * Provider is pluggable via LLM_PROVIDER env var so this can run against
 * a free-tier model (Gemini Flash / OpenRouter) in dev/CI without cost,
 * and a stronger model in prod if needed.
 */
export async function extractInvoiceData(rawText: string): Promise<ExtractionResult> {
  const model = process.env.LLM_MODEL || "gemini-2.0-flash";
  const start = Date.now();

  let raw: string;
  try {
    raw = await callProvider(model, EXTRACTION_PROMPT + rawText);
  } catch (err) {
    llmCallDuration.observe({ model, outcome: "error" }, (Date.now() - start) / 1000);
    throw err;
  }

  const latencyMs = Date.now() - start;
  llmCallDuration.observe({ model, outcome: "success" }, latencyMs / 1000);

  // Rough token-based cost estimate; replace with provider's actual usage response.
  const estimatedCostUsd = estimateCost(model, rawText.length + raw.length);
  llmCostTotal.inc({ model }, estimatedCostUsd);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error(`LLM returned non-JSON output: ${raw.slice(0, 200)}`);
  }

  const data = ExtractionSchema.parse(parsedJson);

  logger.info({ model, latencyMs, promptVersion: PROMPT_VERSION }, "invoice extracted");

  return { data, model, latencyMs, costUsd: estimatedCostUsd };
}

async function callProvider(model: string, prompt: string): Promise<string> {
  const provider = process.env.LLM_PROVIDER || "mock";

  if (provider === "mock") {
    // Naive keyword-based mock so local dev / CI / evals run deterministically
    // without any API key or network call. Real extraction quality is validated
    // against the "gemini" provider in CI before a prompt change ships.
    // Only look at the actual invoice text (after the instruction preamble),
    // not the prompt instructions themselves.
    const invoiceText = prompt.split("Invoice text:\n")[1] ?? prompt;
    return JSON.stringify(naiveMockExtract(invoiceText));
  }

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini response missing text");
    return stripCodeFence(text);
  }

  throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
}

function naiveMockExtract(prompt: string): Extraction {
  const vendorMatch = prompt.match(/(?:From|Vendor):?\s*([^\n]+)/i);
  const fallbackVendorMatch = prompt
    .split("\n")
    .map((l) => l.trim())
    .find(
      (l) =>
        l &&
        !l.startsWith("*") &&
        !l.startsWith("(") &&
        !/^(invoice|bill to|delivery|receipt|consumer)/i.test(l)
    );
  const amountMatch = prompt.match(/(?:Amount Due|Total Payable|Shipment charges|Amount):?\s*(?:INR|USD|\$)?\s*([\d,]+\.?\d*)/i);
  const currencyMatch = prompt.match(/\b(INR|USD|EUR|GBP)\b/);
  const dueDateMatch = prompt.match(/(\d{4}-\d{2}-\d{2})/);

  const vendor = vendorMatch ? vendorMatch[1].trim() : fallbackVendorMatch || "Unknown Vendor";
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 0;
  const currency = currencyMatch ? currencyMatch[1] : "USD";
  const dueDate = dueDateMatch ? dueDateMatch[1] : "2026-12-31";

  const lower = prompt.toLowerCase();
  let category: Extraction["category"] = "other";
  if (/notion|software|saas|subscription/.test(lower)) category = "software";
  else if (/electric|power|utility|water|gas bill/.test(lower)) category = "utilities";
  else if (/delivery|express|shipment|logistics|courier/.test(lower)) category = "logistics";
  else if (/consult|legal|professional/.test(lower)) category = "professional_services";
  else if (/supplies|stationery|office/.test(lower)) category = "office_supplies";

  return { vendor, amount, currency, dueDate, category };
}

function stripCodeFence(text: string): string {
  return text.replace(/```json\s*|\s*```/g, "").trim();
}

function estimateCost(model: string, approxChars: number): number {
  const approxTokens = approxChars / 4;
  const ratePerMillionTokens: Record<string, number> = {
    "gemini-2.0-flash": 0.1,
    "gemini-1.5-pro": 1.25,
  };
  const rate = ratePerMillionTokens[model] ?? 0.5;
  return (approxTokens / 1_000_000) * rate;
}
