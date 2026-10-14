---
course: prep
module: frontend-system-design
title: Frontend system design
order: 122
---
=== lesson: component-api-design | Component API design
Frontend system design rounds (common at product companies) often start with "design a reusable X component". Good component APIs are easy to use correctly and hard to misuse.

## Principles

- **Small, predictable props** named for meaning: `variant="danger"`, `size="sm"`, not `red`, `small`.
- **Composition over configuration**: accept `children` and slots instead of 20 boolean props.

```jsx
// configuration explosion
<Modal title="Delete?" showClose hasFooter footerAlign="right" primaryText="Delete" onPrimary={…} secondaryText="Cancel" />

// composition
<Dialog open={open} onOpenChange={setOpen}>
  <Dialog.Title>Delete project?</Dialog.Title>
  <Dialog.Description>This can't be undone.</Dialog.Description>
  <Dialog.Actions><Button variant="ghost">Cancel</Button><Button variant="danger">Delete</Button></Dialog.Actions>
</Dialog>
```

- **Controlled and uncontrolled** support: `value`/`onChange` for control, `defaultValue` for convenience.
- **Pass through native props** (`...rest` onto the root element, `className`, `ref`) so users can add `aria-*`, `data-*` and styles.
- **Accessible by default**: correct roles, keyboard handling, focus management, labels.
- **Headless** option: logic and accessibility in hooks/primitives (Radix, React Aria, Headless UI), styling left to the app.
- Typed props, sensible defaults, and documentation with examples (Storybook).

In the interview: requirements (variants, states: loading/disabled/error, sizes, accessibility, theming), the props API with an example, internal state, edge cases, and how you'd test it.

=== lesson: data-fetching-caching-layer | Data fetching and caching layer
Every non-trivial frontend needs a strategy for loading, caching and updating server data.

## Requirements to cover

- Loading, error and empty states for every request.
- Caching so revisiting a screen is instant (stale-while-revalidate).
- Deduplication: three components needing the user trigger one request.
- Invalidation after mutations; optimistic updates where it improves UX.
- Pagination / infinite loading, prefetching on hover.
- Cancellation of outdated requests (fast typing, navigation).
- Retries with backoff for transient failures; offline handling.

## Typical architecture

```text
components ── useQuery / useMutation hooks ── query client (cache keyed by ["orders", filters])
                                                   │
                                     API client (fetch wrapper: base URL, auth, error normalisation, tracing)
                                                   │
                                             REST / GraphQL / server components
```

Use a library (TanStack Query, SWR, Apollo/urql for GraphQL, RTK Query) rather than `useEffect` + `useState` everywhere. In Next.js App Router, much fetching moves to server components, with client-side queries for interactive, frequently updated data.

## Discussion points

Cache keys and normalisation (entities shared across queries), stale times per data type, real-time updates (WebSocket events invalidating or patching the cache), and how errors surface (inline vs toast vs error boundary).

=== lesson: state-architecture-at-scale | State architecture at scale
In a large app, state goes wrong when everything ends up global or everything is prop-drilled. Classify state first, then give each kind its home:

| Kind | Examples | Home |
|---|---|---|
| **Server state** | users, orders, products | data-fetching cache (TanStack Query, server components) |
| **URL state** | filters, tab, page, search term, selected item | the URL (search params, route segments) |
| **Form state** | input values, validation errors | form library (React Hook Form) or local state |
| **Local UI state** | is this dropdown open | component state |
| **Shared client state** | cart before checkout, editor document, multi-step wizard | a store (Zustand, Redux Toolkit) or context near where it's used |
| **Persisted preferences** | theme, layout density | localStorage + a small store |

## Principles

- Keep state as **local** as possible and lift only when needed.
- **Derive** instead of duplicating (filtered lists, totals).
- **Single source of truth** per piece of data; don't copy server data into a client store.
- Prefer **URL state** for anything users would share or expect back/forward to restore.
- In very large apps: feature-scoped stores, module boundaries, and avoid one giant global store that every feature touches.

=== lesson: design-autocomplete-typeahead | Design autocomplete / typeahead
A classic frontend system design question.

## Requirements

