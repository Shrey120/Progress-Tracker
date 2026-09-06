# Prep Tracker

A study tracker for two parallel tracks — DSA and non-DSA interview prep — organised as
sections → topics → problems. One HTML file, no build step, no backend.

## Run it

Open `index.html`. To serve locally: `python3 -m http.server 8000`

## Deploy

Push, then Settings → Pages → source `main` / root.
Live at `https://<username>.github.io/<repo>/`.

## What's loaded

**DSA — the full Striver A2Z sheet**, extracted from the live page: 18 sections, 60
topics, 473 problems with their real titles and difficulties.

The official total is 474. One problem in "Learn the basics" didn't extract — the page's
intro paragraph occupied the row where its title should have been. Every other section
matches its official count exactly. Add the missing one using the "Add a problem" row
inside any topic.

**Interview prep** — 3 sections, 23 topics, 339 items, grouped by how much they actually
decide an interview outcome:

- **High leverage** (9 topics, 149 items) — JavaScript core, TypeScript, React, Next.js
  and rendering, SQL and Postgres, API design, auth and web security, testing,
  behavioural and remote.
- **Mid leverage** (10 topics, 153 items) — Node and backend, system design, caching,
  performance, browser and networking, HTML and CSS, Docker/CI-CD/cloud, Git and
  workflow, design and engineering practice, AI application layer.
- **Lower leverage** (4 topics, 37 items) — CS fundamentals, NoSQL, frontend system
  design, accessibility.

Every item carries a priority tier:

- `★★★` decides the outcome — must be automatic and cold
- `★★` will come up — needs working fluency and a real answer
- `★` recognise and reason about live; won't sink you

Items are ordered by tier inside each topic, and due dates are assigned in list order, so
`★★★` material always lands on the first days of a topic. If you fall behind, what slips
is the low-tier material — which is the right thing to lose.

## Views

**Module** — three levels. A section (e.g. Dynamic Programming) opens to its topics
(1D DP, DP on Strings…), and a topic opens to its problems. `–` and `+` change a topic's
length; later topics *in the same track* shift to match, so DSA and prep stay independent.
Search matches sections, topics and problem titles, and auto-expands to the hits.

The topic names and individual problems shown in the "Today" strip are clickable — clicking
one opens its section and topic below and scrolls to it, with a brief highlight so you can
find it in the full list immediately.

**Kanban Flow** — a live view of what's actually due, not the whole 700-item plan.
Each problem gets its own due date (see below), and:
- **Backlog** — its due date has passed and it's still not done. This happens whether
  or not you ever touched it — overdue is overdue.
- **In progress** — only problems you've explicitly marked in progress (via the checkbox
  in the exploded topic row). A problem due exactly today that you haven't touched yet
  does **not** appear here — it lives in the Today strip until you check it.
- **Completed** — done, regardless of when.

A problem not yet due, and not manually started, doesn't appear on this board at all —
it's still visible in the Module view and Calendar, just not cluttering the working set.

## How due dates are assigned

Every problem carries a difficulty, and difficulty is treated as cost:
**Easy = 1 unit, Medium = 2, Hard = 3.**

A topic's length is `ceil(total weight / 4)` days — four units of effort per day, so a day
is four Easies, or two Mediums, or one Hard plus one Easy. Within the topic, problem *i*
falls on `start + floor(weightBefore(i) x span / totalWeight)`, so a run of Hards eats more
calendar than a run of Easies. With uniform difficulty this reduces to an even split.

Worked examples from the loaded plan:

```
Things to Know in C++/Java/Python   3 days, 9 items, all Easy
  06 Sep   E E E
  07 Sep   E E E
  08 Sep   E E E

Trying out all Combos / Hard        6 days, 8 items, mostly Hard
  04 Dec   H H
  05 Dec   H
  06 Dec   H
  07 Dec   M H
  08 Dec   H
  09 Dec   H
```

Nothing is stored. Due dates are recomputed from the topic's current `start`, `days`,
`extra` and item list every time they're read, so `-`/`+` or adding and removing problems
reflows the whole topic instantly.

Every item in both tracks has a difficulty. For DSA these come from the A2Z sheet itself.
For the interview-prep track there is no published rating for conceptual topics, so those
are estimates of interview depth and time-to-learn — change any that don't match your
experience, and the schedule adjusts.

## Backing up

Progress is per-browser and does not sync between devices. **Backup** gives you the whole
state as JSON to copy or download, plus a box to paste one back. Do this before clearing
browser data.

## Notes

JSX is compiled ahead of time to plain `React.createElement` calls, so there is no Babel
and no build step — the page only pulls React and ReactDOM from unpkg.com. It needs a
connection on first load and says so plainly if the CDN is blocked, rather than showing a
blank screen.