---
course: prep
module: behavioural-and-remote
title: Behavioural and remote
order: 109
---
=== lesson: star-method | The STAR method
Behavioural questions ("tell me about a time…") are scored on structure and evidence. **STAR** gives you both.

> The example stories in this topic are **made up** to show structure. Interviewers probe details with follow-up questions, so only ever tell real stories from your own work. Use the examples as templates for yours.

- **Situation** — the context, in one or two sentences. Team, product, what was at stake.
- **Task** — what **you** were responsible for.
- **Action** — what **you** did, step by step. This is most of the answer (about 60%). Say "I", not "we".
- **Result** — the outcome, with numbers where possible, and what you learned.

## Example skeleton

> **S**: "At EitBiz I was the only developer on a client's booking platform, and checkout was failing for about 8% of payments."
> **T**: "I owned finding the cause and fixing it before the client's sale weekend."
> **A**: "I added structured logging around the payment flow, found that webhook retries were creating duplicate orders that then failed validation, added idempotency keys keyed on the gateway's payment ID, and wrote a backfill to reconcile the affected orders."
> **R**: "Failures dropped to under 0.5%, we recovered about ₹X in stuck payments, and I added the idempotency pattern to our project template."

## Prepare a story bank

Write 6–8 real stories now, each usable for several questions: a hard bug, a production incident, a disagreement, a trade-off, a deadline you missed, feedback you received, something you led or mentored, a project you're proud of. Keep each to about 2 minutes spoken. Practise out loud.

## Habits that score well

Specifics over generalities, honest about mistakes, show reflection ("next time I'd…"), and connect it to the role you're interviewing for.

=== lesson: walking-through-a-project-you-built | Walking through a project you built
"Tell me about a project you're proud of" or "Walk me through the architecture of your last project" opens most interviews. It's your best chance to steer the conversation onto ground you know well, so prepare it like a talk.

## A structure that works (5–7 minutes)

1. **What it is and who uses it** — one sentence. "A booking platform for a car-service garage: customers book slots, staff manage the workshop schedule."
2. **Your role** — solo, lead, one of four. Be precise about what **you** built.
3. **Architecture** — draw it if there's a whiteboard: client (Next.js), API (route handlers / Node), database (Postgres via Supabase), auth, payments, background jobs, hosting (Vercel), third-party services.
4. **One or two hard problems**, in depth: what was hard, options considered, what you chose, the result in numbers.
5. **What you'd change** now, and what you learned.

## Be ready for drill-down questions

- Why this database / framework / hosting?
- How does auth work, end to end? Where are tokens stored?
- What happens when two users book the same slot at the same time? (transactions, unique constraints)
- How did you deploy it? How do you roll back?
- How did you test it? How do you know when it breaks in production?
- What would break first at 100× the users?
- What did you use AI for while building it?

If you can't answer one, say what you'd check. Inventing details is the fastest way to lose credibility, since interviewers keep asking "why" until they reach the bottom.

## Prepare two projects

One deep (your strongest, most complex) and one different (another stack or a personal project like this tracker, the WHOOP + Lyfta coach, or the portfolio tracker). For each, write the architecture, three hard problems, three numbers, and three things you'd change.

=== lesson: a-hard-bug-you-debugged | A hard bug you debugged
Interviewers use this to see how you think: hypotheses, evidence, narrowing down, and persistence.

## What a strong answer shows

1. **The symptom** and why it was hard (intermittent, only in production, no error message, spanning systems).
2. **Your method**: reproduce it, gather evidence (logs, traces, metrics), form hypotheses, test them one at a time, narrow the search (bisecting commits, disabling parts).
3. **The root cause**, explained simply enough for a non-specialist.
4. **The fix**, and how you verified it.
5. **Prevention**: a test, monitoring, a lint rule, documentation.

## Example outline

> "Users occasionally saw another user's name in the header for a second after logging in. It only happened under load, so I couldn't reproduce it locally. I added request IDs to logs and found the wrong name always came from responses served by our CDN. The `/api/me` response didn't set `Cache-Control: private`, and the CDN cached it for a few seconds when a cookie header was missing on one request path. I fixed the headers, purged the cache, and added a test that checks every authenticated endpoint sends `private, no-store`. It taught me to treat caching headers as part of the API contract."

Pick a bug where **you** did the investigating, and where the technique is interesting (not just "it was a typo").

