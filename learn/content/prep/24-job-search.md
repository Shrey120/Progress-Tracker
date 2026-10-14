---
course: prep
module: job-search-and-offers
title: Job search and offers
order: 110
---
=== lesson: how-product-company-interview-loops-work | How product company interview loops work
Knowing the process lets you prepare for each round deliberately. A typical loop for a full-stack or SDE-2 role (2–5 years):

| Round | What it tests | Prepare with |
|---|---|---|
| Recruiter / HR screen | fit, notice period, expectations, communication | your pitch, "why are you leaving", target range |
| Online assessment (OA) | 2–3 DSA problems in 60–90 minutes (HackerRank, CodeSignal) | Striver sheet, timed practice, stdin parsing |
| DSA / problem solving (1–2 rounds) | arrays, strings, hashing, trees, graphs, DP; talking through the approach | Python course + sheet; explain before coding |
| **Machine coding** (frontend/full-stack) | build a working UI feature in 60–120 minutes | the Machine coding topic |
| **Low-level design** | classes, interfaces, patterns for a small system | the LLD topic |
| **High-level / system design** | scalable architecture, trade-offs | System design topic (lighter depth for 2–3 years) |
| Tech deep dive / project round | your past work, decisions, debugging | "Walking through a project you built" |
| Hiring manager / behavioural | ownership, conflict, collaboration, remote work | Behavioural topic, STAR stories |
| Bar raiser (some companies) | a senior engineer cross-checks the overall level | all of the above |

## Variations

- **Service companies and startups**: fewer rounds, more stack questions (React, Node, SQL), often a take-home assignment.
- **Remote-first international companies**: take-home projects or paid trials, pair programming, heavy weight on written communication and async work, time-zone overlap.
- **Big tech**: more DSA and system design, standardised levels and bands.

## Your levers

Ask the recruiter for the exact rounds and what each focuses on (they usually tell you), schedule the companies you care most about **after** a few practice interviews, and keep a log of every question asked so you can close gaps.

=== lesson: resume-for-product-and-remote-roles | A resume for product and remote roles
Recruiters skim a resume in seconds. It has one job: get you the first interview.

## Structure (one page for under ~6 years)

1. **Header**: name, email, phone, city (and "open to remote"), LinkedIn, GitHub, portfolio.
2. **Summary** (optional, 2 lines): "Full-stack developer (Next.js, TypeScript, Node, Postgres) with 2 years shipping client products end to end."
3. **Experience**: company, title, dates; 3–5 bullets each.
4. **Projects**: 2–3 strong ones with links (live demo + code).
5. **Skills**: grouped (Languages / Frontend / Backend / Data / Cloud & tools), only what you can discuss.
6. Education.

## Bullets that work: action + what + impact

| Weak | Strong |
|---|---|
| Worked on React frontend | Built the booking flow in Next.js and TypeScript, cutting checkout drop-off from 38% to 22% |
| Responsible for APIs | Designed 25 REST endpoints in Node/Postgres with idempotent payment webhooks, eliminating duplicate orders |
| Used Docker | Containerised 3 services and set up GitHub Actions CI/CD, reducing deploy time from 40 to 6 minutes |

Numbers don't need to be perfect, but they must be honest and explainable: interviewers will ask.

## Details that matter

- Tailor the top third (summary, first bullets, skills order) to each role's stack and keywords; many companies filter with an ATS.
- Simple single-column layout, PDF, readable fonts; no photos, ratings bars or graphics (ATS parsers choke on them).
- Show **ownership** if you've been the sole developer on projects: that's a strength for startups and remote roles.
- Link to things that work: a deployed project with a clean README beats ten unfinished repos.
- Get it reviewed by an engineer at your target companies.

=== lesson: where-to-find-remote-and-high-paying-roles | Where to find remote and high-paying roles
Cast a wide net, but put most energy into the channels with the best hit rate.

## Channels, roughly by effectiveness