Suggestions appear as the user types; keyboard navigation; highlights the match; fast perceived response; handles slow networks; accessible; works on mobile.

## Data flow

```text
input → debounce (~200 ms) → if query.length ≥ 2: check client cache (LRU by query) → else fetch /suggest?q=
      → abort previous in-flight request (AbortController) → ignore out-of-order responses
      → render top N (≈ 8–10) with the matched part highlighted
```

## Key details

- **Debounce** to limit requests; **cache** results per query (and prefix reuse: results for "iph" can filter locally for "ipho").
- **Race conditions**: abort the previous fetch or tag requests and drop stale responses.
- **Keyboard**: ↑/↓ moves the active option, Enter selects, Escape closes, Tab moves on.
- **Accessibility (ARIA combobox pattern)**: `role="combobox"`, `aria-expanded`, `aria-controls` pointing to a `role="listbox"`, `aria-activedescendant` for the highlighted `role="option"`, and an `aria-live` count of results.
- **Empty, loading and error states**; recent searches when the input is empty.
- **Performance**: virtualize very long lists; avoid re-rendering the whole page on each keystroke.
- **Backend side**: a prefix-optimised index (Elasticsearch completion suggester, a trie, Postgres `pg_trgm`), popular-query ranking, and CDN caching of common prefixes.

=== lesson: design-an-infinite-feed | Design an infinite feed
Think of a social or product feed that loads more as you scroll.

## Requirements

Smooth scrolling with thousands of items, new items arriving at the top, variable-height cards with images and video, back navigation restoring the scroll position, works on low-end phones.

## Design

- **Cursor-based pagination** from the API (`after=<cursor>`, stable under inserts).
- **IntersectionObserver** on a sentinel element near the bottom triggers the next page (prefetch a page early: `rootMargin: "800px"`).
- **Virtualization** (windowing) keeps the DOM small: only render visible cards plus a buffer; measure variable heights (react-virtuoso, TanStack Virtual).
- **New items at the top**: show a "12 new posts" pill instead of pushing content down under the user's thumb.
- **Media**: lazy-load images with reserved dimensions (no layout shift), play videos only when visible, low-quality placeholders.
- **State restoration**: keep feed data in a cache (TanStack Query infinite query) and restore scroll position on back navigation.
- **Errors**: retry button for a failed page without losing loaded items.
- **Accessibility**: `role="feed"` with `aria-busy` while loading, articles with labels, keyboard access, and an alternative "load more" button (infinite scroll can trap keyboard users before the footer).

Performance budget: memoized card components, no heavy work in scroll handlers, images via an image CDN.

=== lesson: design-a-data-table | Design a data table
Admin panels and dashboards are full of tables; designing a good one covers many frontend skills.

## Requirements to clarify

Number of rows (100 or 1 million?), sorting, filtering, search, pagination vs infinite scroll, column resizing/reordering/hiding, row selection and bulk actions, inline editing, sticky header and first column, export, responsive behaviour.

## Key decisions

- **Server-side vs client-side** operations: under a few thousand rows, sort and filter in the browser; beyond that, the server does it, with query parameters in the URL (`?sort=-createdAt&status=paid&page=3`).
- **Rendering large data**: virtualize rows (and columns when there are many).
- **Headless table logic** (TanStack Table) with your own markup and styling.
- **State in the URL** for sort, filters and page, so views are shareable and back/forward works.
- **Selection** model: by row ID (not index), "select all matching" vs "select page".
- **Editing**: optimistic updates with rollback, validation per cell, keyboard navigation like a spreadsheet.

## Accessibility

Use a real `<table>` with `<th scope>` (or the ARIA grid pattern for interactive grids), `aria-sort` on sortable headers, buttons inside headers for sorting, and announce result counts after filtering.

On small screens: hide less important columns, or switch to a card layout per row.

=== lesson: design-a-chat-ui | Design a chat UI
(Pairs with System design → Design a chat app for the backend.)

## Requirements

Conversation list and message view, real-time incoming messages, sending with instant feedback, history loading upwards, typing indicators, read receipts, attachments, works with flaky mobile networks.

## Design points

