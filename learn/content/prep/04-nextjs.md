---
course: prep
module: next-js-and-rendering
title: Next.js and rendering
order: 104
---
=== lesson: ssr-ssg-isr-csr-trade-offs-and-when-to-pick-which | SSR, SSG, ISR, CSR: trade-offs
Four ways to decide **when** a page's HTML is produced.

| Strategy | HTML made | Good for | Costs |
|---|---|---|---|
| **CSR** (client-side) | in the browser, after JS loads | dashboards behind login, highly interactive apps | blank page until JS runs, weaker SEO, slow on cheap phones |
| **SSR** (server-side) | on the server, **per request** | personalised or always-fresh pages: feeds, search results, carts | server work every request, TTFB depends on data |
| **SSG** (static) | at **build time** | marketing pages, docs, blogs | stale until rebuilt; build time grows with page count |
| **ISR** (incremental static) | at build, then **regenerated** in the background after N seconds or on demand | product pages, articles, catalogues | users may see slightly stale content |

## How to choose

1. Is the content the same for every visitor? → static (SSG/ISR).
2. Does it change? How fresh must it be? Minutes is fine → ISR. Must be live → SSR or client fetch.
3. Is it personalised? → SSR, or a static shell plus client-side fetching for the personal parts.
4. Does it need SEO and fast first paint? → avoid pure CSR.

## Mixing is normal

Real apps mix per route, and with the App Router, per **component**: a static product page with a streamed, dynamic "recommended for you" section. That's what partial prerendering formalises.

> **"SSR vs SSG?"** SSG renders once at build time and serves from a CDN: fastest, cheapest, but stale until rebuilt. SSR renders per request: always fresh and personalisable, but costs server time on every hit. ISR is SSG that refreshes itself on a schedule or on demand.

=== lesson: app-router | The App Router
The App Router (`app/` directory, Next.js 13+) maps folders to routes and is built on React Server Components.

## File conventions

```
app/
  layout.tsx            ← wraps every page; persists across navigation
  page.tsx              ← "/"
  loading.tsx           ← Suspense fallback for this segment
  error.tsx             ← error boundary for this segment ("use client")
  not-found.tsx
  dashboard/
    layout.tsx          ← nested layout for /dashboard/*
    page.tsx            ← "/dashboard"
    [teamId]/page.tsx   ← dynamic segment: params.teamId
  (marketing)/about/page.tsx   ← route group: no URL segment
  api/users/route.ts    ← route handler (API endpoint)
```

## Key ideas

- **Layouts don't re-render on navigation** between their child pages, so their state is kept (a sidebar stays mounted).
- Components are **Server Components by default**; add `"use client"` where you need state, effects or browser APIs.
- Data is fetched directly in async server components (`await db.query(...)`), no `getServerSideProps`.
- `params` and `searchParams` are **promises** (Next.js 15+, required in 16): `const { teamId } = await params`.
- Parallel routes (`@modal`) and intercepting routes (`(.)photo`) build modals that have their own URLs.

## Pages Router vs App Router

| Pages Router | App Router |
|---|---|
| `getServerSideProps` / `getStaticProps` per page | async server components, fetch anywhere |
| whole page is client JS | server components ship no JS |
| `_app`, `_document` | nested `layout.tsx` |
| API routes in `pages/api` | `route.ts` route handlers |

> **"Why the App Router?"** Nested layouts that persist, server components that send less JavaScript, streaming with Suspense, and data fetching colocated with the component that needs it.

=== lesson: server-components-vs-client-components | Server Components vs Client Components
**React Server Components (RSC)** run only on the server (at build or request time). Their code never ships to the browser. **Client Components** (`"use client"`) are the React you know: rendered on the server for the first HTML, then hydrated and interactive in the browser.

| Server Component | Client Component |
|---|---|
| can be `async`, `await` the database directly | useState, useEffect, event handlers |
| can use secrets, server-only libraries | browser APIs: window, localStorage |
| zero JS sent to the browser | its code is in the bundle |
| can't use hooks or handlers | can't import server-only code |

