---
course: prep
module: machine-coding-round
title: Machine coding round
order: 125
---
=== lesson: how-machine-coding-rounds-work-and-how-to-approach-them | How machine coding rounds work
In a **machine coding** round (common at Indian product companies for frontend and full-stack roles) you build a working feature in 60–120 minutes: a todo app, autocomplete, nested comments, a file explorer, a kanban board. Usually React or vanilla JavaScript, sometimes with a mock API.

## What's evaluated

1. **It works**: core requirements complete and demo-able. A working subset beats a broken whole.
2. **Code structure**: sensible components, state in the right place, no giant file.
3. **Edge cases**: empty input, duplicates, long text, rapid clicks, errors from the API.
4. **Extensibility**: could you add a feature quickly? (Interviewers often ask for one at the end.)
5. **UX and accessibility basics**: keyboard support, labels, loading/empty states.
6. **Communication**: you explain decisions as you go.

## A time plan for 90 minutes

| Minutes | Do |
|---|---|
| 0–10 | clarify requirements; list must-haves vs nice-to-haves; sketch components and state |
| 10–60 | build the core flow end to end, ugly first |
| 60–75 | edge cases, error/empty states, keyboard |
| 75–85 | refactor, naming, light styling |
| 85–90 | demo, explain trade-offs and what you'd add next |

## Habits

- Decide the **state shape** first; most of the solution follows from it.
- Keep a running list of assumptions and say them out loud.
- Commit to simple styling (or none); don't burn 20 minutes on CSS.
- Practise the common problems in this topic with a timer until the patterns are automatic.

=== lesson: build-a-todo-app-with-filters | Build a todo app with filters
Requirements: add, toggle, delete, edit todos; filters All / Active / Completed; "items left" count; clear completed; persist in localStorage. Try it below, then press **Edit** to read and change the code.

```htmlrun
<style>
  body { max-width: 420px } .row { display:flex; gap:6px } input[type=text] { flex:1; padding:6px }
  ul { list-style:none; padding:0 } li { display:flex; gap:8px; align-items:center; padding:4px 0 }
  li.done span { text-decoration: line-through; color:#888 } .filters button[aria-pressed=true] { font-weight:700 }
</style>
<form class="row" id="add"><input type="text" id="text" placeholder="What needs doing?" aria-label="New todo"><button>Add</button></form>
<ul id="list"></ul>
<div class="row filters"><span id="left"></span>
  <button data-f="all">All</button><button data-f="active">Active</button><button data-f="done">Completed</button>
  <button id="clear">Clear completed</button></div>
<script>
  let todos = []; let filter = "all";
  try { todos = JSON.parse(localStorage.getItem("todos")) || []; } catch {}
  const save = () => { try { localStorage.setItem("todos", JSON.stringify(todos)); } catch {} };
  const visible = () => todos.filter(t => filter === "all" || (filter === "done" ? t.done : !t.done));
  function render() {
    const list = document.getElementById("list"); list.innerHTML = "";
    for (const t of visible()) {
      const li = document.createElement("li"); li.className = t.done ? "done" : "";
      li.innerHTML = `<input type="checkbox" ${t.done ? "checked" : ""} aria-label="Toggle"><span></span><button aria-label="Delete">✕</button>`;
      li.querySelector("span").textContent = t.text;            // textContent: no XSS from user input
      li.querySelector("input").onchange = () => { t.done = !t.done; save(); render(); };
      li.querySelector("button").onclick = () => { todos = todos.filter(x => x.id !== t.id); save(); render(); };
      li.querySelector("span").ondblclick = () => { const v = prompt("Edit", t.text); if (v && v.trim()) { t.text = v.trim(); save(); render(); } };
      list.appendChild(li);
    }
    const left = todos.filter(t => !t.done).length;
    document.getElementById("left").textContent = `${left} item${left === 1 ? "" : "s"} left`;
    document.querySelectorAll("[data-f]").forEach(b => b.setAttribute("aria-pressed", b.dataset.f === filter));
  }
  document.getElementById("add").onsubmit = e => {
    e.preventDefault(); const input = document.getElementById("text"); const text = input.value.trim();
    if (!text) return;
    todos.push({ id: Date.now() + Math.random(), text, done: false }); input.value = ""; save(); render();
  };
  document.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { filter = b.dataset.f; render(); });
  document.getElementById("clear").onclick = () => { todos = todos.filter(t => !t.done); save(); render(); };
  render();
</script>
```

