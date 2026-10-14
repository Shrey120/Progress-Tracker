---
course: prep
module: system-design
title: System design
order: 111
---
=== lesson: requirements-gathering-scoping | Requirements gathering and scoping
A system design interview is 45–60 minutes. Candidates fail most often by jumping straight to boxes and arrows. Spend the first 5–8 minutes on requirements.

## The framework

1. **Functional requirements** — what the system does. List 3–5 core features and agree on them. "Users create short links; visiting a short link redirects; links can expire; we show click counts."
2. **Out of scope** — say what you're **not** doing: "No custom domains or user accounts for now."
3. **Non-functional requirements** — scale, latency, availability, consistency, durability. "100M new links a month, reads 100× writes, redirects under 50 ms p99, redirects must stay up even if creation is degraded."
4. **Estimates** (next lesson) — just enough numbers to drive decisions.
5. **API** — the main endpoints or functions.
6. **Data model** — main entities and how they're accessed.
7. **High-level design** — the boxes: clients, load balancer, services, databases, caches, queues.
8. **Deep dives** — pick 1–3 parts where the hard problems are (the interviewer often chooses). Scaling, failure handling, bottlenecks.
9. **Wrap up** — trade-offs you made, what you'd monitor, what you'd do next.

## Questions worth asking

Who are the users and how many? Read-heavy or write-heavy? Global or one region? Is it OK to show slightly stale data? What happens if we lose a message? Mobile, web, or both?

## How you're graded

Not on reaching a "right" answer, but on: clarifying ambiguity, making and **justifying** trade-offs, knowing the building blocks, spotting bottlenecks, and communicating clearly. Think out loud, check in with the interviewer, and draw as you go.

=== lesson: back-of-envelope-estimation | Back-of-envelope estimation
Rough numbers decide the design: one database or sharded? Cache needed? How much storage? Be quick and round aggressively.

## Numbers to remember

| Thing | Value |
|---|---|
| Seconds in a day | ~86,400 ≈ **10⁵** |
| 1 million requests/day | ≈ **12 per second** |
| 1 billion requests/day | ≈ 12,000 per second |
| Peak traffic | ~2–3× average |
| Memory read | ~100 ns |
| SSD random read | ~100 µs |
| Same-datacenter round trip | ~0.5 ms |
| Cross-continent round trip | ~100–150 ms |
| One Postgres instance | thousands to tens of thousands of simple queries/s |
| One Redis instance | ~100,000 ops/s |

Powers of two: 1 KB = 10³, 1 MB = 10⁶, 1 GB = 10⁹, 1 TB = 10¹² bytes.

## Worked example: a URL shortener

```jsrun
const newLinksPerMonth = 100e6;
const writesPerSec = newLinksPerMonth / (30 * 86400);
const readsPerSec = writesPerSec * 100;           // 100:1 read:write
const bytesPerLink = 500;                          // url + metadata
const storage5y = newLinksPerMonth * 12 * 5 * bytesPerLink;
console.log("writes/s ≈", Math.round(writesPerSec));
console.log("reads/s ≈", Math.round(readsPerSec), "(peak ~3×:", Math.round(readsPerSec * 3) + ")");
console.log("storage over 5 years ≈", (storage5y / 1e12).toFixed(1), "TB");
console.log("links in 5 years ≈", (newLinksPerMonth * 60 / 1e9).toFixed(0), "billion → 7 base62 chars gives", (62 ** 7 / 1e12).toFixed(1), "trillion");
```

Conclusions you can now state: writes are small (one database handles them); reads at ~4,000/s peak want a cache; 3 TB fits a single database for years; 7-character codes are plenty.

## Tips

Say your assumptions out loud, round to one significant figure, and only estimate what changes a decision.

=== lesson: stateless-services | Stateless services
A service is **stateless** when any instance can handle any request because no instance keeps per-user data in its own memory between requests. State lives in shared stores: databases, Redis, object storage.

## Why it matters

- **Horizontal scaling**: add or remove instances freely; the load balancer can send a request anywhere.
- **Resilience**: an instance can crash or be replaced (deploys, autoscaling) without users losing sessions.
- **Simpler deploys**: rolling updates just swap instances.

## Where state hides

| Hidden state | Move it to |
|---|---|
| In-memory sessions | Redis session store or signed cookies |
| Uploaded files on local disk | object storage (S3) |
| In-memory caches that must be consistent | Redis (local caches OK only as a best-effort layer) |
| Rate-limit counters | Redis |
| Scheduled jobs in a process | a queue or scheduler |
| WebSocket connections | inherently stateful: route with a pub/sub layer between instances |

## Sticky sessions

Load balancers can pin a user to one instance ("session affinity"). It's a workaround for stateful apps: uneven load, and sessions are lost when that instance dies. Prefer stateless services; use stickiness only where it's inherent (WebSockets).

=== lesson: horizontal-scaling | Horizontal scaling
- **Vertical scaling (scale up)**: a bigger machine. Simple, no code changes, but there's a ceiling, it's a single point of failure, and big machines get expensive.
- **Horizontal scaling (scale out)**: more machines behind a load balancer. Near-unlimited for stateless tiers, and survives failures, but needs stateless services and shared state stores.

## Scaling each tier

```text
clients → CDN → load balancer → app servers (×N, stateless, autoscaled)
                                   │
                    ┌──────────────┼───────────────┐
                 Redis cache   Postgres primary   queue → workers (×M)
                               └→ read replicas
```

