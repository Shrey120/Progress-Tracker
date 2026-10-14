# Prep Notebook

Lessons with runnable exercises: Python for DSA first, then the interview-prep topics from the
Prep Tracker. A static site with no build step at deploy time; Python runs in the browser with
Pyodide inside a web worker.

The **Patterns** page (`#/patterns`, data in `patterns.js`) trains problem recognition: a cheat
sheet of signals per pattern, an unlabeled drill of short problem descriptions with spaced repeats,
and a journal. The journal reads DSA problems marked done in the tracker (same origin, key
`prep-tracker-v3`), stores a one-line pattern + insight per problem, and brings each back for
recall after 1, 3, 7, 14, 30 and 60 days.

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
