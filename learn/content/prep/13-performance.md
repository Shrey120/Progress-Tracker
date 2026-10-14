---
course: prep
module: performance
title: Performance
order: 113
---
=== lesson: core-web-vitals-lcp-inp-cls | Core Web Vitals: LCP, INP and CLS
Google's three user-centred performance metrics, measured from real users (field data) and used in search ranking.

| Metric | Measures | Good |
|---|---|---|
| **LCP** — Largest Contentful Paint | loading: when the biggest image or text block appears | ≤ 2.5 s |
| **INP** — Interaction to Next Paint | responsiveness: delay from a tap/click/keypress to the next frame, across the whole visit | ≤ 200 ms |
| **CLS** — Cumulative Layout Shift | visual stability: how much content jumps around | ≤ 0.1 |

Scored at the 75th percentile of page loads. INP replaced FID (First Input Delay) in March 2024.

## Fixing each

**LCP**: fast server response (TTFB), CDN, preload or `fetchpriority="high"` on the hero image, modern image formats with proper sizes, avoid client-side rendering for the main content, no render-blocking CSS/JS, don't lazy-load the LCP image.

**INP**: less JavaScript on the main thread, break up long tasks, keep event handlers cheap (defer non-urgent work with `setTimeout`/`scheduler.yield()`, React transitions), avoid huge re-renders, virtualize long lists, move heavy work to Web Workers.

**CLS**: set `width`/`height` (or `aspect-ratio`) on images and embeds, reserve space for ads and dynamic content, avoid inserting content above existing content, use `font-display` with size-adjusted fallbacks, animate with `transform` not layout properties.

## Measuring

Field: Chrome UX Report, Search Console, the `web-vitals` library sending to your analytics, Vercel Speed Insights. Lab: Lighthouse, DevTools Performance panel (good for debugging, not the same as real users).

=== lesson: lazy-loading | Lazy loading
Load things only when they're needed, instead of everything up front.

## Images and iframes

```html
<img src="review.jpg" loading="lazy" width="400" height="300" alt="Customer photo">
<iframe src="https://www.youtube.com/embed/…" loading="lazy"></iframe>
```

Native `loading="lazy"` defers offscreen media until the user scrolls near it. **Never lazy-load the LCP image** (the hero above the fold); give it `fetchpriority="high"` instead.

## Components and code

```jsx
const Editor = lazy(() => import("./RichEditor"));       // React
const Map = dynamic(() => import("./Map"), { ssr: false, loading: () => <Skeleton /> });  // Next.js
```

Load heavy, rarely used, or below-the-fold components on demand: editors, charts, maps, modals, admin features.

## Data

Infinite scroll and pagination, fetching tab contents when the tab opens, `IntersectionObserver` to start loading a section just before it enters the viewport.

```js
const io = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) { loadComments(); io.disconnect(); }
}, { rootMargin: "200px" });   // start loading 200px before it's visible
io.observe(document.querySelector("#comments"));
```

## Trade-off

Lazy loading delays content until it's needed, which can mean a spinner at the moment the user wants it. Prefetch likely-next resources during idle time (next lesson) to get both.

=== lesson: code-splitting | Code splitting
Bundlers combine your modules into JavaScript files. Without splitting, every page downloads the code for every page. **Code splitting** creates separate chunks loaded on demand.

## Kinds

- **Route-based**: each page gets its own chunk. Next.js, Remix and React Router (lazy routes) do this automatically.
- **Component-based**: `import()` heavy components (charts, editors) only when rendered.
- **Vendor chunks**: shared libraries in their own long-cached file.
- **Conditional features**: load polyfills, admin tools or rarely used flows only when needed.

```js
button.addEventListener("click", async () => {
  const { exportToPdf } = await import("./pdf-export.js");   // separate chunk, fetched on first click
  exportToPdf(report);
});
```

## Pitfalls

