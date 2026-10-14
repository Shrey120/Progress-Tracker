---
course: prep
module: react
title: React
order: 103
---
=== lesson: controlled-vs-uncontrolled-components | Controlled vs uncontrolled components
How a form input's value is owned.

- **Controlled** — React state is the single source of truth. The input shows `value={state}` and every keystroke goes through `onChange` → `setState`.
- **Uncontrolled** — the DOM keeps the value. You read it when needed with a ref or from the form on submit, and set only `defaultValue`.

```jsx
function Controlled() {
  const [email, setEmail] = useState("");
  const valid = email.includes("@");
  return <input value={email} onChange={e => setEmail(e.target.value)} aria-invalid={!valid} />;
}

function Uncontrolled() {
  const ref = useRef(null);
  return (
    <form onSubmit={e => { e.preventDefault(); console.log(ref.current.value); }}>
      <input ref={ref} defaultValue="hi" />
    </form>
  );
}
```

## When to pick which

| Controlled | Uncontrolled |
|---|---|
| live validation, formatting, dependent fields | simple forms read on submit |
| value must be reset or set from outside | file inputs (always uncontrolled) |
| more re-renders (one per keystroke) | fewer re-renders, less code |

Form libraries like React Hook Form are mostly uncontrolled for performance and register inputs with refs. React 19 form actions also lean on uncontrolled inputs read from `FormData`.

## The classic warning

"A component is changing an uncontrolled input to be controlled" means `value` started as `undefined` and later became a string. Initialise state to `""`, not `undefined`.

> **"Controlled or uncontrolled?"** Controlled when the UI needs to react to the value as it changes; uncontrolled when you only need it at submit time, or for performance on large forms.

=== lesson: keys | Keys
`key` tells React which item in a list is which between renders, so it can keep the right component instance (its state, DOM node, focus) attached to the right data.

## Why index keys break things

```jsx
{todos.map((t, i) => <TodoRow key={i} todo={t} />)}      // fragile
{todos.map(t => <TodoRow key={t.id} todo={t} />)}         // stable identity
```

With index keys, inserting at the top shifts every key by one. React then reuses row 0's component (with its local state, like a half-typed edit or a checked box) for what is now a different todo. Symptoms: input text appearing in the wrong row, animations on the wrong item, unnecessary re-renders.

Index keys are fine only when the list never reorders, filters, or inserts in the middle.

## Rules

- Unique among **siblings**, not globally.
- Stable across renders: never `key={Math.random()}`, which remounts every item every time.
- Come from the data (database id), not from rendering.

## The reset trick

Changing a component's key unmounts it and mounts a fresh one. That's the cleanest way to reset all of its state:

```jsx
<ProfileForm key={userId} userId={userId} />   // switching users resets the form
```

> **"Why does React need keys?"** To match list items across renders during reconciliation. Stable keys preserve each item's state and DOM; unstable or index keys make React mix up items when the list changes order.

=== lesson: state-colocation-lifting | State colocation and lifting state up
Two opposite moves, both about putting state in the right place.

## Colocate: keep state as low as possible

State should live in the lowest component that needs it. State placed too high (a whole page, or a global store) makes every update re-render everything below it and couples unrelated parts.

```jsx
// Only the search box needs `query` — keep it there, not in <App>.
function SearchBox() {
  const [query, setQuery] = useState("");
  ...
}
```

## Lift: move state up to the closest common parent

When two siblings need the same data, move the state to their nearest shared parent and pass it down, with a callback to change it.

```jsx
function Filters({ value, onChange }) { ... }
function Results({ filter }) { ... }

function Page() {
  const [filter, setFilter] = useState("all");
  return (
    <>
      <Filters value={filter} onChange={setFilter} />
      <Results filter={filter} />
    </>
  );
}
```

## Derive, don't duplicate

If a value can be computed from props or other state, compute it during render. Copying it into its own state creates two sources of truth that drift apart.

```jsx
const visible = todos.filter(t => filter === "all" || t.status === filter);   // not useState
```

