---
course: prep
module: caching
title: Caching
order: 112
---
=== lesson: ttl | TTL
**Time to live** is how long a cached value is considered valid. After it expires, the next read fetches fresh data.

```text
SET product:42 '{"name":"Keyboard","price":2500}' EX 300     # Redis: expires in 300 s
Cache-Control: max-age=300                                   # HTTP: browsers/CDNs keep it 5 min
```

## Choosing a TTL

It's a trade-off between **staleness** and **load**:

| Data | Typical TTL |
|---|---|
| Static assets with hashed filenames | 1 year (`immutable`) |
| Product catalogue, blog posts | minutes to hours, plus invalidation on change |
| Prices, stock levels | seconds, or no cache |
| User sessions | the session lifetime |
| Config, feature flags | 30–60 s |

- A TTL is a **safety net** even when you invalidate explicitly: if an invalidation is missed, data still corrects itself eventually.
- **Add jitter** (`ttl = 300 + random(0, 60)`) so keys written together don't all expire at the same moment and stampede the database.
- Negative caching: cache "not found" briefly too, so repeated lookups for missing keys don't hit the database.

=== lesson: cache-aside-pattern | Cache-aside pattern
The most common caching pattern. The **application** manages the cache:

1. Read: check the cache. **Hit** → return. **Miss** → read the database, store in the cache with a TTL, return.
2. Write: update the database, then **delete** the cache key (don't update it).

```jsrun
const db = new Map([["42", { name: "Keyboard", price: 2500 }]]);
const cache = new Map();
let dbReads = 0;
async function getProduct(id) {
  if (cache.has(id)) return cache.get(id);
  dbReads++;
  const p = db.get(id);                  // the slow part in real life
  cache.set(id, p);                      // real code: a TTL too
  return p;
}
async function updatePrice(id, price) {
  db.set(id, { ...db.get(id), price });
  cache.delete(id);                      // invalidate; the next read repopulates
}
(async () => {
  await getProduct("42"); await getProduct("42"); await getProduct("42");
  await updatePrice("42", 2200);
  console.log(await getProduct("42"), "db reads:", dbReads);
})();
```

## Why delete instead of update?

Two concurrent writers updating the cache can leave it with the older value (write A to DB, write B to DB, B updates cache, A updates cache → stale). Deleting avoids most races, and the value is only computed when someone needs it.

## Other patterns, briefly

- **Read-through**: the cache library loads from the DB on a miss itself (same idea, logic in the cache layer).
- **Write-through / write-behind**: see their lesson.

Cache-aside keeps working when the cache is down (just slower), caches only what's actually read, and is easy to reason about. Its weak spots: the first read after a miss is slow, and stampedes on popular keys.

=== lesson: cache-invalidation | Cache invalidation
"There are only two hard things in computer science: cache invalidation and naming things." Invalidation is hard because the cache and the source of truth are separate systems that can't be updated atomically.

## Strategies

| Strategy | How | Trade-off |
|---|---|---|
| **TTL only** | let entries expire | simple; stale up to the TTL |
| **Delete on write** | after updating the DB, delete affected keys | fresh; you must know every key that depends on the data |
| **Versioned keys** | `product:42:v7`; bump the version on change | old keys simply stop being read; no deletes needed |
| **Event-driven** | DB change → event (CDC / outbox) → cache invalidator | decoupled, works across services; eventual |
| **Tags** | group keys by tag, invalidate the tag | e.g. Next.js `revalidateTag`, CDN surrogate keys |

## The hard parts

- **Derived data**: one product change affects the product page, category listings, search results and the home page. Track dependencies, or use tags.
- **Races**: a reader fetches old data from the DB just before the write, then sets the cache after the delete → stale entry. Mitigate with short TTLs, delayed double delete, or versioning.
- **Multiple layers**: Redis, CDN and browser caches all need invalidating (purge APIs for CDNs; short `max-age` with `stale-while-revalidate` for browsers).

> In interviews, say which data can be stale and for how long, pick TTL + delete-on-write as the default, and mention the race and how you'd bound it.

=== lesson: http-caching-headers-cache-control-etag | HTTP caching headers: Cache-Control and ETag
## Cache-Control

```text
Cache-Control: public, max-age=31536000, immutable        # hashed static files
Cache-Control: no-cache                                    # may store, but must revalidate before use
Cache-Control: no-store                                    # never store (sensitive data)
Cache-Control: private, max-age=60                         # browser only, never shared caches/CDNs
Cache-Control: public, s-maxage=600, stale-while-revalidate=60   # CDN 10 min, serve stale while refreshing
```

- `max-age` — seconds the response is fresh. `s-maxage` overrides it for shared caches (CDNs).
- `public` / `private` — whether shared caches may store it. Authenticated responses should be `private` or `no-store`.
- `no-cache` doesn't mean "don't cache"; it means "check with the server first".
- `stale-while-revalidate` — serve the stale copy instantly while fetching a fresh one in the background.

## Validators: ETag and Last-Modified

When a cached response is stale, the browser asks "has it changed?" instead of downloading again:

```text
→ GET /api/products/42      If-None-Match: "a1b2c3"
← 304 Not Modified          (no body: saves bandwidth)
```

`ETag` is a fingerprint of the content (a hash or version); `Last-Modified` + `If-Modified-Since` works by date. `ETag` + `If-Match` also gives **optimistic concurrency** for updates (412 if someone else changed it).

## A sensible setup for a web app

- Hashed JS/CSS/images: `public, max-age=31536000, immutable`.
- HTML: `no-cache` (always revalidate, so new deploys show up), or a short CDN `s-maxage`.
- API responses with user data: `private, no-store`, unless designed for caching.
- `Vary: Accept-Encoding, Accept-Language` when the response depends on request headers.

=== lesson: redis-data-structures | Redis data structures
Redis is an in-memory data store; its value is the variety of **data structures** with atomic operations.

| Structure | Commands | Uses |
|---|---|---|
| **String** | `GET`, `SET … EX`, `INCR`, `SET NX` | cache values, counters, rate limits, locks |
| **Hash** | `HSET`, `HGET`, `HINCRBY` | objects (user session fields), token buckets |
| **List** | `LPUSH`, `RPOP`, `LRANGE`, `LTRIM` | queues, recent items ("last 100 events") |
| **Set** | `SADD`, `SISMEMBER`, `SINTER` | unique visitors, tags, "users online" |
| **Sorted set** | `ZADD`, `ZRANGE … REV`, `ZINCRBY`, `ZRANGEBYSCORE` | leaderboards, priority queues, sliding-window rate limits, timelines |
| **Bitmap** | `SETBIT`, `BITCOUNT` | daily active flags for millions of users cheaply |
| **HyperLogLog** | `PFADD`, `PFCOUNT` | approximate unique counts in 12 KB |
| **Stream** | `XADD`, `XREADGROUP` | durable-ish event log with consumer groups |
| **Pub/Sub** | `PUBLISH`, `SUBSCRIBE` | live fan-out (no persistence) |
| **Geo** | `GEOADD`, `GEOSEARCH` | nearby drivers/stores |

## Example: a leaderboard

```text
ZINCRBY leaderboard:2026-10 50 user:42        # add points
ZREVRANGE leaderboard:2026-10 0 9 WITHSCORES   # top 10
ZREVRANK leaderboard:2026-10 user:42           # my rank
```

## Things to know

- Single-threaded command execution → each command is atomic; use `MULTI`/Lua scripts for multi-step atomicity.
- Persistence options (RDB snapshots, AOF log), but treat it primarily as a cache unless configured for durability.
- Memory is the limit: set `maxmemory` and an eviction policy.
- Avoid `KEYS *` in production (blocks); use `SCAN`.
- Valkey is the open-source fork created after Redis changed its licence in 2024; managed services offer either.

=== lesson: eviction-policies | Eviction policies
When a cache is full, something must be removed to make room.

| Policy | Evicts | Good when |
|---|---|---|
| **LRU** (least recently used) | the item untouched for the longest | recent items likely to be used again (most web caches) |
| **LFU** (least frequently used) | the item used least often | a stable set of popular items; resists one-off scans |
| **FIFO** | the oldest inserted | simple, rarely ideal |
| **TTL-based** | items closest to expiry | everything has a TTL anyway |
| **Random** | a random item | cheap; surprisingly decent |

Redis `maxmemory-policy`: `allkeys-lru`, `allkeys-lfu`, `volatile-lru` (only keys with a TTL), `noeviction` (writes fail when full: right for queues or data you can't lose).

## Implement an LRU cache

A classic interview question (LeetCode 146). A JavaScript `Map` remembers insertion order, so delete-and-reinsert moves a key to the "most recent" end:

```jsrun
class LRUCache {
  constructor(capacity) { this.capacity = capacity; this.map = new Map(); }
  get(key) {
    if (!this.map.has(key)) return -1;
    const v = this.map.get(key);
    this.map.delete(key); this.map.set(key, v);        // mark as most recently used
    return v;
  }
  put(key, value) {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value);  // oldest
  }
}
const c = new LRUCache(2);
c.put(1, "a"); c.put(2, "b"); c.get(1); c.put(3, "c");   // evicts 2
console.log(c.get(2), c.get(1), c.get(3));
```

In languages without an ordered map, the standard answer is a **hash map + doubly linked list**: O(1) lookup, O(1) move-to-front and evict-from-tail.

=== lesson: session-stores | Session stores
Server-side sessions need storage that every app instance can reach (see Stateless services).

## Options

| Store | Pros | Cons |
|---|---|---|
| **Redis** | fast, TTL built in, shared | another component; data lost if not persisted (users re-login) |
| Database table | durable, no extra infra | a query per request; clean up expired rows |
| Signed/encrypted cookie (stateless) | no storage at all | size limit (~4 KB), can't revoke individually without extra state |
| In-memory per instance | trivial | breaks with more than one instance; lost on restart |

## Design notes

- Session ID: long, random, unguessable; store it in an `HttpOnly; Secure; SameSite` cookie.
- **Regenerate the ID on login** (prevents session fixation).
- Sliding expiration (extend on activity) plus an absolute maximum lifetime.
- Index sessions by user to support "log out all devices" and listing active sessions.
- Store minimal data (user ID, roles, CSRF token); look the rest up.

=== lesson: cdn-behavior | CDN behaviour
A **CDN** (Cloudflare, CloudFront, Fastly, Akamai, Vercel's edge network) has servers (points of presence) in many cities. Users connect to the nearest one; it serves cached content or fetches it from your **origin**.

## How a request flows

```text
user in Kanpur → nearest edge (e.g. Delhi)
   cached and fresh?  → served in a few ms
   miss or stale      → edge fetches from origin (maybe via a regional shield cache) → caches → serves
```

## What it gives you

Lower latency (shorter distance, TLS terminated nearby), less load on your origin, absorbing traffic spikes and DDoS, compression, HTTP/3, image optimisation, edge functions.

## Controlling it

- **Cache keys**: by default URL (+ some headers). Strip tracking query params so `?utm_source=` doesn't fragment the cache.
- `Cache-Control: s-maxage` / CDN-specific headers decide TTLs; `Vary` adds headers to the key.
- **Purging**: by URL, by prefix, or by **tag** (surrogate keys) when content changes; or use versioned asset URLs that never need purging.
- Never cache personalised responses publicly: `private` or `no-store`, or vary carefully.

## Gotchas

Caching responses that set cookies; cache poisoning via unkeyed headers; stale content after deploys (HTML cached too long); origin overload when a popular object expires everywhere at once (enable origin shield / request collapsing).

=== lesson: cache-stampede | Cache stampede
A **stampede** (thundering herd, dog-piling) happens when a popular key expires or is evicted, and hundreds of concurrent requests all miss at once and hit the database to rebuild the same value. The database slows down, more requests time out and retry, and it can cascade into an outage.

## Fixes

1. **Request coalescing / single flight**: only one request recomputes; the others wait for its result.

```jsrun
const inflight = new Map();
let dbCalls = 0;
async function slowDbRead(key) { dbCalls++; await new Promise(r => setTimeout(r, 50)); return "value of " + key; }
async function getOnce(key) {
  if (inflight.has(key)) return inflight.get(key);       // join the request already running
  const p = slowDbRead(key).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
Promise.all(Array.from({ length: 100 }, () => getOnce("home-feed")))
  .then(r => console.log(r.length, "requests answered with", dbCalls, "database call"));
```

   Across servers, use a short Redis lock (`SET lock:key NX EX 10`): the winner rebuilds; others serve stale data or wait briefly.

2. **Serve stale while revalidating**: keep the old value past its soft expiry and refresh in the background.
3. **Probabilistic early refresh**: occasionally refresh before expiry, more likely as expiry nears, so it rarely expires under load.
4. **TTL jitter**: avoid many keys expiring simultaneously.
5. **Pre-warm** the cache before traffic (after deploys or flushes) for known hot keys.

=== lesson: distributed-locks | Distributed locks
A lock that works across processes and machines, so only one worker does something at a time: running a scheduled job once, rebuilding a cache entry, processing one user's balance.

## Redis lock, done carefully

```text
SET lock:invoice-job <random-token> NX PX 30000     # acquire only if free, auto-expire after 30 s
... do the work ...
release: delete the key ONLY IF its value is still my token (Lua script compare-and-delete)
```

- **NX** ensures one holder; the **expiry** prevents a crashed holder from blocking forever.
- The **token** check stops you deleting someone else's lock after yours expired.

## The hard problem

If your work takes longer than the lock's expiry (a GC pause, a slow network), the lock expires, another worker acquires it, and now two run at once. Mitigations: renew the lock while working (a watchdog), and **fencing tokens**: each acquisition gets an increasing number, and the resource (database) rejects writes with an older token.

Redlock (locking across several Redis nodes) is debated; for correctness-critical cases prefer a consensus system (etcd, ZooKeeper) or the database itself.

## Often you don't need one

- Postgres **advisory locks** (`pg_try_advisory_lock(key)`) or `SELECT … FOR UPDATE SKIP LOCKED` for job claiming.
- Unique constraints and idempotency make duplicate work harmless.
- A single scheduler (cron service) instead of every instance racing.

=== lesson: write-through-write-behind | Write-through and write-behind
Patterns where the **cache sits in the write path**.

## Write-through

Every write goes to the cache **and** the database synchronously (the cache layer writes to the DB, or the app does both).

- Cache is always populated and consistent with the DB for written keys.
- Writes are slower (two systems); you cache data that may never be read.

## Write-behind (write-back)

Writes go to the cache immediately; the cache flushes to the database **later**, asynchronously and often batched.

- Very fast writes; batching reduces database load (counters, view counts, analytics, game state).
- **Risk of data loss** if the cache fails before flushing; the DB lags behind; harder consistency.

## Write-around

Writes go only to the database; the cache fills on reads (cache-aside). Avoids polluting the cache with data that's written but rarely read.

## Choosing

| Need | Pattern |
|---|---|
| general web data, read-heavy | cache-aside / write-around |
| reads right after writes must be fast and consistent | write-through |
| extreme write volume, some loss acceptable | write-behind (e.g. buffer like counts in Redis, flush every few seconds) |
