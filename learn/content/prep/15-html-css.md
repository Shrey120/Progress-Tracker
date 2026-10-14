---
course: prep
module: html-and-css
title: HTML and CSS
order: 115
---
=== lesson: semantic-html | Semantic HTML
Use elements for what they **mean**, not how they look. Browsers, screen readers, search engines and browser features (reader mode, autofill) rely on it.

```html
<header>…logo, nav…</header>
<nav aria-label="Main">…</nav>
<main>
  <article>
    <h1>Title</h1>
    <p>…</p>
    <figure><img alt="…"><figcaption>…</figcaption></figure>
  </article>
  <aside>…related…</aside>
</main>
<footer>…</footer>
```

## Common swaps

| Instead of | Use | Why |
|---|---|---|
| `<div onclick>` | `<button>` | focusable, keyboard (Enter/Space), announced as a button |
| `<span>` styled as a link with JS navigation | `<a href>` | works with middle-click, new tab, crawlers |
| `<div>` per heading | `<h1>`–`<h6>` in order | screen reader users navigate by headings |
| layout tables | CSS grid/flex; `<table>` only for tabular data | |
| placeholder as label | `<label for>` | accessible names, bigger click target |
| `<b>`/`<i>` for meaning | `<strong>`/`<em>` | |

Native elements also give you free behaviour: `<details>`/`<summary>` (disclosure), `<dialog>` (modal with focus handling), `<input type="date|email|tel">` (mobile keyboards, validation), `<form>` (Enter submits).

> "Semantic HTML gives accessibility, SEO and browser features for free; ARIA is only for filling gaps native elements can't."

=== lesson: box-model | The box model
Every element is a box: **content** → **padding** → **border** → **margin**.

```css
.card { width: 300px; padding: 20px; border: 2px solid; margin: 16px; }
```

- `box-sizing: content-box` (the default): `width` is the content only → the card is 300 + 40 + 4 = **344px** wide.
- `box-sizing: border-box`: `width` includes padding and border → exactly **300px**. Almost every project sets this globally:

```css
*, *::before, *::after { box-sizing: border-box; }
```

Compare the two boxes. Both say `width: 200px`. Press **Edit** and change the padding to see which one grows:

```htmlrun
<style>
  .box { width: 200px; padding: 20px; border: 6px solid #2E6AD8; margin: 10px 0; background: #EAF1FF; }
  .border-box { box-sizing: border-box; }
</style>
<div class="box">content-box: 200 + 40 + 12 = 252px wide</div>
<div class="box border-box">border-box: exactly 200px wide</div>
<div style="width:200px;height:6px;background:#E0B000">← 200px ruler</div>
```


## Margins

- **Margin collapsing**: vertical margins of adjacent blocks (and a parent and its first/last child) merge into the larger one instead of adding up. Doesn't happen in flex or grid containers, or with padding/border between them.
- Negative margins pull elements; `margin: 0 auto` centres a block with a set width.

## display matters

- `block` takes the full width and respects width/height.
- `inline` flows in text; ignores width/height and vertical margins.
- `inline-block` flows inline but respects box sizing.
- `flex` / `grid` make the element a layout container for its children.
- `none` removes it from layout (vs `visibility: hidden`, which keeps its space).

=== lesson: specificity-the-cascade | Specificity and the cascade
When several rules set the same property on an element, the **cascade** decides which wins, in this order:

1. **Origin and importance**: `!important` user-agent/user/author rules, transitions/animations.
2. **Cascade layers** (`@layer`): later-declared layers win; unlayered styles beat layered ones.
3. **Specificity** of the selector.
4. **Order of appearance**: later wins.

## Specificity as (a, b, c)

| Selector part | Counts as |
|---|---|
| inline `style=""` | beats any selector |
| ID `#nav` | (1, 0, 0) |
| class `.btn`, attribute `[type=text]`, pseudo-class `:hover` | (0, 1, 0) |
| element `button`, pseudo-element `::before` | (0, 0, 1) |
| `*`, combinators, `:where()` | 0 |

`#nav .item a` = (1, 1, 1) beats `.nav .item a` = (0, 2, 1). Compare left to right; 11 classes never beat one ID.

`:is()` and `:not()` take the specificity of their most specific argument; `:where()` always adds zero (great for resettable defaults).