- **App tier**: horizontal and autoscaled on CPU, requests or queue depth.
- **Database**: hardest to scale. Order of moves: indexes and query fixes → caching → read replicas → vertical scaling → partitioning → sharding.
- **Background work**: move slow tasks to queues and scale workers separately.
- **Static assets and cacheable pages**: CDN.

## What to say in an interview

Start simple (one app server, one database) and evolve it as the numbers require. Name the next bottleneck at each step: "At 10× this, the database writes become the limit, so I'd…". Over-engineering a small system is a red flag too.

=== lesson: load-balancing | Load balancing
A load balancer spreads requests across healthy instances.

## Layer 4 vs Layer 7

- **L4 (transport)**: routes TCP/UDP connections by IP and port. Very fast, doesn't look at requests. (AWS NLB.)
- **L7 (application)**: understands HTTP: routes by path, host or header, terminates TLS, adds headers, retries. (AWS ALB, Nginx, Envoy, Cloudflare, Traefik.)

## Algorithms

| Algorithm | Good when |
|---|---|
| Round robin | identical instances, similar requests |
| Weighted round robin | instances of different sizes, canaries |
| Least connections / least outstanding requests | requests vary in duration |
| IP hash / consistent hashing | you need the same client on the same instance (caches, stickiness) |
| Power of two random choices | large fleets: pick two at random, send to the less loaded |

## Health checks

The load balancer probes each instance (`GET /health`) and stops sending traffic to failing ones. Distinguish **liveness** (is the process alive?) from **readiness** (can it serve? DB connected, warmed up). A readiness check that calls every dependency can take the whole fleet out when one dependency blips; keep it focused.

## Redundancy

A single load balancer is itself a single point of failure: managed load balancers are redundant across zones; DNS can spread traffic across regions (GeoDNS, anycast).

=== lesson: single-points-of-failure | Single points of failure
A **SPOF** is any component whose failure takes the whole system down. Interviewers ask you to find them in your own diagram.

## How to remove them

| Component | Redundancy |
|---|---|
| App server | multiple instances across availability zones |
| Load balancer | managed/redundant LBs, multi-AZ |
| Database | primary + standby with automatic failover; backups; replicas |
| Cache | Redis replicas/cluster; and the app must survive a cache outage (degraded, not down) |
| Queue | managed queue or replicated broker |
| Region | multi-region (expensive: only when the business needs it) |
| Third-party API | timeouts, retries, circuit breakers, fallbacks, a second provider for critical ones (payments, SMS) |
| DNS / certificates / config | multiple providers or long TTLs; expiry alerts |
| People | runbooks, on-call rotation, no single person who knows a system |

## Availability numbers

| Availability | Downtime per year |
|---|---|
| 99% | ~3.65 days |
| 99.9% | ~8.8 hours |
| 99.99% | ~53 minutes |
| 99.999% | ~5 minutes |

Components in **series** multiply: two 99.9% services both required → ~99.8%. **Redundant** copies in parallel raise availability. Each extra nine costs a lot more; match it to the business need.

=== lesson: caching-layers | Caching layers
Caching keeps copies of data closer to where it's needed so you skip slow work. A request can hit several layers:

```text
browser cache → CDN → reverse proxy / API gateway cache → application cache (Redis) → database buffer cache
```

| Layer | Caches | Example |
|---|---|---|
| Browser | static assets, API responses with cache headers | `Cache-Control: max-age=31536000, immutable` for hashed JS |
| CDN | static files, public pages, public API responses | product images, marketing pages |
| App / Redis | computed results, DB rows, sessions | user profile, product details, feed |
| In-process memory | hot, tiny, rarely changing data | feature flags, config (per instance) |
| Database | pages in memory | automatic |

## Questions to answer in a design

- **What** to cache: read-heavy, expensive to compute, tolerant of slight staleness.
- **Pattern**: cache-aside, read-through, write-through (see the Caching topic).
- **Key design**: include everything the value depends on (`product:42:v3:en`).
- **Invalidation**: TTL, explicit delete on write, or versioned keys.
- **Failure**: if Redis is down, fall back to the database with protection (rate limits), don't crash.
- **Hit ratio**: monitor it; a low hit rate means the cache adds latency for little benefit.

Caching hides problems too: always ask what happens on a cold cache (after a deploy or flush), and plan against stampedes.

=== lesson: db-indexing-query-design | Database indexing and query design in system design
In design interviews, the database choice and its access patterns matter more than the brand.

## Design from access patterns

List the queries the system must serve, with their frequency, then shape tables and indexes around them:

| Query | Index |
|---|---|
| get link by short code | primary key / unique index on `code` |
| user's links, newest first | `(user_id, created_at DESC)` |
| unread notifications for a user | partial index `(user_id, created_at) WHERE read_at IS NULL` |
| messages in a chat after a cursor | `(conversation_id, id)` |

## Patterns that come up

- **Read/write ratio** drives everything: read-heavy → replicas and caching; write-heavy → batching, queues, append-only tables, partitioning.
- **Hot rows**: a single counter row updated by every request (likes, inventory) becomes a lock bottleneck. Shard the counter into N rows and sum, or buffer increments in Redis and flush periodically.
- **Large tables**: partition by time; archive old data.
- **Denormalize for hot reads** (counts, last message) and keep it in sync with events.
- **Pagination**: keyset, never deep OFFSET.
- **Transactions only where invariants need them** (payments, inventory), not across services.