=== lesson: a-production-incident-you-caused-or-fixed | A production incident you caused or fixed
They're checking ownership, calm under pressure, and whether you learn systematically.

## Structure (it mirrors a postmortem)

1. **Impact**: what broke, for whom, for how long.
2. **Detection**: how it was noticed (an alert, or a customer, which is itself a lesson).
3. **Response**: how you stabilised first (rollback, feature flag off, scale up) before investigating.
4. **Root cause**: technical cause and the contributing factors (no review, missing test, risky deploy process).
5. **Follow-ups**: the changes that make this class of incident less likely, and communication with stakeholders.

## If you caused it

Own it plainly. "I deployed a migration that locked the orders table for 4 minutes during peak." Then focus on what you did and changed. Blameless culture means the process gets fixed, not that nobody was involved. Interviewers like candidates who have caused an incident and handled it well; it shows real production experience.

## Phrases that land

"I rolled back first and investigated second." "I posted updates every 15 minutes in the incident channel." "The fix was 2 lines; the follow-up was making that whole category impossible."

=== lesson: a-technical-trade-off-you-made | A technical trade-off you made
Senior signals: you saw options, weighed costs against the context, decided, and later evaluated the decision.

## Structure

1. **The decision** and its constraints (deadline, team size, scale, budget).
2. **The options** you considered (at least two, realistically).
3. **The criteria**: what mattered most here, and why.
4. **The choice** and what you knowingly gave up.
5. **The outcome**: did it hold up? What would you change?

## Example outline

> "For a client dashboard, I had to choose between building our own charting with D3 or using a library like Recharts. D3 would have matched the designs exactly; Recharts would cover 90% of them in a fraction of the time. With a three-week deadline and me as the only developer, I chose Recharts, agreed with the designer which two charts would be simplified, and wrapped the library in our own components so we could swap it later. We shipped on time; six months later we replaced one chart with custom D3 without touching the pages."

Other good topics: SSR vs SPA, Postgres vs MongoDB, a monolith vs splitting a service, building vs buying (auth, payments), tech debt now vs later.

=== lesson: how-you-use-ai-tools-in-your-work | How you use AI tools in your work
Since 2025, many interviews include some version of: "How do you use AI in your daily work? What does it help with? Where do you still write things yourself?" Some companies now run AI-assisted coding rounds. They're testing **judgement**, not whether you use AI.

## What a strong answer covers

- **Specific uses**, with tools: "Claude / Copilot / Cursor for boilerplate, tests, unfamiliar APIs, refactors across files, explaining legacy code, first drafts of docs and SQL."
- **Where you don't rely on it**: core business logic you need to fully understand, security-sensitive code, performance-critical paths, and anything you can't verify.
- **How you verify**: you read every line, run it, write or run tests, check the docs for APIs it used (it invents functions and options), and review it like a junior's pull request.
- **Context management**: giving it the right files, constraints and examples; breaking work into small steps.
- **Data care**: not pasting secrets or client code into tools your company hasn't approved.
- **Impact**, honestly: "It roughly halves the time on CRUD and tests; it doesn't help much on debugging production issues, where I need to reason about our system."

## Example answer

> "I use AI daily, mainly Claude and Copilot. It's best for scaffolding, writing tests, converting between formats and explaining code I haven't seen. For anything going to production I treat its output as a draft: I read it line by line, run the tests, and check any library call against the docs, because it sometimes uses APIs that don't exist. I don't use it for auth or payment logic without fully understanding every line. I also use it to learn: asking it to explain an unfamiliar concept, then confirming in the docs."

## In an AI-allowed coding round

Narrate your choices: what you ask for and why, what you accept, what you reject. Interviewers watch whether you can catch its mistakes and keep ownership of the design.

=== lesson: a-time-ai-generated-code-was-wrong | A time AI-generated code was wrong
A newer behavioural question: "Walk me through a time AI-generated code failed or was wrong, and how you found it." It checks that you verify output and learn from it.

## Structure (STAR)

- **Situation**: what you were building and what you asked the AI for.
- **What was wrong**: be specific. Common real examples: a library method that doesn't exist or belongs to an older version; a query missing a tenant filter (a data leak); an off-by-one in pagination; no error handling around a network call; a race condition; a test that asserted the wrong thing and passed anyway.
- **How you caught it**: a failing test, code review, reading the docs, testing an edge case, a production alert.
- **The fix**, and **what you changed** in how you work: added tests first, more context in prompts, a review checklist, never accepting changes to auth code without a full read.