> **"Where should this state live?"** In the closest common ancestor of everything that reads it, and no higher. Lift when siblings share it; push down when only one subtree uses it; derive anything computable.

=== lesson: component-composition-patterns | Component composition patterns
React favours composition over inheritance. The main tools:

## children and slots

```jsx
function Card({ title, actions, children }) {
  return (
    <section className="card">
      <header>{title}{actions}</header>
      {children}
    </section>
  );
}
<Card title="Orders" actions={<Button>Export</Button>}>
  <OrdersTable />
</Card>
```

Passing elements as props ("slots") avoids a pile of configuration booleans.

## Composition fixes prop drilling

Instead of passing `user` through five layers that don't use it, let the top level build the leaf and pass it down as an element:

```jsx
<Layout sidebar={<UserMenu user={user} />} />
```

## Compound components

Components that work together and share state through context, with a clean API:

```jsx
<Tabs defaultValue="code">
  <Tabs.List>
    <Tabs.Trigger value="code">Code</Tabs.Trigger>
    <Tabs.Trigger value="output">Output</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="code">…</Tabs.Panel>
</Tabs>
```

This is how Radix and Headless UI are built.

## Container / presentational

Separate data loading (a hook or container) from UI that only receives props. Hooks replaced most container components, but the split still makes UI easy to test and reuse.

> **"How do you avoid prop drilling?"** First, composition: pass components as children or slots. Then colocate state. Context for genuinely global values (theme, auth, locale). A state library only when shared state is large and frequently updated.

=== lesson: hooks-rules-closures-in-hooks | Rules of hooks and closures in hooks
## The two rules

1. Call hooks **only at the top level** of a component or custom hook: never inside conditions, loops, or nested functions.
2. Call them **only from React functions** (components or custom hooks).

Why: React doesn't know hooks by name. It stores their state in a list and matches them by **call order** on every render. A conditional hook shifts the order and hands the wrong state to the wrong hook.

## Stale closures

Every render is a function call with its own props and state. Functions created during that render close over **those** values. A callback that outlives its render sees old values.

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1);        // count is always 0 here: stuck at 1
    }, 1000);
    return () => clearInterval(id);
  }, []);                         // effect captured render 1's count
}
```

Fixes, best first:

```jsx
setCount(c => c + 1);             // updater function: always gets the latest
// or include count in deps (re-creates the interval each time)
// or read the latest value from a ref: countRef.current
```

## Batching

Multiple `setState` calls in the same event are batched into one render (and since React 18, also in timeouts and promises). `setCount(count + 1)` twice adds 1, not 2, because both read the same `count`; the updater form adds 2.

> **"Why can't hooks be in an if?"** React identifies hook state by call order. A conditional call changes the order between renders and mismatches state. Put the condition inside the hook instead.

=== lesson: useeffect-dependencies-cleanup | useEffect: dependencies and cleanup
`useEffect` synchronises a component with something **outside** React: a subscription, a timer, the DOM, a network request. It runs after the render is painted.

## Dependencies

- `[a, b]` — run after the first render and whenever `a` or `b` changed (compared with `Object.is`).
- `[]` — only after mount.
- omitted — after every render.

List **every** reactive value the effect reads (props, state, functions defined in the component). The `react-hooks/exhaustive-deps` lint rule exists because missing deps cause stale data.

## Cleanup

Return a function to undo the effect. It runs before the effect re-runs and on unmount.

```jsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/users/${id}`, { signal: controller.signal })
    .then(r => r.json())
    .then(setUser)
    .catch(e => { if (e.name !== "AbortError") setError(e); });
  return () => controller.abort();      // stops the old request when id changes
}, [id]);
```

Without cleanup, a slow response for an old `id` can arrive after a newer one and overwrite it (a race condition).

## Strict Mode runs effects twice in development

React mounts, unmounts and remounts components in dev to surface missing cleanup. If double-running breaks something, the effect is missing its cleanup.

## You might not need an effect

- Deriving data from props/state → compute during render (or `useMemo`).
- Responding to a user event → do it in the event handler.
- Resetting state when a prop changes → use a `key`.
- Fetching data → prefer a data library (TanStack Query) or a framework loader.

