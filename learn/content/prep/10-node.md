---
course: prep
module: node-and-backend
title: Node and backend
order: 110
---
=== lesson: node-event-loop-phases | The Node event loop phases
Node runs your JavaScript on one thread and hands I/O to the operating system (and a thread pool). The event loop decides which callback runs next. It cycles through **phases**, each with its own queue:

1. **timers** — `setTimeout` / `setInterval` callbacks whose time has come.
2. **pending callbacks** — some deferred system callbacks (e.g. TCP errors).
3. **idle, prepare** — internal.
4. **poll** — wait for and run I/O callbacks (network, files). If nothing else is scheduled, Node blocks here waiting for I/O.
5. **check** — `setImmediate` callbacks.
6. **close callbacks** — `socket.on("close")` and similar.

**Between every callback** (not just between phases), Node drains two microtask queues: first `process.nextTick`, then promises.

## Ordering puzzle

```js
setTimeout(() => console.log("timeout"), 0);
setImmediate(() => console.log("immediate"));
process.nextTick(() => console.log("nextTick"));
Promise.resolve().then(() => console.log("promise"));
console.log("sync");
// sync, nextTick, promise, then timeout/immediate in either order from the main module.
// Inside an I/O callback, setImmediate always runs before setTimeout(…, 0).
```

## Why it matters in practice

- **Never block the loop**: a CPU-heavy loop, `JSON.parse` of a 50 MB body, synchronous file or crypto calls, or a catastrophic regex freezes **every** request on that process. Measure event-loop lag (`perf_hooks.monitorEventLoopDelay`).
- Recursive `process.nextTick` can starve I/O.
- Offload CPU work to worker threads or another service.

> **"How does Node handle many concurrent requests on one thread?"** Requests spend most of their time waiting on I/O. Node starts the I/O, registers a callback, and keeps serving others; the event loop runs callbacks as I/O completes. It only works while each callback is short and non-blocking.

=== lesson: libuv | libuv
**libuv** is the C library underneath Node that provides the event loop and asynchronous I/O across operating systems.

## What it does

- **The event loop** itself (the phases from the previous lesson).
- **Network I/O** using the OS's non-blocking mechanisms: epoll (Linux), kqueue (macOS), IOCP (Windows). No threads needed: one thread can watch thousands of sockets.
- **A thread pool** (4 threads by default, `UV_THREADPOOL_SIZE` up to 1024) for work that has no non-blocking OS API:
  - file system operations (`fs.*`),
  - DNS lookups via `dns.lookup` (used by `http.get` by default),
  - some `crypto` (pbkdf2, scrypt, randomBytes) and `zlib`.
- Timers, signals, child processes.

## The practical gotcha

If you run many `fs` or `crypto.pbkdf2` calls at once, they queue for those **4 threads**. Example: password hashing under load makes unrelated file reads slow. Raising `UV_THREADPOOL_SIZE` (set before startup) or moving hashing elsewhere helps.

> **"Is Node single-threaded?"** Your JavaScript runs on a single thread, but Node isn't: libuv uses the OS's async networking and a thread pool for file system, DNS and some crypto work, and you can create worker threads for CPU-heavy JS.

=== lesson: buffers | Buffers
A `Buffer` is Node's fixed-size chunk of raw bytes, outside the V8 heap. It's how Node deals with binary data: files, network packets, images, hashes. It's a subclass of `Uint8Array`.

```js
const b = Buffer.from("héllo", "utf8");
b.length;                        // 6 bytes (é takes 2 in UTF-8), not 5 characters
b.toString("hex");               // '68c3a96c6c6f'
b.toString("base64");            // 'aMOpbGxv'
Buffer.concat([b1, b2]);
Buffer.alloc(16);                // zero-filled
Buffer.allocUnsafe(16);          // faster, contains old memory: overwrite before use
```

The browser equivalent is `Uint8Array` with `TextEncoder`/`TextDecoder`:

