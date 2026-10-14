---
course: prep
module: accessibility
title: Accessibility
order: 123
---
=== lesson: semantic-markup | Semantic markup for accessibility
(See HTML and CSS → Semantic HTML.)

Assistive technologies (screen readers, voice control, switch devices) build an **accessibility tree** from your HTML: each element's **role** (button, link, heading), **name** (its label), and **state** (expanded, checked). Native elements provide all three for free.

```htmlrun
<style>.fake { display:inline-block; padding:6px 12px; background:#2E6AD8; color:#fff; border-radius:6px; cursor:pointer; }</style>
<p>Press Tab to move between these. Only the real button receives keyboard focus:</p>
<div class="fake" onclick="this.textContent='Clicked (mouse only)'">Fake button (div)</div>
<button onclick="this.textContent='Activated with ' + (event.detail ? 'mouse' : 'keyboard')">Real button</button>
```

## Key structures

- **Landmarks**: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`: screen reader users jump between them.
- **Headings** in order (`h1` → `h2` → `h3`): the most common way blind users skim a page.
- **Lists** for lists, **tables** for tabular data with `<th>`.
- **Links** go somewhere; **buttons** do something.
- A **skip link** ("Skip to main content") as the first focusable element.
- `lang` on `<html>` so screen readers pronounce text correctly.

The first rule of ARIA: if a native element does the job, use it instead of ARIA.

=== lesson: keyboard-navigation-focus-management | Keyboard navigation and focus management
Everything usable with a mouse must be usable with a keyboard: Tab / Shift+Tab to move, Enter / Space to activate, arrow keys within composite widgets, Escape to close.

## Rules

- **Visible focus**: never `outline: none` without a replacement. Use `:focus-visible` to show rings for keyboard users only.
- **Logical order**: DOM order should match visual order; avoid positive `tabindex` values.
- `tabindex="0"` makes a custom element focusable; `tabindex="-1"` makes it focusable by script only.
- **Roving tabindex** for groups (tabs, menus, toolbars): one Tab stop for the group, arrows move inside it.

## Focus management in SPAs

- **Modals**: move focus into the dialog on open, **trap** it inside, close on Escape, return focus to the trigger on close. The native `<dialog>` with `showModal()` does most of this, and `inert` disables the background.
- **Route changes**: move focus to the new page's heading (or announce the new page), since nothing tells a screen reader the "page" changed.
- **Deleting an item**: move focus somewhere sensible (the next item), not to `<body>`.
- **Errors after submit**: focus the first invalid field or an error summary.

Test by unplugging the mouse: can you complete signup, checkout and every menu?

=== lesson: form-labeling | Form labeling
Every input needs an accessible **name**, and errors must be perceivable and associated with their fields.

```html
<label for="email">Email address</label>
<input id="email" name="email" type="email" autocomplete="email" required
       aria-invalid="true" aria-describedby="email-hint email-error">