> **"What's the cleanup function for?"** Undoing whatever the effect set up (listeners, timers, subscriptions, in-flight requests) before it runs again or the component unmounts, preventing leaks and stale updates.

=== lesson: useref | useRef
`useRef(initial)` returns an object `{ current }` that persists for the component's whole life. Changing `.current` **does not** cause a re-render.

## Two uses

**1. DOM access**

```jsx
function SearchField() {
  const inputRef = useRef(null);
  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current.focus()}>Focus</button>
    </>
  );
}
```

**2. A mutable value that shouldn't trigger renders**: a timer id, the previous value, "is this mounted", the latest callback.

```jsx
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; });
  return ref.current;          // value from the previous render
}
```

## Refs vs state

| | state | ref |
|---|---|---|
| change re-renders | yes | no |
| value during render | the snapshot for that render | whatever was last written |
| use for | anything shown on screen | instance variables, DOM nodes |

Don't read or write `ref.current` during rendering (except for lazy initialisation); it makes renders impure.

## Passing refs to children

In React 19, `ref` is a normal prop for function components. Before that, `forwardRef` was required. `useImperativeHandle` exposes a limited API (`focus()`, `scrollToBottom()`) instead of the whole DOM node.

> **"useRef vs useState?"** Both persist across renders; only state updates re-render. Use a ref for values the UI doesn't display.

=== lesson: usereducer | useReducer
`useReducer(reducer, initialState)` manages state through **actions**: you `dispatch({ type, ...payload })`, and a pure function computes the next state.

```jsx
function reducer(state, action) {
  switch (action.type) {
    case "add":    return { ...state, items: [...state.items, action.item] };
    case "remove": return { ...state, items: state.items.filter(i => i.id !== action.id) };
    case "clear":  return { ...state, items: [] };
    default: throw new Error("unknown action " + action.type);
  }
}
function Cart() {
  const [state, dispatch] = useReducer(reducer, { items: [] });
  return <button onClick={() => dispatch({ type: "clear" })}>Clear</button>;
}
```

## When it beats useState

- Several pieces of state change together (a form with status, errors and values).
- The next state depends on the previous one in non-trivial ways.
- You want the update logic testable outside the component (a reducer is a plain function).
- Passing `dispatch` down is stable across renders, unlike a set of callbacks.

Combine with context (`StateContext` + `DispatchContext`) for a small Redux-like store without a library. With TypeScript, type actions as a discriminated union so each `case` knows its payload.

> **"useState or useReducer?"** useState for independent simple values. useReducer when updates follow rules, involve several fields at once, or you want the transitions in one testable place.

=== lesson: custom-hooks | Custom hooks
A custom hook is a function whose name starts with `use` and that calls other hooks. It's how you reuse **stateful logic** (not state itself: each component using the hook gets its own copy).

```jsx
function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial; }
    catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

function useDebouncedValue(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
```

## Good custom hooks

- Do one thing, named for what it gives you: `useOnlineStatus`, `useMediaQuery`, `useFetch`.
- Return what callers need, as an array (like useState) or an object for several values.
- Clean up everything they set up.
- Are tested with `renderHook` from Testing Library.

## Interview favourites to write live

`useDebounce`, `usePrevious`, `useToggle`, `useFetch` (with abort and loading/error state), `useInterval` (with a ref to the latest callback), `useClickOutside`, `useWindowSize`.

> **"Do two components using the same custom hook share state?"** No. Hooks share logic; each call has its own state. To share state, lift it up or put it in context or a store.

=== lesson: context-re-render-behavior | Context and re-render behaviour
Context passes a value down the tree without props. Every component that calls `useContext(Ctx)` re-renders when the Provider's `value` changes, compared by reference.

## The common performance trap

```jsx
function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("dark");
  // a new object every render → every consumer re-renders every time App renders
  return <AppCtx.Provider value={{ user, setUser, theme, setTheme }}>…</AppCtx.Provider>;
}
```

Fixes:

1. **Memoise the value**: `const value = useMemo(() => ({ user, setUser }), [user]);`
2. **Split contexts** by how often they change: `UserContext`, `ThemeContext`. A theme toggle no longer re-renders user consumers.
3. **Separate state from dispatch**: the dispatch/setter never changes, so components that only update don't re-render on reads.
4. For high-frequency updates (a value changing on every keystroke or mouse move), use a store with selectors (Zustand, Redux, `useSyncExternalStore`), where components subscribe to just the slice they read.

## What doesn't re-render

Children passed as `children` from above the provider aren't re-rendered just because the provider's state changed; only consumers are (plus anything the provider itself renders).

## When to use context

Values many components need and that change rarely: theme, locale, auth user, feature flags, dependencies like an API client. It isn't a state-management library; it's a transport.

> **"Why is my whole app re-rendering?"** Usually a context provider whose value is a new object every render, or state lifted too high. Memoise the value, split contexts, and keep frequently changing state local or in a selector-based store.

=== lesson: reconciliation-the-diffing-algorithm | Reconciliation and the diffing algorithm
When state changes, React calls your components again to get a new element tree, then **reconciles** it with the previous one to find the minimal DOM changes. A full tree diff is O(n³); React makes it O(n) with two assumptions:

1. **Different element types produce different trees.** If `<div>` becomes `<section>`, or `<Profile>` becomes `<Settings>`, React destroys the old subtree (state and DOM) and builds the new one.
2. **Keys identify children across renders.** Without keys, children are matched by position.

## What follows from that

- Same type in the same position → React keeps the instance and its state, and just updates changed attributes and props.
- Defining a component **inside** another component's body creates a new type every render, so its subtree remounts and loses state every time. Always define components at the top level.

```jsx
function Parent() {
  function Child() { ... }        // new function each render = new type = remount
  return <Child />;
}
```

- Conditionally rendering `{flag ? <Input /> : <Input />}` in the same position keeps state (same type); add different keys to force a reset.

## Render vs commit

**Render phase**: call components, build the tree, diff. Pure and interruptible (in concurrent React). **Commit phase**: apply DOM changes, run layout effects, then effects. A component re-rendering doesn't mean the DOM changed.

> **"What triggers a re-render, and does it touch the DOM?"** A state change re-renders that component and, by default, all its children. React then diffs the new output against the old and only commits real differences to the DOM. Memoisation can skip re-rendering subtrees whose props didn't change.

=== lesson: usememo-usecallback-react-memo-and-when-they-do-not-help | useMemo, useCallback, React.memo, and when they don't help
- `useMemo(() => compute(a, b), [a, b])` — cache a computed **value** between renders.
- `useCallback(fn, [deps])` — cache a **function** identity (same as `useMemo(() => fn, deps)`).
- `React.memo(Component)` — skip re-rendering a component when its props are shallowly equal to last time.

## They work as a set

`React.memo` only helps if the props are actually equal. Passing a new object or arrow function every render defeats it:

```jsx
const Row = React.memo(function Row({ item, onSelect }) { ... });

function List({ items }) {
  const [selected, setSelected] = useState(null);
  const onSelect = useCallback(id => setSelected(id), []);   // stable identity
  return items.map(i => <Row key={i.id} item={i} onSelect={onSelect} />);
}
```

## When they don't help (or hurt)

- The computation is cheap: memoising costs a dependency comparison and memory every render.
- The child isn't wrapped in `React.memo`: a stable callback changes nothing.
- Dependencies change every render anyway (an object created inline).
- The real problem is state placed too high; colocating fixes it without memo.

Measure with the React Profiler first. Typical real wins: expensive filtering/sorting of large lists, stable values passed into context, props of big memoised subtrees, dependencies of effects.

## React Compiler

React Compiler (stable in 2025) memoises components and values automatically at build time. In codebases using it, manual `useMemo`/`useCallback` mostly disappear, but you still need to explain what they do.

> **"Should you wrap everything in useMemo?"** No. Memoisation has a cost and only pays off for expensive calculations or to keep referential equality for memoised children and effect dependencies. Profile, then memoise where it shows up.