- **Too many tiny chunks** add request overhead and waterfalls (chunk A loads, then discovers it needs B). HTTP/2 helps; bundlers group sensibly.
- **Barrel files** (`index.ts` re-exporting everything) can pull whole libraries into a chunk.
- A big library imported in a shared layout lands on every page.
- Loading states: lazy chunks need fallbacks; prefetch on hover/visibility for snappy navigation.

Measure with a bundle analyzer (next lesson) to see what's in each chunk.

=== lesson: bundle-analysis | Bundle analysis
Before optimising JavaScript size, **look** at what's in your bundles.

## Tools

- `@next/bundle-analyzer`, `rollup-plugin-visualizer` (Vite), `webpack-bundle-analyzer`: treemaps of every module by size.
- `source-map-explorer` on any build with source maps.
- bundlephobia.com / pkg-size.dev: the cost of a package before you install it.
- Lighthouse "Reduce unused JavaScript" and the DevTools **Coverage** tab: code shipped but not executed.

## What you usually find

| Finding | Fix |
|---|---|
| Moment.js with all locales | date-fns / dayjs / `Intl` |
| All of lodash | per-method imports or native methods |
| A chart library on every page | lazy-load it on the page that needs it |
| Icons library imported whole | import icons individually |
| Duplicate versions of a dependency | dedupe (`npm dedupe`, resolutions) |
| Server-only code in the client bundle | move to server components / API |
| Big JSON or translations bundled | fetch at runtime, split per locale |

## Set budgets

Track bundle size in CI (size-limit, Next.js build output) and fail or warn when a PR adds too much. A typical target: under ~170 KB of compressed JS for the initial load on mobile (a common guideline, not a law).

=== lesson: tree-shaking | Tree shaking
**Tree shaking** removes exports that are never imported from the final bundle. It relies on **static ES module** syntax: bundlers can see exactly which exports are used without running code.

```js
// utils.js
export function used() {}
export function unused() {}        // dropped from the bundle if nobody imports it

// app.js
import { used } from "./utils.js";
```

## What breaks it

- **CommonJS** (`require`/`module.exports`): dynamic, so bundlers usually keep everything.
- **Side effects**: if importing a module might do something (patch globals, register CSS), the bundler must keep it. Packages declare `"sideEffects": false` (or a list of files) in `package.json` to allow removal.
- Importing a whole namespace and using it dynamically (`lib[name]()`).
- Re-export barrels in some setups, and classes with static side effects.

## Practical tips

Prefer libraries that ship ESM and mark side effects (lodash-es, date-fns), import named functions, check results with a bundle analyzer, and remember tree shaking only removes unused **exports**; a large function you do use stays.

=== lesson: long-tasks-main-thread-blocking | Long tasks and main-thread blocking
The browser's **main thread** runs JavaScript, style calculation, layout, paint, and handles input. A **long task** is anything that keeps it busy for more than **50 ms**. During it, clicks and typing can't be handled, which hurts INP and feels janky.

## Common causes

Large JS bundles parsing and executing on load, hydration of big pages, heavy re-renders, processing big arrays or JSON, synchronous third-party scripts (analytics, chat widgets, A/B tools), layout thrashing.

## Fixes

- **Ship less JavaScript** (code splitting, server components).
- **Break work into chunks** and yield to the browser between them:

```jsrun
const yieldToMain = () => new Promise(r => setTimeout(r, 0));   // or scheduler.yield() where supported
async function processAll(items) {
  let last = Date.now(), chunks = 0;
  for (let i = 0; i < items.length; i++) {
    items[i] = items[i] * 2;                 // the work
    if (Date.now() - last > 40) { await yieldToMain(); last = Date.now(); chunks++; }
  }
  return chunks;
}
processAll(Array.from({ length: 3e6 }, (_, i) => i)).then(n => console.log("yielded", n, "times instead of one long task"));
```

- **Web Workers** for CPU-heavy work (parsing, image processing, search indexes).
- **Defer** non-critical work: `requestIdleCallback`, load third-party scripts `async`/`defer` or after interaction (Partytown moves some to a worker).
- React: transitions, memoization where profiling shows wasted renders, virtualization.

