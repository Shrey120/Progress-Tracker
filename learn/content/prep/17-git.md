---
course: prep
module: git-and-workflow
title: Git and workflow
order: 117
---
=== lesson: git-fundamentals-working-tree-staging-commits-head | Git fundamentals: working tree, staging, commits, HEAD
Git is a **distributed version control system**: every clone has the full history, and most operations are local. GitHub/GitLab host shared copies (remotes) and add pull requests, issues and CI.

## The three areas

```text
working tree  ──git add──▶  staging area (index)  ──git commit──▶  repository (.git: commits)
   (your files)               (what goes in the next commit)          (history)
```

- **Working tree**: the files you edit.
- **Staging area / index**: a draft of the next commit. `git add -p` stages part of a file, which makes focused commits.
- **Commit**: a snapshot of the whole project plus metadata (author, message, parent commit(s)), identified by a SHA hash. Commits form a graph; history can't change without changing hashes.

## Branches and HEAD

- A **branch** is just a movable pointer (a name) to a commit. Creating one is instant.
- **HEAD** points to what you have checked out, usually a branch. Committing moves the current branch forward.

```bash
git status                       # what changed, what's staged
git add src/api.ts && git commit -m "fix: handle empty cart"
git log --oneline --graph --all  # see the commit graph
git switch -c feat/search        # new branch from here
git diff / git diff --staged     # unstaged / staged changes
```

## What interviewers want

> "Git stores snapshots as commits linked to their parents. A branch is a pointer to a commit and HEAD is what I'm on. I stage exactly what belongs together, commit with a clear message, and push to share."

=== lesson: remotes-fetch-vs-pull-push-origin-upstream-forks | Remotes: fetch vs pull, push, origin, upstream, forks
A **remote** is another copy of the repository, usually on GitHub. `origin` is the default name for the one you cloned from.

| Command | Does |
|---|---|
| `git fetch` | download new commits and branches from the remote; **doesn't change your files** (updates `origin/main`) |
| `git pull` | `fetch` + integrate into your current branch (merge by default, or rebase with `--rebase`) |
| `git push` | upload your commits to the remote branch |
| `git push -u origin feat/x` | push and set the upstream (tracking) branch |

`fetch` is always safe: it lets you look before integrating (`git log main..origin/main`). Many developers set `git config --global pull.rebase true` to avoid noisy merge commits.

## Forks and upstream

For open source (or no write access), you **fork** the repository to your account, clone your fork (`origin`), and add the original as `upstream`:

```bash
git remote add upstream https://github.com/org/project.git
git fetch upstream && git rebase upstream/main     # keep your fork current
```

## Push rejected?

"Updates were rejected because the remote contains work that you do not have": someone pushed first. `git pull --rebase`, resolve conflicts, push again. Never `push --force` to shared branches; on your own branch use `--force-with-lease`, which refuses if someone else pushed in the meantime.

=== lesson: branching-strategy | Branching strategy
How a team organises branches.

| Strategy | How | Fits |
|---|---|---|
| **Trunk-based** | short-lived branches (hours–2 days) merged to `main` often; incomplete work behind feature flags; `main` always deployable | CI/CD, web apps, most modern teams |
| **GitHub flow** | branch from `main` → PR → review → merge → deploy | very similar; simple |
| **Git flow** | `main`, `develop`, feature, release and hotfix branches | versioned releases (mobile apps, installed software); heavy for web |
| Release branches | cut `release/2.4` for stabilisation while `main` moves on | apps with release trains |

## Practices that matter more than the model

- **Small PRs** merged quickly: fewer conflicts, faster reviews.
- **Protected `main`**: required reviews and passing CI, no direct pushes.
- Clear branch names: `feat/search-filters`, `fix/cart-total-rounding`.
- Delete branches after merging.
- Long-lived feature branches are where merge pain comes from; use feature flags instead.

> "We used trunk-based development: short branches, PR review with required CI, merge to main, automatic deploy, and feature flags for unfinished work."

=== lesson: merge-vs-rebase | Merge vs rebase
Both integrate changes from one branch into another.

```text
         A---B---C  feature
        /
   D---E---F---G  main

merge (on feature: git merge main)       rebase (on feature: git rebase main)
         A---B---C---M  feature                         A'--B'--C'  feature
        /           /                                  /
   D---E---F-------G  main                  D---E---F---G  main
```