## Example outline

> "I asked an AI assistant to add cursor pagination to an orders endpoint. The code looked right and the happy-path test passed. When I tested with two orders created in the same second, one was skipped: it paginated on `created_at` alone, without a unique tiebreaker. I added `id` to the sort and the cursor, plus a test with duplicate timestamps. Since then, I write the edge-case tests before accepting generated code for anything involving ordering, money or permissions."

Pick a real story from your own work, with a concrete bug. Interviewers will ask follow-ups.

=== lesson: disagreeing-with-a-manager-or-teammate | Disagreeing with a manager or teammate
They're looking for: you speak up with evidence, you listen and might be wrong, you keep the relationship, and you commit once a decision is made.

## Structure

1. What you disagreed about and **why it mattered**.
2. How you raised it: privately or in the right forum, with data, focusing on the problem not the person.
3. How you understood their view ("I asked what constraints they were working with").
4. How it was resolved: you persuaded them, they persuaded you, or you **disagreed and committed**.
5. The outcome and the relationship afterwards.

## Example outline

> "My lead wanted to ship a feature without the database index I thought it needed. Instead of arguing in standup, I ran the query against a copy of production data and showed it took 4 seconds at current volume and would grow. He was worried the index migration would delay the release, so we agreed on creating it concurrently in a separate deploy the same day. It went out on time, and he later asked me to add query checks to our PR template."

Avoid stories where you were simply right and the other person was foolish, or where you complied silently and things went wrong.

=== lesson: receiving-critical-feedback | Receiving critical feedback
Shows self-awareness and growth.

## Structure