Find them in the DevTools **Performance** panel (red triangles on tasks) or with the Long Animation Frames API in the field.

=== lesson: react-profiler-finding-wasted-renders | React Profiler: finding wasted renders
React re-renders a component when its state changes or its parent re-renders. Usually cheap, but in big trees it adds up. Measure before optimising.

## React DevTools Profiler

1. Open React DevTools → **Profiler** → record → do the slow interaction → stop.
2. The **flame chart** shows each commit and every component that rendered, with time.
3. Enable "Record why each component rendered": props changed, state changed, hooks changed, parent rendered.
4. Look for big subtrees re-rendering when their output didn't change.

"Highlight updates when components render" (in DevTools settings) flashes components as they render: great for spotting a whole page lighting up on each keystroke.

## Typical findings and fixes

| Finding | Fix |
|---|---|
| Typing in an input re-renders the whole page | move the input's state down (colocate) |
| Context value is a new object every render | `useMemo` the value, split the context |
| Memoized child re-renders anyway | an inline object/function prop: `useCallback`/`useMemo` |
| A list of 2,000 rows re-renders | virtualize; memoize rows with stable keys |
| An expensive calculation on every render | `useMemo`, or move it server-side |

The `<Profiler>` component and `why-did-you-render` library can measure in code. With React Compiler enabled, much of the manual memoization is done for you; profiling is still how you find what remains.

=== lesson: image-formats-responsive-images | Image formats and responsive images
Images are usually the heaviest part of a page.

## Formats

| Format | Use |
|---|---|
| **AVIF** | best compression for photos; slower to encode |
| **WebP** | great compression, universal support |
| JPEG | photos, fallback |
| PNG | lossless graphics with transparency (often WebP is smaller) |
| **SVG** | icons, logos, illustrations: tiny and sharp at any size |

## Serve the right size

```html
<img
  src="hero-800.jpg"
  srcset="hero-400.avif 400w, hero-800.avif 800w, hero-1600.avif 1600w"
  sizes="(max-width: 700px) 100vw, 50vw"
  width="1600" height="900" alt="Workshop at dawn"
  fetchpriority="high">
```

- `srcset` lists available widths; `sizes` tells the browser how wide the image will display, so it picks the smallest adequate file for the screen and pixel density.
- `<picture>` with `<source type="image/avif">` offers formats with fallbacks, or art direction (a different crop on mobile).
- `width`/`height` prevent layout shift.

## In practice

Use an image CDN or framework component (next/image, Cloudinary, imgix, Cloudflare Images) to resize and convert automatically. Compress (quality ~70–80 is usually indistinguishable), lazy-load offscreen images, and never ship a 4000-pixel photo into a 400-pixel slot.

=== lesson: preload-prefetch-preconnect | Preload, prefetch and preconnect
Resource hints tell the browser about resources earlier than it would discover them.

| Hint | Means | Use for |
|---|---|---|
| `<link rel="preconnect" href="https://cdn.example.com">` | open the connection (DNS + TCP + TLS) now | third-party origins you'll definitely use soon |
| `<link rel="dns-prefetch" href="…">` | just resolve DNS | cheaper hint for many origins |
| `<link rel="preload" href="/hero.avif" as="image" fetchpriority="high">` | fetch this **now**, high priority, for **this** page | late-discovered critical resources: hero image, key font, CSS-loaded assets |
| `<link rel="prefetch" href="/checkout.js">` | fetch at low priority for a **future** navigation | the likely next page's code |
| `<link rel="modulepreload" href="/app.js">` | preload and parse an ES module | module graphs |

## Rules of thumb

- Preload only a few things; preloading everything means prioritising nothing, and unused preloads waste bandwidth (the console warns).
- Fonts preloaded need `crossorigin`.
- Framework links (Next.js `<Link>`) prefetch routes automatically when visible or hovered.
- Speculation Rules (`<script type="speculationrules">`) let Chromium browsers prefetch or even prerender likely next pages for near-instant navigation.

