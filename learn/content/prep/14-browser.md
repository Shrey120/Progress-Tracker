---
course: prep
module: browser-and-networking
title: Browser and networking
order: 114
---
=== lesson: what-happens-when-you-type-a-url | What happens when you type a URL
The classic question. Go layer by layer and stop where the interviewer wants depth.

1. **Parse the input**: URL or search term? HSTS list: force HTTPS for known sites.
2. **Caches first**: the browser may serve the page from its HTTP cache or a service worker without any network.
3. **DNS**: resolve `www.example.com` to an IP: browser cache → OS cache → configured resolver (ISP, 1.1.1.1) → recursive lookup through root → `.com` → the domain's authoritative nameserver. (See DNS resolution.)
4. **Connect**: TCP three-way handshake (SYN, SYN-ACK, ACK) to port 443, then the **TLS** handshake: agree on a cipher, server sends its certificate, browser verifies it against trusted CAs, keys exchanged. TLS 1.3 needs one round trip. With HTTP/3, QUIC over UDP combines both.
5. **HTTP request**: `GET / HTTP/2` with headers (Host, cookies, Accept, User-Agent).
6. **Server side**: CDN edge (maybe a cache hit) → load balancer → web server → app → database → response with status, headers, HTML body (possibly streamed).
7. **Browser parses HTML** into the DOM; discovers CSS, JS, images and fetches them (the preload scanner finds them early).
8. **Builds CSSOM** from CSS; scripts may block parsing unless `defer`/`async`/`type=module`.
9. **Render tree** (DOM + CSSOM, visible nodes) → **layout** (sizes and positions) → **paint** (pixels in layers) → **composite** (GPU combines layers).
10. **JavaScript runs**, frameworks hydrate, the page becomes interactive. Further requests (APIs, images) follow.

## Make it yours

Interviewers often follow up on one part: "how does TLS verify the certificate?", "what's in DNS caching?", "how would you make step 6 faster?". Mention where performance work happens at each step: CDN, HTTP/2, caching headers, critical CSS, defer JS.

=== lesson: http-methods-status-codes | HTTP methods and status codes
(Covered in depth in API design → Verb semantics and Status code discipline.)

## Quick reference

**Methods**: `GET` (read, safe, cacheable), `POST` (create/action), `PUT` (replace, idempotent), `PATCH` (partial update), `DELETE` (idempotent), `HEAD` (headers only), `OPTIONS` (capabilities; CORS preflight).

**Status classes**: `1xx` informational (`101 Switching Protocols` for WebSockets), `2xx` success, `3xx` redirection, `4xx` client error, `5xx` server error.

| Code | One-liner |
|---|---|
| 200 / 201 / 204 | OK / Created / No Content |
| 301 / 302 / 307 / 308 | permanent / temporary / temporary keeping method / permanent keeping method |
| 304 | not modified (use your cached copy) |
| 400 / 401 / 403 / 404 | bad request / not authenticated / not allowed / not found |
| 409 / 422 / 429 | conflict / validation failed / rate limited |
| 500 / 502 / 503 / 504 | server bug / bad upstream response / unavailable / upstream timeout |

## HTTP message anatomy

```text
POST /api/orders HTTP/1.1
Host: shop.example.com
Content-Type: application/json
Authorization: Bearer eyJ…

{"productId": 7, "qty": 1}
```

A request line (method, path, version), headers, a blank line, an optional body. Responses: status line, headers, body.

=== lesson: caching-headers | Caching headers (browser view)
(The full treatment is in Caching → HTTP caching headers.)

From the browser's side, every response is checked against its headers:

1. **Fresh?** (`Cache-Control: max-age` not exceeded) → use the cached copy, no request at all.
2. **Stale but has a validator?** → conditional request with `If-None-Match` (ETag) or `If-Modified-Since` → `304 Not Modified` (reuse) or `200` with new content.
3. **`no-store`** → never cached.

## Where to see it

DevTools → Network: the Size column shows "(memory cache)", "(disk cache)" or "(ServiceWorker)"; status 304 for revalidations. "Disable cache" while DevTools is open for testing.

## Typical bugs