=== lesson: error-boundaries | Error boundaries
An error boundary catches JavaScript errors **during rendering** anywhere in its child tree and shows a fallback UI instead of unmounting the whole app (which is what React does with an uncaught render error).

They're still class components (or the `react-error-boundary` package):

```jsx
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }   // render fallback
  componentDidCatch(error, info) { reportToSentry(error, info.componentStack); }
  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}

<ErrorBoundary fallback={<p>Couldn't load comments.</p>}>
  <Comments />
</ErrorBoundary>
```

## What they don't catch

- Errors in **event handlers** (use try/catch there).
- **Async** code (`setTimeout`, promise callbacks) outside rendering.
- Server-side rendering errors, and errors in the boundary itself.

To surface an async error to a boundary, put it in state and throw during render, or use `useErrorBoundary().showBoundary(error)` from react-error-boundary. Data libraries with Suspense (TanStack Query's `throwOnError`) and Next.js `error.js` files do this for you.

## Placement

Wrap independent sections (a widget, a route, a sidebar) so one failure doesn't blank the page. Provide a retry (`resetErrorBoundary`) and reset the boundary when the route or key changes.

> **"How do you stop one broken component from crashing the page?"** Error boundaries around independent regions, with fallbacks and logging; try/catch for event handlers and async code, since boundaries only catch errors thrown while rendering.

=== lesson: suspense-lazy-loading | Suspense and lazy loading
`<Suspense fallback={...}>` shows a fallback while something inside it is **not ready**: code being loaded, or data being fetched by a Suspense-enabled source.

## Code splitting with lazy

```jsx
const Chart = React.lazy(() => import("./Chart"));   // separate bundle chunk

function Dashboard() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Chart />
    </Suspense>
  );
}
```

The chart's code only downloads when it first renders. Split by route first, then by heavy, below-the-fold or rarely used components (editors, charts, modals).

## Data with Suspense

A component "suspends" by throwing a promise while data loads; the nearest Suspense boundary shows its fallback. You don't throw promises yourself: libraries do it (TanStack Query `useSuspenseQuery`, Relay, Next.js server components, React 19's `use()`).

## Placing boundaries

- One boundary at the top gives one big spinner; nested boundaries let parts appear as they're ready.
- Sibling components under the same boundary reveal together, which avoids layout jumping.
- With transitions (`startTransition`), React keeps showing the old UI instead of falling back to a spinner when navigating.
- On the server, Suspense boundaries are where HTML is **streamed** in chunks (see the Next.js topic).

> **"How does Suspense work?"** A child signals it isn't ready (lazy code or data), React shows the nearest boundary's fallback, and retries rendering when the promise resolves. Boundaries define loading states declaratively instead of `isLoading` flags everywhere.

=== lesson: server-state-vs-client-state-with-tanstack-query | Server state vs client state (TanStack Query)
Two different kinds of state that need different tools.

| Client state | Server state |
|---|---|
| owned by the browser: open modal, form input, theme | owned by the server: users, orders, posts |
| always up to date | a **cached copy** that can go stale |
| synchronous | async, can fail, needs loading and error states |
| useState, useReducer, Zustand | TanStack Query, SWR, RTK Query, Apollo |

Putting API data in Redux or `useState` + `useEffect` means hand-writing caching, deduping, retries, refetching and invalidation. TanStack Query does those.

## TanStack Query in one example

```jsx
const { data, isPending, error } = useQuery({
  queryKey: ["user", id],              // cache key: changes refetch
  queryFn: () => api.getUser(id),
  staleTime: 60_000,                   // fresh for a minute: no refetch on remount
});

const qc = useQueryClient();
const update = useMutation({
  mutationFn: api.updateUser,
  onSuccess: () => qc.invalidateQueries({ queryKey: ["user", id] }),   // refetch
});
```

What you get: request deduping (ten components, one request), background refetch on window focus, retries with backoff, pagination and infinite queries, optimistic updates, and devtools.

## Key ideas to explain