## Choosing a store

Relational by default; key-value (DynamoDB, Redis) for simple high-throughput lookups; wide-column (Cassandra) for massive write-heavy time-ordered data like chat messages or events; search engine for text search; object storage for files.

=== lesson: message-queues-async-processing | Message queues and async processing
A **queue** decouples the part of the system that produces work from the part that does it.

```text
API ──enqueue──▶ [ queue ] ──▶ worker ──▶ email provider / image processing / DB
  └─ responds "202 Accepted" immediately
```

## Benefits

- **Faster responses**: slow work happens later.
- **Load levelling**: a spike fills the queue instead of overloading downstream systems; workers drain it at a steady rate.
- **Resilience**: if the email provider is down, messages wait and retry instead of failing user requests.
- **Independent scaling**: add workers when the queue grows.

## Delivery guarantees

- **At-most-once**: may lose messages, never duplicates.
- **At-least-once**: never loses, may duplicate. The common default → consumers must be **idempotent**.
- **Exactly-once**: costly and only within specific systems (Kafka transactions); in practice "at-least-once + idempotent consumers".

## Things to design for

Retries with backoff, a **dead-letter queue** for poison messages, **ordering** (usually only guaranteed per partition/key, e.g. per user), visibility timeouts (SQS hides a message while a worker processes it), monitoring **queue depth and age** (the best signal that workers are falling behind), and the **outbox pattern** to enqueue atomically with a database change.

=== lesson: kafka-vs-rabbitmq-vs-sqs | Kafka vs RabbitMQ vs SQS
Three common choices, built on different models.

| | RabbitMQ | AWS SQS | Kafka |
|---|---|---|---|
| Model | message broker: queues, exchanges, routing | managed queue | distributed **log**: append-only, partitioned topics |
| After consumption | message is removed (acked) | removed after delete | **kept** for the retention period; consumers track their own offset |
| Replay old messages | no | no | **yes** (rewind the offset) |
| Multiple consumers of the same data | via fan-out exchanges | via SNS → several queues | built in: each consumer group reads independently |
| Ordering | per queue | FIFO queues (lower throughput) | per partition (choose a key, e.g. user ID) |
| Throughput | high | high, scales automatically | very high (millions/s) |
| Operations | run it yourself or managed | zero ops | complex (or managed: MSK, Confluent, Redpanda) |
| Best for | task queues, complex routing, RPC-ish patterns | simple decoupling on AWS | event streaming, event sourcing, analytics pipelines, change data capture |

## How to choose in an interview

- "Send this email / resize this image later" → a task queue (SQS, RabbitMQ, BullMQ on Redis).
- "Many services react to `OrderPlaced`, and new ones may join and need history" → Kafka (or a managed log like Kinesis, Pub/Sub).
- Small team, AWS → SQS + SNS until you need replay or very high throughput.

Mention the cost of Kafka: partitions, consumer group rebalancing, schema management (a schema registry), and operational expertise.

=== lesson: pub-sub-event-driven-architecture | Pub/sub and event-driven architecture
In **pub/sub**, publishers emit events to a topic without knowing who listens; any number of subscribers receive them.

```text
Order service ──"OrderPlaced"──▶ topic ──▶ Email service (confirmation)
                                       ├─▶ Inventory service (reserve stock)
                                       ├─▶ Analytics
                                       └─▶ Loyalty points (added next year, no change to Order service)
```

## Events vs commands

- **Command**: "SendEmail" — directed at one handler, expects it done.
- **Event**: "OrderPlaced" — a fact about the past; subscribers decide what to do.

## Benefits

Loose coupling (add consumers without touching the producer), each service scales and fails independently, natural audit trail.

## Costs

- **Eventual consistency**: the email may arrive before inventory updates. UIs and flows must tolerate it.
- **Harder debugging**: no single call stack. Use correlation IDs and distributed tracing.
- **Ordering, duplicates and retries** must be handled by every consumer (idempotency).
- **Schema evolution**: events are a contract. Version them and only add fields.
- Hidden coupling: a consumer that depends on an event's exact shape is still coupled.

Tools: Kafka, SNS + SQS, Google Pub/Sub, Redis pub/sub (no persistence: fine for live notifications, not for important events), EventBridge, NATS.

=== lesson: saga-and-outbox-patterns | Saga and outbox patterns
When a business process spans several services, each with its own database, you can't use one ACID transaction. Two patterns fill the gap.

## The outbox pattern

Problem: you update your database **and** publish an event. If you commit and then crash before publishing, other services never hear about it. If you publish first and the commit fails, they hear about something that didn't happen.

Fix: write the event into an `outbox` table **in the same transaction** as the change. A separate relay (a polling job, or change data capture with Debezium) reads the outbox and publishes, marking rows sent. Delivery becomes at-least-once, so consumers deduplicate by event ID.

```sql
BEGIN;
UPDATE orders SET status = 'paid' WHERE id = 42;
INSERT INTO outbox (id, topic, payload) VALUES (gen_random_uuid(), 'OrderPaid', '{"orderId": 42}');
COMMIT;
```

## Sagas

A saga is a sequence of local transactions, each in one service; if a step fails, earlier steps are undone by **compensating actions**.

