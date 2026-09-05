# Prep Tracker

A study tracker for a two-track plan: DSA problems and interview-prep topics, each on its
own schedule. One HTML file, no build step, no backend.

## Run it

Open `index.html`. That's all it needs.

To serve locally: `python3 -m http.server 8000`

## Deploy

Push the repo, then Settings → Pages → source `main` / root.
Live at `https://<username>.github.io/<repo>/`.

## Loading your problems

The starter plan is a placeholder. Replace it with your real list through
**Import problems** in the top right.

Format — a `#` line starts a topic, every other line is a problem, difficulty after a pipe:

```
# Arrays
Largest element in array | Easy
Second largest element | Easy
Longest subarray with sum K | Medium
Maximum product subarray | Hard

# Binary Search
Search in rotated sorted array | Medium
Koko eating bananas
```

Difficulty is optional and accepts `Easy` / `E` / `easy`, same for Medium and Hard.
Lines with no pipe just get no difficulty tag.

**Merge** adds to topics that already exist by name and skips duplicate problem titles,
so you can import one topic at a time as you work through your list.
**Replace** wipes that track first.

Each imported topic gets roughly one day per two problems, minimum two days. Adjust after
importing with the `–` and `+` controls on each row.

## Views

**Module** — topics with date ranges and checklists. Clicking a checkbox cycles
backlog → in progress → done → backlog. `–` and `+` change a topic's length and later
topics *in the same track* shift to match, so DSA and prep stay independent.
Filter by track, by difficulty, by revision flag, or search across every problem.

**Kanban Flow** — the same problems as backlog / in progress / completed columns.

**Calendar** — green means you finished something that day, red means a scheduled day
passed with nothing marked done, outlined is today.

The `★` on each problem flags it for revision. The count sits in the header and the
★ Revision filter pulls up every flagged problem across all topics.

## Backing up

Progress lives in this browser only — it will not sync between your laptop and phone.
**Backup** gives you the full state as JSON to copy or download, and a box to paste one
back in. Do this before clearing browser data.

## Editing the starter plan

`SEED` near the top of the script holds the default topics:

```js
{track:'dsa', name:'Arrays', days:12, items:[['Two-sum family','Medium'], ...]}
```

`track` is `'dsa'` or `'prep'`. Edits to `SEED` only apply to a fresh plan — use
**Reset everything** afterward, or just import instead.

## Notes

React and Babel load from a CDN and JSX is transpiled in the browser, which costs a few
hundred milliseconds on load in exchange for zero build tooling. The tree is already split
into `Header`, `ModuleView`, `BoardView`, `CalendarView` and the modals, so moving it to
Vite later is mostly mechanical.