- New deploy, old JS: HTML was cached too long, or assets aren't fingerprinted. Fix: hashed filenames + long cache for assets, `no-cache` for HTML.
- Users seeing others' data from a CDN: authenticated responses missing `private`/`no-store`.
- API never cached: no `Cache-Control` at all means browsers apply heuristics; be explicit.

The **back/forward cache** (bfcache) is separate: it keeps whole pages in memory for instant back/forward navigation; `Cache-Control: no-store` and `unload` handlers can prevent it.

=== lesson: cors | CORS (browser view)
(The full treatment is in Auth and web security → CORS and preflight.)

The one-paragraph answer: browsers block JavaScript from **reading** responses from a different origin (scheme + host + port) unless that server allows it with `Access-Control-Allow-Origin`. Non-simple requests (JSON bodies, custom headers, PUT/DELETE) send an `OPTIONS` preflight first. Credentials (cookies) require a specific origin and `Access-Control-Allow-Credentials: true`. It's enforced only by browsers, so it's not an authentication mechanism, and fixes always happen on the **server** (or by proxying through your own origin).

## Debugging a CORS error

1. Check the console message: it says which header was missing or wrong.
2. Network tab: look at the `OPTIONS` request. Did it return 2xx with the allow headers?
3. Common causes: the server only sets CORS headers on success responses (errors lack them, so you see CORS instead of the real 500); `*` with credentials; the preflight blocked by auth middleware; `localhost:3000` vs `127.0.0.1:3000` being different origins.

In development, the frontend dev server's proxy (Vite `server.proxy`, Next.js rewrites) avoids CORS by making API calls same-origin.

=== lesson: event-bubbling-capturing-delegation | Event bubbling, capturing and delegation
When you click a button inside a list inside a page, the event travels in three phases:

1. **Capturing**: from `window` down through ancestors to the target.
2. **Target**: at the element clicked.
3. **Bubbling**: back up from the target through every ancestor.

Listeners run in the bubbling phase by default; pass `{ capture: true }` for the capturing phase.

```js
list.addEventListener("click", e => console.log("list (bubble)"));
list.addEventListener("click", e => console.log("list (capture)"), { capture: true });
button.addEventListener("click", e => console.log("button"));
// click the button → list (capture), button, list (bubble)
```

- `e.target` — the element that was actually clicked. `e.currentTarget` — the element whose listener is running.
- `e.stopPropagation()` — stop travelling further. `e.preventDefault()` — cancel the default action (link navigation, form submit); unrelated to propagation.

## Event delegation

Attach **one** listener to a parent instead of one per child; use `e.target.closest()` to find which child was clicked. Works for elements added later too.

```js
document.querySelector("#todo-list").addEventListener("click", e => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.closest("li").dataset.id;
  if (btn.dataset.action === "delete") removeTodo(id);
});
```

React uses delegation internally: it attaches listeners at the root and dispatches synthetic events.

Some events don't bubble (`focus`, `blur`; use `focusin`/`focusout`), and `mouseenter`/`mouseleave` don't either.

=== lesson: cookies-vs-localstorage-vs-sessionstorage | Cookies vs localStorage vs sessionStorage
| | Cookies | localStorage | sessionStorage |
|---|---|---|---|
| Capacity | ~4 KB each | ~5–10 MB per origin | ~5–10 MB per origin |
| Sent to server | **automatically with every request** to that domain | never | never |
| Lifetime | session or `Expires`/`Max-Age` | until cleared | until the tab closes |
| Scope | domain + path | origin | origin **and tab** |
| JS access | yes, unless `HttpOnly` | yes | yes |
| API | `document.cookie` (awkward), Cookie Store API | sync key/value strings | same |

## When to use which

- **Cookies**: auth sessions (`HttpOnly; Secure; SameSite`), anything the server must see on every request (locale, A/B bucket).
- **localStorage**: non-sensitive UI preferences, drafts, cached non-critical data. **Never** auth tokens if you can avoid it (any XSS can read it).
- **sessionStorage**: per-tab state like a multi-step form in progress.
- **IndexedDB**: large or structured data, offline apps (async, can store blobs).

## Gotchas

localStorage is synchronous (blocks the main thread for large values), stores only strings (`JSON.stringify`), can throw in private mode or when full, and isn't available during server rendering. Cookies add bytes to every request, including images, so keep them small.