## The React shape

```jsx
function TodoApp() {
  const [todos, setTodos] = useLocalStorage("todos", []);          // custom hook
  const [filter, setFilter] = useState("all");
  const visible = todos.filter(t => filter === "all" || (filter === "done" ? t.done : !t.done));   // derived, not state
  const add = text => setTodos(ts => [...ts, { id: crypto.randomUUID(), text, done: false }]);
  const toggle = id => setTodos(ts => ts.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = id => setTodos(ts => ts.filter(t => t.id !== id));
  return (<>
    <AddTodo onAdd={add} />
    <TodoList items={visible} onToggle={toggle} onRemove={remove} />
    <Footer left={todos.filter(t => !t.done).length} filter={filter} onFilter={setFilter} />
  </>);
}
```

Points to mention: stable IDs as keys (not indexes), immutable updates, filtered list derived (not stored), trimming and empty-input checks, and rendering user text safely.

=== lesson: build-autocomplete-with-debounce | Build autocomplete with debounce
Requirements: suggestions while typing, debounced requests, ignore stale responses, keyboard navigation (↑ ↓ Enter Escape), highlight the matching part, loading and empty states. The "API" below is faked with a random delay so you can see stale responses being ignored.

```htmlrun
<style>
  .box { position:relative; width:280px } input { width:100%; padding:8px; box-sizing:border-box }
  ul { position:absolute; left:0; right:0; margin:0; padding:0; list-style:none; border:1px solid #ccd; background:#fff }
  li { padding:6px 8px; cursor:pointer } li[aria-selected=true] { background:#EAF1FF } mark { background:#FFE9A8 }
  .status { font-size:12px; color:#667; margin-top:4px }
</style>
<div class="box">
  <input id="q" role="combobox" aria-expanded="false" aria-controls="list" aria-autocomplete="list" placeholder="Search a city…" autocomplete="off">
  <ul id="list" role="listbox" hidden></ul>
  <div class="status" id="status" aria-live="polite"></div>
</div>
<script>
  const CITIES = ["Agra","Ahmedabad","Amritsar","Bengaluru","Bhopal","Chennai","Delhi","Hyderabad","Indore","Jaipur","Kanpur","Kochi","Kolkata","Lucknow","Mumbai","Mysuru","Nagpur","Noida","Patna","Pune","Surat","Varanasi"];
  const fakeApi = q => new Promise(r => setTimeout(() => r(CITIES.filter(c => c.toLowerCase().includes(q.toLowerCase()))), 100 + Math.random() * 400));
  const input = document.getElementById("q"), list = document.getElementById("list"), status = document.getElementById("status");
  let items = [], active = -1, latest = 0, timer;
  const cache = new Map();
  const escape = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function render(q) {
    list.innerHTML = items.map((c, i) => {
      const k = c.toLowerCase().indexOf(q.toLowerCase());
      const html = escape(c.slice(0, k)) + "<mark>" + escape(c.slice(k, k + q.length)) + "</mark>" + escape(c.slice(k + q.length));
      return `<li role="option" id="opt${i}" aria-selected="${i === active}">${html}</li>`;
    }).join("");
    list.hidden = !items.length; input.setAttribute("aria-expanded", String(!!items.length));
    input.setAttribute("aria-activedescendant", active >= 0 ? "opt" + active : "");
  }
  async function search(q) {
    const id = ++latest;                                   // tag this request
    if (q.length < 1) { items = []; status.textContent = ""; return render(q); }
    status.textContent = "Loading…";
    const res = cache.get(q) ?? await fakeApi(q);
    if (id !== latest) return;                             // a newer request started: drop this stale result
    cache.set(q, res); items = res.slice(0, 8); active = -1;
    status.textContent = items.length ? `${items.length} suggestions` : "No matches";
    render(q);
  }
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => search(input.value.trim()), 200); });
  input.addEventListener("keydown", e => {
    if (!items.length) return;
    if (e.key === "ArrowDown") { active = (active + 1) % items.length; render(input.value.trim()); e.preventDefault(); }
    if (e.key === "ArrowUp") { active = (active - 1 + items.length) % items.length; render(input.value.trim()); e.preventDefault(); }
    if (e.key === "Enter" && active >= 0) choose(items[active]);
    if (e.key === "Escape") { items = []; render(""); }
  });
  list.addEventListener("mousedown", e => { const li = e.target.closest("li"); if (li) choose(li.textContent); });
  function choose(v) { input.value = v; items = []; render(""); status.textContent = "Selected " + v; }
</script>
```