- **Transport**: WebSocket (or SSE + POST) with reconnection and resync ("give me messages after ID X").
- **Optimistic sending**: show the message immediately with a client ID and a "sending" state, replace with the server-confirmed message (and ID) on ack, show "failed, tap to retry" on error. Dedupe by client ID.
- **Ordering** by server sequence, not client clocks.
- **Scrolling**: newest at the bottom; stay pinned to the bottom when the user is there, show a "new messages ↓" button when they've scrolled up; load older messages on scroll-up while **preserving scroll position** (a reverse virtualized list, e.g. react-virtuoso).
- **Normalised client cache**: messages by conversation; unread counts updated from events.
- **Typing indicators** throttled (send at most every few seconds), expire automatically.
- **Attachments**: upload directly to storage with progress, then send a message referencing the file.
- **Offline**: queue outgoing messages and send on reconnect.
- **Accessibility**: new messages announced politely (`aria-live="polite"` on the log, `role="log"`), proper labels on the composer.

=== lesson: design-a-file-uploader | Design a file uploader
## Requirements

Drag and drop and a file picker, multiple files, progress per file, cancel and retry, large files, type and size validation, previews for images, accessible.

## Design

- **Client validation first**: type, size, count; but the server validates again.
- **Direct-to-storage uploads** with presigned URLs (see System design → File upload); multipart/chunked for large files so a failure retries one chunk, not the whole file (or the tus protocol).
- **Concurrency limit**: upload 2–3 files at a time, queue the rest.
- **Progress**: `XMLHttpRequest` upload progress events (fetch upload progress is limited), per file and overall.
- **Cancel** with `abort()`; **retry** with backoff.
- **Previews** with `URL.createObjectURL(file)` (revoke when done); resize or compress images in the browser before upload where appropriate.
- **State machine per file**: `queued → uploading → processing → done | failed | cancelled`.
- **Resumability** across reloads for very large files (store upload IDs and completed parts).

## Accessibility

A real `<input type="file">` (visually styled) so keyboard and screen readers work; the drop zone isn't the only way in; progress with `role="progressbar"` and `aria-valuenow`; announce completion and errors.

=== lesson: optimistic-updates | Optimistic updates
Update the UI **immediately** as if the server will succeed, then reconcile when it responds. Likes, toggles, reordering, chat messages and adding to cart feel instant.

```js
const qc = useQueryClient();
useMutation({
  mutationFn: (todo) => api.toggleTodo(todo.id),
  onMutate: async (todo) => {
    await qc.cancelQueries({ queryKey: ["todos"] });                 // avoid overwriting by an in-flight fetch
    const previous = qc.getQueryData(["todos"]);
    qc.setQueryData(["todos"], (old) => old.map(t => t.id === todo.id ? { ...t, done: !t.done } : t));
    return { previous };
  },
  onError: (_err, _todo, ctx) => { qc.setQueryData(["todos"], ctx.previous); toast("Couldn't save. Undone."); },
  onSettled: () => qc.invalidateQueries({ queryKey: ["todos"] }),    // sync with the server's truth
});
```

React 19's `useOptimistic` does the same for actions.

## When to use it

High-success-rate, low-stakes, easily reversible actions. **Avoid** for payments, irreversible actions, or anything where showing success falsely would mislead (stock-limited purchases).

## Edge cases