```text
Place order → Reserve stock → Charge payment → Arrange shipping
                  ↑ if payment fails: Release stock, Cancel order (compensations)
```

- **Choreography**: services react to each other's events. Simple for a few steps; hard to follow as it grows.
- **Orchestration**: a coordinator (or a workflow engine like Temporal, AWS Step Functions) tells each service what to do and handles failures. Easier to reason about and monitor.

Compensations aren't rollbacks: a refund is a new action, and some things can't be undone (an email sent), so order steps so the irreversible ones come last.

=== lesson: idempotency-keys | Idempotency keys in distributed systems
(See API design → Idempotency for the HTTP mechanics.)

In distributed systems, **every** network hop can be retried: clients retry requests, load balancers retry, queues redeliver, webhooks resend. Design every state-changing operation to be safe if it runs twice.

## Where keys come from

- Client-generated UUID per user action (payment button click), sent in a header.
- A natural business key: `(order_id, "charge")`, an upstream event ID, a payment gateway's reference.
- A hash of the message content when nothing else exists.

## Where they're enforced

- **Unique constraint** in the database: the second insert fails cleanly.
- A **processed-messages table** checked in the same transaction as the work.
- A Redis `SET key NX EX 86400` as a fast first check (not alone for money).

## Example: consuming a payment event

```sql
BEGIN;
INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING;  -- 0 rows → already handled: stop
UPDATE wallets SET balance = balance + $2 WHERE user_id = $3;
COMMIT;
```

Because the dedupe row and the effect commit together, a crash in between can't leave the event "half processed".

=== lesson: rate-limiting-algorithms-token-bucket-leaky-bucket-sliding-w | Rate limiting algorithms
## Fixed window counter

Count requests per key per window (`user:42:2026-10-15T10:31`). Simple and cheap, but allows double bursts at boundaries (100 at 10:30:59 + 100 at 10:31:00).

## Sliding window log

Store a timestamp per request, count those in the last N seconds. Accurate, but memory grows with traffic.

## Sliding window counter

Weighted mix of the current and previous fixed windows: `count = current + previous × (overlap fraction)`. Close to accurate, cheap. A popular default.

## Token bucket

A bucket holds up to `capacity` tokens, refilled at `rate` per second. Each request takes a token; empty bucket → reject. Allows short bursts up to capacity, enforces the average rate.

```jsrun
function tokenBucket(capacity, refillPerSec) {
  let tokens = capacity, last = 0;
  return (nowMs) => {
    tokens = Math.min(capacity, tokens + ((nowMs - last) / 1000) * refillPerSec);
    last = nowMs;
    if (tokens >= 1) { tokens -= 1; return true; }
    return false;
  };
}
const allow = tokenBucket(5, 2);            // burst of 5, then 2 requests/second
const times = [0, 10, 20, 30, 40, 50, 60, 500, 1000, 1010, 1020];
console.log(times.map(t => `${t}ms:${allow(t) ? "ok" : "429"}`).join("  "));
```

## Leaky bucket

Requests enter a queue that drains at a fixed rate; overflow is rejected. Smooths output to a constant rate (useful in front of a fragile downstream).

## Distributed implementation

Keep state in **Redis** and update it atomically (a Lua script or `INCR` + `EXPIRE`), so all app instances share limits. Return `429` with `Retry-After`. For very high scale, limit locally per instance with a share of the global limit, accepting some inaccuracy.

=== lesson: design-a-rate-limiter | Design a rate limiter
## Requirements

- Limit requests per client (API key / user / IP) per rule: e.g. 100/minute, 1,000/hour, login 5/minute.
- Low added latency (< 2 ms), works across many API servers, configurable rules, clear 429 responses.
- If the limiter fails, **fail open** (allow traffic) for most endpoints, rather than taking the API down.

## Design

```text
client → API gateway / middleware ──check──▶ Redis cluster (counters, token buckets)
                     │                         ▲
                     └── rules from config ────┘ (cached locally, refreshed)
```

- **Where**: in the API gateway or a shared middleware, before business logic.
- **Algorithm**: token bucket (bursts allowed) or sliding window counter. Store per key: `{tokens, last_refill}` in a Redis hash; update with one Lua script so check-and-decrement is atomic.
- **Keys**: `rl:{rule}:{clientId}` with a TTL so idle keys expire.
- **Response headers**: `RateLimit-Limit`, `RateLimit-Remaining`, `Retry-After`.

## Deep dives

- **Redis latency and load**: one round trip per request; pipeline or use local token pre-allocation for very hot keys.
- **Multi-region**: per-region limits (simpler) vs a global count (needs cross-region sync, slower).
- **Race conditions**: avoided by atomic Lua scripts.
- **Different tiers**: rules per plan; burst allowances for paid customers.
- **Abuse vs fairness**: rate limits for fairness; bot detection and WAF rules for abuse.

=== lesson: unique-id-generation | Unique ID generation
Auto-increment IDs from one database don't work once you have many databases or need IDs before inserting. Options:

| Approach | Pros | Cons |
|---|---|---|
| DB auto-increment | simple, small, ordered | single writer; leaks counts (competitors see your order volume) |
| UUID v4 (random) | generate anywhere, no coordination | 128 bits; random order fragments B-tree indexes |
| **UUID v7 / ULID** | time-ordered + random: index-friendly, generate anywhere | 128 bits |
| **Snowflake** (64-bit) | time-ordered, compact, generated per machine | needs unique machine IDs, clock care |
| Ticket server / ID ranges | each server reserves a block of 1,000 IDs | a central dependency |

