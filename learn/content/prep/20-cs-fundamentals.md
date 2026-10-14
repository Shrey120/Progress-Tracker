---
course: prep
module: cs-fundamentals
title: CS fundamentals
order: 120
---
=== lesson: processes-vs-threads | Processes vs threads
- A **process** is a running program with its **own memory space**, file handles and at least one thread. Processes are isolated: one crashing doesn't corrupt another.
- A **thread** is a path of execution **inside** a process. Threads in the same process **share memory**, so they communicate cheaply but must coordinate access (locks).

| | Process | Thread |
|---|---|---|
| Memory | separate | shared within the process |
| Creation / switching cost | higher | lower |
| Communication | IPC: pipes, sockets, shared memory, messages | shared variables (with synchronisation) |
| Failure isolation | strong | a crash or memory bug affects the whole process |

## In the stacks you use

- **Node.js**: one process, one JavaScript thread (plus libuv's thread pool); scale with more processes (cluster, containers) or worker threads for CPU work.
- **Browsers**: Chrome runs each site in its own renderer **process** for security and stability; inside, the main thread runs JS while compositor and worker threads do other work.
- **Python**: threads share the GIL (only one runs Python bytecode at a time in CPython), so CPU-bound work uses processes.
- **Postgres**: a process per connection, which is why connection counts matter.

=== lesson: concurrency-vs-parallelism | Concurrency vs parallelism
- **Concurrency**: dealing with many tasks at once by **interleaving** them; progress on several, not necessarily at the same instant. About structure.
- **Parallelism**: actually executing several tasks **at the same instant** on multiple cores. About execution.

```text
concurrency (1 core):   A A B B A C B A C …   (switching)
parallelism (3 cores):  core1: A A A A
                        core2: B B B B
                        core3: C C C C
```

A single Node process is highly **concurrent** (thousands of requests in flight, each waiting on I/O) but runs JavaScript on one core, so it isn't parallel for CPU work.

```jsrun
const wait = (ms, label) => new Promise(r => setTimeout(() => r(label), ms));
(async () => {
  let t = Date.now();
  await wait(100, "a"); await wait(100, "b"); await wait(100, "c");
  console.log("sequential:", Date.now() - t, "ms");
  t = Date.now();
  await Promise.all([wait(100, "a"), wait(100, "b"), wait(100, "c")]);
  console.log("concurrent:", Date.now() - t, "ms (one thread, waits overlap)");
})();
```

## Which helps when

- **I/O-bound** work (network, disk, DB): concurrency is enough: async/await, event loops, goroutines.
- **CPU-bound** work (image processing, compression, ML): needs parallelism: multiple processes, worker threads, or several machines.

=== lesson: race-conditions | Race conditions
A **race condition** happens when the result depends on the timing of concurrent operations, and an unlucky interleaving gives a wrong result.

## The classic: read-modify-write

```jsrun
let stock = 1;
async function buy(name) {
  const current = stock;                         // 1. read
  await new Promise(r => setTimeout(r, 10));     // (a DB call or network in real life)
  if (current > 0) { stock = current - 1; console.log(name, "bought it"); }   // 2. write
}
Promise.all([buy("Asha"), buy("Ravi")]).then(() => console.log("stock is now", stock, "— but two people bought 1 item"));
```

Even single-threaded JavaScript has races across `await` points, and every web backend with multiple instances has them across requests.

## Fixes

- **Atomic operations** in the database: `UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock > 0` and check the affected row count.
- **Locks**: `SELECT … FOR UPDATE`, mutexes, distributed locks.
- **Unique constraints** so duplicates fail (double sign-ups, double bookings).
- **Optimistic concurrency**: version columns; retry on conflict.
- **Idempotency keys** for retried requests.
- On the frontend: ignore stale responses (abort the previous fetch, or check that the response matches the latest request) so a slow old search result doesn't overwrite a newer one.

=== lesson: deadlocks | Deadlocks
A **deadlock**: two or more tasks each hold a resource and wait for one held by another, so none can proceed.

```text
Task A: locks account 1 → wants account 2
Task B: locks account 2 → wants account 1      → both wait forever
```

## The four conditions (all must hold)

1. **Mutual exclusion**: resources can't be shared.
2. **Hold and wait**: a task holds one resource while waiting for another.
3. **No preemption**: resources can't be forcibly taken away.
4. **Circular wait**: a cycle of tasks each waiting on the next.

Break any one to prevent deadlocks.

## In practice

- **Consistent lock ordering** (always lock the lower ID first) breaks circular wait. The most practical fix.
- **Timeouts** on lock acquisition (`lock_timeout`, `NOWAIT`) and retry.
- Acquire everything needed **at once**, or keep transactions short.
- Detection and recovery: databases detect cycles and abort one transaction (see SQL → Locking and deadlocks); the application retries.

Related: **livelock** (tasks keep reacting to each other and make no progress) and **starvation** (a task never gets the resource because others always win).

=== lesson: mutex-vs-semaphore | Mutex vs semaphore
Both coordinate access to shared resources between concurrent tasks.

- **Mutex** (mutual exclusion lock): only **one** holder at a time. The holder must release it. Protects a critical section ("only one task updates this balance at once").
- **Semaphore**: a counter allowing up to **N** concurrent holders. Acquire decrements; release increments; at zero, acquirers wait. A semaphore with N = 1 behaves like a mutex (without ownership rules).

## A semaphore limiting concurrency

The same idea limits how many requests you send to an API at once:

```jsrun
function semaphore(max) {
  let active = 0; const queue = [];
  const next = () => { if (active < max && queue.length) { active++; queue.shift()(); } };
  return async (task) => {
    await new Promise(r => { queue.push(r); next(); });
    try { return await task(); } finally { active--; next(); }
  };
}
const limit = semaphore(2);
let running = 0, peak = 0;
const job = (i) => limit(async () => { running++; peak = Math.max(peak, running); await new Promise(r => setTimeout(r, 30)); running--; return i; });
Promise.all([1, 2, 3, 4, 5, 6].map(job)).then(r => console.log("done", r, "| max running at once:", peak));
```

Libraries: `p-limit` in Node, connection pools (a semaphore over connections), database advisory locks, Redis-based locks across machines.

=== lesson: context-switching | Context switching
A **context switch** is the operating system pausing one thread or process and resuming another on a CPU core: saving registers, the program counter and stack pointer, and loading another's.

## Why it matters

- It costs **microseconds** each, plus indirect costs: CPU caches and TLB entries become cold for the new task.
- Thousands of threads constantly switching (one thread per connection designs under heavy load) waste CPU on switching rather than work.
- That's a motivation for **event loops** (Node, Nginx) and lightweight user-space tasks (goroutines, async runtimes, virtual threads in Java 21), which switch far more cheaply.

Process switches cost more than thread switches (different memory spaces). Triggers: time slices expiring, blocking on I/O, waiting for locks, interrupts.

The human analogy holds: switching between tasks has a cost, which is also why batching work and fewer, focused threads perform better.

=== lesson: cpu-scheduling | CPU scheduling
The OS **scheduler** decides which ready thread runs next on each core.

| Algorithm | Idea | Trade-off |
|---|---|---|
| First-come, first-served | run in arrival order | long jobs block short ones (convoy effect) |
| Shortest job first | shortest next burst first | optimal average wait; needs to know lengths; long jobs can starve |
| Round robin | each gets a time slice, then back of the queue | fair, responsive; slice too small = switching overhead |
| Priority | highest priority first | starvation (fixed by **aging**: priority rises while waiting) |
| Multilevel feedback queue | several queues; interactive tasks stay high, CPU hogs drop lower | what general-purpose OSs approximate |

Linux used the **Completely Fair Scheduler** (CFS) for years and moved to **EEVDF** in 2023: both aim to give each task a fair share of CPU time, weighted by priority (`nice`).

## Terms

**Preemptive** (the OS can interrupt a running task) vs **cooperative** (tasks yield voluntarily; JavaScript's event loop is cooperative, which is why a long task blocks everything). Metrics: throughput, turnaround time, waiting time, response time.

For web developers, the practical link is the event loop: cooperative scheduling means long tasks must yield.

=== lesson: memory-management | Memory management
## Stack vs heap

- **Stack**: per thread; holds function call frames (local primitives, return addresses). Fast, automatically freed when a function returns, limited size (a stack overflow from deep recursion).
- **Heap**: dynamically allocated objects that outlive a single call. Managed manually (C: `malloc`/`free`), by ownership (Rust), or by a **garbage collector** (JS, Python, Java, Go).

## Garbage collection approaches

- **Reference counting** (Python's primary method; Swift's ARC): free when the count hits zero; can't free cycles alone (Python adds a cycle collector).
- **Tracing / mark-and-sweep** (V8, JVM, Go): mark everything reachable from roots, free the rest; generational variants assume most objects die young.

## Common problems

| Problem | Example |
|---|---|
| Memory leak | references kept forever: global caches, listeners, timers, closures (see JavaScript → Memory leaks) |
| Out of memory | loading a 2 GB file into memory instead of streaming |
| GC pauses | allocation-heavy hot paths causing latency spikes |
| Fragmentation | free memory split into unusable small pieces |

In Node, the default heap limit can be raised (`--max-old-space-size`), but a growing heap usually means a leak: compare heap snapshots.

=== lesson: virtual-memory-and-paging | Virtual memory and paging
Each process sees its own large, contiguous **virtual address space**. The OS and the CPU's MMU map virtual addresses to physical RAM in fixed-size **pages** (commonly 4 KB).

## Why

- **Isolation**: a process can't read another's memory; its addresses map only to its own pages.
- **Overcommit**: processes can reserve more than physical RAM; pages are only backed when used.
- **Swapping**: rarely used pages can be moved to disk to free RAM.
- **Sharing**: libraries and copy-on-write `fork()` share physical pages between processes.

## Terms

- **Page table**: the virtual → physical mapping per process. The **TLB** caches recent translations.
- **Page fault**: accessing a page not in RAM; the OS loads it (from disk or zero-fills it). A **major** fault hits disk and is slow.
- **Thrashing**: so much swapping that the system spends its time moving pages instead of working; a sign the working set doesn't fit in RAM.
- **OOM killer** (Linux): kills a process when memory runs out. Containers with memory limits get killed with exit code 137, a common production mystery.

=== lesson: utc-timezones-epoch-handling | UTC, time zones and epoch handling
Time bugs are among the most common real-world bugs. Rules that prevent most of them:

1. **Store and transmit timestamps in UTC** (Postgres `timestamptz`; ISO 8601 strings with `Z` or an offset; or epoch milliseconds).
2. **Convert to the user's time zone only for display**, using an IANA zone name (`Asia/Kolkata`), not a fixed offset.
3. **Store the zone separately** when it matters (a recurring 9 am meeting must stay 9 am across DST changes in the attendee's zone).

```jsrun
const t = new Date("2026-03-08T20:30:00Z");            // a UTC instant
console.log(t.toISOString());
console.log(t.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
console.log(t.toLocaleString("en-US", { timeZone: "America/New_York" }));   // DST began that day in the US
console.log("epoch ms:", t.getTime(), "| epoch s:", Math.floor(t.getTime() / 1000));
console.log(new Date("2026-03-08"), "← date-only strings parse as UTC midnight;", new Date("2026-03-08T00:00"), "← date-time without zone parses as local");
```

## Classic bugs

- Date-only values ("birthday 2026-03-08") shifted by a day when converted through time zones. Store them as dates, not timestamps.
- "Today" computed on a UTC server for an Indian user between 00:00 and 05:30 IST.
- Daylight saving: some days have 23 or 25 hours; "add 1 day" ≠ "add 24 hours".
- Epoch seconds vs milliseconds mix-ups (off by 1000×).
- Comparing timestamps as strings in different formats.

Use `Intl.DateTimeFormat`, date-fns/date-fns-tz, Luxon, or the `Temporal` API (shipping in browsers from 2025–2026) instead of hand-rolled maths.

=== lesson: utf-8-encoding | UTF-8 and encoding
- **Unicode** assigns a number (code point) to every character: `A` = U+0041, `₹` = U+20B9, `😀` = U+1F600.
- An **encoding** turns code points into bytes. **UTF-8**, the web's standard, uses 1 to 4 bytes per character: ASCII stays 1 byte, Hindi characters take 3, emoji 4.

```jsrun
for (const s of ["A", "₹", "क", "😀", "नमस्ते"]) {
  const bytes = new TextEncoder().encode(s);
  console.log(JSON.stringify(s).padEnd(10), "length:", s.length, "code points:", [...s].length, "UTF-8 bytes:", bytes.length);
}
```

JavaScript strings are UTF-16: `"😀".length` is 2 (a surrogate pair). Use `[...str]` or `Intl.Segmenter` to count what users see as characters (grapheme clusters: "नमस्ते" is 6 code points but fewer visible characters).

## Where it bites

- Byte limits vs character limits (database column sizes, SMS segments, `Content-Length`).
- **Mojibake** (garbled text like `â‚¹`) from decoding UTF-8 bytes as Latin-1: declare `charset=utf-8` everywhere: HTML meta, HTTP headers, database (`utf8mb4` in MySQL; plain `utf8` there can't store emoji).
- Truncating strings mid-character or mid-emoji.
- Case-insensitive comparisons and sorting across languages: use `localeCompare` / `Intl.Collator` and Unicode normalisation (`str.normalize("NFC")`) for equality.
- Base64 isn't encryption; it's an encoding of bytes into text.

=== lesson: proxies-vs-reverse-proxies | Proxies vs reverse proxies
Both sit in the middle of a connection; they differ in **whose side** they're on.

- **Forward proxy**: acts for **clients**. The client sends requests to the proxy, which forwards them to the internet. Uses: corporate filtering and logging, caching, hiding client IPs, VPN-like access, bypassing geo-restrictions.
- **Reverse proxy**: acts for **servers**. Clients think they're talking to the website; the proxy forwards to backend servers. Uses: load balancing, TLS termination, caching, compression, rate limiting, WAF, routing paths to different services, hiding internal topology.

```text
forward:  [your laptop] → [company proxy] → internet → any site
reverse:  any user → internet → [Nginx / Cloudflare / ALB] → [app server 1, app server 2, …]
```

Examples of reverse proxies: Nginx, HAProxy, Caddy, Envoy, Traefik, cloud load balancers, CDNs. An API gateway is a specialised reverse proxy.

Behind a reverse proxy, the app sees the proxy's IP; the real client IP arrives in `X-Forwarded-For` (trust it only from your own proxies).

=== lesson: osi-model | The OSI model
A conceptual model of network communication in seven layers. Real networks follow the simpler TCP/IP model, but interviewers use OSI vocabulary ("an L4 vs L7 load balancer").

| # | OSI layer | Does | Examples |
|---|---|---|---|
| 7 | Application | protocols apps use | HTTP, DNS, SMTP, WebSocket |
| 6 | Presentation | encoding, encryption, compression | TLS (roughly), UTF-8, JPEG |
| 5 | Session | managing sessions | (mostly folded into others today) |
| 4 | Transport | end-to-end delivery between processes, ports | TCP, UDP, QUIC |
| 3 | Network | routing between networks, IP addresses | IP, ICMP (ping) |
| 2 | Data link | delivery on one local network, MAC addresses | Ethernet, Wi-Fi |
| 1 | Physical | bits on wires and radio | cables, fibre, radio |

TCP/IP model: Application (5–7), Transport (4), Internet (3), Link (1–2).

## Where it comes up for web developers

- **L4 vs L7** load balancers and firewalls (ports vs HTTP paths/headers).
- Debugging: can I reach the IP (L3, `ping`)? Is the port open (L4, `nc`, `telnet`)? Does HTTP respond (L7, `curl -v`)? Work up the layers.
- A mnemonic: "Please Do Not Throw Sausage Pizza Away" (Physical → Application).
