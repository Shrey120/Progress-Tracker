---
course: python
module: python-interview
title: Gotchas and Python interview questions
level: Advanced
icon: 🎤
tagline: The traps that cost points, and the theory questions
order: 19
---
=== lesson: gotchas | The gotchas that cost points
A checklist to reread before an interview or OA.

1. **`[[0] * m] * n`** shares rows. Use `[[0] * m for _ in range(n)]`.
2. **Mutable default arguments** (`def f(x, seen=set())`) are shared across calls. Default to `None`.
3. **Appending a list you keep mutating** (`res.append(path)`) stores a reference. Append `path[:]`.
4. **`a = a.sort()`** sets `a` to `None`. `sort()` works in place; `sorted()` returns.
5. **`-7 // 2 == -4`**, not -3. `-7 % 2 == 1`. Use `int(a / b)` or sign-aware division when the problem says "truncate".
6. **`round(2.5) == 2`**: banker's rounding.
7. **`is` vs `==`**: `is` checks identity. `x is 1000` can be False even when `x == 1000`, because only small ints (-5..256) are cached. Use `is` only with `None`.
8. **`if x:` when 0 is valid**: write `if x is not None:`.
9. **`{}` is a dict**; an empty set is `set()`.
10. **Shadowing built-ins**: a variable named `list`, `max`, `sum`, `min`, `map`, `id` or `input` breaks that built-in.
11. **Modifying a list while iterating over it** skips elements. Build a new list, or iterate over a copy or backwards.
12. **Changing a dict's size while iterating** raises RuntimeError. Iterate over `list(d)`.
13. **Recursion depth** (~1000 by default). `sys.setrecursionlimit`, or go iterative.
14. **`list.pop(0)`, `x in list` inside loops**: hidden O(n).
15. **Float equality**: `0.1 + 0.2 != 0.3`. Compare with a tolerance (`abs(a - b) < 1e-9`), or stay in integers (multiply out, compare fractions as cross-products).
16. **`1e9 + 7` is a float**. Use `10**9 + 7`.
17. **`heapq` is a min-heap**, and comparing tuples falls through to the next element, which may not be comparable. Add a tie-breaker index.
18. **`defaultdict` lookups insert keys**. Use `.get()` to only read.
19. **`max()` of an empty sequence** raises. Use `max(seq, default=0)`.
20. **`str.split(" ")` vs `str.split()`**: the first keeps empty strings between repeated spaces.

::: exercise gotcha-hunt | Fix three bugs in one function
`pairs_by_sum(nums, target)` should return every pair `[a, b]` (values, `a` before `b` in the list) whose sum is `target`, and must not modify `nums`. It has three bugs from the list above. Find them.

--- starter
def pairs_by_sum(nums, target, out=[]):
    nums = nums.sort()
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                out.append([nums[i], nums[j]])
    return out
--- tests
assert pairs_by_sum([3, 1, 2, 4], 5) == [[3, 2], [1, 4]]
a = [5, 0]; pairs_by_sum(a, 5); assert a == [5, 0], "nums must not be modified"
pairs_by_sum([1, 1], 2); assert pairs_by_sum([2, 2], 4) == [[2, 2]], "results leak between calls"
--- solution
def pairs_by_sum(nums, target, out=None):
    if out is None:
        out = []
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                out.append([nums[i], nums[j]])
    return out
--- hint
The order of pairs follows the original list, so there should be no sorting at all. Also: the default argument, and what `.sort()` returns.
:::

=== lesson: python-theory | Python questions interviewers ask
These come up in screening rounds and when Python is on your resume. Know a crisp two-sentence answer for each.

## Mutable vs immutable

Immutable: int, float, bool, str, tuple, frozenset, bytes. Mutable: list, dict, set, most objects. Assignment never copies; it binds another name to the same object. That's why changing a list inside a function is visible to the caller, but rebinding the parameter isn't.

## How are arguments passed?

"Pass by object reference" (or "by assignment"): the function receives a reference to the same object. Mutating it is visible outside; assigning a new object to the parameter name isn't.

## Shallow vs deep copy

`list(x)`, `x[:]`, `x.copy()`, `copy.copy(x)` copy the container only; nested objects are shared. `copy.deepcopy(x)` copies recursively.

## How does a dict work?

A hash table with open addressing. Keys are hashed; collisions are probed. Average O(1), worst O(n). Since 3.7 it preserves insertion order (a compact array of entries plus a sparse index table). Keys must be hashable and their hash must not change while stored, which is why lists can't be keys.

## The GIL

