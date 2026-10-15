# Prep Notebook

Lessons with runnable exercises: Python for DSA first, then the interview-prep topics from the
Prep Tracker. A static site with no build step at deploy time; Python runs in the browser with
Pyodide inside a web worker.

The **Patterns** page (`#/patterns`, data in `patterns.js`) trains problem recognition: a cheat
guide: how to go from brute force to optimal (method + moves table), then a card per pattern with
its signals, the brute force it replaces, and classic LeetCode problems to practise on. The tracker
loads the same `patterns.js` for the pattern picker in its per-problem notes.

Notes and revision live in the tracker (✎ and ↻ on any problem or topic), not here.

## Run locally

    python3 -m http.server 8000      # then open http://localhost:8000

## Edit content

Lessons live in `content/<course>/*.md`. After editing, rebuild `content.js` and check every
exercise:

    python3 build.py --verify

`--verify` runs each reference solution against its tests and confirms each starter does not
already pass. The file format is documented at the top of `build.py`. `content/courses.json`
holds course descriptions and the planned interview-prep outline; written lessons replace their
planned entries by id.

## How exercises run

`runner-worker.js` loads Pyodide from jsDelivr (or from `vendor/pyodide/` if present, which is
git-ignored and only used for offline testing). Each run gets 8 seconds; after that, or after a
browser stack overflow, the worker is replaced. An `assert a == b` test with no message reports
the expected and actual values.

In-browser recursion limits: plain functions nest past 16,000 calls; functions wrapped in
`@cache`/`lru_cache` about 450, so keep memoised tests at or below that depth.

## Progress

Stored in this browser's localStorage (read lessons, solved exercises, your code). Use
"Backup progress" in the sidebar to copy or download it.

## Moving to its own repo and Vercel

The folder is self-contained. Copy it to a new repo and import that repo in Vercel as a static
site (framework preset "Other", no build command, output directory = root).
