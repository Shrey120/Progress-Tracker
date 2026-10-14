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