## What to say while building

Debounce limits calls; the request counter (or `AbortController`) drops out-of-order responses; the cache makes backspacing instant; ARIA combobox roles make it usable with screen readers; highlighting uses escaped text (never inject raw user input as HTML). Extensions interviewers ask for: recent searches, grouping, infinite results, or making it a reusable component with an `onSearch` prop.

=== lesson: build-a-star-rating-component | Build a star rating component
Requirements: N stars, hover preview, click to set, keyboard support, readonly mode, accessible.

```htmlrun
<style>
  .stars { display:inline-flex; gap:2px } .stars button { font-size:28px; background:none; border:0; cursor:pointer; color:#ccd; padding:0 }
  .stars button.on { color:#E0A800 } .stars button:focus-visible { outline:2px solid #2E6AD8; border-radius:4px }
</style>
<div id="rating" class="stars" role="radiogroup" aria-label="Rate this product"></div>
<p id="out">No rating yet</p>
<script>
  function StarRating(el, { max = 5, value = 0, onChange }) {
    let hover = 0;
    const buttons = Array.from({ length: max }, (_, i) => {
      const b = document.createElement("button");
      b.textContent = "★"; b.setAttribute("role", "radio"); b.setAttribute("aria-label", `${i + 1} star${i ? "s" : ""}`);
      b.onmouseenter = () => { hover = i + 1; paint(); };
      b.onclick = () => set(i + 1);
      el.appendChild(b); return b;
    });
    el.onmouseleave = () => { hover = 0; paint(); };
    el.onkeydown = e => {
      if (e.key === "ArrowRight" || e.key === "ArrowUp") { set(Math.min(max, value + 1)); e.preventDefault(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") { set(Math.max(1, value - 1)); e.preventDefault(); }
    };
    function set(v) { value = v; paint(); buttons[v - 1].focus(); onChange?.(v); }
    function paint() {
      const shown = hover || value;
      buttons.forEach((b, i) => {
        b.classList.toggle("on", i < shown);
        b.setAttribute("aria-checked", String(i + 1 === value));
        b.tabIndex = (value ? i + 1 === value : i === 0) ? 0 : -1;   // roving tabindex: one tab stop
      });
    }
    paint();
  }
  StarRating(document.getElementById("rating"), { onChange: v => (document.getElementById("out").textContent = `You rated ${v} / 5`) });
</script>
```

Talking points: the separation of `hover` (preview) and `value` (committed), a single Tab stop with arrow keys (roving tabindex), radio semantics for screen readers, and in React a controlled `value`/`onChange` API. Extension: half stars (track pointer position within a star).

=== lesson: build-tabs-and-an-accordion | Build tabs and an accordion
Two staples, both mostly about state and accessibility.