The Global Interpreter Lock lets only one thread run Python bytecode at a time in CPython. Threads still help for I/O-bound work (they release the GIL while waiting); CPU-bound work needs `multiprocessing` or native extensions. Python 3.13 added an experimental free-threaded build without the GIL.

## Generators and `yield`

A function with `yield` returns a generator: a lazy iterator that resumes where it left off each time you ask for the next value. Memory stays O(1) regardless of how many values it produces.

```pyrun
def chunks(xs, k):
    for i in range(0, len(xs), k):
        yield xs[i:i + k]

# try it
print(list(chunks([1, 2, 3, 4, 5], 2)))
```

## Decorators

A function that takes a function and returns a replacement. `@cache` is one. Written by hand:

```python
import functools, time

def timed(fn):
    @functools.wraps(fn)           # keep fn's name and docstring
    def wrapper(*args, **kwargs):
        t = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            print(fn.__name__, time.perf_counter() - t)
    return wrapper
```

## Context managers

`with open(path) as f:` guarantees cleanup. Any object with `__enter__`/`__exit__` works, or use `contextlib.contextmanager` on a generator.

## `*args`, `**kwargs`, and unpacking

Collect extra positional / keyword arguments; `*` and `**` also unpack at call sites and in literals (`[*a, *b]`, `{**d1, **d2}`).

## `__init__` vs `__new__`

`__new__` creates the instance; `__init__` initialises it. You almost never override `__new__` (immutable subclasses and singletons are the exceptions).

## Iterators

An iterable has `__iter__`; an iterator also has `__next__` and raises `StopIteration` when done. `for` calls `iter()` once, then `next()` until StopIteration.

## Memory management

Reference counting frees most objects immediately; a cyclic garbage collector handles reference cycles. Small ints and some strings are interned (cached), which is why `is` sometimes "works" on them by accident.

## List vs tuple

Tuples are immutable, hashable (if their contents are), slightly smaller and faster to create. Use tuples for fixed records and keys; lists for collections that change.

## Type hints

Ignored at runtime, checked by tools like mypy or Pyright. Worth using in real code; on LeetCode they're documentation.