```jsrun
const bytes = new TextEncoder().encode("héllo");
console.log(bytes.length, [...bytes].map(b => b.toString(16).padStart(2, "0")).join(""));
console.log(new TextDecoder().decode(bytes));
```

## Gotchas

- **Byte length ≠ string length** for non-ASCII text; matters for size limits and `Content-Length`.
- Concatenating chunks from a stream as strings can split a multi-byte character across chunks. Collect Buffers and decode once, or use `setEncoding("utf8")`, which handles it.
- Compare secrets with `crypto.timingSafeEqual`, not `===`.
- Reading a huge file into one Buffer can exhaust memory; stream it instead.

=== lesson: streams-backpressure | Streams and backpressure
**Streams** process data piece by piece instead of loading it all into memory: reading a 4 GB file, piping an upload to S3, compressing a response.

Types: **Readable** (source), **Writable** (destination), **Duplex** (both: a socket), **Transform** (modifies data passing through: gzip, CSV parsing).

```js
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { createGzip } from "node:zlib";

await pipeline(
  createReadStream("access.log"),
  createGzip(),
  createWriteStream("access.log.gz"),
);   // constant memory regardless of file size; errors and cleanup handled
```

## Backpressure

When the destination is slower than the source (a slow client, a slow disk), data piles up in memory. **Backpressure** is the signal to slow down:

- `writable.write(chunk)` returns `false` when its internal buffer passes `highWaterMark`.
- The producer should stop and wait for the `"drain"` event.
- `pipe()` and `pipeline()` do this automatically. Writing in a loop and ignoring the return value is how you get out-of-memory crashes.

## Why pipeline over pipe

`pipe` doesn't forward errors or destroy the other streams when one fails, which leaks file descriptors. `pipeline` handles errors and cleanup and works with `async` generators:

```js
await pipeline(source, async function* (chunks) {
  for await (const chunk of chunks) yield chunk.toString().toUpperCase();
}, destination);
```

Web streams (`ReadableStream`) are the browser/fetch equivalent, and Node supports them too.

=== lesson: middleware-request-lifecycle | Middleware and the request lifecycle
In Express (and Koa, Fastify hooks, Nest interceptors), a request passes through a chain of **middleware** functions before reaching a route handler.

```js
const app = express();
app.use(helmet());                          // security headers
app.use(cors({ origin: ["https://app.acme.com"], credentials: true }));
app.use(express.json({ limit: "1mb" }));    // parse bodies, with a size limit
app.use(requestId);                         // attach an id for logs
app.use(requestLogger);

app.get("/orders/:id", requireAuth, loadOrder, (req, res) => res.json(req.order));

app.use(notFound);
app.use(errorHandler);                      // 4 arguments: (err, req, res, next)

function requireAuth(req, res, next) {
  const user = verifySession(req.cookies.session);
  if (!user) return res.status(401).json({ error: "unauthenticated" });   // stop the chain
  req.user = user;
  next();                                                               // continue
}
```

## The order matters

Each middleware either **responds** (ending the chain), calls `next()` to continue, or calls `next(err)` to skip to error handlers. Typical order: security headers → CORS → body parsing → request ID/logging → rate limiting → auth → routes → 404 → error handler.

## Common bugs

- Forgetting `next()`: the request hangs.
- Calling `next()` after sending a response: "headers already sent".
- Async middleware throwing in Express 4: the error isn't caught (see Async error propagation). Express 5 handles rejected promises.
- Auth middleware mounted after the routes it should protect.

=== lesson: error-handling-strategy | Error handling strategy
A consistent approach so errors are handled once, logged once, and returned safely.

## Two kinds of errors

- **Operational** (expected): invalid input, not found, permission denied, a dependency timing out. Handle them and return a proper status.
- **Programmer** errors (bugs): undefined is not a function, broken invariants. Log with full detail, return a generic 500, and fix the code. After an unknown exception the process may be in a bad state; crashing and letting the supervisor restart it is often safer.

## A typed error hierarchy

