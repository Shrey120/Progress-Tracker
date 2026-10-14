---
course: python
module: complexity
title: Complexity and speed in Python
order: 9
---
=== lesson: big-o-table | The cost of every built-in you use
Python hides loops inside innocent-looking calls. This table is the one to keep in your head. Averages for hash structures; n is the container size.

| Operation | list | dict | set | deque | str |
|---|---|---|---|---|---|
| index `x[i]` | O(1) | — | — | O(n) middle, O(1) ends | O(1) |
| `x in c` | **O(n)** | O(1) | O(1) | O(n) | O(n·m) |
| append / add | O(1)* | O(1) | O(1) | O(1) both ends | new string |
| pop end | O(1) | — | — | O(1) both ends | — |
| pop / insert at front | **O(n)** | — | — | O(1) | — |
| delete by value | O(n) | O(1) by key | O(1) | O(n) | — |
| `len` | O(1) | O(1) | O(1) | O(1) | O(1) |
| copy / slice length k | O(k) | O(n) | O(n) | O(n) | O(k) |
| sort | O(n log n) | — | — | — | via `sorted` |
| min / max / sum | O(n) | O(n) | O(n) | O(n) | O(n) |

\* amortised.

Other costs to remember:

- `sorted(x)` and `x.sort()`: O(n log n). `heapq.heapify`: O(n). `heappush` / `heappop`: O(log n).
- `bisect_left`: O(log n), but `insort` is O(n) because of the shift.
- `s1 + s2`, `"".join(parts)`: proportional to the total length.
- `list(set(x))`, `Counter(x)`, `set(x)`: O(n).
- `x == y` on lists, tuples or strings: O(n).
- `hash(tuple)` and `hash(str)`: O(length) the first time (strings cache their hash).
- `str(n)` for a huge int: worse than linear. Avoid converting very big ints to strings repeatedly.

## How big can n be?

A rough budget for Python on judges: **about 10⁷ simple operations per second**, often less. C++ gets 10⁸–10⁹.

| n up to | Python can afford |
|---|---|
| 10–12 | O(n!) |
| 20–25 | O(2ⁿ) |
| 500 | O(n³) |
| 5,000 | O(n²), tight |
| 10⁵–10⁶ | O(n log n) |
| 10⁷ | O(n) with simple work per step |
| larger | O(log n) or O(1) |

LeetCode scales time limits by language, so O(n²) at n = 10⁴ sometimes passes in Python; in OAs with fixed limits, it won't.

::: exercise spot-quadratic | Remove a hidden O(n²)
`common_count(a, b)` counts how many elements of `a` also appear in `b`. The starter is correct but O(n·m) because `x in b` scans a list. Make it O(n + m). The last test has 10⁵ elements in each list.

--- starter
def common_count(a, b):
    return sum(1 for x in a if x in b)
--- tests
assert common_count([1, 2, 3], [3, 4, 1]) == 2
assert common_count([], [1]) == 0
assert common_count([5, 5], [5]) == 2
import time; t = time.time(); r = common_count(list(range(100000)), list(range(50000, 150000))); assert r == 50000 and time.time() - t < 1.0, "too slow: still scanning a list per element?"
--- solution
def common_count(a, b):
    sb = set(b)
    return sum(1 for x in a if x in sb)
:::

=== lesson: speed-tricks | Writing fast Python
When a correct Python solution times out, the fix is usually one of these, in this order.

## 1. Use a better data structure

`in list` → `in set`. `list.pop(0)` → `deque.popleft()`. Re-sorting after every insert → heap. This changes the Big-O; nothing else on this page does.

## 2. Push loops into built-ins

Built-ins run in C. One `sum(...)`, `max(...)`, `sorted(...)`, `"".join(...)`, `Counter(...)` or slice beats a hand-written loop doing the same work by 5–50×.

```python
total = sum(nums)                 # not: for x in nums: total += x
best = max(nums)
row = grid[r][:]                  # copying a row: slice, not a loop
```

## 3. Avoid repeated attribute and global lookups in hot loops

Local variables are the fastest names. In a tight loop that runs millions of times:

```python
def solve(nums):
    out = []
    push = out.append            # bind the method once
    for x in nums:
        push(x * 2)
    return out
```

This is micro-optimisation; reach for it only when a solution is just over the limit.

## 4. Avoid recursion for deep, simple DP

Every call costs. A bottom-up table with loops runs several times faster than `@cache` recursion and has no depth limit.

## 5. Read input in bulk

In OAs, `sys.stdin.buffer.read().split()` instead of `input()` per line (see the I/O lesson).

## 6. Flatten 2D when it's hot

`grid[r][c]` is two indexing operations. For very hot loops over a fixed-size grid, a flat list indexed by `r * cols + c` is faster. Again, last resort.

## What doesn't help

- `numpy` isn't available on LeetCode's judge for most problems, and its per-element overhead is worse than plain Python for scalar loops.
- Swapping `for` loops for `map` with a lambda is usually not faster; the lambda call costs as much as the loop body.

::: exercise fast-dp | Bottom-up instead of deep recursion
`count_ways(n)` returns the number of ways to write `n` as an ordered sum of 1s, 2s and 3s, modulo 10⁹+7. The starter's recursion hits the recursion limit for large `n`. Rewrite it bottom-up with O(1) memory.

--- starter
from functools import cache

MOD = 10**9 + 7

@cache
def count_ways(n):
    if n < 0:
        return 0
    if n == 0:
        return 1
    return (count_ways(n - 1) + count_ways(n - 2) + count_ways(n - 3)) % MOD
--- tests
assert count_ways(0) == 1
assert count_ways(3) == 4
assert count_ways(4) == 7
assert count_ways(100000) == 111787461
--- solution
MOD = 10**9 + 7

def count_ways(n):
    a, b, c = 0, 0, 1   # ways(n-3), ways(n-2), ways(n-1) relative to i = 0
    for _ in range(n):
        a, b, c = b, c, (a + b + c) % MOD
    return c
--- hint
Keep the last three values: `ways(i) = ways(i-1) + ways(i-2) + ways(i-3)`.
:::