=== lesson: ttfb | TTFB
**Time to First Byte**: from the request starting until the first byte of the response arrives. It includes redirects, DNS, connection setup (TCP + TLS), and **server processing time**. Everything else (LCP, FCP) waits on it.

A good TTFB is under about 0.8 s at the 75th percentile (web.dev guidance); fast sites are well under 200 ms.

## What makes it slow, and fixes

| Cause | Fix |
|---|---|
| distance to the server | CDN / edge, regions near users |
| server rendering waits for slow queries | indexes, caching, parallel fetches, streaming (send the shell first) |
| no caching of HTML | static generation / ISR / CDN caching for public pages |
| cold starts (serverless) | keep warm, smaller bundles, edge runtime for light routes |
| redirect chains | link to the final URL; avoid `http → https → www` hops |
| slow TLS / old protocols | HTTP/2 or HTTP/3, TLS 1.3, session resumption |

Measure in DevTools Network ("Waiting for server response"), with `Server-Timing` headers that break down server work (`Server-Timing: db;dur=53, render;dur=47`), and in field data.

=== lesson: compression-gzip-brotli | Compression: gzip and Brotli
Text responses (HTML, CSS, JS, JSON, SVG) compress very well, typically 70–90% smaller.

```text
→ Accept-Encoding: gzip, deflate, br, zstd
← Content-Encoding: br
```

- **gzip**: universal, fast.
- **Brotli (br)**: ~15–25% smaller than gzip for text; slower at high levels, so **pre-compress static assets at build time** at max level and use lower levels for dynamic responses.
- **zstd**: newer, fast, supported in Chromium and Firefox.

## Where it happens

Usually at the CDN or reverse proxy (Nginx, Cloudflare, Vercel do it automatically). In Node, `compression` middleware or Fastify's plugin, but offloading to the proxy is better.

## Don't

- Compress already-compressed formats (JPEG, PNG, WebP, video, zip): wasted CPU.
- Compress tiny responses (< 1 KB): overhead exceeds savings.
- Mix secrets and attacker-controlled input in compressed responses over TLS (BREACH attack); a concern for CSRF tokens in HTML.

Remember `Vary: Accept-Encoding` so caches store separate compressed versions.

=== lesson: font-loading-strategies | Font loading strategies
Web fonts can delay text (invisible until loaded: FOIT) or cause a swap and layout shift (FOUT + CLS).

## font-display

```css
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter.woff2") format("woff2");
  font-display: swap;          /* show fallback text immediately, swap when loaded */
}
```

| Value | Behaviour |
|---|---|
| `swap` | fallback immediately; swap whenever loaded (may shift) |
| `optional` | use the font only if it loads very fast; no late swap (best for CLS) |
| `fallback` | short invisible period, short swap window |
| `block` | invisible text up to ~3 s (avoid for body text) |

## Better practices

- **Self-host** WOFF2 files (no extra connection to a font provider); `next/font` does this automatically.
- **Subset** to the characters you need (Latin only; add Devanagari only if used).
- **Preload** the one or two critical font files.
- **Variable fonts**: one file for all weights.
- **Size-adjusted fallbacks** (`size-adjust`, `ascent-override`) so the fallback takes the same space and the swap doesn't shift layout.
- Fewer families and weights; system font stacks are free.

=== lesson: lighthouse | Lighthouse
Lighthouse (in Chrome DevTools, PageSpeed Insights, or CLI/CI) audits a page in a **simulated lab environment** and scores performance, accessibility, best practices and SEO.

## Reading the performance score

Weighted from lab metrics: LCP, Total Blocking Time (the lab proxy for INP), CLS, FCP, Speed Index. The **Opportunities** and **Diagnostics** sections tell you what to fix: render-blocking resources, unused JS/CSS, oversized images, long main-thread work.

## Lab vs field

