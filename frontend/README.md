# Invoice Triage — Frontend

Next.js (App Router) console for the Invoice Triage Agent backend. Deployed
and run completely separately from the backend — this is a pure API
consumer, talking to the backend over HTTP via `NEXT_PUBLIC_API_URL`.

## Running locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Runs on **http://localhost:3001** (the backend runs on 3000 — kept
deliberately separate, mirroring how they'd be two independent deployments
in production, e.g. Vercel for this + a container/K8s deployment for the API).

Make sure the backend is running first (`docker compose up` in the
`invoice-triage-agent` repo) and that its `CORS_ORIGIN` env var matches
this app's origin (`http://localhost:3001` by default — already set in
the backend's `.env.example`).

## What it does

- **Submit panel** — paste raw invoice text, queues it via `POST /api/invoices`
- **Ledger table** — polls `GET /api/invoices` every 3s while any invoice is
  `PENDING`/`PROCESSING`, stops polling once everything settles
- **Detail drawer** — click a row to see the full extraction result,
  including the LLMOps metadata (model used, latency, estimated cost,
  attempt count) pulled straight from the backend's Prometheus-tracked fields
- **API status pill** — live `/healthz` check every 5s in the top bar

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Base URL of the backend API |

## Next steps (platform layer)

This frontend gets its own Dockerfile + Jenkins pipeline + K8s Deployment,
separate from the backend's — a good place to demonstrate independent
CI/CD and independent scaling (frontend is stateless and horizontally
trivial; backend has the queue/worker complexity).