=== lesson: critical-rendering-path | Critical rendering path
The steps from receiving HTML to showing pixels:

```text
HTML → DOM ─┐
            ├─▶ render tree ─▶ layout ─▶ paint ─▶ composite
CSS → CSSOM ┘
       JavaScript can modify both, and blocks along the way
```

## What blocks it

- **CSS is render-blocking**: the browser won't paint until the CSSOM is built (otherwise you'd see unstyled content).
- **Classic `<script>` is parser-blocking**: HTML parsing stops while the script downloads and runs (scripts may `document.write` or query styles).

## Optimising it

| Technique | Effect |
|---|---|
| `defer` scripts | download in parallel, run after parsing, in order |
| `async` scripts | download in parallel, run as soon as ready (independent scripts like analytics) |
| `type="module"` | deferred by default |
| inline critical CSS, load the rest non-blocking | faster first paint |
| `media` attributes on stylesheets (`media="print"`) | non-matching sheets don't block |
| fewer, smaller critical resources; preload late-discovered ones | shorter path |
| server-rendered HTML with real content | content visible before JS runs |

Metrics affected: First Contentful Paint and LCP. DevTools Performance panel shows parse, style, layout and paint tasks in order.

=== lesson: reflow-vs-repaint | Reflow vs repaint
- **Reflow (layout)**: recalculating sizes and positions. Triggered by changing geometry: width, height, margin, font size, adding/removing elements, reading layout after writing.
- **Repaint**: redrawing pixels without layout changes: colour, background, visibility, shadows.
- **Composite-only**: `transform` and `opacity` changes can be handled by the GPU compositor without layout or paint: the cheapest.

Reflow is the expensive one, because one element's change can affect many others.

## Layout thrashing

Interleaving reads of layout properties (`offsetHeight`, `getBoundingClientRect`, `scrollTop`) with writes forces a synchronous layout on every read:

```js
// bad: read, write, read, write… a forced layout each iteration
for (const el of items) el.style.height = el.offsetWidth / 2 + "px";

// good: read everything, then write everything
const widths = items.map(el => el.offsetWidth);
items.forEach((el, i) => { el.style.height = widths[i] / 2 + "px"; });
```

## Tips

Animate `transform`/`opacity` instead of `top`/`left`/`width`; batch DOM changes (or let your framework do it); use `requestAnimationFrame` for visual updates; `will-change: transform` sparingly for elements about to animate; `contain: layout` / `content-visibility: auto` to limit how far changes propagate.

=== lesson: websockets | WebSockets
A **WebSocket** is a persistent, full-duplex connection between browser and server over one TCP connection. After an HTTP upgrade handshake (`101 Switching Protocols`), either side can send messages anytime with little overhead.

```js
const ws = new WebSocket("wss://chat.example.com/ws?room=42");
ws.onopen = () => ws.send(JSON.stringify({ type: "join" }));
ws.onmessage = e => render(JSON.parse(e.data));
ws.onclose = () => scheduleReconnect();       // with backoff
```

## Use for

Chat, multiplayer games, collaborative editing, live dashboards with frequent two-way traffic, trading UIs.

## Production concerns

- **Scaling**: connections are stateful and long-lived. Servers hold thousands each; a pub/sub layer (Redis, NATS, Kafka) routes messages between server instances; load balancers need WebSocket support and long idle timeouts.
- **Reconnection** with exponential backoff and jitter; resync missed messages after reconnecting (send "last seen ID").
- **Heartbeats** (ping/pong) to detect dead connections through proxies.
- **Auth**: authenticate during the handshake (cookie or a short-lived token), re-check permissions per room.
- **Backpressure**: slow clients accumulate buffered messages; drop or disconnect them.
- Serverless platforms don't hold connections well; use managed services (Pusher, Ably, Supabase Realtime, API Gateway WebSockets) or long-running servers. Socket.IO adds fallbacks, rooms and reconnection on top.

=== lesson: server-sent-events | Server-Sent Events
**SSE** is a one-way stream from server to browser over a normal HTTP response that stays open. Text events, with automatic reconnection built into the browser's `EventSource`.