1. **Referrals** (next lesson): the highest response rate by far.
2. **Direct outreach** to hiring managers and engineers at companies you want.
3. **LinkedIn**: jobs with filters (Remote, India), and an optimised profile so recruiters find you ("Open to work" visible to recruiters, headline with your stack).
4. **India-focused platforms** with salary transparency: Wellfound (AngelList Talent), Instahyre, Cutshort, Hirist, and company career pages.
5. **Remote boards**: We Work Remotely, Remote OK, Remotive, Working Nomads, Himalayas, and "Who's hiring" threads (Hacker News monthly).
6. **Talent marketplaces** connecting Indian developers with foreign companies (Turing, Uplers, Toptal, Arc and similar): vetting tests, then matching.
7. Communities: Twitter/X and LinkedIn tech circles, Discord/Slack groups, meetups and conferences.

## Where the higher packages tend to be

Product companies and well-funded startups, global companies with India engineering centres (GCCs), and international remote-first companies paying in foreign currency. Research ranges on levels.fyi, Glassdoor, AmbitionBox and Blind before you talk numbers.

## Run it like a project

Track every application in a sheet (company, role, channel, date, stage, next step), aim for a steady pipeline (10–15 thoughtful applications a week beats 100 one-click ones), and follow up politely after a week.

=== lesson: referrals-and-outreach | Referrals and outreach
A referral moves your resume from a pile of thousands to a short list. Most people are happy to refer: many companies pay referral bonuses.

## Asking for a referral

1. Find engineers at the company (LinkedIn search: company + "software engineer"; alumni from your college; past colleagues).
2. Send a short, specific message:

> "Hi Priya, I'm a full-stack developer (Next.js, Node, Postgres, 2 years). I saw the SDE-2 role on your platform team (job ID 4821) and it matches what I've built: [one line of proof, with a link]. Would you be open to referring me? I've attached my resume; happy to answer anything first. Thanks either way!"

3. Make it easy: the job link/ID, your resume, a two-line summary they can paste.
4. Follow up once after a week. Thank them whatever happens.

## Cold outreach to hiring managers

Short, specific, about **their** problem: reference their product or a recent launch, show one relevant thing you've built, ask for a conversation. Engineering managers at startups often reply when the message shows genuine interest and proof of work.

## Build the network before you need it

Comment thoughtfully on engineers' posts, share what you're building and learning (this tracker and learning site are good material), help others; relationships make referrals natural rather than transactional.

=== lesson: understanding-ctc-fixed-variable-esops-joining-bonus | Understanding CTC: fixed, variable, ESOPs, joining bonus
In India, offers quote **CTC** (cost to company): everything the employer spends on you per year. Your **in-hand** salary can be much lower.

## Typical CTC components

| Component | Notes |
|---|---|
| **Base / fixed salary** | basic + HRA + special allowance; the part that matters most |
| Employer PF | usually 12% of basic; goes to your provident fund, not your bank account |
| Gratuity | about 4.8% of basic; paid only if you stay 5+ years |
| Insurance | health/life premiums the employer pays |
| **Variable / performance bonus** | 5–20% of CTC; may pay out at less than 100% |
| **Joining / signing bonus** | one-time; often clawed back if you leave within 12 months |
| Relocation, retention bonuses | one-time or conditional |
| **ESOPs / RSUs** | equity, vesting over years (see below) |

Ask for the breakup and compare offers on **fixed cash** first, then guaranteed one-time amounts, then expected variable, then equity.

## Equity

- **RSUs** (listed companies): shares granted over a vesting schedule (often 4 years, sometimes with a 1-year cliff); taxed as income when they vest; real market value.
- **ESOPs** (startups): the option to buy shares at a fixed strike price later; valuable only if the company grows and there's a liquidity event (buyback, acquisition, IPO). Ask: number of options, strike price, current valuation, vesting, exercise window after leaving, and any past buybacks.

## Foreign remote offers

- Paid through an **employer of record** (Deel, Remote, Oyster): you're a regular Indian employee of the EOR, with salary, PF and TDS.
- Or as an **independent contractor**: you invoice in foreign currency, handle your own taxes (the presumptive scheme for professionals is often used), and get no PF, gratuity or paid leave unless negotiated, so the number must be higher to compare fairly.

Tax rules change every budget: use a current salary calculator and talk to a chartered accountant for contractor setups. This lesson explains structure, not tax advice.

=== lesson: negotiating-an-offer | Negotiating an offer
Negotiation is expected; companies budget for it. Done politely, it doesn't put offers at risk.

## Before