| | Merge | Rebase |
|---|---|---|
| History | keeps true history; adds a merge commit | linear history; commits re-created with new hashes |
| Safe on shared branches | yes | **no**: rewrites history others may have |
| Conflicts | resolved once | may be resolved per commit being replayed |
| Traceability | shows when branches joined | cleaner `git log` and `git bisect` |

## The golden rule

**Never rebase commits that others have based work on** (pushed shared branches). Rebasing your own local or personal feature branch onto `main` before opening/merging a PR is fine and common.

## On GitHub

PRs can be merged with a **merge commit**, **squash and merge** (all PR commits become one commit on `main`: a clean history of one commit per PR, the most common choice), or **rebase and merge**.

> "I rebase my own feature branch on main to keep it current and the history linear, and squash-merge PRs. I'd never rebase a shared branch, because that rewrites commits other people have."

=== lesson: fast-forward-vs-three-way-merge-detached-head | Fast-forward vs three-way merge; detached HEAD
## Fast-forward

If the target branch hasn't moved since you branched, Git just **moves the pointer** forward. No merge commit.

```text
main: D---E                    after git merge feature (fast-forward):
               \
feature:        A---B          main, feature: D---E---A---B
```

## Three-way merge

If both branches have new commits, Git combines them using three snapshots: the two tips and their **merge base** (common ancestor), creating a **merge commit** with two parents. Conflicts happen when both sides changed the same lines.

`git merge --no-ff` forces a merge commit even when a fast-forward is possible (to record that a feature branch existed); `git merge --ff-only` refuses unless it can fast-forward.

## Detached HEAD

Normally HEAD points to a branch name. If you check out a specific commit or tag (`git checkout a1b2c3d`, `git switch --detach v1.2.0`), HEAD points **directly at a commit**: "detached HEAD".

- Looking around and building is fine.
- Commits you make there aren't on any branch; switching away leaves them unreferenced (and eventually garbage-collected).
- To keep them: `git switch -c rescue-branch` before leaving. If you already left, find them in `git reflog`.

=== lesson: conflict-resolution | Conflict resolution
A conflict happens when two branches changed the same part of a file (or one edited a file the other deleted), and Git can't decide which wins.

```text
<<<<<<< HEAD
const TAX_RATE = 0.18;
=======
const TAX_RATE = getTaxRate(region);
>>>>>>> feat/regional-tax
```

## Process

1. `git status` lists conflicted files.
2. For each conflict, understand **both** intentions (read the commits/PRs), and write the correct combined result. It's often neither side as-is.
3. Remove the markers, run the tests and the app.
4. `git add` the files, then `git commit` (merge) or `git rebase --continue` (rebase). `git merge --abort` / `git rebase --abort` to back out.

## Tools

VS Code's merge editor, `git mergetool`, `git diff --merge`. `git checkout --ours/--theirs <file>` takes one side wholesale (careful: during a rebase, "ours" and "theirs" are swapped). `git rerere` remembers resolutions you've made before.

## Preventing conflicts

Small, frequent PRs; rebase or merge `main` into your branch often; communicate when touching shared files; automatic formatting (Prettier) so whitespace changes don't conflict; lockfile conflicts: accept one side and re-run `npm install`.

=== lesson: undoing-changes-reset-vs-revert-vs-restore-amend-reflog | Undoing changes: reset vs revert vs restore, amend, reflog
One of the most asked Git questions.

| Command | Does | Rewrites history? | Use when |
|---|---|---|---|
| `git restore file` | discard uncommitted changes in the working tree | no | throw away edits |
| `git restore --staged file` | unstage (keep the edits) | no | staged by mistake |
| `git commit --amend` | replace the last commit (message or content) | **yes** | fix the last commit before pushing |
| `git reset --soft HEAD~1` | undo the last commit, keep changes **staged** | yes | redo the commit |
| `git reset --mixed HEAD~1` (default) | undo the commit, keep changes **unstaged** | yes | re-split work |
| `git reset --hard HEAD~1` | undo the commit **and discard the changes** | yes | really throw it away (dangerous) |
| `git revert <sha>` | create a **new commit** that undoes an old one | **no** | undo something already pushed/shared |

## reset vs revert, in one line

`reset` moves the branch pointer back (erasing commits from the branch: only for local/unpushed work); `revert` adds a new commit that cancels the change (safe for shared history, and leaves an audit trail). On `main`, always `revert`.

## reflog: the safety net

Git records every position HEAD has been at, even after `reset --hard`, rebases or deleted branches:

```bash
git reflog                     # find the commit you lost: e.g. "a1b2c3d HEAD@{3}: commit: add search"
git switch -c recovered a1b2c3d
```

Entries are kept for about 90 days. Almost nothing committed is truly lost; uncommitted changes discarded with `restore` or `reset --hard` are.

=== lesson: git-stash | git stash
`git stash` shelves your uncommitted changes so you can switch context with a clean working tree, then bring them back.

```bash
git stash push -m "wip: search filters"   # save tracked changes (add -u for untracked files)
git switch main && git pull               # do something else (urgent fix, review)
git switch feat/search
git stash list                            # stash@{0}: On feat/search: wip: search filters
git stash pop                             # re-apply and drop (or `apply` to keep it)
git stash drop stash@{1}                  # delete one
git stash show -p stash@{0}               # see what's in it
```

## Notes

- Popping can conflict, like a merge; resolve and `git stash drop` afterwards.
- Stashes are local and easy to forget; for anything longer than a quick switch, a WIP commit on your branch (amend it later) is safer.
- `git switch` refuses to change branches if your changes would be overwritten; stash or commit first. Git worktrees (`git worktree add ../hotfix main`) are another option: a second working directory for another branch.

=== lesson: interactive-rebase-squashing | Interactive rebase and squashing
`git rebase -i` rewrites a series of your commits before sharing them, so the history tells a clear story.

```bash
git rebase -i HEAD~4        # or: git rebase -i main
```

An editor opens:

```text
pick a1b2c3 add search endpoint
fixup d4e5f6 typo
pick 7890ab add search UI
reword cdef12 wip
```

| Command | Effect |
|---|---|
| `pick` | keep the commit |
| `reword` | keep, edit the message |
| `edit` | stop to amend or split it |
| `squash` | combine with the previous commit, merge messages |
| `fixup` | combine with the previous, discard this message |
| `drop` | remove it |

Reorder lines to reorder commits.

## Handy workflow

`git commit --fixup <sha>` while working, then `git rebase -i --autosquash main` folds fixups into the right commits automatically.

Only rewrite commits that haven't been shared (or your own branch, then `push --force-with-lease`). Many teams skip this and squash-merge PRs instead; knowing interactive rebase still comes up in interviews.

=== lesson: cherry-pick | Cherry-pick
`git cherry-pick <sha>` applies the changes from a specific commit onto your current branch as a **new commit** (new hash).

```bash
git switch release/2.4
git cherry-pick 9f3c2e1          # bring one bug fix from main into the release branch
git cherry-pick A^..B            # a range
git cherry-pick -x 9f3c2e1       # record "cherry picked from commit …" in the message
```

## Use for

- **Backporting** a fix to a release or hotfix branch.
- Rescuing one commit from a branch you'll abandon.
- Moving a commit you made on the wrong branch (cherry-pick it to the right one, then reset the wrong one).

## Cautions

Cherry-picked commits are duplicates: when the branches later merge, Git usually handles it, but conflicts can appear. Prefer merging when you want **all** of a branch's changes; cherry-pick is for **specific** ones.

=== lesson: pr-review-practice | PR review practice
Code review catches bugs, spreads knowledge, and keeps the codebase consistent. Interviewers ask how you review and how you take feedback.

## As the author

- Small, focused PRs (under ~400 lines changed) with one purpose.
- A description: what, why, how, how it was tested, screenshots for UI, risks (see Behavioural → Written communication).
- Self-review the diff first; CI green before requesting review.
- Respond to every comment; don't take it personally; push back with reasons when you disagree.

## As the reviewer

Look, in order of importance:

1. **Correctness**: does it do what it should? Edge cases, errors, concurrency, security (auth checks, injection, secrets).
2. **Design**: right place, right abstraction, will it be easy to change?
3. **Tests**: do they cover the behaviour and the edge cases?
4. **Readability**: names, complexity, comments where the "why" isn't obvious.
5. Style nits last, and automate them (formatters, linters) so humans don't argue about them.

## Tone

Ask questions ("What happens if `items` is empty?"), explain the why, label severity ("blocking:", "nit:", "suggestion:"), praise good solutions, and review promptly: within a few hours keeps the team moving. Approve with comments when issues are minor.

=== lesson: semantic-commits | Semantic commits
**Conventional Commits** is a message format that makes history readable and machine-parseable:

```text
<type>(<optional scope>): <short summary in imperative mood>

<optional body: why, not how>

<optional footer: BREAKING CHANGE: …, Closes #123>
```