- **staleTime** — how long data counts as fresh. **gcTime** — how long unused data stays cached.
- **Query keys** — include every variable the query depends on.
- **Invalidation after mutations** vs setting the cache directly (`setQueryData`) for instant updates.

> **"Why not keep API data in Redux?"** Because it's a cache of server data, not app state. A server-state library handles staleness, deduping, refetching and invalidation; the client-state store stays small and only holds what the browser owns.

=== lesson: state-management-choice-justification | Choosing a state management approach
There's no single answer; interviewers want a reasoned choice.

## A decision ladder

1. **Local state** (`useState`/`useReducer`) — the default. Colocate.
2. **Lift to a common parent** when siblings share it.
3. **URL state** for anything shareable or bookmarkable: filters, tabs, pagination, search (`useSearchParams`, nuqs).
4. **Server-state library** (TanStack Query, SWR) for API data. This usually removes most "global state".
5. **Context** for low-frequency globals: theme, auth user, locale.
6. **A client store** when shared, frequently updated client state remains:
   - **Zustand** — tiny, hook-based, selectors avoid extra renders. A good default.
   - **Redux Toolkit** — explicit actions, devtools, middleware; suits large teams and complex flows.
   - **Jotai / Recoil** — atomic state, good for many independent pieces (editors, canvases).
   - **XState** — explicit state machines for complex flows (checkout, multi-step wizards).

## How to answer

> "I start local and only move state up when something else needs it. API data goes into TanStack Query, shareable UI state goes into the URL, and theme and auth go into context. If there's still shared client state that changes often, like a document editor, I'd add Zustand for its selector-based subscriptions. Redux Toolkit if the team needs strict conventions and time-travel debugging."

Mention the costs: boilerplate, bundle size, learning curve, and the risk of putting everything global.

=== lesson: list-virtualization | List virtualization
Rendering 10,000 rows creates 10,000+ DOM nodes: slow first render, heavy memory, janky scrolling. **Virtualization** (windowing) renders only the rows in view plus a small buffer, and fakes the full scroll height.

## How it works

- A scroll container with a known height.
- An inner spacer with the full height (`rowCount × rowHeight`) so the scrollbar is right.
- On scroll, compute `firstIndex = floor(scrollTop / rowHeight)` and render rows from there to the visible count + overscan, absolutely positioned at `index × rowHeight`.