Which colour wins? Edit the rules to test your prediction:

```htmlrun
<style>
  #intro p { color: green; }          /* (1,0,1) */
  .lead.big { color: blue; }          /* (0,2,0) */
  p.lead { color: orange; }           /* (0,1,1) */
  p { color: red; }                   /* (0,0,1) */
</style>
<div id="intro"><p class="lead big">The ID rule wins: one ID beats any number of classes.</p></div>
<p class="lead big">Outside #intro, the two-class rule wins.</p>
```


## Inheritance

Some properties inherit (color, font, line-height); most layout ones don't (margin, border, width). `inherit`, `initial`, `unset`, `revert` control it.

## Keeping it manageable

Low, flat specificity (single classes: BEM, utility classes, CSS modules), avoid IDs and `!important` for styling, use `@layer` to order resets/base/components/utilities. Specificity wars are a sign of a missing structure.

=== lesson: flexbox | Flexbox
Flexbox lays out items along **one axis** (a row or a column).

```css
.toolbar { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
```

## Container properties

| Property | Controls |
|---|---|
| `flex-direction` | `row` (default) or `column`: sets the **main axis** |
| `justify-content` | alignment along the main axis: `flex-start`, `center`, `space-between`, `space-around`, `space-evenly` |
| `align-items` | alignment on the cross axis: `stretch` (default), `center`, `flex-start`, `baseline` |
| `flex-wrap` | allow items to wrap onto new lines |
| `gap` | spacing between items |

## Item properties

`flex: <grow> <shrink> <basis>`:

- `flex: 1` → grow to share free space equally (basis 0).
- `flex: none` → keep natural size.
- `flex: 0 0 240px` → a fixed 240px sidebar.

Plus `align-self` (override cross alignment) and `order`.

## Patterns

```css
.center { display: flex; align-items: center; justify-content: center; }      /* centre anything */
.layout { display: flex; } .sidebar { flex: 0 0 260px; } .main { flex: 1; min-width: 0; }
.push-right { margin-left: auto; }                                             /* last nav item to the right */
```

`min-width: 0` on a flex child lets long content (code, long words) shrink instead of overflowing; a frequent bug fix.

Try it: press **Edit**, change `justify-content` to `center` or `space-around`, or `flex-direction` to `column`, then **Update preview**.

```htmlrun
<style>
  .bar { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px; background: #F1F3F9; border-radius: 8px; }
  .bar div { padding: 8px 14px; background: #2E6AD8; color: white; border-radius: 6px; }
  .grow { flex: 1; text-align: center; background: #12925E !important; }
</style>
<div class="bar"><div>Logo</div><div class="grow">flex: 1 (takes the free space)</div><div>Login</div></div>
```


Flexbox for one-dimensional layouts (toolbars, nav bars, centring, a row of cards that wraps); Grid when you control rows **and** columns.

=== lesson: grid | CSS Grid
Grid lays out items in **two dimensions**: rows and columns at once.

```css
.page {
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  min-height: 100vh;
  gap: 16px;
}
header { grid-area: header; } aside { grid-area: sidebar; } main { grid-area: main; } footer { grid-area: footer; }
```

## Key pieces

- `fr`: a fraction of the remaining space.
- `repeat(3, 1fr)`, `minmax(200px, 1fr)`.
- **Responsive cards without media queries**:

```css
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
```

Resize by dragging the preview's bottom-right corner, or edit `minmax(140px, 1fr)` to see the columns change:

```htmlrun
<style>
  .page { display: grid; grid-template-columns: 120px 1fr; grid-template-areas: "head head" "side main" "foot foot"; gap: 8px; }
  .page > * { padding: 10px; border-radius: 6px; background: #EAF1FF; }
  header { grid-area: head; } aside { grid-area: side; } main { grid-area: main; } footer { grid-area: foot; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
  .cards div { background: #FFE9A8; padding: 18px; border-radius: 6px; text-align: center; }
</style>
<div class="page">
  <header>header</header><aside>sidebar</aside>
  <main><div class="cards"><div>1</div><div>2</div><div>3</div><div>4</div><div>5</div></div></main>
  <footer>footer</footer>
</div>
```