## The boundary

`"use client"` marks an entry point: that file **and everything it imports** become client code. Push it down to the leaves (a button, a chart), not the whole page.

Server components can render client components and pass them **serialisable props** (no functions, except server actions). A client component can't import a server component, but can receive one as `children`:

```tsx
// page.tsx (server)
export default async function Page() {
  const posts = await db.post.findMany();
  return (
    <LikeProvider>                 {/* client */}
      <PostList posts={posts} />   {/* server, passed as children */}
    </LikeProvider>
  );
}
```

## Common mistakes

- `"use client"` at the top of a layout makes the whole tree client-side.
- Passing large data to client components (it's serialised into the page).
- Importing a server module (with secrets) into client code; use the `server-only` package to make that a build error.

> **"What problem do server components solve?"** They let components fetch data on the server and send rendered output instead of JavaScript, so data-heavy, non-interactive parts cost nothing in the bundle, and secrets never reach the client.

=== lesson: dynamic-vs-static-rendering | Dynamic vs static rendering
Next.js decides per route whether it can render at **build time** (static) or must render **per request** (dynamic).

## What makes a route dynamic

Reading request-specific data:

- `cookies()`, `headers()`, `draftMode()`
- `searchParams`
- uncached data fetches (in Next.js 15+, `fetch` isn't cached by default)
- `connection()` (an explicit opt-in to dynamic)
- `export const dynamic = "force-dynamic"`

Otherwise it can be prerendered. Dynamic segments like `[slug]` can still be static if you return the list with `generateStaticParams`.

## Next.js 16 with Cache Components

With `cacheComponents: true`, the rule becomes simpler: **everything is dynamic by default**, and you opt into caching with the `"use cache"` directive on a page, component or function. Static parts of a page are prerendered into a shell and dynamic parts stream in through Suspense, so a route doesn't have to be all-static or all-dynamic.

```tsx
async function ProductInfo({ id }: { id: string }) {
  "use cache";                 // cached; key derived from the arguments
  return <Details product={await getProduct(id)} />;
}
```

## How to check

`next build` prints each route with a symbol for static (○), SSG with params (●), or dynamic (ƒ).

> **"Why is my page dynamic when I expected static?"** Something in the tree reads request data (cookies, headers, searchParams) or does an uncached fetch. Move that into a smaller component behind Suspense, or cache the data, so the rest of the page can be static.

=== lesson: route-handlers | Route handlers
API endpoints in the App Router: a `route.ts` file exporting functions named after HTTP methods. They use the Web `Request`/`Response` APIs.

```ts
// app/api/todos/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
  const todos = await db.todo.findMany({ skip: (page - 1) * 20, take: 20 });
  return NextResponse.json(todos);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = TodoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const todo = await db.todo.create({ data: parsed.data });
  return NextResponse.json(todo, { status: 201 });
}
```

Dynamic segments: `app/api/todos/[id]/route.ts` receives `{ params }` (a promise) as the second argument.

## Route handlers vs server actions

| Route handlers | Server actions |
|---|---|
| public HTTP endpoints | functions called from your own UI |
| webhooks, mobile apps, third parties | form submissions and mutations |
| you choose method, status, headers | always POST, managed by Next.js |

Use route handlers when something other than your Next.js UI calls it: Stripe webhooks, OAuth callbacks, a mobile client, cron jobs.

Remember: they're public URLs. Authenticate, authorise and validate every request.

=== lesson: middleware | Middleware (proxy.ts in Next.js 16)
Code that runs **before** a request reaches a route, so it can redirect, rewrite, set headers or cookies, or return a response early.

In Next.js 16, `middleware.ts` was renamed to **`proxy.ts`** (exported function `proxy`), and it runs on the Node.js runtime. `middleware.ts` still works for the Edge runtime but is deprecated.

```ts
// proxy.ts (middleware.ts in Next.js ≤15)
import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  if (!session && req.nextUrl.pathname.startsWith("/dashboard")) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("x-request-id", crypto.randomUUID());
  return res;
}

export const config = { matcher: ["/dashboard/:path*", "/api/:path*"] };
```

## Good uses

Auth redirects (cheap checks only), locale detection and rewrites, A/B test bucketing, adding security headers, bot blocking, redirects for moved URLs.

## Cautions

- It runs on **every matched request**: keep it fast, use `matcher` to limit it.
- Don't rely on it as your only authorisation check. A 2025 vulnerability (CVE-2025-29927) let attackers skip middleware with a crafted header; check permissions again where data is read (server components, actions, route handlers).
- Avoid database calls; verify a signed cookie or token instead.

=== lesson: server-actions | Server actions
Async functions marked `"use server"` that run on the server but can be called from client code, typically from a form. Next.js turns each one into a POST endpoint behind the scenes.

```tsx
// app/todos/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function addTodo(formData: FormData) {
  const user = await auth();
  if (!user) throw new Error("Unauthorised");
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "Text is required" };
  await db.todo.create({ data: { text, userId: user.id } });
  revalidatePath("/todos");            // refresh the cached page
}

// app/todos/page.tsx (server component)
<form action={addTodo}>
  <input name="text" />
  <button>Add</button>
</form>
```

Forms with server actions work before JavaScript loads (progressive enhancement). On the client, pair them with `useActionState` for errors and pending state, and `useOptimistic` for instant feedback.

## Security: treat each action as a public endpoint

Anyone can call it with any arguments. Always:

- authenticate and authorise inside the action,
- validate input (Zod),
- never trust IDs from the client without checking ownership.

## After a mutation

`revalidatePath()` or `revalidateTag()` to refresh cached data; in Next.js 16, `updateTag()` gives read-your-writes (the user sees their change immediately) and `refresh()` re-fetches uncached data. `redirect()` to navigate afterwards.

=== lesson: metadata-seo-api | Metadata and SEO API
The App Router manages `<head>` through exports, not a `<Head>` component.

```tsx
// static
export const metadata: Metadata = {
  title: { default: "Acme", template: "%s · Acme" },
  description: "…",
  openGraph: { images: ["/og.png"] },
  alternates: { canonical: "https://acme.com" },
};

// dynamic, per page
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);       // deduped with the page's own fetch
  return { title: post.title, description: post.excerpt, openGraph: { images: [post.cover] } };
}
```

Metadata from nested layouts and pages is merged, with the deepest segment winning.

## File-based SEO

- `app/sitemap.ts` → `/sitemap.xml`; `app/robots.ts` → `/robots.txt`
- `opengraph-image.tsx` generates social images with JSX (`ImageResponse`)
- `icon.png`, `apple-icon.png` for favicons

## SEO talking points

Server-rendered HTML with real content (not client-only), one `<h1>` and semantic structure, canonical URLs to avoid duplicates, structured data (JSON-LD in a `<script type="application/ld+json">`), fast Core Web Vitals, descriptive link text and alt text.

=== lesson: image-font-optimization | Image and font optimization
## next/image

```tsx
import Image from "next/image";
<Image src={product.photo} alt={product.name} width={800} height={600}
       sizes="(max-width: 768px) 100vw, 50vw" priority />
```

What it does for you:

- Resizes to the requested widths and serves modern formats (WebP/AVIF) via `srcset`.
- **Requires dimensions** (or `fill`), reserving space so the layout doesn't shift (better CLS).
- Lazy-loads offscreen images by default; `priority` (or `preload` in newer versions) for the LCP image above the fold.
- Remote images must be allowed in `images.remotePatterns`.

`sizes` matters: without it, the browser may download a much larger image than it displays.

## next/font

```tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], display: "swap" });
<html className={inter.className}>
```

- Downloads Google fonts **at build time** and self-hosts them, so there's no request to Google at runtime (privacy, one fewer connection).
- Generates a size-adjusted fallback font so the swap from fallback to web font doesn't shift the layout.
- Preloads the font files.

> **"How does Next help with Core Web Vitals?"** next/image avoids layout shift and oversized downloads and prioritises the hero image (LCP); next/font removes font-swap shift and third-party requests; server components and code splitting reduce JS (INP).

=== lesson: hydration-hydration-mismatches | Hydration and hydration mismatches
**Hydration**: the server sends HTML so the page is visible fast; then React runs in the browser, builds the same tree, and attaches event handlers to the existing DOM instead of recreating it.

For that to work, the first client render **must produce the same output** as the server. If not, React reports a **hydration mismatch** and re-renders that part on the client (slower, and can flicker).

## Common causes

- `Date.now()`, `new Date().toLocaleString()`, `Math.random()` in render.
- `typeof window !== "undefined"` branches that render different content.
- Reading `localStorage` or `window.innerWidth` during render.
- Locale or timezone differences between server and browser.
- Invalid HTML nesting (`<div>` inside `<p>`, `<a>` inside `<a>`), which the browser silently "fixes".
- Browser extensions modifying the DOM before hydration.

## Fixes

```tsx
// render browser-only values after mount
const [now, setNow] = useState<string | null>(null);
useEffect(() => setNow(new Date().toLocaleTimeString()), []);
return <span>{now ?? "—"}</span>;
```

- Or load a component only on the client: `dynamic(() => import("./Map"), { ssr: false })`.
- `suppressHydrationWarning` for unavoidable single-element differences (a timestamp).
- Fix invalid HTML nesting.

## Hydration cost

Hydration re-runs every client component in the browser. Large pages can take a while to become interactive. Server components (which don't hydrate), smaller client islands, and lazy loading reduce it.

=== lesson: streaming-suspense-boundaries | Streaming and Suspense boundaries
Instead of waiting for all data before sending any HTML, the server can **stream**: send the page shell immediately, then send each slow section as its data arrives.

```tsx
export default function Page() {
  return (
    <>
      <Header />                                    {/* sent immediately */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews />                                 {/* async, slow: streamed in later */}
      </Suspense>
      <Suspense fallback={<RecsSkeleton />}>
        <Recommendations />
      </Suspense>
    </>
  );
}
```

`loading.tsx` wraps a whole route segment in a Suspense boundary automatically.

## How it works

The response uses chunked transfer. The initial HTML contains the fallbacks; when `<Reviews>` resolves, the server sends its HTML plus a small inline script that swaps it into place. Selective hydration lets React hydrate the parts that have arrived first, prioritising whatever the user interacts with.

## Why it matters

- **TTFB and FCP improve**: the shell arrives without waiting for the slowest query.
- Independent sections don't block each other.
- **Avoid waterfalls**: start independent fetches in parallel (`Promise.all`), or let sibling Suspense boundaries fetch independently.

Status codes: once streaming starts, the HTTP status is already sent (200), so `notFound()` or redirects inside a streamed section are handled in the HTML, not via headers. Do important checks before the first boundary.

=== lesson: the-caching-layers-request-data-full-route-router | The caching layers
In Next.js 13–15 the App Router had four caches. Interviewers still ask about them, and you'll meet them in existing codebases.

| Cache | Where | What | Lifetime |
|---|---|---|---|
| **Request memoization** | server, one render | identical `fetch` calls in a single render tree are deduplicated | that request |
| **Data cache** | server, persistent | results of `fetch` (when cached) | until revalidated |
| **Full route cache** | server | rendered HTML + RSC payload of static routes | until revalidated or redeployed |
| **Router cache** | browser memory | RSC payloads of visited/prefetched routes | the session (short for dynamic pages) |

## The history, briefly

- Next.js 13–14 cached `fetch` by default, which surprised people with stale data.
- Next.js 15 made `fetch` and GET route handlers **uncached by default**.
- Next.js 16's **Cache Components** (`cacheComponents: true`) make caching explicit: `"use cache"` on functions, components or pages, `cacheLife()` for duration, `cacheTag()` for invalidation. Anything not cached runs per request.

```ts
import { cacheLife, cacheTag } from "next/cache";
export async function getProducts() {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  return db.product.findMany();
}
```

`React.cache()` still deduplicates non-fetch calls (like a DB query) within one request.

> **"My page shows stale data after an update. Why?"** Something cached it: the data cache, the full route cache, or the browser's router cache. After a mutation, revalidate the tag or path on the server (or `updateTag` in Next 16), and `router.refresh()` on the client if needed.

=== lesson: revalidation-strategies | Revalidation strategies
How cached data gets refreshed.

## Time-based

```ts
// Next ≤15: per fetch, or for the whole route
fetch(url, { next: { revalidate: 3600 } });
export const revalidate = 3600;

// Next 16 with Cache Components
"use cache"; cacheLife("hours");
```

Stale-while-revalidate: after the period, the next visitor still gets the cached version while a fresh one is generated in the background. Simple, but data can be stale for up to the interval.

## On-demand

Invalidate exactly when data changes, from a server action, route handler or webhook:

```ts
revalidatePath("/blog/[slug]", "page");     // a path
revalidateTag("posts", "max");              // everything tagged "posts" (Next 16: profile argument)
updateTag(`post-${id}`);                    // Next 16, in actions: expire and read fresh immediately
```

Tags beat paths when one piece of data appears on many pages (a product on its page, in listings and in search).

## Choosing

| Data | Strategy |
|---|---|
| marketing copy, docs | static, revalidate on deploy or CMS webhook |
| product catalogue | tags, revalidated by the admin's save action or a CMS webhook |
| prices, stock | short time-based, or dynamic |
| user's own data | dynamic, or `updateTag` after their writes |

> **"How would you keep a cached product page fresh?"** Tag the product fetch, and call revalidateTag from the action or webhook that updates the product, with a long time-based fallback as a safety net.

=== lesson: edge-vs-node-runtime | Edge vs Node runtime
Next.js server code can run in two runtimes.

| | Node.js runtime | Edge runtime |
|---|---|---|
| where | regional servers / serverless functions | many locations close to users (V8 isolates) |
| cold start | slower | near zero |
| APIs | all of Node: fs, native modules, most npm packages | Web APIs only (fetch, Request, crypto.subtle); no fs, limited npm |
| limits | generous memory and time | small bundle, CPU-time limits |
| good for | database access, heavy logic, most routes | redirects, rewrites, auth checks, geolocation, A/B tests |

## The catch with edge

Running near the user only helps if your **data** is near the user too. An edge function in Mumbai calling a database in Virginia makes the round trip worse, not better. That's why many teams moved back to Node for data-heavy routes, and why Next.js 16's `proxy.ts` runs on Node by default.

Choose per route: `export const runtime = "edge"`.

> **"When would you use the edge runtime?"** For lightweight logic that benefits from low latency everywhere and doesn't need a central database: redirects, header manipulation, personalisation from cookies or geo, token verification. Database-heavy work stays in the Node runtime near the database.

=== lesson: partial-prerendering | Partial prerendering
**PPR** combines static and dynamic rendering in the **same route**. The static parts are prerendered at build time into a shell served instantly from the CDN; the dynamic parts, wrapped in `<Suspense>`, are rendered per request and streamed into the holes.

```tsx
export default function ProductPage() {
  return (
    <>
      <ProductDetails />                      {/* cached: in the static shell */}
      <Suspense fallback={<CartSkeleton />}>
        <CartButton />                        {/* reads cookies: dynamic, streamed */}
      </Suspense>
    </>
  );
}
```

Before PPR, one `cookies()` call made the **whole** route dynamic.

## Status

PPR was experimental from Next.js 14. In Next.js 16 the `experimental.ppr` flag was removed and the model became part of **Cache Components** (`cacheComponents: true`): cached content (`"use cache"`) goes in the shell, Suspense boundaries mark the dynamic holes.

> **"What problem does PPR solve?"** The all-or-nothing choice between static and dynamic per page. You get a CDN-fast static shell plus per-request personalised sections, with Suspense boundaries as the dividing line.
