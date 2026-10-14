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

**Python for DSA** — 19 topics, 51 lessons, matching the Learn site, at the start of the DSA track.

**Interview prep** — 3 sections, 23 topics, 364 items, grouped by how much they actually
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

## How long things take

Every item carries an **estimate in minutes**, and every track has a **daily time budget**
(default: DSA 80 min, interview prep 40 min, which is 2 hours a day). A topic's length is its total
minutes divided by its track's daily minutes, rounded up. Change the budget with **Daily time** in
the footer and every topic's length is recomputed; the footer also shows hours left per track.

Where the estimates come from:

- **Python for DSA** (the first section of the DSA track): measured from the lessons on the Learn
  site: reading time, runnable examples, and 10/15/20 minutes per practice exercise for
  Beginner/Intermediate/Advanced topics.
- **Striver A2Z**: 20 / 45 / 75 minutes for Easy / Medium / Hard (12 / 30 / 50 in "Learn the
  basics"). That's for someone relearning DSA in Python, including watching the explanation for new
  concepts.
- **Interview prep**: 20 / 35 / 50 minutes for Easy / Medium / Hard: reading the lesson plus
  practising the answer out loud until you can give it cold.

Totals at the default budget: DSA track about 384 hours (Python 31 + A2Z 353), interview prep about
201 hours (High leverage about 89). At 80 + 40 minutes a day, each track takes about 310–325 days:
roughly 10–11 months for everything, with both tracks finishing at about the same time.

Inside a topic, items are spread across its days in proportion to their minutes, so a run of long
items takes more calendar than a run of short ones. `-` and `+` still add or remove days by hand.

## Upgrading a saved plan

The plan is saved in the browser. When the built-in plan changes (new items, the Python section,
estimates), it carries a version number; on first load after an update, the saved plan is upgraded
in place: matching topics keep their items, statuses, dates and extra days, items gain estimates,
new built-in items and topics are added, and topics you imported yourself are kept.

## Backing up

Progress is per-browser and does not sync between devices. **Backup** gives you the whole
state as JSON to copy or download, plus a box to paste one back. Do this before clearing
browser data.

## Notes

JSX is compiled ahead of time to plain `React.createElement` calls, so there is no Babel
and no build step — the page only pulls React and ReactDOM from unpkg.com. It needs a
connection on first load and says so plainly if the CDN is blocked, rather than showing a
blank screen.
## Learn

`learn/` is a separate lesson site (Python for DSA, then the interview-prep topics) with
in-browser Python exercises, linked from the tracker's **Learn** button and served at
`/learn/`. See `learn/README.md`.