```js
class AppError extends Error {
  constructor(message, { status = 500, code = "internal", details, cause } = {}) {
    super(message, { cause });
    Object.assign(this, { status, code, details });
  }
}
class NotFoundError extends AppError { constructor(what) { super(`${what} not found`, { status: 404, code: "not_found" }); } }
class ValidationError extends AppError { constructor(details) { super("Invalid input", { status: 422, code: "validation", details }); } }
```

## One central handler

```js
app.use((err, req, res, _next) => {
  const known = err instanceof AppError;
  req.log[known && err.status < 500 ? "warn" : "error"]({ err }, "request failed");
  res.status(known ? err.status : 500).json({
    error: { code: known ? err.code : "internal", message: known ? err.message : "Something went wrong", details: err.details, requestId: req.id },
  });
});
```

## Principles

- Never leak stack traces or SQL errors to clients.
- Wrap low-level errors with context (`{ cause }`) instead of losing them.
- Don't swallow errors (`catch {}`): handle, rethrow, or log with a reason.
- Include the request ID in responses so support can find the logs.
- Alert on 5xx rates, not on every 4xx.

=== lesson: async-error-propagation | Async error propagation
Errors in async code only propagate if every step is awaited or returned.

## Where errors get lost

```js
app.get("/user/:id", async (req, res) => {
  const user = await db.findUser(req.params.id);   // Express 4: a rejection here is NOT caught
  res.json(user);
});

function save() {
  db.insert(row);            // missing await/return: caller never sees the failure
}

items.forEach(async (item) => {
  await process(item);       // forEach ignores the promises; errors are unhandled
});
```

## Fixes

- **Express 5** (stable since 2024) forwards rejected promises from handlers to the error middleware. In Express 4, wrap handlers: `const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);`
- Always `await` or `return` promises. The `@typescript-eslint/no-floating-promises` lint rule catches missing ones.
- Use `for...of` with `await`, or `await Promise.all(items.map(process))` (or `allSettled` if partial failure is fine).
- Event emitters: errors are emitted as `"error"` events; an `error` event with no listener crashes the process.

## Process-level handlers

```js
process.on("unhandledRejection", (reason) => { logger.fatal({ reason }, "unhandled rejection"); process.exit(1); });
process.on("uncaughtException", (err) => { logger.fatal({ err }, "uncaught exception"); process.exit(1); });
```

These are a last resort for logging before exiting; let your process manager (Kubernetes, PM2, systemd) restart it. Node crashes on unhandled rejections by default since v15.

=== lesson: environment-config | Environment config
The twelve-factor rule: configuration that varies between environments (URLs, credentials, feature flags, limits) comes from the **environment**, not from code.

## Validate at startup

Crash immediately with a clear message if config is missing or wrong, instead of failing at 3 am when a code path first reads it.

```ts
import { z } from "zod";
const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  RATE_LIMIT_PER_MIN: z.coerce.number().default(100),
});
export const env = Env.parse(process.env);   // typed everywhere; throws on startup if invalid
```

## Practices

- `.env` for local development only (git-ignored), with a committed `.env.example` listing every variable.
- Real secrets in a secrets manager or the platform's encrypted variables.
- One typed config module; the rest of the code imports `env`, never reads `process.env` directly.
- Same build artifact promoted through staging and production; only the environment differs.
- Node 20.6+ can load env files natively: `node --env-file=.env server.js`.

=== lesson: structured-logging | Structured logging
Log **JSON objects** with consistent fields instead of free-text strings, so logs can be searched, filtered and aggregated.

```js
import pino from "pino";
const logger = pino({ level: process.env.LOG_LEVEL ?? "info", redact: ["req.headers.authorization", "*.password"] });

logger.info({ orderId, userId, amount, durationMs: 182 }, "order placed");
// {"level":30,"time":1760500000000,"orderId":"o_91","userId":"u_42","amount":4999,"durationMs":182,"msg":"order placed"}
```

Now you can query `orderId = "o_91"` or chart `durationMs` by endpoint.

## What to include

