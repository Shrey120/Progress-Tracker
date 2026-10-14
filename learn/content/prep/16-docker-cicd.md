---
course: prep
module: docker-ci-cd-and-cloud
title: Docker, CI/CD and cloud
order: 116
---
=== lesson: how-deployment-works-end-to-end-git-push-to-live-url | How deployment works end to end
"How does your code get from your laptop to users?" is one of the most common questions for full-stack developers. Walk through it in order.

```text
git push → CI: install, lint, type-check, test, build → artifact (bundle / Docker image)
        → deploy to staging (or a preview URL) → checks / approval
        → deploy to production: new version starts, health checks pass, traffic switches
        → users hit: DNS → CDN → load balancer → app instances → database
        → monitoring watches errors and latency; rollback if needed
```

## Each step, briefly

1. **Version control**: a pull request to `main`; review; merge.
2. **CI** (GitHub Actions etc.): fresh environment, `npm ci`, lint, type-check, unit/integration tests, build.
3. **Artifact**: a static bundle, a serverless bundle, or a Docker image tagged with the commit SHA, pushed to a registry.
4. **Database migrations**: run as a separate, backwards-compatible step before or alongside the new code.
5. **Release**: the platform starts new instances, waits for health checks, shifts traffic (rolling, blue-green or canary), and drains old instances.
6. **Configuration**: environment variables and secrets injected per environment.
7. **Networking**: domain DNS points at the platform/CDN; TLS certificates (often automatic via Let's Encrypt).
8. **After**: dashboards, error tracking (Sentry), alerts; a fast rollback path.

## On Vercel (what you've likely used)

Push → Vercel builds → every branch/PR gets a **preview URL** → merging to `main` deploys production → the build is uploaded to their edge network, serverless functions to regions → instant rollback to any previous deployment. Explaining that this is what happens under the hood shows real understanding.

=== lesson: environments-dev-staging-production-preview-deploys | Environments: dev, staging, production, preview
| Environment | Purpose | Data |
|---|---|---|
| **Local / dev** | building features | seed/fake data, local DB (Docker) |
| **Preview** | one per PR: review the change in a real deployment | shared staging DB or a database branch (Neon, Supabase branching) |
| **Staging** | production-like rehearsal: final QA, migrations, integrations | anonymised or synthetic data, test API keys |
| **Production** | real users | real data; restricted access |

## Rules

- **Same artifact** promoted through environments; only configuration differs (twelve-factor).
- **Separate credentials** per environment; staging can't touch production data or send real emails/SMS/payments (use test modes and sandboxes).
- Keep staging close to production (same versions, similar infrastructure) or it won't catch real problems; see Environment parity.
- Production access is limited, audited, and changes go through the pipeline, not manual edits.

Preview deployments changed frontend workflows: designers and PMs review the actual change before merge, and E2E tests can run against the preview URL in CI.

=== lesson: docker-images-layers-multi-stage-builds | Docker images, layers and multi-stage builds
A **container** packages your app with its runtime and dependencies so it runs the same everywhere. An **image** is the read-only template; a container is a running instance of it.

## Layers and caching

Each Dockerfile instruction creates a layer. Docker reuses cached layers until something changes, so order instructions from least to most frequently changing:

```dockerfile
# ---- build stage ----
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci                                  # cached until dependencies change
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- runtime stage ----
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node                                   # don't run as root
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## Multi-stage builds

Build tools, dev dependencies and source stay in the first stage; the final image contains only what's needed to run: smaller (faster pulls, cold starts) and safer (less to attack).

## Good practices

`.dockerignore` (`node_modules`, `.git`, `.env`), pin base image versions, slim or distroless bases, one process per container, configuration via env vars (never bake secrets into images), a `HEALTHCHECK` or platform health checks, scan images (Trivy, Docker Scout). Next.js has `output: "standalone"` for minimal images.

> "Image vs container?" An image is the immutable blueprint built from a Dockerfile; a container is a running process created from it, with its own filesystem layer on top.

=== lesson: docker-compose | Docker Compose
Compose defines **multi-container** setups in one YAML file, mostly for local development and testing.

```yaml
services:
  api:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgres://app:secret@db:5432/app
      REDIS_URL: redis://cache:6379
    depends_on:
      db: { condition: service_healthy }
    volumes: ["./src:/app/src"]          # live code reload in dev
  db:
    image: postgres:17
    environment: { POSTGRES_USER: app, POSTGRES_PASSWORD: secret, POSTGRES_DB: app }
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck: { test: ["CMD", "pg_isready", "-U", "app"], interval: 5s }
  cache:
    image: redis:7
volumes:
  pgdata:
```

`docker compose up -d`, `docker compose logs -f api`, `docker compose down -v`.

## Points to know

- Services reach each other by **service name** (`db:5432`) on a shared network.
- `depends_on` controls start order; with a healthcheck condition it waits for readiness.
- **Volumes** persist data (named volumes) or mount source code (bind mounts).
- Great for "clone and run" onboarding, integration tests in CI, and reproducing production-like dependencies locally.
- For production, teams usually use a managed platform or Kubernetes instead (Compose works for small single-server deployments).

=== lesson: ci-cd-pipeline-stages | CI/CD pipeline stages
- **CI (continuous integration)**: every push/PR is automatically built and tested, so `main` stays releasable.
- **CD**: **continuous delivery** (every change is deployable; release is a button) or **continuous deployment** (every passing change deploys automatically).

## A typical pipeline

| Stage | What | Fails the build when |
|---|---|---|
| Install | `npm ci` with cache | lockfile mismatch |
| Static checks | lint, format check, type-check | errors |
| Unit + integration tests | with a test DB service | any failure |
| Build | production bundle / Docker image | build errors, bundle size budget |
| Security | dependency audit, secret scanning, image scan | high-severity issues |
| E2E | Playwright against a preview deployment | critical journeys broken |
| Deploy staging | migrations + deploy | health checks fail |
| Deploy production | rolling/canary | error rate rises → automatic rollback |

## Principles

- **Fast feedback**: run cheap checks first, parallelise, cache dependencies; aim for a PR pipeline under ~10 minutes.
- **Build once, deploy many**: the same artifact goes to staging and production.
- **Reproducible**: pinned versions, clean environments.
- **Required checks** on protected branches; nobody deploys from a laptop.
- Trunk-based development with small PRs and feature flags makes CD practical.

=== lesson: github-actions | GitHub Actions
GitHub's CI/CD. Workflows are YAML files in `.github/workflows/`, triggered by events.

```yaml
name: ci
on:
  pull_request:
  push: { branches: [main] }
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env: { POSTGRES_PASSWORD: test }
        ports: ["5432:5432"]
        options: --health-cmd pg_isready --health-interval 5s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint && npm run typecheck
      - run: npm test
        env: { DATABASE_URL: postgres://postgres:test@localhost:5432/postgres }
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production                  # protection rules, environment secrets
    permissions: { id-token: write, contents: read }   # OIDC to the cloud, no stored keys
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh
```

## Concepts

Workflows → jobs (run in parallel on separate runners unless `needs:`) → steps (shell commands or reusable **actions**). Matrix builds (`strategy.matrix` for several Node versions), caching, artifacts between jobs, reusable workflows, environments with required reviewers, `concurrency` to cancel outdated runs.

## Security

Secrets in repository/environment secrets; least-privilege `permissions`; **OIDC** federation to AWS/GCP instead of long-lived keys; pin third-party actions to a commit SHA (tags can be moved by attackers); be careful with `pull_request_target` on forks.

=== lesson: rollback-strategy | Rollback strategy
Things will break in production. The fastest fix is usually to **go back** to the last good version, then investigate.

## Options

| Approach | Speed | Notes |
|---|---|---|
| Redeploy the previous artifact / "instant rollback" (Vercel, image tag) | seconds–minutes | needs immutable, versioned artifacts |
| Blue-green switch back | seconds | old environment still running |
| Turn off a **feature flag** | seconds | no deploy at all; best for new features |
| Revert commit + redeploy | minutes | goes through CI again |
| Roll forward with a fix | depends | only when the fix is small and certain |

## The database problem

Code can roll back; data and schema often can't. That's why migrations must be **backwards compatible** (expand/contract: see SQL → zero-downtime changes): the previous version of the code must still work with the new schema. Never couple a destructive migration (drop column) with the release that stops using it.

## Make it routine

Automated rollback when error rates or health checks degrade after a deploy (canary analysis), a documented one-command rollback, and practising it. If rolling back is scary, people hesitate during incidents.

=== lesson: environment-parity | Environment parity
Twelve-factor's "dev/prod parity": keep development, staging and production as similar as possible, so bugs don't appear only in production.

## Gaps that cause "works on my machine"

| Gap | Fix |
|---|---|
| SQLite locally, Postgres in prod | run the same database (Docker Compose) |
| different Node/runtime versions | `.nvmrc`/`engines`, the same Docker base image |
| missing services locally (Redis, queues, S3) | Compose services, LocalStack/MinIO |
| different env config | typed, validated config; `.env.example` |
| OS differences (case-sensitive file names on Linux!) | build and test in containers/CI on Linux |
| data volume (10 rows locally, 10M in prod) | realistic seed data; test migrations on a copy |
| time gap between writing and deploying | small, frequent deploys |
| people gap (devs don't operate prod) | developers deploy and watch their own changes |

Dev containers (VS Code / Codespaces) give every developer the same toolchain. Infrastructure as code keeps staging and production infrastructure identical by construction.

=== lesson: hosting-choices-vercel-vs-vps-vs-containers-vs-serverless | Hosting choices: Vercel vs VPS vs containers vs serverless
| Option | Examples | Good for | Watch out for |
|---|---|---|---|
| **Frontend/serverless platform** | Vercel, Netlify, Cloudflare Pages | Next.js/React apps, previews, zero ops | cost at scale, function time limits, cold starts, long-lived connections |
| **PaaS** | Render, Railway, Fly.io, Heroku | full-stack apps with workers and DBs, simple ops | less control, price per instance |
| **VPS** | DigitalOcean droplet, Hetzner, Lightsail, EC2 | cheap, full control, WebSockets, cron | you manage OS updates, security, scaling, backups |
| **Containers (managed)** | AWS ECS/Fargate, Google Cloud Run, Azure Container Apps | Dockerised services, autoscaling, no servers to patch | more setup; cold starts on scale-to-zero |
| **Kubernetes** | EKS, GKE, AKS | many services, platform teams | significant complexity; overkill for small teams |
| **Serverless functions** | AWS Lambda, Cloud Functions | spiky/event-driven workloads, glue code | limits (time, memory), cold starts, DB connection storms |

## How to choose (interview answer)

Start from the team and workload: a small team shipping a Next.js app with Postgres → Vercel + a managed database (Supabase/Neon). Long-running workers, WebSockets or heavy background jobs → add a container service or PaaS. Strict cost control at steady load → VPS or containers. Many teams and services → Kubernetes with a platform team.

Mention the costs you've seen: serverless is cheap at low traffic and can get expensive at high sustained load; a VPS is cheap but your time isn't free.

=== lesson: domains-dns-records-and-https-certificates | Domains, DNS records and HTTPS certificates
Connecting `www.myapp.com` to your deployment:

1. **Register** the domain (Namecheap, Cloudflare, GoDaddy). Optionally move DNS to a provider like Cloudflare.
2. **DNS records**:
   - apex `myapp.com` → `A` record to the platform's IP (or ALIAS/flattened CNAME),
   - `www` → `CNAME` to the platform hostname (`cname.vercel-dns.com`),
   - email: `MX`, and `TXT` records for SPF, DKIM, DMARC (or your mail will land in spam),
   - verification `TXT` records for Google, Vercel, etc.
3. **HTTPS certificate**: platforms issue and renew them automatically with **Let's Encrypt** (ACME). On a VPS, Caddy does it automatically, or Certbot with Nginx.
4. **Redirects**: pick a canonical host (`www` or apex) and 301 the other; redirect HTTP → HTTPS; add **HSTS** once stable.

## How TLS certificates work (briefly)

A certificate binds a domain to a public key, signed by a Certificate Authority the browser trusts. During the TLS handshake, the server presents it; the browser checks the signature chain, the domain name and the expiry. The CA proves you control the domain via an HTTP or DNS challenge before issuing.

## Gotchas

DNS changes take time to propagate (TTL), CAA records can block issuance, expired certificates take sites down (automate renewal and monitor expiry), and wildcard certificates (`*.myapp.com`) need DNS challenges.

=== lesson: running-node-in-production-reverse-proxy-process-manager-hea | Running Node in production: reverse proxy, process manager, health checks
If you deploy to a VPS (or explain what platforms do for you):

```text
internet → Nginx / Caddy (TLS, gzip, static files, rate limits) → Node app (PM2 or systemd, one process per core) → Postgres/Redis
```

## Reverse proxy

Nginx or Caddy in front of Node: terminates HTTPS, serves static files efficiently, compresses, buffers slow clients, adds security headers, load-balances across several Node processes, and hides the app port.

```nginx
server {
  server_name api.myapp.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";   # WebSockets
  }
}
```

Tell Express to trust the proxy (`app.set("trust proxy", 1)`) so `req.ip` and secure cookies work.

## Process manager

**PM2** or **systemd** keeps the app running: restarts on crash, starts on boot, captures logs, and PM2's cluster mode runs one process per CPU core with zero-downtime reloads (`pm2 reload`). In containers, the orchestrator does this instead.

## Health checks

- `GET /healthz` (liveness): the process responds.
- `GET /readyz` (readiness): it can serve: DB reachable, migrations done. Load balancers route only to ready instances.

Plus: graceful shutdown on `SIGTERM`, structured logs shipped off the box, firewall (only 80/443 and SSH with keys), automatic security updates, and backups.

=== lesson: cloud-basics-managed-db-object-storage-iam-serverless-regist | Cloud basics: managed DB, object storage, IAM, serverless, registry
The handful of cloud services that appear in almost every architecture (AWS names, with GCP/Azure equivalents):

| Need | AWS | Notes |
|---|---|---|
| Compute | EC2 (VMs), ECS/Fargate (containers), Lambda (functions), App Runner | |
| Managed relational DB | RDS / Aurora (Postgres, MySQL) | backups, failover, patches handled |
| Object storage | S3 | files, backups, static sites |
| Cache | ElastiCache (Redis/Valkey) | |
| Queues and events | SQS, SNS, EventBridge | |
| CDN | CloudFront | |
| DNS | Route 53 | |
| Container registry | ECR | stores Docker images |
| Secrets | Secrets Manager, SSM Parameter Store | |
| Identity and access | **IAM** | users, roles, policies |
| Monitoring | CloudWatch | logs, metrics, alarms |
| Networking | VPC, subnets, security groups | private databases |

## IAM essentials

- **Least privilege**: grant only the actions and resources needed (`s3:PutObject` on one bucket, not `s3:*`).
- **Roles, not long-lived keys**: services assume roles; CI uses OIDC.
- MFA on human accounts, no root account usage, separate accounts for prod and dev.

## Regions and availability zones

A **region** (Mumbai `ap-south-1`) contains several isolated **availability zones** (separate datacentres). Run across at least two AZs for resilience; choose regions near users and for data-residency laws.

Interviewers rarely expect deep cloud certification knowledge from full-stack candidates; they want you to know which managed service solves which problem and the basics of networking and permissions.

=== lesson: monitoring-alerting | Monitoring and alerting
(See System design → Observability for the concepts.)

## What to set up for a typical web app

- **Uptime checks** from outside (Better Stack, UptimeRobot, Checkly) on key URLs and the health endpoint.
- **Error tracking** with stack traces and release tagging (Sentry) for frontend and backend.
- **Metrics dashboards**: request rate, error rate, p95/p99 latency per endpoint, DB connections and slow queries, queue depth, CPU/memory.
- **Logs** centralised and searchable, with request IDs.
- **Real user monitoring**: Core Web Vitals from real users.
- **Business signals**: signups, checkouts, payment failures; a sudden drop is often the first sign of a bug.

## Good alerts

- Alert on **user-facing symptoms** and SLOs (error rate > 2% for 5 minutes; checkout success below normal), not on every CPU spike.
- Every alert is **actionable** and links to a runbook.
- Route by severity: page someone for outages, a Slack message for warnings.
- Review noisy alerts and delete or tune them; alert fatigue makes people ignore the important ones.

After incidents: a blameless postmortem with timeline, root cause, and follow-up actions (often new alerts or tests).

=== lesson: kubernetes-pods-deployments-services-ingress-configmaps-secr | Kubernetes: pods, deployments, services, ingress, ConfigMaps, secrets
Kubernetes (K8s) runs and manages containers across a cluster of machines. You declare the desired state in YAML; controllers make reality match it.

| Object | What it is |
|---|---|
| **Pod** | the smallest unit: one or more containers sharing a network and storage; ephemeral |
| **Deployment** | manages replicas of a pod template: scaling, rolling updates, rollbacks |
| **Service** | stable virtual IP and DNS name that load-balances to matching pods |
| **Ingress** (or Gateway API) | HTTP routing from outside: hosts, paths, TLS → services |
| **ConfigMap** | non-secret configuration as env vars or files |
| **Secret** | sensitive config (base64-encoded, not encrypted by default: enable encryption or use an external secrets manager) |
| **HorizontalPodAutoscaler** | scales replicas on CPU/memory/custom metrics |
| **Namespace** | logical isolation within a cluster |
| StatefulSet, Job/CronJob, DaemonSet | stateful apps, batch jobs, one pod per node |

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: api }
spec:
  replicas: 3
  selector: { matchLabels: { app: api } }
  template:
    metadata: { labels: { app: api } }
    spec:
      containers:
        - name: api
          image: registry.example.com/api:3f9c2a1
          ports: [{ containerPort: 3000 }]
          envFrom: [{ configMapRef: { name: api-config } }, { secretRef: { name: api-secrets } }]
          readinessProbe: { httpGet: { path: /readyz, port: 3000 } }
          resources: { requests: { cpu: 250m, memory: 256Mi }, limits: { memory: 512Mi } }
```

For a full-stack interview: know these objects and why K8s exists (self-healing, scaling, declarative deploys), and that for small teams managed platforms are often the better choice.

=== lesson: blue-green-canary-deployments | Blue-green and canary deployments
Strategies for releasing a new version with less risk than replacing everything at once.

## Rolling update

Replace instances a few at a time. The default on most platforms. Old and new versions run side by side briefly, so they must be compatible.

## Blue-green

Run two full environments. **Blue** serves traffic; deploy the new version to **green**, test it, then switch the router to green. Rollback = switch back.

- Instant cutover and rollback.
- Double the infrastructure during the switch; database shared, so schema must suit both.

## Canary

Send a **small percentage** of traffic (1–5%) to the new version, watch error rates and latency, then increase gradually to 100%. Roll back automatically if metrics degrade (Argo Rollouts, Flagger, AWS CodeDeploy, Cloud Run traffic splitting).

- Real-traffic validation with limited blast radius.
- Needs good metrics to compare versions, and sticky routing so a user doesn't bounce between versions.

## Related

- **Feature flags** release features independently of deploys (often the simplest canary).
- **Shadow traffic**: copy real requests to the new version without returning its responses, to test under real load.
- **A/B tests** split traffic to measure product impact, not deployment safety.
