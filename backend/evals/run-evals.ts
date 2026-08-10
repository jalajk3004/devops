/**
 * LLMOps eval gate.
 *
 * Run with: LLM_PROVIDER=mock npx tsx evals/run-evals.ts
 *
 * In CI, this is run in the pipeline BEFORE a deploy step whenever
 * src/services/extraction.ts or PROMPT_VERSION changes. If the pass
 * rate drops below PASS_THRESHOLD, the pipeline fails and the change
 * cannot ship - this is the guardrail that replaces "eyeball the
 * output and hope" with an actual quality gate on a non-deterministic
 * system.
 */
import fixtures from "./fixtures.json";
import { extractInvoiceData, PROMPT_VERSION } from "../src/services/extraction";

const PASS_THRESHOLD = 0.9; // 90% of fields across all fixtures must match

interface FixtureCase {
  name: string;
  rawText: string;
  expected: Record<string, unknown>;
}

async function main() {
  const cases = fixtures as FixtureCase[];
  let totalFields = 0;
  let passedFields = 0;
  const failures: string[] = [];

  for (const testCase of cases) {
    const result = await extractInvoiceData(testCase.rawText);
    for (const [key, expectedValue] of Object.entries(testCase.expected)) {
      totalFields++;
      const actualValue = (result.data as Record<string, unknown>)[key];
      const match =
        typeof expectedValue === "number"
          ? Math.abs((actualValue as number) - expectedValue) < 0.01
          : actualValue === expectedValue;

      if (match) {
        passedFields++;
      } else {
        failures.push(`[${testCase.name}] ${key}: expected ${expectedValue}, got ${actualValue}`);
      }
    }
  }

  const passRate = passedFields / totalFields;
  console.log(`\nPrompt version: ${PROMPT_VERSION}`);
  console.log(`Eval pass rate: ${(passRate * 100).toFixed(1)}% (${passedFields}/${totalFields} fields)`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(`  - ${f}`));
  }

  if (passRate < PASS_THRESHOLD) {
    console.error(`\nFAILED: pass rate below threshold (${PASS_THRESHOLD * 100}%). Blocking deploy.`);
    process.exit(1);
  }

  console.log("\nPASSED: eval gate cleared.");
}

main().catch((err) => {
  console.error("Eval run crashed:", err);
  process.exit(1);
});