1. The feedback, quoted honestly, and who gave it.
2. Your first reaction (it's fine to admit it stung).
3. What you did with it: specific changes.
4. Evidence it worked.

## Example outline

> "A senior reviewer told me my pull requests were hard to review: huge, mixing refactors with features, with no description. My first reaction was defensive, because the code worked. But I looked at my last ten PRs and he was right: the average was over 900 lines. I started splitting work into stacked PRs under 300 lines, writing a description with context and screenshots, and separating refactors. Review time on my PRs dropped from days to hours, and that reviewer later asked me to write our PR guidelines."

Good topics: communication, estimation, code quality, asking for help earlier, documentation. Avoid fake weaknesses ("I work too hard").

=== lesson: missed-deadline | A missed deadline
Everyone misses deadlines. They want to see early communication, honest scoping and learning.

## Structure

1. The commitment and what made it slip (unknowns, scope growth, dependencies, your estimate).
2. **When** you realised and **how fast** you told people. Raising risk early is the key behaviour.
3. Options you offered: cut scope, add time, phase the release.
4. Outcome and what you changed in how you plan.

## Example outline

> "I estimated a payment-gateway integration at a week. Two days in, I found the gateway's sandbox didn't support the refund flow we needed. I told the client that day, laid out two options: launch without in-app refunds (handled manually for a month) or slip a week. They chose the first. We launched on the original date, and I now spend the first day of any third-party integration building a throwaway spike to surface surprises before I commit to a date."

=== lesson: why-you-are-leaving | Why you are leaving
Keep it positive, brief, forward-looking, and true.

## Good framing

Talk about what you're moving **towards**: scale, product ownership, a stronger engineering team, specific technologies, remote collaboration with a distributed team. Not what you're escaping.

> "I've spent almost two years at EitBiz building full-stack projects for clients, often as the only developer, which taught me to own things end to end. I'm now looking for a product company where I can work on one product over time, with experienced engineers to learn from and real scale problems. This role's focus on [their product area] is exactly that."

## Avoid

Criticising your current employer or manager, leading with money (fine to discuss compensation when asked; just not as your reason), or vague answers that suggest you'll leave them quickly too.

=== lesson: mentoring | Mentoring
Even without a formal lead title, show that you make others better.

## What counts

Onboarding a new hire, pairing on a hard problem, thorough and kind code reviews, writing docs or a starter template, explaining a concept in a team session, helping a client's team take over a codebase.

## Structure

1. Who you helped and where they were stuck.
2. How you helped, adapted to them (pairing vs letting them struggle productively, asking questions vs giving answers).
3. Their growth, with evidence.
4. What you learned about teaching.

> "When an intern joined, I paired with him for the first week, then switched to giving him small, well-defined tickets and reviewing within the hour. I wrote a setup guide from his questions. By the end of the month he shipped a feature alone, and the guide cut the next person's setup from two days to two hours."

=== lesson: conflict-escalation-stories | Conflict escalation stories
Some conflicts can't be solved between two people: priorities clash across teams, a client demands something unsafe, or someone's behaviour is a problem.

## What they want to see

- You tried to resolve it directly first.
- You escalated with facts and options, not complaints.
- You chose the right person and channel.
- You stayed professional and kept working.

## Example outline

> "A client's product owner kept asking us to skip testing to hit dates, after two releases had already caused bugs. I raised it with him directly, with the bug reports and the cost of fixing them. When that didn't change anything, I wrote a short summary for my manager with two options: fixed scope with testing, or a reduced scope on the same date. My manager brought it to the client's director; they chose reduced scope. Releases were clean after that and the relationship improved."

=== lesson: async-communication-practice | Async communication practice
Remote teams depend on writing. Interviewers for remote roles ask how you work when people aren't online at the same time.

## What good async looks like

- **Messages that stand alone**: context, the question, what you've tried, what you need and by when. "Hi, quick question?" and waiting is the anti-pattern.
- **Decisions written down** where people will find them (the ticket, a doc), not only in a call.
- **Proactive updates**: a short end-of-day note on progress, blockers and next steps.
- **Default to public channels** so answers help others and are searchable.
- Use sync time (calls) for what needs it: complex disagreements, brainstorming, relationships. Then summarise in writing.

## Example message

> "Checkout PR #482 is ready for review. It adds idempotency keys to payment creation (context: duplicate orders on retries, see INC-12). Main thing to check: the migration adds a unique index concurrently, so it's safe to deploy anytime. I'm offline after 7 pm IST; if anything blocks merging, comment on the PR and I'll pick it up first thing tomorrow."

> **"How do you work effectively remotely?"** Over-communicate in writing, make status visible without being asked, document decisions, protect overlap hours for things that need real-time discussion, and be reliably responsive within agreed windows.

=== lesson: timezone-overlap-handoff-answer | Timezone overlap and handoffs
For international remote roles from India, expect: "Our team is in the US/EU. How will you handle the time difference?"

## A strong answer has specifics

- **Overlap you'll commit to**: e.g. "I can reliably overlap 3–4 hours with EU time, or 2–3 hours with US East Coast mornings by shifting my day later."
- **How you make overlap count**: use it for unblocking, reviews and discussions; do focused work outside it.
- **Handoffs**: end your day with a written status (what's done, what's blocked, what you need), so their morning starts with answers, not questions.
- **Unblocking yourself**: when you're stuck and others are asleep, switch to another task, make a reasonable decision and document it, or prepare options for them to choose.
- **Evidence**: any past work with clients or teams in other time zones.

> "I've worked with clients in other time zones, so I already work this way: I keep 3–4 hours of overlap with the team's morning, finish each day with a written handoff in the ticket, and plan my work so I always have something unblocked to pick up when I'm waiting on an answer."

=== lesson: written-communication-in-prs-and-docs | Written communication in PRs and docs
In remote teams, writing **is** most of your visibility. Some companies use written exercises or ask to see a design doc you wrote.

## A good pull request description

```
## What
Adds cursor pagination to GET /orders (replaces offset).

## Why
Page 200+ took >3 s because OFFSET scans skipped rows (see #351).

## How
- (created_at, id) keyset with an opaque base64 cursor
- New composite index, created CONCURRENTLY in migration 0042
- `offset` still accepted for 30 days, logs a deprecation warning

## Testing
- Unit tests for cursor encoding; integration test paging through 1,000 rows with concurrent inserts
- p95 on staging: 3.2 s → 45 ms

## Risk / rollout
Migration is online-safe. Mobile app v4.2+ already sends cursors.
```

Plus: small PRs, screenshots for UI changes, review your own diff first, and reply to every review comment.

## A design doc

Context and problem, goals and non-goals, the proposed design, alternatives considered and why not, risks, rollout and migration, open questions. One to three pages. Write for someone who joins in six months.

## General writing habits

Lead with the conclusion, short paragraphs, specific numbers, define acronyms, and cut words. "What do I need the reader to know or do?"