- Placing items: `grid-column: 1 / 3` or `span 2`; `grid-row`.
- `place-items: center` centres content in every cell.
- `subgrid` lets nested elements align to the parent's grid tracks (aligned card headers and footers).
- `auto-fill` keeps empty tracks; `auto-fit` collapses them so items stretch.

## Grid vs flexbox

Grid: page layouts, galleries, forms with aligned labels, anything with rows **and** columns. Flexbox: content-driven single rows or columns. They combine well: a grid page whose cards use flex inside.

=== lesson: responsive-design-media-queries | Responsive design and media queries
Make one layout adapt to any screen.

## Foundations

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Without it, phones render at a fake desktop width and zoom out.

## Mobile-first media queries

Write base styles for small screens, add complexity as space grows:

```css
.grid { display: grid; gap: 12px; }
@media (min-width: 768px)  { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1200px) { .grid { grid-template-columns: repeat(4, 1fr); } }
```

## Beyond widths

```css
@media (prefers-color-scheme: dark) { … }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
@media (hover: hover) and (pointer: fine) { .row:hover { … } }   /* real hover devices only */
@media print { nav { display: none; } }
```

## Fluid techniques (fewer breakpoints)

- Relative units: `%`, `rem` (relative to root font size), `em`, `vw`/`vh`, `dvh` (dynamic viewport height that accounts for mobile browser bars).
- `clamp()` for fluid type and spacing: `font-size: clamp(1rem, 0.9rem + 1vw, 1.5rem);`
- `max-width` on images: `img { max-width: 100%; height: auto; }`
- Flex wrap, grid `auto-fill`, container queries for components.

Test on real devices and DevTools device mode; check touch target sizes (at least 44×44 px), and that nothing scrolls horizontally.

=== lesson: positioning-stacking-contexts | Positioning and stacking contexts
## position

| Value | Behaviour |
|---|---|
| `static` | normal flow (default); `top/left` ignored |
| `relative` | normal flow, then offset visually; becomes the containing block for absolute children |
| `absolute` | removed from flow; positioned relative to the nearest **positioned** ancestor |
| `fixed` | relative to the viewport (unless an ancestor has `transform`/`filter`: a common surprise) |
| `sticky` | normal flow until a scroll threshold, then sticks (`top: 0`); needs a scrolling ancestor and no `overflow: hidden` in between |

```css
.card { position: relative; }
.card .badge { position: absolute; top: 8px; right: 8px; }   /* positioned inside the card */
```

## Stacking contexts

A **stacking context** is a group whose children are layered together and can't interleave with elements outside it. New contexts are created by: `position` + `z-index` (non-auto), `opacity < 1`, `transform`, `filter`, `will-change`, `isolation: isolate`, `position: fixed/sticky`, flex/grid children with `z-index`, and more.

That's why "z-index: 9999 doesn't work": the element is inside a parent stacking context that itself sits below something else. Its z-index only competes with siblings inside that context. Next lesson goes deeper.

```htmlrun
<style>
  .wrap { position: relative; height: 140px; }
  .header { position: absolute; top: 0; left: 0; right: 0; height: 60px; background: #2E6AD8; color: #fff; padding: 8px; z-index: 2; }
  .container { position: relative; z-index: 1; top: 30px; }          /* creates a stacking context */
  .modal { position: absolute; top: 0; left: 20px; width: 220px; padding: 10px; background: #FFE9A8; z-index: 9999; }
</style>
<div class="wrap">
  <div class="header">header (z-index: 2)</div>
  <div class="container"><div class="modal">modal with z-index: 9999 is still UNDER the header, because its container has z-index: 1</div></div>
</div>
```


=== lesson: z-index-behavior | z-index behaviour
`z-index` controls stacking order **only within the same stacking context**, and only on positioned elements (or flex/grid children).

## Debugging "my modal is under the header"

1. Find the stacking context each element belongs to (DevTools layers panel, or check ancestors for `transform`, `opacity`, `filter`, `z-index`).
2. Compare the **context roots**, not the elements: a `z-index: 9999` modal inside a container with `z-index: 1` loses to a header with `z-index: 2`.
3. Fixes: render the modal outside the container (a **portal** to `body`), remove the accidental context (an unnecessary `transform`), or adjust z-index at the root level.

## Keep it sane

Define a small scale of tokens and stick to it:

```css
:root { --z-dropdown: 10; --z-sticky: 20; --z-overlay: 30; --z-modal: 40; --z-toast: 50; }
```

Use `isolation: isolate` on components to contain their internal z-indexes so they can't leak out. The native `<dialog>` with `showModal()` and the Popover API render in the **top layer**, above everything, with no z-index needed.

=== lesson: css-variables | CSS variables (custom properties)
```css
:root {
  --color-primary: #2E6AD8;
  --space-2: 8px;
  --radius: 10px;
}
.button {
  background: var(--color-primary);
  padding: var(--space-2) calc(var(--space-2) * 2);
  border-radius: var(--radius, 6px);        /* fallback */
}
[data-theme="dark"] { --color-primary: #5B95F7; }   /* theming: just override the variables */
```

## Compared with Sass variables

| CSS custom properties | Sass variables |
|---|---|
| live at **runtime**; can change with media queries, classes, JavaScript | replaced at **build time** |
| cascade and inherit like normal properties | lexical scope in the source |
| readable/writable from JS (`el.style.setProperty("--x", "10px")`) | not visible at runtime |

## Uses

Theming (light/dark, brands), design tokens, component variants (`.btn--danger { --btn-bg: red }`), passing values from JS (scroll progress, mouse position) to CSS without re-rendering React components.

`@property` registers a typed variable (`syntax: "<color>"`) so it can be animated smoothly.

=== lesson: transitions-animations | Transitions and animations
## Transitions: A → B when a property changes

```css
.button { transition: transform 150ms ease-out, background-color 150ms; }
.button:hover { transform: translateY(-2px); background-color: var(--hover); }
```

## Animations: keyframes, can loop and run without a state change

```css
@keyframes pulse { 50% { opacity: 0.4; } }
.skeleton { animation: pulse 1.2s ease-in-out infinite; }
```

## Performance

Animate **`transform` and `opacity`** only, whenever possible. They can run on the compositor (GPU) without layout or paint, staying smooth even when JS is busy. Animating `width`, `height`, `top`, `left`, `margin` triggers layout on every frame.

Hover the cards in the preview:

```htmlrun
<style>
  .card { display: inline-block; width: 140px; padding: 20px; margin: 8px; border-radius: 10px; background: #EAF1FF; transition: transform 160ms ease-out, box-shadow 160ms; }
  .card:hover { transform: translateY(-6px) scale(1.03); box-shadow: 0 10px 24px rgba(0,0,0,.15); }
  .dot { width: 14px; height: 14px; border-radius: 50%; background: #12925E; animation: pulse 1s ease-in-out infinite; }
  @keyframes pulse { 50% { transform: scale(1.6); opacity: .4; } }
</style>
<div class="card">hover me</div><div class="card">and me</div>
<div class="dot"></div>
```


## Accessibility

Respect users who've asked for less motion:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

## Newer tools

- **View Transitions API**: animate between page states or routes (`document.startViewTransition`), now supported for same-document transitions widely and cross-document in Chromium.
- Web Animations API (`el.animate()`) for JS-controlled animations.
- Scroll-driven animations (`animation-timeline: scroll()`) without JS.
- Libraries: Framer Motion (Motion), GSAP for complex sequences.

=== lesson: tailwind-utility-model | The Tailwind utility model
Tailwind provides small single-purpose classes you compose in markup instead of writing custom CSS.

```html
<button class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 disabled:opacity-50 md:px-6">
  Save
</button>
```

## Why teams like it

- No naming things, no hunting for which stylesheet affects what; styles live with the markup.
- Constrained design tokens (spacing scale, colours) keep UIs consistent.
- Only used classes ship: small CSS output.
- Responsive and state variants inline: `md:`, `hover:`, `focus-visible:`, `dark:`, `group-hover:`.

## Criticisms (and answers)

| Criticism | Answer |
|---|---|
| long, noisy class lists | extract **components** (React), not `@apply` everywhere |
| conditional classes get messy | `clsx` + `tailwind-merge`, or `cva` for variants |
| it's "inline styles" | unlike inline styles: tokens, responsive variants, pseudo-classes, purging |
| learning curve / coupling to Tailwind | mostly CSS knowledge in shorthand |