## Snowflake layout

`41 bits timestamp (ms since a custom epoch) | 10 bits machine ID | 12 bits sequence` → 4,096 IDs per ms per machine, sortable by time.

```jsrun
const EPOCH = 1704067200000n;     // 2024-01-01
function snowflake(machineId) {
  let lastMs = -1n, seq = 0n;
  return () => {
    let now = BigInt(Date.now());
    if (now === lastMs) { seq = (seq + 1n) & 4095n; if (seq === 0n) while ((now = BigInt(Date.now())) <= lastMs); }
    else seq = 0n;
    lastMs = now;
    return ((now - EPOCH) << 22n) | (BigInt(machineId) << 12n) | seq;
  };
}
const next = snowflake(7);
const ids = [next(), next(), next()];
console.log(ids.map(String));
console.log("timestamp of first:", new Date(Number((ids[0] >> 22n) + EPOCH)).toISOString(), "machine:", Number((ids[0] >> 12n) & 1023n));
```

Watch out for clocks moving backwards (NTP): refuse to generate until the clock catches up. In JavaScript clients, 64-bit IDs exceed `Number.MAX_SAFE_INTEGER`, so send them as strings in JSON.

=== lesson: design-a-url-shortener | Design a URL shortener
## Requirements

- Create a short link for a long URL (optional custom alias, optional expiry).
- Redirect `sho.rt/abc1234` to the long URL fast.
- Click analytics.
- Scale (from the estimation lesson): ~40 writes/s, ~4,000 reads/s peak, billions of links over years.

## API

```text
POST /links  { url, alias?, expiresAt? }  → 201 { code, shortUrl }
GET  /{code}                              → 301/302 Location: longUrl
GET  /links/{code}/stats                  → clicks over time
```

## Generating codes

- **Counter + base62**: a unique ID (Snowflake or DB sequence) encoded in base62. No collisions; but sequential codes are guessable (mitigate by shuffling bits).
- **Random 7 characters**: 62⁷ ≈ 3.5 trillion; insert with a unique constraint and retry on collision.
- Hashing the URL (MD5 → first 7 chars) collides and makes the same URL always map to one code (sometimes desired).

```jsrun
const ALPHA = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const toBase62 = n => { let s = ""; do { s = ALPHA[n % 62] + s; n = Math.floor(n / 62); } while (n > 0); return s; };
console.log(toBase62(125), toBase62(3_521_614_606_207), toBase62(Date.now()));
```

## Architecture

```text
client → CDN/edge → LB → redirect service ──▶ Redis (code → url, hot links)
                                     │ miss
                                     ▼
                              DB (code PK, url, owner, expires_at)
         └─ click events → queue/stream → analytics workers → analytics store (ClickHouse)
```

## Deep dives