- **Know your market**: levels.fyi, AmbitionBox, Glassdoor, Blind, and people in similar roles. Know the band for the level.
- **Avoid giving a number first** where you can: "I'm focused on the right role; I'm sure we can agree on a fair number. What's the budgeted range?" If pressed, give a researched range whose bottom you'd be happy with.
- In India, recruiters often ask current CTC; you can answer, but steer to expectations based on the role and market rather than a percentage hike on your current salary.

## Getting leverage

The strongest lever is **another offer** (or an interview process at a late stage). Time your processes so offers land close together. Being well prepared for interviews (to clear at a higher level) matters more than any negotiation tactic: **level determines band**.

## The conversation

- Thank them and show enthusiasm first.
- Ask for time to review (2–3 days is normal) and the full breakup in writing.
- Make one clear, reasoned ask: "Based on the role's scope and another offer I have at ₹X fixed, I'd be ready to sign today at ₹Y fixed."
- Negotiate the **fixed** component first; then joining bonus (to cover a lost bonus or notice buyout), equity, level/title, notice-period buyout, remote setup, start date.
- Get the final offer in writing before resigning.

## Don't

Bluff about offers you don't have, accept verbally and keep shopping, or negotiate aggressively after saying a number was fine.

=== lesson: notice-period-and-resignation | Notice period and resignation
Indian companies commonly have **30–90 day** notice periods, which affects how employers view you.

## While interviewing

- Many companies prefer candidates who can join within 30 days; a 90-day notice period loses some opportunities. Ask your company whether early release or a **buyout** (paying salary in lieu of notice) is possible, and whether the new employer will cover it.
- Be honest about your notice period from the first call.
- Some candidates resign before having an offer to shorten the wait; it's risky without savings and multiple active processes.

## Resigning well

1. Signed offer in hand (and background verification started) before resigning.
2. Tell your manager in person or on a call first, then send a short formal email with your last working day.
3. Keep it positive; no need to justify in detail or criticise.
4. Counter-offers: decide in advance. If the reasons you started looking were more than money, they usually remain.
5. Hand over properly: documentation, knowledge transfer, finishing or transferring work. Your reputation and references outlast the job.
6. Collect relieving letter, experience letter, final settlement, and Form 16; transfer your PF (UAN stays the same).

=== lesson: portfolio-and-proof-of-work | Portfolio and proof of work
For a developer without big-brand experience, visible work is the most convincing evidence.

## What counts

- **Deployed projects** with real complexity: auth, a database, payments or third-party APIs, background jobs, tests, CI/CD. Two strong projects beat ten tutorials.
- **Good READMEs**: what it is, screenshots or a demo video, architecture diagram, stack and why, how to run it, what you'd improve.
- **Clean commit history** and tests: interviewers do look.
- **Writing**: short posts on problems you solved ("How I fixed duplicate orders from payment webhooks"). Shows communication, which remote companies value highly.
- Open-source contributions, even small ones (docs, bug fixes) to libraries you use.

## Your existing material

Projects like a multi-source fitness dashboard (WHOOP + Lyfta + smart scale), a stock portfolio tracker with Zerodha sync, a self-built interview tracker and a learning site with in-browser Python are the kind of real, end-to-end work interviewers like discussing. Make sure each has a live link (or demo video), a README with the architecture, and that you can explain every decision.

## Profiles

GitHub profile README pinning your best work, LinkedIn headline with your stack and "open to remote", and a simple personal site linking everything.

=== lesson: interview-practice-and-mock-interviews | Interview practice and mock interviews
Interviewing is a skill separate from engineering. Practise the format, not only the content.

## How to practise

- **Mock interviews** with peers or platforms (Pramp-style peer platforms, paid mocks with engineers at target companies). Ask for blunt feedback.
- **Talk out loud** while solving DSA problems, even alone: clarify, propose a brute force, optimise, code, test with examples, state complexity.
- **Time yourself**: 20–25 minutes for a medium problem; 60–90 for a machine coding task.
- **Record yourself** answering behavioural questions; cut the rambling.
- **Apply to a few lower-priority companies first** as real practice.

## After every interview

Write down every question and how you did within an hour, then fill the gaps. Patterns appear fast: maybe you freeze on graphs, or your project explanation runs long.

## On the day

Test your setup (camera, mic, editor, screen sharing) 30 minutes early, keep water and a notepad nearby, ask clarifying questions, think aloud, and if stuck, say what you're considering. Interviewers can only give you credit for reasoning they hear.