```htmlrun
<style>
  [role=tablist] { display:flex; gap:4px; border-bottom:1px solid #ccd } [role=tab] { padding:6px 12px; border:0; background:none; cursor:pointer }
  [role=tab][aria-selected=true] { border-bottom:3px solid #2E6AD8; font-weight:700 } [role=tabpanel] { padding:10px 2px }
  details { border:1px solid #dde; border-radius:6px; padding:8px; margin:6px 0 } summary { cursor:pointer; font-weight:600 }
</style>
<div id="tabs">
  <div role="tablist" aria-label="Product info">
    <button role="tab" aria-selected="true" aria-controls="p1" id="t1">Details</button>
    <button role="tab" aria-selected="false" aria-controls="p2" id="t2" tabindex="-1">Reviews</button>
    <button role="tab" aria-selected="false" aria-controls="p3" id="t3" tabindex="-1">Shipping</button>
  </div>
  <div role="tabpanel" id="p1" aria-labelledby="t1">Mechanical keyboard with hot-swappable switches.</div>
  <div role="tabpanel" id="p2" aria-labelledby="t2" hidden>4.6 ★ from 212 reviews.</div>
  <div role="tabpanel" id="p3" aria-labelledby="t3" hidden>Ships in 2 days across India.</div>
</div>
<h4>Accordion (native, no JS)</h4>
<details name="faq" open><summary>Can I return it?</summary>Yes, within 7 days.</details>
<details name="faq"><summary>Is there a warranty?</summary>One year, manufacturer warranty.</details>
<script>
  const tabs = [...document.querySelectorAll("[role=tab]")];
  function select(tab) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    tab.focus();
  }
  tabs.forEach((t, i) => {
    t.onclick = () => select(t);
    t.onkeydown = e => {
      if (e.key === "ArrowRight") select(tabs[(i + 1) % tabs.length]);
      if (e.key === "ArrowLeft") select(tabs[(i - 1 + tabs.length) % tabs.length]);
      if (e.key === "Home") select(tabs[0]);
      if (e.key === "End") select(tabs[tabs.length - 1]);
    };
  });
</script>
```

The accordion uses native `<details>`; the shared `name` attribute makes only one open at a time in current browsers. For a custom accordion: buttons with `aria-expanded` and `aria-controls`.

React version of tabs: a `Tabs` compound component with context holding the active value, `Tabs.List`, `Tabs.Trigger value=…`, `Tabs.Panel value=…` (see React → Component composition).

=== lesson: build-nested-comments | Build nested comments
Requirements: comments with replies to any depth, add a reply under any comment, collapse a thread, show counts. The key ideas are a **recursive component** and the right **data shape**.

```htmlrun
<style>
  .c { margin:6px 0 6px 0; padding-left:12px; border-left:2px solid #dde } .c .meta { font-size:12px; color:#667 }
  .c button { font-size:12px; margin-right:6px } form { display:flex; gap:4px; margin:4px 0 } form input { flex:1 }
</style>
<div id="root"></div>
<script>
  // flat, normalised data: easy to update and to store; parentId builds the tree
  let comments = [
    { id: 1, parentId: null, author: "Asha", text: "Does this keyboard work with Mac?" },
    { id: 2, parentId: 1, author: "Ravi", text: "Yes, there's a Mac mode switch." },
    { id: 3, parentId: 2, author: "Asha", text: "Thanks!" },
    { id: 4, parentId: null, author: "Meera", text: "How loud are the switches?" },
  ];
  const collapsed = new Set();
  let nextId = 5;
  const childrenOf = id => comments.filter(c => c.parentId === id);
  const countAll = id => childrenOf(id).reduce((n, c) => n + 1 + countAll(c.id), 0);
  function renderComment(c) {                       // recursion: a comment renders its children
    const el = document.createElement("div"); el.className = "c";
    const replies = countAll(c.id);
    el.innerHTML = `<div class="meta"></div><div class="text"></div>
      <button data-reply>Reply</button>${replies ? `<button data-toggle>${collapsed.has(c.id) ? "Show" : "Hide"} ${replies} repl${replies > 1 ? "ies" : "y"}</button>` : ""}`;
    el.querySelector(".meta").textContent = c.author; el.querySelector(".text").textContent = c.text;
    el.querySelector("[data-reply]").onclick = () => {
      if (el.querySelector(":scope > form")) return;
      const f = document.createElement("form"); f.innerHTML = `<input placeholder="Write a reply" aria-label="Reply"><button>Post</button>`;
      f.onsubmit = e => { e.preventDefault(); const v = f.querySelector("input").value.trim(); if (!v) return;
        comments.push({ id: nextId++, parentId: c.id, author: "You", text: v }); collapsed.delete(c.id); render(); };
      el.insertBefore(f, el.querySelector(".c")); f.querySelector("input").focus();
    };
    const t = el.querySelector("[data-toggle]");
    if (t) t.onclick = () => { collapsed.has(c.id) ? collapsed.delete(c.id) : collapsed.add(c.id); render(); };
    if (!collapsed.has(c.id)) childrenOf(c.id).forEach(ch => el.appendChild(renderComment(ch)));
    return el;
  }
  function render() { const root = document.getElementById("root"); root.innerHTML = ""; childrenOf(null).forEach(c => root.appendChild(renderComment(c))); }
  render();
</script>
```