::: exercise write-generator | Write a generator
`window_sums(nums, k)` is a **generator** that yields the sum of each length-`k` window, in order, in O(1) extra memory (don't build a list or slice inside the loop).

--- starter
def window_sums(nums, k):
    pass
--- tests
assert list(window_sums([1, 2, 3, 4, 5], 2)) == [3, 5, 7, 9]
assert list(window_sums([5], 1)) == [5]
assert list(window_sums([1, 2], 3)) == []
import types; assert isinstance(window_sums([1], 1), types.GeneratorType), "use yield"
--- solution
def window_sums(nums, k):
    if k > len(nums):
        return
    s = sum(nums[:k])
    yield s
    for i in range(k, len(nums)):
        s += nums[i] - nums[i - k]
        yield s
:::


::: exercise write-decorator | Write a memoising decorator
Write `memo`, a decorator that caches a function's results by its positional arguments (like a minimal `functools.cache`). The tests count how many times the wrapped function body actually runs.

--- starter
def memo(fn):
    pass
--- tests
calls = []; f = memo(lambda x: calls.append(x) or x * 2); f(3); f(3); f(4); assert (f(3), len(calls)) == (6, 2)
fib = None; fib = memo(lambda n: n if n < 2 else fib(n - 1) + fib(n - 2)); assert fib(80) == 23416728348467685
--- solution
def memo(fn):
    cache = {}
    def wrapper(*args):
        if args not in cache:
            cache[args] = fn(*args)
        return cache[args]
    return wrapper
--- hint
Keep a dict in the closure, keyed by the `args` tuple.
:::

=== lesson: spotting-the-pattern | Spotting the pattern in a new problem
On the Striver sheet the section title tells you the pattern before you read the problem. In an interview nobody tells you. Recognising the pattern is a separate skill from coding it, and you train it separately.

Three things build it:

1. **Knowing the signals**: the words, input shapes and constraints that point to each pattern (this lesson).
2. **Unlabeled, mixed practice**: guessing the pattern from a problem statement alone. The [pattern drill](#/patterns/drill) does exactly this.
3. **Keeping your own insight**: writing one line per solved problem, in your own words, and re-reading it when you revise. Press ✎ next to the problem in the [tracker](../) to write it.

## Read the constraints first

The input size tells you the complexity the interviewer expects, which rules most patterns in or out before you think about the problem.

| Largest `n` | Target complexity | Usually means |
|---|---|---|
| ≤ 12 | O(n!) | permutations, backtracking |
| ≤ 20–25 | O(2ⁿ) | subsets, backtracking, bitmask DP |
| ≤ 500 | O(n³) | triple loops, interval DP |
| ≤ 5 000 | O(n²) | 2D DP, all pairs |
| ≤ 10⁵ – 10⁶ | O(n log n) or O(n) | sorting, heap, binary search, two pointers, sliding window, hashing, prefix sums |
| values up to 10⁹, n small | O(log V) | binary search on the answer, maths |

Python runs roughly 10⁷ simple operations per second, so O(n²) with n = 10⁵ (10¹⁰ steps) will time out.

## Signals in the input

| You see | Think |
|---|---|
| sorted array (or "can be sorted") | two pointers, binary search |
| contiguous **subarray / substring** | sliding window (all non-negative), prefix sums + dict (negatives) |
| intervals, meetings, ranges | sort by start, then sweep or merge; heap of end times |
| linked list | fast/slow pointers, dummy head, reverse in place |
| binary tree | recursive DFS returning a value; BFS for levels |
| grid of cells | it's a graph: BFS/DFS from cells, 4 neighbours |
| prerequisites, "before/after", build order | topological sort |
| edges with weights | Dijkstra (non-negative weights) |
| stream of numbers, "so far" | heap, running state |

## Signals in the question

| The question asks for | Think |
|---|---|
| all subsets / permutations / combinations / ways to place | backtracking |
| number of ways, min cost, max profit, "can you reach" with choices at each step | dynamic programming |
| k-th largest, top k, k closest | heap of size k |
| next greater / smaller, span, histogram | monotonic stack |
| shortest path, fewest steps, unweighted | BFS |
| minimum X such that a condition holds (or maximum) | binary search on the answer |
| groups, connected, "are these joined", merging accounts | union-find or DFS components |
| pair / triple summing to a target | dict of seen values, or sort + two pointers |
| count subarrays with sum (or XOR) equal to k | prefix sums + dict |
| seen before, duplicates, frequency, anagram | hash map / Counter / set |
| single number, power of two, toggling | bit manipulation |
| locally best choice works (earliest end, largest first) | greedy, usually after sorting |

## When nothing jumps out: start from brute force

Write the brute force, then ask **what work is repeated**. The repeated work names the pattern:

- looking the same thing up again and again → **hash map**
- re-adding the same range of numbers → **prefix sums**
- re-scanning a window that only moved by one → **sliding window**
- solving the same subproblem twice → **memoization / DP**
- re-sorting or re-scanning for the max each step → **heap**
- trying every option, most of them hopeless → **backtracking with pruning**

```pyrun
from collections import Counter

def count_brute(nums, k):            # O(n²): re-adds the same ranges
    n = len(nums); c = 0
    for i in range(n):
        s = 0
        for j in range(i, n):
            s += nums[j]
            c += s == k
    return c

def count_fast(nums, k):             # O(n): prefix sums remember the repeated work
    seen = Counter({0: 1}); total = c = 0
    for x in nums:
        total += x
        c += seen[total - k]          # an earlier prefix of total-k means the gap sums to k
        seen[total] += 1
    return c

nums = [3, 4, -7, 3, 1, 3, 1, -4, -2, -2]
print(count_brute(nums, 7), count_fast(nums, 7))
```

## A checklist for any new problem

Go through these in order; most problems are decided by the third question.

1. **What's `n`?** That fixes the target complexity.
2. **What's the input shape?** Array, string, tree, grid, graph, intervals, linked list.
3. **What does it ask for?** All of something (backtracking), count/optimum with choices (DP), k-th/top (heap), shortest (BFS), "minimum such that" (binary search on answer).
4. **Is it sorted, or does sorting help?** Then two pointers, binary search, or greedy.
5. **Brute force, then find the repeated work.**

Say these out loud in an interview. Interviewers want to hear this reasoning, not just the final pattern.

## Make it stick

The routine that turns solved problems into recognition:

1. Try for 20–30 minutes. Struggling first is what makes the answer memorable.
2. If stuck, read only the **approach** of a good community solution, then close it and write the code yourself.
3. Write **one line** in your own words: the pattern, the giveaway, the trick. "Prefix sums + dict, because negatives break the window; seed `{0: 1}`."
4. Re-solve from a blank editor after a few days. If you can't, you remembered the code, not the idea.
5. Once a week, do a **mixed** set with no section titles.

The tracker handles steps 3 and 4: ✎ on a problem stores your one line, and ↻ puts it in the Revision tab with that note beside it. For step 5, the [Drill](#/patterns/drill) on the Patterns page mixes problems from every topic.

=== lesson: dsa-interview-round | How to run a DSA interview round
In a live coding round, interviewers score more than whether you reach the answer. They score how you think, how you communicate, how clean your code is, and whether you test it. Candidates who solve the problem in silence often score lower than ones who reach a slightly worse solution while explaining every step.

A 45-minute round usually splits like this:

| Minutes | Step |
|---|---|
| 0–5 | Clarify the problem and examples |
| 5–12 | Brute force, then the optimised approach, agreed with the interviewer |
| 12–32 | Code |
| 32–40 | Dry run and edge cases |
| 40–45 | Complexity, follow-ups, your questions |

## 1. Clarify before you think

Restate the problem in your own words, then ask:

- How big is the input? (That sets the target complexity.)
- Can values be negative, zero, duplicated? Is the input sorted?
- Can the input be empty? What should I return then?
- Return indices or values? What if there are several answers, or none?

Write one normal example and one edge example down. Five minutes here saves you from solving the wrong problem, which is the most common way to fail a round.

## 2. Brute force out loud

Say the obvious solution and its complexity, even if it's slow: "I could check every pair, that's O(n²). With n up to 10⁵ that's too slow, so let me look for something better."

This proves you can always deliver something, and gives you a starting point. Don't code it unless the interviewer asks or you're stuck.

## 3. Optimise and agree

Find the repeated work in the brute force (see *Spotting the pattern*), name the pattern and the new complexity, then check with the interviewer: "I'll keep a dict of values I've seen, so each lookup is O(1) and the whole thing is O(n) time, O(n) space. Does that sound good?"

Only start coding once they agree. If they push you towards something else, they're giving you a hint; take it.

## 4. Code cleanly while talking

- Use clear names (`left`, `window_sum`, `seen`), not `a`, `b`, `t`.
- Pull fiddly parts into small helpers (`neighbours(r, c)`), even if you write them last.
- Narrate decisions, not keystrokes: "I'm shrinking the window while it's invalid".
- If you're stuck, say what you're stuck on. Silence is the one thing that always costs points.
- Use Python idioms you know well (`Counter`, `enumerate`, `heapq`); don't experiment with ones you don't.

## 5. Test it yourself, before they ask

First a **dry run**: walk your example through the code by hand, saying the variables' values aloud. Most bugs show up here. Then list edge cases and check each one:

```pyrun
def two_sum(nums, target):
    seen = {}                       # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []

tests = [
    ([2, 7, 11, 15], 9, [0, 1]),    # the given example
    ([3, 3], 6, [0, 1]),            # duplicates
    ([-1, -2, -3], -5, [1, 2]),     # negatives
    ([5], 5, []),                   # one element
    ([], 0, []),                    # empty
]
for nums, t, want in tests:
    got = two_sum(nums, t)
    print("ok " if got == want else "BAD", nums, t, got)
```

Typical edge cases: empty, one element, all the same, negatives, already sorted or reversed, the answer at the very start or end, and the largest input (does it fit the time limit?).

## 6. Complexity and follow-ups

State time and space at the end, and why: "O(n) time, one pass; O(n) space for the dict."

Be ready for the usual follow-ups:

- What if the input is a **stream** too large for memory?
- What if it's **sorted**? (Often: two pointers, O(1) space.)
- Can you do it in **O(1) extra space**?
- What if it ran across many machines?

## When you're stuck

Phrases that keep you moving and show your thinking:

- "Let me try a smaller example by hand."
- "What if the array were sorted? Would that help?"
- "The slow part is finding X each time. Is there a structure that gives me X fast?"
- "I'm deciding between a heap and sorting; the heap wins because k is small."

Asking for a hint is fine and common: "I think the bottleneck is here; am I looking in the right place?" Taking a hint costs far less than ten minutes of silence.

## Online assessments are different

HackerRank, CodeSignal and similar tests have no interviewer, so only passing test cases counts:

- Read every question first and start with the one you're surest about.
- Check how input is given; some tests make you read stdin yourself (see *Reading input in online assessments*).
- A brute force that passes 60% of cases beats an elegant solution that doesn't compile. Submit the simple version first, then optimise.
- Watch the clock per question, not just the total.

## Practise the format, not just the problems

Solving on LeetCode trains the problem-solving part. The talking part needs its own practice:

- Once a week, solve a problem out loud with a 45-minute timer, as if someone were listening.
- Record yourself once; you'll hear the long silences.
- Do a few mock interviews with a friend or a free platform before your real ones.
