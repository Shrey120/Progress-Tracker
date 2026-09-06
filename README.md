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
topics, 473 problems, each with its real title and difficulty.

The official total is 474. One problem in "Learn the basics" didn't extract — the page's
intro paragraph occupied the row where its title should have been. Every other section
matches its official count exactly. Add the missing one from the sheet using the
"Add a problem" row inside any topic.

**Interview prep** — 7 sections, 23 topics, 224 items: language fundamentals, frontend,
backend & data, CS fundamentals, design, engineering practice, job hunt.

## Views

**Module** — three levels. A section (e.g. Dynamic Programming) opens to its topics
(1D DP, DP on Strings…), and a topic opens to its problems. `–` and `+` change a topic's
length; later topics *in the same track* shift to match, so DSA and prep stay independent.
Search matches sections, topics and problem titles, and auto-expands to the hits.

**Kanban Flow** — every problem as backlog / in progress / completed cards.

**Calendar** — green means you finished something that day, red means a scheduled day
passed with nothing done, outlined is today.

**Progress** — a segmented ring split by Easy / Medium / Hard, bars for each, your average
per active day and days remaining at that pace, then a section-by-section breakdown.

## Import format

`##` starts a section, `#` starts a topic, everything else is a problem. Difficulty comes
after the last `|` and is optional — titles containing `|` are handled correctly.

```
## Dynamic Programming
# 1D DP
Climbing stairs | Medium
Frog Jump | Medium

# DP on Strings
Edit distance | Hard
```

**Merge** matches on section + topic name and skips duplicate titles, so you can import
one section at a time. **Replace** wipes that track first.

`a2z-import.txt` in this repo is the full A2Z sheet in this format, if you ever need to
reload it.

## Re-extracting the sheet

If Striver updates the sheet, open it, expand everything, and run the extractor script in
the browser console — see the repo history or ask for it again. Output pastes straight
into Import.

## Backing up

Progress is per-browser and does not sync between devices. **Backup** gives you the whole
state as JSON to copy or download, plus a box to paste one back. Do this before clearing
browser data.

## Notes

JSX is compiled ahead of time to plain `React.createElement` calls, so there is no Babel
and no build step — the page only pulls React and ReactDOM from unpkg.com. It needs a
connection on first load and says so plainly if the CDN is blocked, rather than showing a
blank screen.