# Invoice Triage Agent

An LLM-powered service that ingests raw invoice text, extracts structured
data (vendor, amount, due date, category), and exposes a status API. Built
as the application layer for a full DevOps/Platform Engineering project —
this repo is the app; a separate `infra/` layer (Terraform, Jenkins, Helm,
ArgoCD, Prometheus/Grafana) sits around it.

## Why this app, specifically

It's small enough to build fast, but has real production failure modes
worth operating against:
- LLM calls can time out, return malformed JSON, or hallucinate fields
- Extraction quality is non-deterministic — you can't just "unit test" it,
  you need an **eval gate**
- Queue backlogs happen under load — worth watching queue depth
- Cost per request is a real, trackable number (`llm_cost_usd_total`)

That combination — a queue-backed async system with a non-deterministic
core and real cost/latency tradeoffs — is what makes the platform layer
around it (CI/CD, K8s, observability) meaningful instead of decorative.

## Architecture

```
Client → POST /api/invoices → Postgres (status=PENDING) → BullMQ queue
                                                                 │
                                                                 ▼
                                                     Worker picks up job
                                                                 │
                                                                 ▼
                                              extractInvoiceData() → LLM
                                                                 │
                                                    ┌────────────┴────────────┐
                                                    ▼                         ▼
                                          Postgres (EXTRACTED/FAILED)   Prometheus metrics
                                                                        (latency, cost, outcome)

Client → GET /api/invoices/:id  → current status + extracted fields
```

## Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/invoices` | Submit raw invoice text, returns `202` + id |
| `GET /api/invoices/:id` | Poll status / get extracted result |
| `GET /api/invoices?status=FAILED` | List invoices, filterable by status |
| `GET /healthz` | Liveness probe target for Kubernetes |
| `GET /readyz` | Readiness probe — checks Postgres + Redis are reachable |
| `GET /metrics` | Prometheus scrape target |

## Running locally

```bash
cp .env.example .env
docker compose up --build
# API on http://localhost:3000, worker runs alongside it
```

Or without Docker:

```bash
npm install
npx prisma migrate dev
npm run dev          # API
node dist/queue/worker.js   # in a second terminal, after `npm run build`
```

## LLMOps: the eval gate

`src/services/extraction.ts` calls a pluggable LLM provider
(`LLM_PROVIDER=mock` for local/CI, `LLM_PROVIDER=gemini` for real
extraction against Gemini 2.0 Flash). Every time the prompt or model
changes, bump `PROMPT_VERSION` and run:

```bash
LLM_PROVIDER=mock npx tsx evals/run-evals.ts
# or, against the real model:
LLM_PROVIDER=gemini GEMINI_API_KEY=xxx npx tsx evals/run-evals.ts
```

This scores extraction accuracy against `evals/fixtures.json` and **fails
the process (exit 1) if pass rate drops below 90%**. In the CI pipeline,
this step runs before the deploy step — a prompt change that regresses
extraction quality cannot ship, the same way a failing unit test blocks a
normal deploy.

## Observability hooks already built in

- `http_request_duration_seconds` — latency histogram per route
- `llm_call_duration_seconds` — LLM latency, split success/error
- `llm_cost_usd_total` — cumulative estimated spend, labeled by model
- `invoices_processed_total` — outcome counter (extracted/failed)
- `invoice_queue_depth` — gauge for queue backlog (wire up in worker for
  the next phase)

These are the exact metrics the Grafana dashboards and Alertmanager rules
in the platform layer will be built against.

## Roadmap (platform layers to add on top of this app)

1. **Terraform** — VPC, EKS/GKE cluster, managed Postgres, IAM — zero
   manual console setup
2. **Jenkins CI** — lint → test → eval gate → build image → push to
   registry → bump Helm chart version
3. **ArgoCD (GitOps CD)** — auto-syncs the cluster to whatever the Helm
   chart in git says, decoupled from CI
4. **Kubernetes manifests / Helm chart** — Deployment, HPA, resource
   limits, readiness/liveness wired to `/healthz` and `/readyz`
5. **Prometheus + Grafana + Alertmanager** — dashboards on the metrics
   above, alerts routed to Slack
6. **Chaos test** — kill a pod mid-request, record the self-heal
7. **Incident postmortem** — deliberately break something, document root
   cause and fix

## Tech stack

TypeScript, Express, Prisma + PostgreSQL, BullMQ + Redis, Zod, Prometheus
client, Pino (structured logging), Vitest.