<p id="email-hint">We'll send the receipt here.</p>
<p id="email-error" role="alert">Enter an email like name@example.com</p>
```

## Rules

- A visible `<label>` tied to the input (`for`/`id` or wrapping). **Placeholders aren't labels**: they disappear on typing and are often low contrast.
- Group related controls with `<fieldset>` and `<legend>` (radio groups, address blocks).
- Mark required fields visibly and with `required` / `aria-required`.
- **Errors**: specific, next to the field, linked with `aria-describedby`, `aria-invalid="true"`; don't rely on red colour alone; on submit, focus the first error or an error summary.
- Correct `type` and `autocomplete` values (`email`, `tel`, `one-time-code`, `postal-code`): better mobile keyboards and autofill, and required by WCAG for personal data fields.
- Don't disable the submit button without explaining why; let users submit and show what's missing.

=== lesson: color-contrast | Colour contrast
Text must have enough contrast against its background for people with low vision (and anyone using a phone in sunlight).

## WCAG AA thresholds

| Content | Minimum contrast ratio |
|---|---|
| Normal text | **4.5 : 1** |
| Large text (≥ 24 px, or ≥ 18.66 px bold) | 3 : 1 |
| UI components and graphics (borders of inputs, icons, focus rings) | 3 : 1 |

AAA raises normal text to 7 : 1.

```jsrun
// WCAG relative luminance and contrast ratio
const lum = hex => {
  const [r, g, b] = hex.match(/\w\w/g).map(h => parseInt(h, 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return ((x + 0.05) / (y + 0.05)).toFixed(2); };
for (const [fg, bg] of [["#777777", "#FFFFFF"], ["#595959", "#FFFFFF"], ["#FFFFFF", "#2E6AD8"], ["#FFD43B", "#FFFFFF"]])
  console.log(fg, "on", bg, "→", ratio(fg, bg), ratio(fg, bg) >= 4.5 ? "passes AA" : "fails AA for body text");
```

## Beyond ratios

- **Don't use colour alone** to convey meaning (errors, chart series, status): add text, icons or patterns.
- Check every state: hover, focus, disabled, placeholder, dark mode.
- Tools: DevTools contrast checker in the colour picker, axe DevTools, Lighthouse, WebAIM contrast checker.

=== lesson: aria-roles-attributes | ARIA roles and attributes
**ARIA** (Accessible Rich Internet Applications) attributes add or change roles, names and states in the accessibility tree when native HTML isn't enough, for custom widgets like tabs, comboboxes and tree views.

## The rules of ARIA

1. Use native HTML if it exists (`<button>`, `<dialog>`, `<details>`, `<select>`).
2. Don't change native semantics unless you must (`<h2 role="button">` is wrong).
3. Interactive ARIA controls must be keyboard operable: ARIA changes what's announced, **not** behaviour.
4. Don't hide focusable elements (`aria-hidden="true"` on something focusable confuses users).
5. Every interactive element needs an accessible name.

"No ARIA is better than bad ARIA": misused ARIA makes things worse than none.

## Common attributes

| Attribute | Use |
|---|---|
| `aria-label` / `aria-labelledby` | name an element (icon buttons: `<button aria-label="Close">×</button>`) |
| `aria-describedby` | extra description (hints, errors) |
| `aria-expanded`, `aria-controls` | disclosure buttons, menus, accordions |
| `aria-selected`, `aria-checked`, `aria-pressed` | states in tabs, options, toggles |
| `aria-current="page"` | the current item in navigation |
| `aria-live="polite"` / `role="status"` / `role="alert"` | announce dynamic updates |
| `aria-hidden="true"` | hide decorative content from assistive tech |
| `aria-busy`, `aria-invalid`, `aria-required` | states |

For widgets, follow the **ARIA Authoring Practices Guide** patterns (tabs, combobox, dialog, menu) or use libraries that implement them (Radix, React Aria, Headless UI).

=== lesson: screen-reader-behavior | Screen reader behaviour
Screen readers (NVDA and JAWS on Windows, VoiceOver on macOS/iOS, TalkBack on Android) read the accessibility tree aloud and let users navigate it.

## How users navigate

Not top to bottom like sighted users: they jump by **headings** (H key), **landmarks** (regions), **links** and **form fields**, or list all links. So headings, landmarks and descriptive link text ("Download invoice", not "click here") matter enormously.

## What gets announced

Role + name + state: "Submit order, button", "Email address, edit text, required, invalid entry", "Filters, collapsed, button".

## Dynamic content

Changes that sighted users notice (a toast, "3 results", a validation error, a chat message) are silent unless you use a **live region**:

```html
<div role="status" aria-live="polite">12 results found</div>   <!-- announced when idle -->
<div role="alert">Payment failed. Try another card.</div>       <!-- announced immediately -->
```

The live region must exist in the DOM before its content changes.

## Test it yourself

Turn on VoiceOver (Cmd+F5 on Mac) or NVDA (free) and try your signup flow with eyes closed for five minutes. It's the fastest way to find real problems: unlabeled buttons, images without alt text, focus lost after actions, modals that don't trap focus.

Alt text: describe the image's **purpose** in context; decorative images get `alt=""` so they're skipped.

=== lesson: wcag-levels | WCAG levels
The **Web Content Accessibility Guidelines** (WCAG) are the standard for web accessibility. The current version is **WCAG 2.2** (2023).

## Four principles: POUR

- **Perceivable**: text alternatives, captions, contrast, content that adapts (zoom to 200%, reflow at 320 px).
- **Operable**: keyboard accessible, enough time, no seizure-inducing flashes, navigable, target sizes.
- **Understandable**: readable, predictable, input assistance (labels, errors, help).
- **Robust**: works with assistive technologies (valid semantics, names, roles, values).

## Conformance levels

| Level | Meaning |
|---|---|
| **A** | the minimum; failing it blocks some users completely |
| **AA** | the usual legal and contractual target (and what most companies aim for) |
| AAA | the highest; not required for whole sites |

WCAG 2.2 added criteria such as visible **focus not obscured** (sticky headers covering focused elements), minimum **target size** (24×24 px), **dragging alternatives**, and **accessible authentication** (no cognitive tests like transcribing codes without allowing paste).

## Legal context

Many laws reference WCAG AA: the US ADA (via case law and the 2024 DOJ rule for public entities), the **European Accessibility Act** (in force from June 2025 for many digital products and services sold in the EU), and India's Rights of Persons with Disabilities Act and government guidelines (GIGW). For international remote roles, accessibility knowledge is a real advantage.

=== lesson: reduced-motion | Reduced motion
Some users get dizziness, nausea or headaches from motion (vestibular disorders), and others find it distracting. Operating systems offer a "reduce motion" setting; respect it.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```js
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
element.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
```

## Guidelines

- Reduce, don't necessarily remove: replace large movement (parallax, sliding, zooming) with fades or instant changes; keep small, meaningful feedback.
- No auto-playing carousels or videos without pause controls (WCAG requires a way to pause anything moving for more than 5 seconds).
- Avoid flashing more than three times per second (seizure risk).
- Motion libraries support it: Framer Motion's `useReducedMotion`, and View Transitions can be skipped when it's set.

This site's own slide animations switch off with the reduced-motion setting.