```js
// browser
const es = new EventSource("/api/notifications/stream");
es.onmessage = e => showToast(JSON.parse(e.data));

// server response
// Content-Type: text/event-stream
// id: 42
// data: {"text": "Order shipped"}
//
```

## SSE vs WebSockets

| SSE | WebSockets |
|---|---|
| server → client only | both directions |
| plain HTTP: works through proxies, HTTP/2 multiplexing, normal auth cookies | separate protocol after upgrade |
| auto-reconnect with `Last-Event-ID` resume | you implement reconnection |
| text only | text and binary |

Great fit for: notifications, live feeds, progress updates, and **streaming LLM responses** (most AI chat APIs stream tokens over SSE-style responses). If the client only needs to receive updates and sends occasional normal HTTP requests, SSE is simpler.

=== lesson: long-polling | Long polling
Before WebSockets and SSE were widespread: the client sends a request, the server **holds it open** until there's new data (or a timeout ~30 s), responds, and the client immediately sends another.

| Technique | How | Trade-offs |
|---|---|---|
| Short polling | request every N seconds | simple; wasteful; delay up to N |
| **Long polling** | request waits for data | near real-time over plain HTTP; one held request per client; reconnect overhead |
| SSE | one open stream | efficient server→client |
| WebSockets | bidirectional connection | most capable, most operational complexity |

Long polling still appears as a fallback (Socket.IO starts with it) and in systems behind restrictive proxies. In interviews: explain all four and pick by direction of data, frequency and infrastructure. For a notification badge that updates every minute, plain polling is often the right, boring answer.

=== lesson: http-2-vs-http-3 | HTTP/1.1 vs HTTP/2 vs HTTP/3
| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Transport | TCP | TCP | **QUIC over UDP** |
| Requests per connection | one at a time (browsers open ~6 connections per host) | **multiplexed** streams on one connection | multiplexed |
| Headers | plain text, repeated | binary, compressed (HPACK) | compressed (QPACK) |
| Head-of-line blocking | per connection | at the TCP level: one lost packet stalls all streams | **none across streams** |
| Handshake | TCP + TLS | TCP + TLS | combined; 1-RTT, 0-RTT on resumption |
| Connection migration | no | no | yes (switching Wi-Fi ↔ mobile keeps the connection) |

## What it changes for developers

- HTTP/1.1-era hacks (domain sharding, sprites, giant concatenated bundles) are unnecessary or harmful with HTTP/2+.
- HTTP/3 helps most on lossy mobile networks.
- HTTP/2 server push was removed from browsers; use `preload` and 103 Early Hints instead.
- CDNs and modern hosts enable HTTP/2 and HTTP/3 automatically; your app server often still speaks HTTP/1.1 behind the proxy, which is fine.

=== lesson: cdns | CDNs
(See Caching → CDN behaviour for caching details.)

A Content Delivery Network is a globally distributed set of servers that sit between users and your origin.

## What CDNs do today

- Cache and serve static assets, images and video close to users.
- Cache whole pages and API responses (with the right headers).
- Terminate TLS near the user and keep warm connections to your origin.
- Optimise: compression, image resizing and format conversion, HTTP/3.
- Protect: DDoS absorption, WAF rules, bot management, rate limiting.
- Run code at the edge (Workers, edge functions) for redirects, auth checks, A/B tests.
- Route: load-balance across origins and regions, failover.

## How users reach the nearest server