## Discussion points

- **Flat list with `parentId`** (normalised) vs nested JSON: flat is easier to update and matches how databases store it; build the tree when rendering (or once with a map, O(n)).
- Recursive `<Comment>` component in React with a `depth` prop to cap indentation on mobile.
- Large threads: load replies lazily ("View 24 more replies"), virtualize.
- Optimistic posting, editing and deleting (keep the node, show "deleted" if it has replies).

=== lesson: build-a-file-explorer-tree | Build a file explorer tree
Requirements: show folders and files from nested data, expand/collapse folders, add a file or folder inside any folder, sort folders before files. Same recursion idea as nested comments, with nested data.

```htmlrun
<style>
  ul { list-style:none; padding-left:16px; margin:2px 0 } li > span { cursor:pointer; user-select:none }
  .tools button { font-size:11px; margin-left:4px }
</style>
<ul id="tree"></ul>
<script>
  const data = { name: "project", type: "folder", children: [
    { name: "src", type: "folder", children: [ { name: "App.tsx", type: "file" }, { name: "components", type: "folder", children: [ { name: "Button.tsx", type: "file" } ] } ] },
    { name: "package.json", type: "file" }, { name: "README.md", type: "file" } ] };
  const open = new Set(["project", "project/src"]);
  const sorted = list => [...list].sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1));
  function node(item, path) {
    const li = document.createElement("li");
    const isOpen = open.has(path);
    const label = document.createElement("span");
    label.textContent = item.type === "folder" ? `${isOpen ? "📂" : "📁"} ${item.name}` : `📄 ${item.name}`;
    li.appendChild(label);
    if (item.type === "folder") {
      label.onclick = () => { isOpen ? open.delete(path) : open.add(path); render(); };
      const tools = document.createElement("span"); tools.className = "tools";
      tools.innerHTML = `<button data-k="file">+ file</button><button data-k="folder">+ folder</button>`;
      tools.onclick = e => {
        const kind = e.target.dataset.k; if (!kind) return;
        const name = prompt(`New ${kind} name`); if (!name || !name.trim()) return;
        if (item.children.some(c => c.name === name.trim())) return alert("Already exists");
        item.children.push(kind === "folder" ? { name: name.trim(), type: "folder", children: [] } : { name: name.trim(), type: "file" });
        open.add(path); render();
      };
      li.appendChild(tools);
      if (isOpen) { const ul = document.createElement("ul"); sorted(item.children).forEach(ch => ul.appendChild(node(ch, path + "/" + ch.name))); li.appendChild(ul); }
    }
    return li;
  }
  function render() { const t = document.getElementById("tree"); t.innerHTML = ""; t.appendChild(node(data, "project")); }
  render();
</script>
```

In an interview, prefer an inline input over `prompt()`; it's used here to keep the demo short.

## Discussion points

Recursive rendering, open/closed state keyed by path or ID (kept outside the data), immutable updates in React (update a nested node by path, or normalise into a flat map of id → node with `childIds`), keyboard navigation with the ARIA **tree** pattern (`role="tree"`, `treeitem`, arrow keys to move, right/left to expand/collapse), and lazy-loading children for huge trees.

=== lesson: build-infinite-scroll-and-pagination | Build infinite scroll and pagination
Requirements: load items page by page as the user scrolls, show a loader, stop at the end, handle errors with retry. Uses `IntersectionObserver` on a sentinel element.