- A **request ID** (or trace ID) on every line, propagated to downstream services and returned to clients. Use child loggers: `req.log = logger.child({ requestId })`.
- User/tenant ID, route, status, duration.
- Errors as objects with stack traces.

## Levels

`fatal` (process dying), `error` (needs attention), `warn` (unexpected but handled), `info` (business events), `debug` (development detail). Production usually runs at `info`.

## Don't log

Passwords, tokens, full card numbers, personal data you don't need: use redaction. And avoid logging inside hot loops; logging has a cost (pino is fast because it does the minimum work in-process).

Logs feed into a platform (Datadog, Grafana Loki, CloudWatch, ELK). Combine with metrics and traces (see Observability in System design).

=== lesson: connection-pooling | Connection pooling in Node
(See also SQL → Connection pooling for the database side.)

In Node, create **one pool per process** at startup and share it, never a new client per request.

```js
import pg from "pg";
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,                       // per process
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000, // fail fast instead of hanging when exhausted
});

const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);   // borrows and returns

const client = await pool.connect();       // for a transaction: one connection throughout
try {
  await client.query("BEGIN");
  /* … */
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK"); throw e;
} finally {
  client.release();                        // always, or the pool leaks
}
```

## Sizing across processes

Total connections = pool size × processes × instances. 10 per process × 4 cluster workers × 6 pods = 240, which may exceed the database's limit. Size pools from the database's budget backwards, or put PgBouncer in front.

## Symptoms of trouble

Requests hanging then timing out (pool exhausted: slow queries, leaked clients not released, transactions held across `await fetch(...)`), and "too many connections" errors from the database (too many pools). Expose pool stats (total, idle, waiting) as metrics.

The same applies to Redis clients and HTTP clients (`undici` keep-alive agents reuse connections to upstream APIs).

=== lesson: file-uploads-multipart | File uploads and multipart
Browsers send files as `multipart/form-data`: the body is split into parts by a boundary string, each part with its own headers.

## Two architectures

**1. Through your server** (small files, or when you must process them):

```js
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
app.post("/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  const type = await fileTypeFromBuffer(req.file.buffer);           // check magic bytes, not the extension
  if (!["image/png", "image/jpeg", "image/webp"].includes(type?.mime)) return res.status(415).end();
  const key = `avatars/${req.user.id}/${crypto.randomUUID()}.webp`;
  await s3.putObject({ Bucket, Key: key, Body: await sharp(req.file.buffer).resize(256).webp().toBuffer() });
  res.json({ key });
});
```

For large files, stream to storage (busboy) instead of buffering in memory.

**2. Direct to object storage with presigned URLs** (large files, scale):

1. Client asks your API for an upload URL (you check auth and the declared size/type).
2. API returns a short-lived presigned PUT URL for S3/R2/GCS.
3. Client uploads directly to storage; your server never touches the bytes.
4. Storage notifies your backend (event) or the client confirms; you validate and process asynchronously (virus scan, thumbnails).

Large files: multipart uploads (S3) or resumable protocols (tus) so a dropped connection doesn't restart from zero.

## Security checklist