Rapid repeated clicks (serialise or use the latest intent), concurrent edits from other users, failures after the user navigated away (still notify), and server-modified results (the server's response wins on settle).

=== lesson: error-loading-state-strategy | Error and loading state strategy
A consistent approach across the app, instead of each screen improvising.

## Loading

- **Skeletons** matching the layout for content areas (better than spinners for perceived speed); spinners for small inline actions.
- Don't flash loaders for fast responses (delay ~200 ms before showing).
- Keep showing old content while refreshing (stale-while-revalidate, React transitions).
- Suspense boundaries placed per independent section, so one slow widget doesn't blank the page.

## Errors

| Error | Treatment |
|---|---|
| Field validation | inline, next to the field, explaining how to fix |
| Action failed (save, delete) | toast or inline message with retry; keep the user's input |
| Section failed to load | error boundary for that section with a retry button |
| Whole page failed | route-level error page with retry and a way back |
| Not found / no permission | dedicated 404/403 states, not a generic crash |
| Offline | banner, queued actions where possible |

## Empty states

"No orders yet" with the next action ("Browse products"), different from "no results for this filter" (offer to clear filters).

Plus: error reporting (Sentry) with context, request IDs shown in error details for support, and messages written for users, not stack traces.

=== lesson: design-systems-tokens | Design systems and tokens
A **design system** is the shared set of components, patterns and rules that keeps a product consistent: tokens + components + documentation + governance.

## Design tokens

Named values for design decisions, used everywhere instead of raw values:

```css
:root {
  --color-bg: #FFFFFF;  --color-text: #141833;  --color-primary: #2E6AD8;  --color-danger: #D23B3B;
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --radius-sm: 6px; --radius-md: 10px;
  --font-body: "Inter", system-ui, sans-serif;  --text-sm: 14px; --text-md: 16px;
}
[data-theme="dark"] { --color-bg: #0E1020; --color-text: #ECEFFA; --color-primary: #5B95F7; }
```

Layers: **primitive** tokens (`blue-600`) → **semantic** tokens (`color-primary`, `color-danger`) → **component** tokens (`button-bg`). Theming and dark mode change semantic tokens; components don't change.

## Components

A library of accessible, documented building blocks (Button, Input, Select, Dialog, Toast, Table) with variants. Often built on headless primitives (Radix, React Aria) and documented in Storybook; shadcn/ui is a popular starting point.

## Making it work

Tokens synced from design tools (Figma variables) to code, visual regression tests (Chromatic), versioning and changelogs, a contribution process, and adoption tracking. Consistency, speed of building, and accessibility built in once are the pay-offs.

=== lesson: code-splitting-budgets | Code splitting budgets
A **performance budget** is a limit you agree on and enforce: if a change exceeds it, CI warns or fails.

## What to budget

- **JavaScript** per route (compressed): e.g. ≤ 170 KB for initial load on mobile, ≤ 50 KB added by any single feature.
- CSS, fonts, images per page.
- Metrics: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at p75; Lighthouse performance score in CI.
- Number of requests, third-party script weight.

## Enforcing

- `size-limit` or bundlewatch in CI, commenting the size diff on PRs.
- Next.js build output reviewed for route sizes; bundle analyzer on big jumps.
- Lighthouse CI with assertions.
- Real-user monitoring dashboards and alerts on regressions.

## Staying within budget

Route- and component-level code splitting, lazy-loading heavy libraries, replacing heavy dependencies, server components for non-interactive UI, and a review step for every new dependency ("what does this add to the bundle?").

The point is to make performance a visible, owned number rather than something noticed after users complain.

=== lesson: i18n-l10n | i18n and l10n
- **Internationalisation (i18n)**: building the app so it **can** support multiple languages and regions.
- **Localisation (l10n)**: actually adapting it for a specific locale: translations, formats, content.

## What i18n involves

- **No hard-coded strings**: keys and message catalogues (`t("cart.items", { count })`) with libraries like next-intl, react-i18next, FormatJS.
- **Plurals and grammar** via ICU message format: `{count, plural, one {# item} other {# items}}`; languages have different plural rules.
- **Formatting with `Intl`**: numbers, currencies, dates, relative times, lists.

```jsrun
const n = 1234567.891, d = new Date("2026-10-15T09:30:00Z");
console.log(new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n));
console.log(new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n));
console.log(new Intl.NumberFormat("de-DE").format(n));
console.log(new Intl.DateTimeFormat("hi-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" }).format(d));
console.log(new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-1, "day"));
```

- **Layout**: text length varies (German is longer), right-to-left languages (Arabic, Urdu): use logical CSS properties (`margin-inline-start`) and `dir="rtl"`.
- **Locale routing**: `/en/…`, `/hi/…`, detection from `Accept-Language` with a user override; `hreflang` tags for SEO.
- Time zones, currencies and units stored separately from language.
- Fonts that cover the scripts (Devanagari, Tamil…).

Plan for it early; retrofitting i18n into a codebase full of concatenated strings is painful.