- **301 vs 302**: 301 is cached by browsers (fewer hits, but you lose click counts and can't change the target); 302/307 for analytics.
- **Caching**: most traffic goes to few links; an LRU cache in Redis serves them; expired links removed from cache.
- **Analytics** asynchronous, so redirects never wait on counting.
- **Abuse**: rate limits on creation, malicious URL scanning, blocklists.
- **Database**: a key-value lookup by code; one Postgres handles it for years; DynamoDB/Cassandra if you need multi-region writes.

=== lesson: design-a-notification-service | Design a notification service
## Requirements

- Send notifications by **push** (iOS/Android), **email**, **SMS** and **in-app**.
- Triggered by other services (order shipped, OTP, marketing campaigns).
- User preferences and opt-outs, templates, scheduling, retries, delivery tracking.
- OTPs fast (seconds); campaigns to millions can take longer.

## Architecture

```text
services ──▶ Notification API ──▶ validate, look up user prefs + devices, render template
                                        │
                              ┌─────────┼──────────┬──────────┐
                           push queue  email q   SMS q     in-app q   (separate queues per channel, priorities)
                              │          │         │          │
                           workers → APNs/FCM  SES/SendGrid  Twilio/MSG91  DB + WebSocket
                              └── delivery status / webhooks ──▶ notification log
```

## Key design points

- **Per-channel queues** so a slow SMS provider doesn't delay push, and **priority queues** so OTPs skip ahead of marketing.
- **Idempotency**: each notification has an ID; dedupe so retries don't send twice.
- **Preferences** checked before sending (opt-out, quiet hours, channel choice); legal unsubscribe for marketing.
- **Rate limiting** per user (no spam) and per provider (their limits).
- **Retries with backoff** and provider failover (a second SMS provider for OTPs).
- **Templates** with localisation and variables, versioned.
- **Tracking**: sent, delivered, opened, failed; invalid device tokens removed.
- **Campaign fan-out**: a job expands a segment into batches, throttled.

=== lesson: blob-storage-presigned-urls | Blob storage and presigned URLs
**Object storage** (S3, Cloudflare R2, Google Cloud Storage, Supabase Storage) stores files as objects in buckets: cheap, durable (S3 is designed for eleven nines), unlimited size, served over HTTP. Don't put files in your database or on app servers' disks.

## Presigned URLs

A URL signed with your credentials that grants **temporary** permission for one operation on one object, without exposing credentials or routing bytes through your servers.

```js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const url = await getSignedUrl(s3, new PutObjectCommand({
  Bucket: "uploads", Key: `users/${userId}/${crypto.randomUUID()}.jpg`, ContentType: "image/jpeg",
}), { expiresIn: 300 });   // valid for 5 minutes
```

Same idea for downloads of private files: a short-lived GET URL instead of making the bucket public.

## Serving files

Public assets through a **CDN** in front of the bucket; private files with signed URLs (or signed CDN cookies). Set correct `Content-Type` and `Content-Disposition`; serve user uploads from a separate domain to limit XSS risk.

## Other details

Lifecycle rules (move old files to cheaper storage classes, delete temp uploads), versioning for accidental deletes, CORS configuration for direct browser uploads, and event notifications (S3 → queue → thumbnail worker).

=== lesson: design-file-upload | Design file upload
## Requirements

Users upload images and documents up to several GB; uploads resume after network drops; files are virus-scanned, images get thumbnails; owners control access.

## Flow

```text
1. client → API: POST /uploads {filename, size, type}      (auth, quota, type checks)
2. API → client: uploadId + presigned URL(s)               (multipart for large files)
3. client ──PUT parts directly──▶ object storage            (parallel parts, retry failed parts)
4. client → API: POST /uploads/{id}/complete               (API completes the multipart upload)
5. storage event → queue → workers: virus scan, thumbnails, metadata extraction
6. DB: files table status pending → ready (or rejected); client notified (poll / WebSocket)
```

## Design points

- **Bytes never pass through app servers**: they stay small and stateless.
- **Multipart upload** (S3 parts ≥ 5 MB): parallel and resumable; the client tracks completed parts. Or the tus protocol.
- **Validation twice**: declared metadata before upload, real content (magic bytes, scan) after.
- **Quarantine**: files aren't accessible until scanned.
- **Storage keys** are random, never user-supplied names; original names kept in the DB.
- **Access**: private bucket, short-lived signed download URLs, CDN for public files.
- **Cleanup**: abort incomplete multipart uploads and delete never-completed files with lifecycle rules.
- **Deduplication** by content hash (optional, saves storage for repeated files).

=== lesson: design-a-chat-app | Design a chat app
## Requirements

One-to-one and group chats, real-time delivery, message history, online/typing indicators, read receipts, push notifications when offline. Scale: millions of daily users, ordered messages per conversation.

## Architecture

```text
clients ⇄ WebSocket gateway (many instances, stateful connections)
              │  publish / subscribe
              ▼
        pub/sub (Redis / Kafka) ── routes messages to the gateway holding each recipient's connection
              │
       Chat service ──▶ message store (Cassandra / Postgres partitioned by conversation)
              └──▶ push notification service for offline users
       Presence service (Redis with TTL heartbeats)
```

## Sending a message

1. Client sends `{conversationId, clientMsgId, text}` over its WebSocket.
2. Gateway → chat service: validate membership, assign a **server ID / sequence per conversation**, persist.
3. Ack to sender (with server ID; `clientMsgId` dedupes retries).
4. Publish to the conversation's channel; gateways holding recipients' sockets push it.
5. Offline recipients → push notification. On reconnect, clients fetch messages after their last seen sequence.

## Deep dives

- **Ordering**: per-conversation sequence numbers; clients sort by them.
- **Storage**: messages are write-heavy and read by conversation + time → partition key `conversation_id`, clustering by message ID (Cassandra/ScyllaDB), or Postgres partitioned tables at smaller scale.
- **Connection routing**: a registry of `userId → gateway instance` (Redis), or per-conversation pub/sub channels.
- **Group fan-out**: small groups → push to each member; huge channels → members pull.
- **Presence**: heartbeats every ~30 s with Redis TTL keys; batch presence updates to avoid floods.
- **Delivery semantics**: at-least-once with dedupe by message ID; read receipts as separate lightweight events.
- **End-to-end encryption** (Signal protocol) changes the design: server stores ciphertext only.

=== lesson: monolith-vs-microservices | Monolith vs microservices
| | Monolith | Microservices |
|---|---|---|
| Deploy | one unit | each service independently |
| Codebase | one, shared | many, owned by teams |
| Calls | in-process function calls | network calls (latency, failures) |
| Data | one database, transactions everywhere | database per service; eventual consistency across services |
| Scaling | scale the whole app | scale hot services independently |
| Ops | simple | service discovery, tracing, versioned APIs, many pipelines |
| Best for | small/medium teams, early products | many teams, clear domain boundaries, very different scaling needs |

## The common, reasonable answer

Start with a **modular monolith**: one deployable, but strict internal boundaries (modules with their own data access and public interfaces, no reaching into each other's tables). Extract a service only when there's a concrete reason:

- a team needs to deploy independently,
- one part has very different scaling or reliability needs (image processing, a real-time gateway),
- a different technology fits much better (Python ML service),
- isolation for security or compliance.

## Microservice pitfalls

A "distributed monolith" (services that must deploy together), chatty synchronous call chains (latency adds up, one failure cascades), shared databases between services, and premature splitting before the domain is understood.

> "I'd keep it a modular monolith until team size or scaling needs justify splitting. Microservices trade code complexity for operational complexity, and that only pays off with several teams."

=== lesson: consistency-models-strong-eventual | Consistency models: strong and eventual
- **Strong consistency**: after a write completes, every read sees it. Behaves like a single copy of the data.
- **Eventual consistency**: replicas may briefly disagree, but converge if writes stop. Reads may return stale data.

## In between

- **Read-your-writes**: a user always sees their own changes (others may not yet).
- **Monotonic reads**: you never see data go "back in time" across reads.
- **Causal consistency**: if B depends on A (a reply to a comment), everyone sees A before B.

## Where each fits

| Strong | Eventual is fine |
|---|---|
| account balances, payments, inventory decrements | like counts, view counts, follower counts |
| uniqueness (usernames, seat booking) | feeds, timelines, search indexes |
| permissions changes (revoking access) | analytics, recommendations |

## How systems provide it

Strong: a single primary database, synchronous replication, or consensus (Raft/Paxos in etcd, CockroachDB, Spanner). Eventual: async replicas, caches, event-driven updates between services, multi-leader setups.

In interviews, say **per feature** which level you need and why, and how you'd hide staleness from users (read-your-writes routing, optimistic UI).

=== lesson: cap-theorem | CAP theorem
In a distributed data store, when a **network partition** happens (nodes can't talk to each other), you must choose between:

- **Consistency** — every read gets the latest write (or an error), or
- **Availability** — every request gets a non-error response (possibly stale).

You can't have both **during a partition**. Partitions will happen, so "CA" isn't a real option for distributed systems.

## Examples

- **CP**: a bank ledger, a lock service (etcd, ZooKeeper), a strongly consistent database: refuses some requests during a partition rather than risk wrong answers.
- **AP**: a shopping cart, social feeds, DNS, Cassandra/DynamoDB in their default modes: keeps answering, reconciles later.

## PACELC: the more useful version

**If Partition**: choose **A** or **C**; **Else** (normal operation): choose **Latency** or **Consistency**. Most of the time there's no partition, and the real everyday trade-off is latency vs consistency (synchronous replication across regions is slow).

> "CAP says that during a network partition a distributed system must give up either consistency or availability. I'd pick per feature: payments CP, likes and feeds AP. Day to day, the bigger trade-off is latency vs consistency, which is what PACELC adds."

=== lesson: consistent-hashing | Consistent hashing
Distributing keys across N servers with `hash(key) % N` breaks badly when N changes: going from 4 to 5 servers moves about 80% of keys (every cache misses at once).

**Consistent hashing** places servers and keys on a ring (hash space). Each key belongs to the next server clockwise. Adding or removing a server only moves the keys in its neighbouring segment, about `1/N` of them.

**Virtual nodes**: each server appears at many points on the ring (e.g. 100), which evens out the load and spreads a removed server's keys across all others.

```jsrun
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
function ring(servers, vnodes = 100) {
  const points = [];
  for (const s of servers) for (let v = 0; v < vnodes; v++) points.push([hash(s + "#" + v), s]);
  points.sort((a, b) => a[0] - b[0]);
  return key => { const h = hash(key); return (points.find(p => p[0] >= h) || points[0])[1]; };
}
const keys = Array.from({ length: 10000 }, (_, i) => "user:" + i);
const before = ring(["A", "B", "C", "D"]), after = ring(["A", "B", "C", "D", "E"]);
const moved = keys.filter(k => before(k) !== after(k)).length;
const modMoved = keys.filter(k => hash(k) % 4 !== hash(k) % 5).length;
console.log("consistent hashing moved", (moved / 100).toFixed(1) + "% of keys");
console.log("hash % N moved", (modMoved / 100).toFixed(1) + "% of keys");
```

Used in: distributed caches (Memcached clients), Cassandra and DynamoDB partitioning, load balancers keeping users on the same cache node, sharded databases.

=== lesson: fan-out-on-read-vs-write | Fan-out on read vs write
How do you build each user's home feed (posts from people they follow)?

## Fan-out on write (push)

When someone posts, write the post ID into the feed list of **every follower** (e.g. a Redis list per user). Reading a feed is one fast lookup.

- Fast reads, which is what users do most.
- Writes explode for celebrities: one post × 50M followers.
- Wasted work for inactive followers.

## Fan-out on read (pull)

When a user opens the feed, fetch recent posts from everyone they follow and merge them.

- Cheap writes, always fresh.
- Slow reads for users who follow thousands of accounts.

## Hybrid (what large networks do)

Push for normal accounts; for accounts with huge follower counts, **pull** their posts at read time and merge them into the precomputed feed. Also skip pushing to inactive users and rebuild their feed when they return.

The same trade-off appears in notifications, activity streams and inboxes: precompute where reads dominate, compute on demand where writes would explode.

=== lesson: multi-tenancy | Multi-tenancy
A **multi-tenant** SaaS serves many customer organisations (tenants) from shared infrastructure, while keeping their data separate.

## Isolation models

| Model | Isolation | Cost / ops |
|---|---|---|
| Shared tables with `tenant_id` column | logical (relies on every query filtering) | cheapest, simplest to run |
| Schema per tenant | stronger | migrations × N schemas |
| Database per tenant | strongest, per-tenant backups/restore | expensive, many connections |
| Hybrid | shared for small tenants, dedicated for enterprise | flexible |

## Making shared tables safe

- `tenant_id` on every tenant-owned table, part of every index and unique constraint.
- Enforce scoping centrally: Postgres **row-level security** with a `SET app.tenant_id`, or a repository layer that always adds the filter. Tests that try cross-tenant reads.
- Tenant ID comes from the authenticated session, never from client input.

## Other concerns

- **Noisy neighbours**: per-tenant rate limits and quotas; move huge tenants to dedicated resources.
- Per-tenant configuration, feature flags, branding, SSO.
- Data residency (EU tenants' data in EU), per-tenant export and deletion.
- Billing and usage metering per tenant.

=== lesson: feature-flags | Feature flags
A **feature flag** turns behaviour on or off at runtime without deploying.

```js
if (await flags.isEnabled("new-checkout", { userId, country, plan })) {
  return newCheckout(cart);
}
return oldCheckout(cart);
```

## Uses

- **Decouple deploy from release**: merge unfinished work behind a flag (trunk-based development).
- **Gradual rollouts**: 1% → 10% → 50% → 100%, watching errors and metrics.
- **Kill switches**: instantly disable a broken or expensive feature.
- **Targeting**: internal users, beta testers, a region, a plan.
- **Experiments**: A/B tests with metrics per variant.

## Practices

- Consistent bucketing: hash the user ID so a user stays in the same group.
- Evaluate server-side for anything sensitive; client-side flags are visible.
- **Remove flags** after rollout: stale flags are technical debt and make code paths combinatorial. Give each an owner and an expiry.
- Defaults that are safe if the flag service is unreachable.

Tools: LaunchDarkly, Unleash, Flagsmith, GrowthBook, PostHog, Vercel Flags, or a config table for simple needs.

=== lesson: observability-logs-metrics-traces | Observability: logs, metrics and traces
Observability answers "what is happening in production, and why?" Three signals:

| Signal | What | Good for | Example |
|---|---|---|---|
| **Metrics** | numbers over time, aggregated | dashboards, alerts, trends | request rate, error rate, p95 latency, queue depth |
| **Logs** | individual events with context | details of a specific failure | structured JSON with request ID |
| **Traces** | a request's path across services, timed per step | finding which hop is slow | checkout → payment → DB query 1.2 s |

## What to measure

- **RED** for services: Rate, Errors, Duration.
- **USE** for resources: Utilisation, Saturation, Errors (CPU, memory, connections).
- **The four golden signals** (Google SRE): latency, traffic, errors, saturation.
- Business metrics: signups, orders, payments succeeded.

## Alerting

Alert on **symptoms users feel** (error rate, latency SLO breaches), not on every cause (CPU 80%). Define **SLOs** ("99.9% of requests succeed under 300 ms over 30 days") and alert when the error budget burns too fast. Every alert should be actionable, with a runbook.

## Tools

OpenTelemetry (vendor-neutral instrumentation), Prometheus + Grafana, Datadog, New Relic, Honeycomb, Sentry (errors), Grafana Loki / ELK (logs), Jaeger/Tempo (traces). Propagate a trace ID through every service, queue message and log line.

=== lesson: service-discovery | Service discovery
With many instances starting and stopping (autoscaling, deploys), services need a way to find each other's current addresses.

## Approaches

- **DNS-based**: a stable name (`orders.internal`) resolving to current instances or a load balancer. Simple; watch DNS caching TTLs.
- **Load balancer per service**: callers use one stable address; the LB tracks healthy instances.
- **Service registry**: instances register themselves (Consul, etcd, Eureka) with health checks; clients or proxies query it.
- **Kubernetes**: a `Service` gives a stable virtual IP and DNS name (`orders.default.svc.cluster.local`) for a set of pods selected by labels; kube-proxy routes to ready pods.
- **Service mesh** (Istio, Linkerd): sidecar proxies handle discovery plus retries, timeouts, mTLS and metrics.

## Client-side vs server-side discovery

- **Client-side**: the caller fetches instances from the registry and load-balances itself (more control, more logic in every client).
- **Server-side**: the caller hits a router/LB that does it (simpler clients).

In most modern setups this is handled by the platform (Kubernetes services, cloud load balancers, ECS Service Connect), so in interviews it's enough to explain the problem and name how your platform solves it.

=== lesson: cqrs-and-event-sourcing | CQRS and event sourcing
Two patterns often mentioned together; both add complexity, so know when they're worth it.

## CQRS (Command Query Responsibility Segregation)

Use **different models for writes and reads**. Commands go to a write model optimised for validation and consistency; queries go to read models (denormalized tables, search indexes, caches) optimised for each screen, updated from events.

```text
command → write model (normalized DB) ──events──▶ projector ──▶ read models (dashboard table, Elasticsearch, cache)
query ───────────────────────────────────────────────────────▶ read models
```

Good when reads and writes have very different shapes or scale (complex dashboards over transactional data). Cost: read models are eventually consistent and must be rebuilt when they change.

## Event sourcing

Store the **sequence of events** (`Deposited 500`, `Withdrew 200`) as the source of truth instead of current state. Current state is derived by replaying events (with snapshots for speed).

- Full audit history and the ability to rebuild state, debug past states, or create new projections later.
- Natural fit for ledgers, order workflows, collaborative editing.
- Costs: event schema evolution, replay time, harder queries (you need projections), and a steep learning curve.

> "I'd use CQRS-style read models for a heavy dashboard, but full event sourcing only where history itself is the product, like a financial ledger."