Size limits, type checks by content, random server-generated names (never the user's filename in a path), store outside the web root, scan for malware, serve user uploads from a separate domain with `Content-Disposition: attachment` where appropriate.

=== lesson: background-jobs-queues-with-bullmq | Background jobs and queues with BullMQ
Work that doesn't need to happen inside the request (sending emails, generating PDFs, processing images, calling slow third-party APIs, webhooks) goes to a **queue** and runs in **workers**. The request returns quickly; the work happens reliably, with retries.

```js
import { Queue, Worker } from "bullmq";
const connection = { url: env.REDIS_URL };

export const emailQueue = new Queue("email", { connection });
await emailQueue.add("welcome", { userId }, {
  jobId: `welcome:${userId}`,                           // dedupe
  attempts: 5, backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: 1000, removeOnFail: 5000,
});

new Worker("email", async (job) => {
  const user = await db.user.find(job.data.userId);     // re-read current data; don't trust stale payloads
  await sendWelcomeEmail(user);
}, { connection, concurrency: 10 });
```

BullMQ stores jobs in Redis. Alternatives: AWS SQS, RabbitMQ, Google Cloud Tasks, Postgres-based queues (pg-boss, Graphile Worker), or hosted workflow engines (Inngest, Trigger.dev, Temporal) for multi-step jobs.

## Concepts to explain

- **At-least-once delivery**: a job can run twice (a worker crashes after doing the work but before acknowledging). Make jobs **idempotent**.
- **Retries with backoff**, and a **dead-letter** list for jobs that keep failing, with alerting.
- **Concurrency and rate limits** per queue (don't hit an email provider's limit).
- **Priorities and delayed jobs** (send a reminder in 24 hours).
- **The outbox pattern**: if a job must be enqueued only when a DB transaction commits, write it to an `outbox` table in the same transaction and have a relay push it to the queue.

=== lesson: cron-scheduled-jobs | Cron and scheduled jobs
Recurring work: nightly reports, cleanup, subscription renewals, syncing data.

## Cron syntax

```
┌ minute (0-59)
│ ┌ hour (0-23)
│ │ ┌ day of month
│ │ │ ┌ month
│ │ │ │ ┌ day of week (0 = Sunday)
0 2 * * *      every day at 02:00
*/15 * * * *   every 15 minutes
0 9 * * 1-5    09:00 on weekdays
```

## The multi-instance problem

`node-cron` inside your web server runs the job **once per instance**: with 4 replicas, the nightly invoice job runs 4 times. Options:

- A dedicated scheduler: Kubernetes CronJob, cloud schedulers (EventBridge Scheduler, Cloud Scheduler), Vercel Cron, GitHub Actions schedules.
- Repeatable jobs in a queue (BullMQ's `repeat` option) where Redis guarantees one scheduled instance.
- A distributed lock (Redis, Postgres advisory lock) around the job.

## Making jobs robust

- **Idempotent and resumable**: it may run twice or crash halfway. Track progress (process records "where processed_at IS NULL", in batches).
- **Timezones**: decide whether "9 am" means UTC or the user's local time; servers usually run in UTC.
- **Overlap**: a job that takes longer than its interval shouldn't start a second copy.
- **Monitoring**: alert when a job **didn't run** (heartbeat checks like Healthchecks.io or Cronitor), not just when it fails.

=== lesson: retries-exponential-backoff | Retries and exponential backoff
Network calls fail transiently: timeouts, 503s, connection resets. Retrying helps, but naive retries make outages worse.

## Exponential backoff with jitter

Wait longer after each failure, with randomness so thousands of clients don't retry in sync (the thundering herd).

```jsrun
async function withRetry(fn, { retries = 4, base = 50, max = 2000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !err.retryable) throw err;
      const delay = Math.random() * Math.min(max, base * 2 ** attempt);   // "full jitter"
      console.log(`attempt ${attempt + 1} failed, retrying in ${Math.round(delay)} ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

let calls = 0;
const flaky = async () => {
  if (++calls < 3) throw Object.assign(new Error("503"), { retryable: true });
  return "ok after " + calls + " calls";
};
withRetry(flaky).then(console.log);
```

## Rules

- **Only retry what can succeed later**: timeouts, 429, 502, 503, 504, connection errors. Never retry 400/401/403/404/422.
- **Only retry idempotent operations**, or make them idempotent with idempotency keys.
- Respect `Retry-After` headers.
- **Cap total time**: set an overall deadline, and per-attempt timeouts.
- **Retry at one layer only**. If the client, the API and the service each retry 3 times, one failure becomes 27 calls (retry amplification).
- Combine with a **circuit breaker** so a dead dependency isn't hammered.

=== lesson: circuit-breakers | Circuit breakers
When a dependency is down, every request waiting on it ties up threads, connections and time, and retries pile more load onto a struggling service. A **circuit breaker** stops calling it for a while.

## States

- **Closed** (normal): calls go through; failures are counted.
- **Open**: failure rate crossed a threshold (e.g. 50% of the last 20 calls). Calls **fail immediately** without touching the dependency, returning a fallback or an error.
- **Half-open**: after a cooldown, let a few trial calls through. Success closes the circuit; failure opens it again.

```jsrun
function breaker(fn, { threshold = 3, cooldownMs = 100 } = {}) {
  let failures = 0, openedAt = 0;
  return async (...args) => {
    if (failures >= threshold && Date.now() - openedAt < cooldownMs) throw new Error("circuit open: failing fast");
    try {
      const result = await fn(...args);
      failures = 0;                                   // success closes it
      return result;
    } catch (e) {
      if (++failures >= threshold) openedAt = Date.now();
      throw e;
    }
  };
}
const down = breaker(async () => { throw new Error("upstream 503"); });
(async () => {
  for (let i = 1; i <= 5; i++) {
    try { await down(); } catch (e) { console.log(i, e.message); }
  }
})();
```

## In practice

Libraries: `opossum` (Node), resilience4j (Java), or a service mesh (Envoy/Istio outlier detection). Pair with **timeouts** (essential: without them nothing ever "fails"), **fallbacks** (cached data, a default, a degraded feature) and **bulkheads** (separate pools per dependency so one slow service can't exhaust everything).

=== lesson: graceful-shutdown | Graceful shutdown
Deploys, autoscaling and restarts send your process `SIGTERM`. Exiting immediately drops in-flight requests and half-finished jobs.

```js
const server = app.listen(env.PORT);
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down");
  // 1. stop taking new work: fail readiness checks so the load balancer stops routing here
  // 2. finish in-flight requests
  server.close();                          // stops accepting; waits for open requests
  server.closeIdleConnections?.();
  await worker?.close();                   // let queue workers finish their current job
  // 3. release resources
  await pool.end();
  await redis.quit();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
setTimeout(() => process.exit(1), 25_000).unref?.();   // hard deadline, under the platform's grace period
```

## Kubernetes details

- The pod gets `SIGTERM`, then `SIGKILL` after `terminationGracePeriodSeconds` (30 s default). Finish within it.
- Endpoint removal and `SIGTERM` happen concurrently, so a few new requests may still arrive. A short `preStop` sleep (5 s) or failing the readiness probe first helps.
- Run Node as PID 1 carefully (or via `tini`/`dumb-init`), and use `node server.js`, not `npm start`, which doesn't forward signals reliably.

Long-running work should be resumable anyway, since crashes don't give you a graceful shutdown.

=== lesson: cluster-worker-threads | Cluster and worker threads
Node runs JavaScript on one thread, so one process uses one CPU core. Two ways to use more:

## cluster (multiple processes)

The primary process forks workers (one per core); they share the listening port.

```js
import cluster from "node:cluster";
import os from "node:os";
if (cluster.isPrimary) {
  for (let i = 0; i < os.availableParallelism(); i++) cluster.fork();
  cluster.on("exit", () => cluster.fork());     // replace crashed workers
} else {
  startServer();
}
```

Each worker has its own memory: no shared in-process state (sessions, caches, rate-limit counters must live in Redis). In containers, the usual approach is **one process per container** and scaling the number of containers instead (or PM2's cluster mode on VMs).

## worker_threads (threads in one process)

For **CPU-heavy JavaScript** (image processing, parsing big files, cryptography, report generation) that would otherwise block the event loop.

```js
import { Worker } from "node:worker_threads";
function runReport(data) {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL("./report-worker.js", import.meta.url), { workerData: data });
    w.once("message", resolve);
    w.once("error", reject);
  });
}
```

Threads can share memory with `SharedArrayBuffer` and transfer `ArrayBuffer`s without copying. Use a pool (Piscina) rather than creating a thread per request.

> **"How would you handle a CPU-heavy endpoint in Node?"** Keep it off the event loop: a worker-thread pool for moderate work, a background job queue if the result can be async, or a separate service in a better-suited language for heavy processing. Scale request handling horizontally with more processes or containers.