```jsx
import { useVirtualizer } from "@tanstack/react-virtual";

function BigList({ rows }) {
  const parentRef = useRef(null);
  const v = useVirtualizer({ count: rows.length, getScrollElement: () => parentRef.current, estimateSize: () => 36, overscan: 8 });
  return (
    <div ref={parentRef} style={{ height: 480, overflow: "auto" }}>
      <div style={{ height: v.getTotalSize(), position: "relative" }}>
        {v.getVirtualItems().map(item => (
          <div key={item.key} style={{ position: "absolute", top: 0, transform: `translateY(${item.start}px)`, height: item.size, width: "100%" }}>
            {rows[item.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

Libraries: TanStack Virtual, react-window, react-virtuoso (handles variable heights and chat-style reverse lists well).

## Trade-offs to mention

- Variable row heights need measuring; estimates cause scroll jumps.
- Ctrl+F (browser find) can't see rows that aren't rendered.
- Accessibility: screen readers only see rendered rows; use `aria-rowcount`/`aria-rowindex` for tables.
- Alternatives first: pagination or "load more" are simpler when they fit the UX. CSS `content-visibility: auto` helps for long static pages.

=== lesson: uselayouteffect-vs-useeffect | useLayoutEffect vs useEffect
Both run after React updates the DOM. The difference is **when** relative to the browser painting.

| | useEffect | useLayoutEffect |
|---|---|---|
| runs | after paint, asynchronously | after DOM mutation, **before paint**, synchronously |
| blocks the screen | no | yes, until it finishes |
| use for | data fetching, subscriptions, logging | measuring layout and adjusting before the user sees it |

## The flicker it prevents

A tooltip that needs its own measured height to position itself: with `useEffect`, the browser paints it in the wrong place first, then it jumps. With `useLayoutEffect`, you measure and set the position before the first paint.

```jsx
function Tooltip({ anchorRect, children }) {
  const ref = useRef(null);
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    const h = ref.current.getBoundingClientRect().height;
    setTop(anchorRect.top - h - 8);       // re-render happens before paint
  }, [anchorRect]);
  return <div ref={ref} style={{ position: "fixed", top }}>{children}</div>;
}
```

## Cautions

- It blocks painting, so keep it short.
- It doesn't run during server rendering (React warns); in SSR code use `useEffect` or an isomorphic wrapper.
- `useInsertionEffect` runs even earlier and exists for CSS-in-JS libraries to inject styles.

> **"When would you use useLayoutEffect?"** Only when you must read layout and change it before the user sees the frame, to avoid visible flicker. Everything else uses useEffect.

=== lesson: portals | Portals
`createPortal(children, domNode)` renders children into a DOM node **outside** the parent's DOM hierarchy, while keeping them in the same place in the **React** tree.

```jsx
import { createPortal } from "react-dom";

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return createPortal(
    <div className="backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>{children}</div>
    </div>,
    document.body
  );
}
```

## Why

Modals, tooltips, dropdowns and toasts get clipped by a parent's `overflow: hidden`, or trapped under other content by a parent's stacking context (`z-index`, `transform`). Rendering at `document.body` escapes both.

## The subtle part

The portal's content still behaves as a React child of where it's written:

- **Context** flows into it normally.
- **Events bubble through the React tree**, not the DOM tree: a click inside the modal reaches the `onClick` of the component that rendered the portal, even though in the DOM it's elsewhere. That surprises people (hence `stopPropagation` above, or checking the target).

## Accessibility checklist for modals

Focus moves into the dialog on open and returns to the trigger on close; Tab is trapped inside; Escape closes it; the background is `inert` or `aria-hidden`. The native `<dialog>` element with `showModal()` now handles most of this for you.

=== lesson: render-props-hocs | Render props and higher-order components
Two older patterns for sharing logic, mostly replaced by hooks. You'll see them in older codebases and libraries, and interviewers ask how they compare.

## Higher-order component (HOC)

A function that takes a component and returns an enhanced one:

```jsx
function withUser(Component) {
  return function WithUser(props) {
    const user = useUser();
    return user ? <Component {...props} user={user} /> : <Login />;
  };
}
export default withUser(Dashboard);
```

Problems: "wrapper hell" in devtools, props colliding between HOCs, unclear where a prop came from, refs not passed through.

## Render props

A component that takes a function and calls it with its data:

```jsx
<MouseTracker render={({ x, y }) => <Cursor x={x} y={y} />} />
// or as children
<Query query={GET_USER}>{({ data }) => <Profile user={data.user} />}</Query>
```

Problems: deeply nested callbacks, and a new function each render.

## Hooks replaced both

```jsx
const { x, y } = useMousePosition();
const user = useUser();
```

Flat, composable, explicit about where values come from, no extra components in the tree.

## Where they still make sense

Render props are still the right API when a component needs to let you control **what's rendered** for each item (virtualized lists, headless table libraries, `Downshift`). HOCs remain for cross-cutting wrappers like route protection or analytics in some frameworks.

=== lesson: react-19-use-actions-useoptimistic | React 19: use, Actions, useOptimistic
React 19 (stable since December 2024) added features around async work and forms.

## Actions

Functions passed to `<form action={fn}>` or run inside `startTransition`, which may be async. React tracks their pending state and errors for you.

```jsx
function UpdateName() {
  const [error, submit, isPending] = useActionState(async (prev, formData) => {
    const res = await updateName(formData.get("name"));
    return res.ok ? null : res.error;
  }, null);
  return (
    <form action={submit}>
      <input name="name" />
      <button disabled={isPending}>Save</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
```

`useFormStatus()` lets a child (like a submit button) read the parent form's pending state. In Next.js, the action can be a server action.

## useOptimistic

Show the expected result immediately while the action runs; React reverts if it fails.

```jsx
const [optimisticTodos, addOptimistic] = useOptimistic(todos, (state, newTodo) => [...state, { ...newTodo, pending: true }]);
async function add(formData) {
  addOptimistic({ text: formData.get("text") });
  await saveTodo(formData.get("text"));
}
```

## use()

Reads a promise (suspending until it resolves) or a context. Unlike other hooks, it can be called inside conditions.

```jsx
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);   // suspends; wrap in <Suspense>
  return comments.map(c => <p key={c.id}>{c.text}</p>);
}
```

## React 19.2 (October 2025)

- `useEffectEvent` — pull "read the latest value but don't re-run the effect" logic out of an effect, the clean fix for many stale-closure and dependency-list problems.
- `<Activity mode="hidden">` — hide part of the UI while keeping its state, and pre-render screens the user is likely to open next.

## Also new

`ref` as a regular prop (no `forwardRef`), `<Context>` as a provider directly, document metadata (`<title>`, `<meta>`) rendered from any component, stylesheet and script deduplication, better hydration error messages, and React Compiler as an opt-in build step.

=== lesson: concurrent-rendering-usetransition-usedeferredvalue | Concurrent rendering: useTransition and useDeferredValue
Since React 18, rendering can be **interrupted**. React can pause work on a slow update to handle something urgent (like typing), then resume or throw away the stale work. You opt in by marking updates as non-urgent.

## useTransition

Mark a state update as a transition: it can be interrupted, and React keeps showing the current UI (instead of a Suspense fallback) while it prepares the new one.

```jsx
function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();
  return (
    <>
      <input value={query} onChange={e => {
        setQuery(e.target.value);                         // urgent: the input stays responsive
        startTransition(() => setResults(filterHuge(e.target.value)));  // can lag behind
      }} />
      {isPending && <Spinner />}
      <ResultList items={results} />
    </>
  );
}
```

## useDeferredValue

The same idea when you don't control the setter: get a "lagging" copy of a value.

```jsx
const deferredQuery = useDeferredValue(query);
const list = useMemo(() => <SlowList query={deferredQuery} />, [deferredQuery]);
```

## What this is not

It doesn't make slow code faster or move it off the main thread; it just keeps urgent updates from waiting behind it. A single long synchronous calculation still blocks (use a Web Worker, or virtualize). It also isn't debouncing: no fixed delay, and work is abandoned rather than postponed.

> **"When would you use useTransition?"** When an update triggers expensive rendering (filtering a big list, switching tabs, navigation) and you want input to stay responsive and old content to stay visible while React prepares the new view.

=== lesson: fiber-architecture | Fiber architecture
**Fiber** is React's reconciliation engine (since React 16). It's what makes interruptible rendering, Suspense and transitions possible.

## The problem it solved

The old reconciler walked the component tree recursively. Once started, it couldn't stop until finished, so a big update froze the main thread and input lagged.

## What a fiber is

A fiber is a JavaScript object representing one unit of work: a component instance or DOM element, with its type, props, state, effects, and links to its **child**, **sibling** and **return** (parent) fibers. The tree becomes a linked list React walks with a loop instead of the call stack, so it can stop after any unit and resume later.

## How a render works

1. **Render phase** (interruptible): starting from the updated fiber, React calls components and builds a **work-in-progress** tree alongside the **current** tree, marking what changed. It yields to the browser periodically (the scheduler works in roughly 5 ms slices) so input stays responsive. Work can be paused, restarted, or thrown away if a more urgent update arrives.
2. **Commit phase** (synchronous): apply all DOM changes at once, swap the work-in-progress tree to become current (double buffering), then run layout effects and schedule effects.

## Lanes and priorities

Updates are assigned priority **lanes**: a click or keystroke is urgent, a transition is low priority, offscreen work is lowest. Higher lanes interrupt lower ones.

> **"What is React Fiber?"** The reconciler rewritten around a linked tree of units of work, so rendering can be split into chunks, prioritised and interrupted. That's the foundation for concurrent features like transitions and Suspense; the commit to the DOM is still a single synchronous step.

Why components must be pure: the render phase may run a component several times or discard the result, so side effects belong in effects and event handlers.