Tailwind v4 (2025) moved configuration into CSS (`@theme` with CSS variables), uses a new faster engine, and needs no content-path config. shadcn/ui popularised copy-in components built on Tailwind and Radix.

In interviews, show you know the CSS underneath: `flex items-center justify-between` is just flexbox.

=== lesson: container-queries | Container queries
Media queries respond to the **viewport**. Container queries respond to the size of a **component's container**, so a card can adapt whether it's in a narrow sidebar or a wide main column.

```css
.card-wrapper { container-type: inline-size; container-name: card; }

.card { display: grid; gap: 12px; }
@container card (min-width: 420px) {
  .card { grid-template-columns: 160px 1fr; }    /* image beside text when there's room */
}
```

- `container-type: inline-size` makes an element a query container for its width.
- Container query units: `cqi`, `cqw` (percent of the container's size) for fluid type inside components.
- **Style queries** (`@container style(--variant: compact)`) are arriving too.

Supported in all modern browsers since 2023. They make components genuinely reusable: the component decides its layout from the space it's given, not from global breakpoints.

Drag the preview's corner to resize it; the card switches layout at 380px of **its container's** width:

```htmlrun
<style>
  .wrapper { container-type: inline-size; border: 1px dashed #aab; padding: 8px; resize: horizontal; overflow: auto; width: 90%; }
  .card { display: grid; gap: 10px; background: #EAF1FF; padding: 10px; border-radius: 8px; }
  .img { background: #FFE9A8; height: 80px; border-radius: 6px; }
  @container (min-width: 380px) { .card { grid-template-columns: 120px 1fr; } }
</style>
<div class="wrapper"><div class="card"><div class="img"></div><div>Drag this dashed box's corner to make it narrower or wider.</div></div></div>
```


=== lesson: has | The :has() selector
`:has()` is the long-awaited "parent selector": select an element based on what it **contains** (or what follows it).

```css
/* a card that contains an image gets a different layout */
.card:has(img) { grid-template-columns: 120px 1fr; }

/* style a form field's wrapper when its input is invalid */
.field:has(input:user-invalid) { border-color: var(--danger); }

/* a label followed by a required input */
label:has(+ input:required)::after { content: " *"; }

/* lock page scroll while a modal is open */
body:has(dialog[open]) { overflow: hidden; }
```

Supported in all modern browsers since late 2023. It replaces many cases where you'd previously toggle classes with JavaScript. Keep selectors reasonably specific; very broad `:has()` checks on large documents can cost performance.

=== lesson: block-formatting-context | Block formatting context
A **block formatting context** (BFC) is an independent layout region: what's inside doesn't affect layout outside, and vice versa.

## Created by

`display: flow-root` (the clean way), `overflow` other than `visible`, floats, `position: absolute/fixed`, `display: inline-block`, flex and grid items, `contain: layout`.

## What it fixes

1. **Containing floats**: a parent of floated children collapses to zero height; making it a BFC (`display: flow-root`) makes it wrap them (the modern "clearfix").
2. **Margin collapsing**: margins don't collapse across a BFC boundary (a child's top margin stops "leaking" out of its parent).
3. **Text wrapping around floats**: a BFC sibling doesn't flow under a float; it sits beside it.

Mostly an interview concept today, since flex and grid replaced float layouts, but it explains several "why is this margin escaping?" bugs.

=== lesson: critical-css | Critical CSS
**Critical CSS** is the minimum CSS needed to render the above-the-fold content. Inlining it in `<head>` lets the browser paint immediately without waiting for the full stylesheet; the rest loads without blocking.

```html
<head>
  <style>/* critical: header, hero, layout grid, fonts */</style>
  <link rel="preload" href="/styles.css" as="style" onload="this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/styles.css"></noscript>
</head>
```

## Trade-offs

- Faster first paint and LCP, especially on slow networks.
- Inlined CSS isn't cached separately; it's resent with every HTML page.
- Generating it needs tooling (Critters/Beasties, Critical) and can cause a flash if the split is wrong.

## In modern stacks

Frameworks largely handle this: Next.js inlines or splits CSS per route, CSS-in-JS and Tailwind keep per-page CSS small. With small, per-route CSS files and HTTP/2, the benefit shrinks. Know the concept, measure (LCP, render-blocking resources in Lighthouse) before adding tooling.