**Anycast** (the same IP announced from many locations; network routing picks the closest) or **GeoDNS** (DNS answers with a nearby server's IP).

Interview angle: when designing anything user-facing at scale, put a CDN in front of static and cacheable content first; it's the cheapest big win for latency and origin load.

=== lesson: dns-resolution | DNS resolution
DNS translates names (`api.example.com`) into IP addresses.

## The lookup

1. Browser cache → OS cache (and `hosts` file).
2. **Recursive resolver** (ISP, 1.1.1.1, 8.8.8.8) checks its cache; if missing:
3. asks a **root server** → "ask the `.com` servers"
4. asks the **TLD server** for `.com` → "ask example.com's nameservers"
5. asks the **authoritative nameserver** → the answer, with a **TTL**.
6. Resolver caches it for the TTL and returns it.

## Record types

| Record | Purpose |
|---|---|
| `A` / `AAAA` | name → IPv4 / IPv6 |
| `CNAME` | alias to another name (`www` → `example.com`); not allowed at the apex |
| `MX` | mail servers |
| `TXT` | verification, SPF/DKIM/DMARC email auth |
| `NS` | the domain's nameservers |
| `CAA` | which CAs may issue certificates |
| `ALIAS`/`ANAME`/flattened CNAME | CNAME-like at the apex (provider feature) |

## Practical points

- **TTL**: lower it before migrations so changes propagate quickly; "propagation" is just caches expiring.
- DNS lookups add latency on first visit: `dns-prefetch`/`preconnect` third-party origins.
- DNS is a single point of failure for everything; use a reliable provider, and DNSSEC to prevent spoofing.
- DNS over HTTPS (DoH) encrypts lookups from the browser.

=== lesson: tcp-vs-udp | TCP vs UDP
| | TCP | UDP |
|---|---|---|
| Connection | handshake first | none: just send datagrams |
| Delivery | reliable: retransmits lost packets | best effort: packets may be lost |
| Order | guaranteed | not guaranteed |
| Flow and congestion control | yes | no (application's job) |
| Overhead / latency | higher | lower |
| Used by | HTTP/1–2, databases, SSH, email | DNS, video calls, games, VoIP, QUIC (HTTP/3) |

## Why both exist

For a web page or a bank transfer, every byte must arrive in order: TCP. For a video call, a late packet is useless; better to skip it and keep going: UDP. Games send frequent position updates where only the latest matters.

**QUIC** (HTTP/3) builds reliability, ordering per stream, and encryption on top of UDP in user space, avoiding TCP's head-of-line blocking and slow handshakes.

The TCP three-way handshake: client `SYN` → server `SYN-ACK` → client `ACK`. Connection teardown uses `FIN`s. Keep-alive and connection pooling exist to avoid paying the handshake repeatedly.

=== lesson: requestanimationframe | requestAnimationFrame
`requestAnimationFrame(callback)` runs your callback right **before the browser's next repaint**, typically 60 times a second (matching the display's refresh rate, 120 on some screens).

```js
function animate(timestamp) {
  const progress = Math.min(1, (timestamp - start) / 600);
  box.style.transform = `translateX(${progress * 300}px)`;
  if (progress < 1) requestAnimationFrame(animate);
}
const start = performance.now();
requestAnimationFrame(animate);
```

## Why not setTimeout(fn, 16)?

- rAF is synchronised with the display: no dropped or doubled frames.
- It pauses in background tabs (saves battery and CPU).
- Multiple rAF callbacks are batched into one frame.

## Uses

JavaScript animations, canvas/WebGL rendering loops, batching DOM writes after reads (read layout, then apply writes in rAF to avoid thrashing), throttling scroll/resize work to once per frame.

Prefer CSS transitions/animations or the Web Animations API for simple effects; they can run on the compositor thread even when JS is busy.

=== lesson: web-workers | Web Workers
A **Web Worker** runs JavaScript on a **separate thread**, so heavy work doesn't block the main thread (and the UI stays responsive).

```js
// main.js
const worker = new Worker(new URL("./search-worker.js", import.meta.url), { type: "module" });
worker.postMessage({ query, items });
worker.onmessage = e => renderResults(e.data);

// search-worker.js
self.onmessage = ({ data }) => {
  const results = fuzzySearch(data.items, data.query);   // expensive
  self.postMessage(results);
};
```

This very site runs your Python and SQL exercises in workers: that's why an infinite loop can be stopped without freezing the page.

## Limits

- No DOM access; communicate only by messages.
- Messages are copied (structured clone); large `ArrayBuffer`s can be **transferred** without copying; `SharedArrayBuffer` shares memory (needs cross-origin isolation headers).
- Startup cost: reuse workers (a pool) rather than spawning per task. Comlink makes the messaging feel like function calls.

## Other worker types

- **Service Workers**: sit between the page and the network: offline caching, push notifications, background sync (PWAs).
- **Shared Workers**: one worker shared across tabs of the same origin.
- **Worklets**: tiny specialised workers (audio processing, CSS Paint API).