```htmlrun
<style>
  #feed { height:220px; overflow:auto; border:1px solid #dde; border-radius:6px } .item { padding:10px; border-bottom:1px solid #eef }
  #sentinel { padding:10px; text-align:center; color:#667; font-size:13px }
</style>
<div id="feed"><div id="items"></div><div id="sentinel">Loading…</div></div>
<script>
  const TOTAL = 57;
  const fetchPage = (cursor) => new Promise((res, rej) => setTimeout(() => {
    if (Math.random() < 0.1) return rej(new Error("network"));        // occasional failure to show retry
    const items = Array.from({ length: Math.min(10, TOTAL - cursor) }, (_, i) => `Post #${cursor + i + 1}`);
    res({ items, nextCursor: cursor + items.length < TOTAL ? cursor + items.length : null });
  }, 300));
  let cursor = 0, loading = false, done = false;
  const sentinel = document.getElementById("sentinel");
  async function loadMore() {
    if (loading || done) return;
    loading = true; sentinel.textContent = "Loading…";
    try {
      const page = await fetchPage(cursor);
      document.getElementById("items").insertAdjacentHTML("beforeend", page.items.map(t => `<div class="item">${t}</div>`).join(""));
      cursor = page.nextCursor ?? cursor; done = page.nextCursor === null;
      sentinel.textContent = done ? "You're all caught up" : "";
    } catch {
      sentinel.innerHTML = `Couldn't load. <button id="retry">Retry</button>`;
      document.getElementById("retry").onclick = loadMore;
    } finally { loading = false; }
  }
  const io = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore(); },
    { root: document.getElementById("feed"), rootMargin: "100px" });
  io.observe(sentinel);
</script>
```

## Discussion points

- **Guard against duplicate loads** (`loading` flag) and stop at the end (`nextCursor: null`).
- **Cursor pagination** from the API (stable under inserts).
- **Virtualization** once the list is long; restore scroll position on back navigation.
- **Accessibility**: infinite scroll can make the footer unreachable; offer a "Load more" button as well, announce new content politely, `aria-busy` while loading.
- Numbered pagination instead when users need to jump or reference pages (search results, admin tables).

=== lesson: build-a-form-with-validation | Build a form with validation
Requirements: name, email, password with rules, confirm password; validate on blur and on submit; accessible error messages; disable double submission.

```htmlrun
<style>
  form { display:grid; gap:10px; max-width:320px } label { display:grid; gap:3px; font-size:14px } input { padding:7px }
  input[aria-invalid=true] { border:2px solid #D23B3B } .err { color:#D23B3B; font-size:12px; min-height:14px }
</style>
<form id="f" novalidate>
  <label>Name <input name="name" autocomplete="name" aria-describedby="name-err"><span class="err" id="name-err"></span></label>
  <label>Email <input name="email" type="email" autocomplete="email" aria-describedby="email-err"><span class="err" id="email-err"></span></label>
  <label>Password <input name="password" type="password" autocomplete="new-password" aria-describedby="password-err"><span class="err" id="password-err"></span></label>
  <label>Confirm password <input name="confirm" type="password" aria-describedby="confirm-err"><span class="err" id="confirm-err"></span></label>
  <button>Create account</button>
  <p id="result" role="status"></p>
</form>
<script>
  const rules = {
    name: v => (v.trim().length >= 2 ? "" : "Enter at least 2 characters"),
    email: v => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Enter an email like name@example.com"),
    password: v => (v.length < 8 ? "Use at least 8 characters" : !/\d/.test(v) ? "Include a number" : ""),
    confirm: (v, all) => (v === all.password ? "" : "Passwords don't match"),
  };
  const form = document.getElementById("f");
  const values = () => Object.fromEntries(new FormData(form));
  function check(name) {
    const msg = rules[name](form.elements[name].value, values());
    form.elements[name].setAttribute("aria-invalid", msg ? "true" : "false");
    document.getElementById(name + "-err").textContent = msg;
    return !msg;
  }
  Object.keys(rules).forEach(n => form.elements[n].addEventListener("blur", () => check(n)));
  form.onsubmit = async e => {
    e.preventDefault();
    const bad = Object.keys(rules).filter(n => !check(n));
    if (bad.length) return form.elements[bad[0]].focus();               // focus the first error
    const btn = form.querySelector("button"); btn.disabled = true; btn.textContent = "Creating…";
    await new Promise(r => setTimeout(r, 600));                          // fake API call
    document.getElementById("result").textContent = `Welcome, ${values().name}!`;
    btn.disabled = false; btn.textContent = "Create account";
  };
</script>
```

## Discussion points

Validate on blur (not on every keystroke before the user finishes), re-validate dependent fields (confirm password), focus the first error on submit, link errors with `aria-describedby` and `aria-invalid`, prevent double submits, and **validate again on the server**. In React: React Hook Form + a Zod schema shared with the backend.

=== lesson: build-an-otp-input | Build an OTP input
Requirements: N single-digit boxes, auto-advance, Backspace goes back, paste a full code, arrow keys, submit when complete.

```htmlrun
<style> .otp { display:flex; gap:8px } .otp input { width:40px; height:48px; text-align:center; font-size:22px } </style>
<div class="otp" id="otp" role="group" aria-label="One-time code"></div>
<p id="msg" role="status"></p>
<script>
  const N = 6, box = document.getElementById("otp");
  const inputs = Array.from({ length: N }, (_, i) => {
    const el = document.createElement("input");
    Object.assign(el, { inputMode: "numeric", maxLength: 1, autocomplete: i === 0 ? "one-time-code" : "off" });
    el.setAttribute("aria-label", `Digit ${i + 1}`);
    box.appendChild(el); return el;
  });
  const code = () => inputs.map(i => i.value).join("");
  function fill(from, digits) {
    digits.split("").slice(0, N - from).forEach((d, k) => (inputs[from + k].value = d));
    inputs[Math.min(N - 1, from + digits.length)].focus();
    if (code().length === N) document.getElementById("msg").textContent = "Verifying " + code() + "…";
  }
  inputs.forEach((el, i) => {
    el.addEventListener("input", () => {
      const d = el.value.replace(/\D/g, "");
      el.value = "";
      if (d) fill(i, d);                                  // handles typing and autofill of several digits
    });
    el.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !el.value && i > 0) { inputs[i - 1].value = ""; inputs[i - 1].focus(); e.preventDefault(); }
      if (e.key === "ArrowLeft" && i > 0) inputs[i - 1].focus();
      if (e.key === "ArrowRight" && i < N - 1) inputs[i + 1].focus();
    });
    el.addEventListener("paste", e => { e.preventDefault(); fill(i, (e.clipboardData.getData("text") || "").replace(/\D/g, "")); });
  });
  inputs[0].focus();