Lighthouse simulates a mid-range phone on a throttled network from one location, with an empty cache. Real users (field data: CrUX, RUM) may be faster or slower. Google ranks on field data. Use Lighthouse to **debug and catch regressions**; use field data to know how you're actually doing.

Scores vary between runs (machine load, network); run several times or in CI with Lighthouse CI and compare medians, setting budgets per metric rather than chasing 100.

> "A 100 Lighthouse score doesn't guarantee a fast site for users; I check field Core Web Vitals and use Lighthouse to find specific problems."

=== lesson: api-response-shaping | API response shaping
Slow pages are often caused by APIs that return too much, too little, or need too many calls.

## Common problems and fixes

| Problem | Fix |
|---|---|
| Over-fetching: huge objects when the screen needs 3 fields | sparse fieldsets (`?fields=`), DTOs per use case, GraphQL |
| Under-fetching: N calls to render one screen | aggregate endpoint / BFF, `?include=` expansions |
| Waterfalls: call B needs A's result, then C needs B's | fetch in parallel where possible, aggregate server-side, server components |
| Unbounded lists | always paginate; set max page sizes |
| Large payloads | compression, avoid deep nesting, return IDs + lookup maps instead of repeated objects |
| Expensive computed fields always included | compute on request (`?include=stats`) or cache |
| Chatty polling | ETags/304, longer intervals, push (SSE/WebSockets) |

## Server-side

Select only needed columns (`SELECT *` sends everything), avoid N+1, cache hot responses, stream large exports instead of building them in memory.

Measure: response sizes in the Network panel, server timings, and how many requests each screen makes.

=== lesson: db-query-optimization | Database query optimization
Most backend performance problems are slow queries. The process:

1. **Find them**: `pg_stat_statements` (top queries by total time), slow query log (`log_min_duration_statement`), APM traces showing slow DB spans.
2. **Understand them**: `EXPLAIN (ANALYZE, BUFFERS)` (see SQL → EXPLAIN).
3. **Fix them**, roughly in order of effort:

| Fix | Example |
|---|---|
| Add or adjust an index | composite `(user_id, created_at)`; partial index for `WHERE deleted_at IS NULL` |
| Rewrite the query | keyset pagination instead of OFFSET; `EXISTS` instead of `IN (big subquery)`; avoid functions on indexed columns |
| Select less | specific columns; `LIMIT` |
| Remove N+1 | joins, batching, DataLoader |
| Batch writes | multi-row `INSERT`, `COPY` for bulk loads |
| Cache | hot reads in Redis; materialized views for reports |
| Precompute | counters, summary tables updated on write |
| Update statistics / maintenance | `ANALYZE`, vacuum bloat |
| Scale | read replicas, connection pooling, bigger instance, partitioning |

4. **Verify**: compare the plan and timing before and after, with production-like data volumes (a query that's fast on 1,000 rows can be terrible on 10 million).

=== lesson: edge-caching | Edge caching
Caching at the CDN edge serves content from servers near users, so requests never reach your origin.

## Beyond static files

- **Full HTML pages** for anonymous users: marketing, docs, product pages (with `s-maxage` + `stale-while-revalidate`, or ISR).
- **Public API responses**: product catalogues, configuration, search suggestions.
- **Edge functions** (Cloudflare Workers, Vercel/Netlify edge) can personalise lightly around cached content: add geo-based currency, A/B bucket via a cookie, check auth before serving.

## Personalisation without losing caching

- Cache the shell, fetch personal bits client-side or stream them (PPR).
- Vary the cache key on a small number of variants (country, language, logged-in vs anonymous), never per user.
- Keep user-specific responses `private`.

## Invalidation

Purge by tag/key on content changes (CMS webhook → CDN purge API), versioned URLs for assets, and short TTLs with `stale-while-revalidate` for content that can be slightly stale.

The win: lower latency worldwide, less origin load, and resilience (some CDNs serve stale content if your origin is down: `stale-if-error`).