```text
feat(search): add filters for price range
fix(cart): round totals to two decimals before tax
refactor(api): extract order validation into a service
docs: describe the deploy process
chore(deps): bump next to 16.1
feat(api)!: remove v1 orders endpoint
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. A `!` or `BREAKING CHANGE:` marks breaking changes.

## Why teams use it

Automatic changelogs and **semantic version** bumps (semantic-release, Changesets: `fix` → patch, `feat` → minor, breaking → major), easy scanning of history, and commitlint/husky hooks enforce it.

Whatever the format: a good message explains **why** the change was made; the diff already shows what.

=== lesson: gitignore-and-removing-committed-secrets | .gitignore and removing committed secrets
## .gitignore

Lists files Git should not track: dependencies, build output, local config, secrets, OS junk.

```gitignore
node_modules/
.next/
dist/
.env
.env*.local
*.log
.DS_Store
coverage/
```

`.gitignore` only affects **untracked** files. If a file is already committed, ignoring it does nothing: remove it from the index first with `git rm --cached .env` (keeps your local copy), then commit.

Global ignores for your machine (`~/.config/git/ignore`) are better for editor and OS files.

## You committed a secret. Now what?

1. **Rotate the secret immediately** (revoke the key, change the password). Assume it's compromised the moment it's pushed: bots scan GitHub within minutes.
2. Remove it from the code and use environment variables.
3. If needed, purge it from history with `git filter-repo` or BFG, then force-push and have collaborators re-clone. This doesn't help with existing clones, forks, or caches, which is why step 1 comes first.
4. Prevent recurrence: GitHub push protection / secret scanning, a pre-commit hook with gitleaks, `.env.example` committed instead of `.env`.

=== lesson: git-bisect | git bisect
`git bisect` finds the commit that introduced a bug by **binary search** through history: with 1,000 commits between a good and a bad version, it takes about 10 steps.

```bash
git bisect start
git bisect bad                 # current commit is broken
git bisect good v2.3.0         # this release was fine
# Git checks out a commit halfway; test it, then:
git bisect good                # or: git bisect bad
# … repeat until Git prints "a1b2c3d is the first bad commit"
git bisect reset               # back to where you started
```

## Automate it

```bash
git bisect run npm test -- tests/cart.test.ts    # exit 0 = good, non-zero = bad
```

Works best with small, atomic commits that each build and pass tests (another reason for clean history). A good "hard bug I debugged" interview story often involves bisect.

=== lesson: tags-releases | Tags and releases
A **tag** is a named pointer to a specific commit that, unlike a branch, doesn't move. Used to mark releases.

```bash
git tag -a v2.4.0 -m "Release 2.4.0"      # annotated tag (author, date, message): use for releases
git push origin v2.4.0                     # tags aren't pushed by default (or --tags)
git switch --detach v2.4.0                 # check out exactly what shipped
```

## Semantic versioning

`MAJOR.MINOR.PATCH`: breaking changes bump MAJOR, new backwards-compatible features bump MINOR, fixes bump PATCH. Pre-releases: `3.0.0-beta.1`.

## GitHub releases

A release is a tag plus notes and downloadable assets. CI often creates them automatically from conventional commits (semantic-release, Changesets, release-please) and deploys on tag push. For web apps that deploy continuously, tags matter less; for libraries, mobile apps and APIs they're essential.

=== lesson: monorepo-vs-polyrepo | Monorepo vs polyrepo
- **Monorepo**: many apps and packages in one repository (`apps/web`, `apps/api`, `packages/ui`, `packages/types`).
- **Polyrepo**: one repository per service or package.

| | Monorepo | Polyrepo |
|---|---|---|
| Sharing code and types | direct imports, one change across front and back end in one PR | publish and version packages |
| Consistency | one set of tooling, lint rules, versions | drifts between repos |
| Atomic changes | yes | coordinated releases across repos |
| CI | needs "affected only" builds and caching | simple per repo |
| Access control and ownership | coarser (CODEOWNERS helps) | per repo |
| Scale | needs tooling as it grows | each repo stays small |

## Tooling

pnpm/npm/yarn **workspaces** for linking packages; **Turborepo** or **Nx** for task pipelines, caching and running only what changed. Google and Meta famously use giant monorepos with custom tools.

For a full-stack TypeScript product (Next.js web + API + shared types/validation), a monorepo with workspaces + Turborepo is a common, strong answer.