</script>
```

Talking points: `inputmode="numeric"` and `autocomplete="one-time-code"` (SMS autofill on phones), paste handling, accessible labels per digit (or a single visually-split input, which some teams prefer for screen readers), and rate-limiting verification on the server.

=== lesson: build-a-progress-bar-and-countdown-timer | Build a progress bar and countdown timer
Two small components that test timers, cleanup and accurate time.

```htmlrun
<style> .bar { height:12px; background:#eef; border-radius:6px; overflow:hidden; width:300px } .bar > div { height:100%; background:#2E6AD8; width:0; transition:width .2s } </style>
<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="pb"><div></div></div>
<p><span id="time">00:10</span> <button id="start">Start</button> <button id="pause">Pause</button> <button id="reset">Reset</button></p>
<script>
  const DURATION = 10_000;
  let endAt = null, remaining = DURATION, raf = null;
  const fmt = ms => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
  function paint() {
    const pct = Math.round(((DURATION - remaining) / DURATION) * 100);
    const pb = document.getElementById("pb"); pb.firstElementChild.style.width = pct + "%"; pb.setAttribute("aria-valuenow", pct);
    document.getElementById("time").textContent = fmt(remaining);
  }
  function tick() {
    remaining = Math.max(0, endAt - Date.now());          // compute from the clock, don't count ticks (timers drift)
    paint();
    if (remaining > 0) raf = requestAnimationFrame(tick); else { endAt = null; document.getElementById("time").textContent = "Done!"; }
  }
  document.getElementById("start").onclick = () => { if (endAt || remaining === 0) return; endAt = Date.now() + remaining; tick(); };
  document.getElementById("pause").onclick = () => { if (!endAt) return; cancelAnimationFrame(raf); remaining = Math.max(0, endAt - Date.now()); endAt = null; };
  document.getElementById("reset").onclick = () => { cancelAnimationFrame(raf); endAt = null; remaining = DURATION; paint(); };
  paint();
</script>
```

## Points interviewers look for

- **Don't count intervals** (`seconds--` every 1000 ms drifts and freezes in background tabs); compute remaining time from a target timestamp.
- **Clean up** timers on pause, reset and unmount (`useEffect` cleanup in React).
- Pause/resume preserving remaining time; prevent double starts.
- Progress bar semantics: `role="progressbar"` with `aria-valuenow`, or the native `<progress>` element.
- Extensions: multiple concurrent timers, a progress bar that animates sequentially through a queue, server-synchronised countdowns (sale ends at a server timestamp).

=== lesson: take-home-assignments | Take-home assignments
A **take-home assignment** is a small project you build on your own time: an API, a small React or Next.js app, or both. Remote-first companies, startups and many foreign employers use them instead of (or as well as) live coding. A review call usually follows, where you walk through your code and extend it live.

They're usually sized at 2–6 hours, sometimes with a few days to submit.

## Before you start

- **Ask questions by email.** Ambiguous requirements are often on purpose; a short, clear list of questions is itself part of the assessment.
- **Agree the time budget.** If they say "about 4 hours", aim for that; reviewers notice both rushed and 30-hour submissions.
- **Use the stack you're fastest in**, unless they require one. For you: Next.js, TypeScript, Postgres or SQLite.
- **Write down the core requirements** and finish all of them before any extras.

## What reviewers check

| Area | What they look for |
|---|---|
| It runs | Clone, install, run in three commands or fewer; works first try |
| Requirements | Every stated requirement done and working |
| Structure | Clear folders, small functions, no 400-line components |
| Types and errors | TypeScript without `any`; loading, empty and error states handled |
| Tests | A few meaningful tests on the core logic |
| Git history | Small commits with clear messages, not one "final" commit |
| README | Setup, decisions, trade-offs, what's missing |

A submission that doesn't run is usually rejected without a closer look.

## The README matters most

Reviewers often read the README before the code. A template:

```md
# Task tracker API

## Run it
cp .env.example .env
npm install
npm run dev        # http://localhost:3000, seeded with demo data
npm test

## What's done
- CRUD for tasks with validation (zod), pagination and filtering by status
- Postgres via Prisma; migrations and a seed script

## Decisions and trade-offs
- Offset pagination: simple and fine at this size; I'd switch to cursors for large tables.
- No auth: out of scope per the brief; the user id comes from a header.

## With more time
- Rate limiting, request logging, an OpenAPI spec

## Time spent
About 5 hours.
```

## Scope: depth over breadth

- Do the core requirements properly before adding anything.
- One or two thoughtful extras (tests, deployment, accessibility, a seed script) beat five half-finished ones.
- Don't over-engineer: no microservices, no Redux, no Kubernetes for a three-screen app. Mention what you'd add at scale in the README instead.

## Git, secrets and deployment

- Commit as you go with messages like `feat: add search with debounce` or `test: cover overdue filter`. Reviewers read the history to see how you work.
- Never commit secrets. Add `.env.example` with placeholder values.
- A live link (Vercel, Render) with seed data saves the reviewer time and makes you look finished.

## Using AI tools

Many companies allow AI assistants for take-homes; check the brief. If you use them:

- Be ready to explain and change every line in the review call.
- Mention it in the README if the company asks.
- Never submit code you can't defend: the follow-up call is designed to catch exactly that.

## The review call

Expect:

- "Walk me through the structure." (Have a two-minute tour ready.)
- "Why did you choose X over Y?" (Your README trade-offs are your answers.)
- "How would this scale to a million users?"
- "Add this small feature now", live, in your own code.

Re-read your code the night before. It's easy to forget your own decisions within a week.

## When to push back

An unpaid assignment that takes several days, or looks like real product work for their roadmap, is a warning sign. It's fine to ask how long it should take, or to ask whether a past project could replace it.
