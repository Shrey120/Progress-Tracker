---
course: python
module: functions
title: Functions and recursion
order: 6
---
=== lesson: function-basics | Functions, arguments and scope
```python
def area(w, h=1):          # h has a default
    return w * h

area(3)          # 3
area(3, 4)       # 12
area(h=4, w=3)   # keyword arguments, any order
```

A function without `return` (or with a bare `return`) returns `None`. Returning several values returns a tuple: `return lo, hi`.

## `*args` and `**kwargs`

```python
def total(*nums):          # any number of positional args, as a tuple
    return sum(nums)

total(1, 2, 3)             # 6
total(*[1, 2, 3])          # unpack a list into arguments
print(*grid[0])            # same trick
```

`**kwargs` collects keyword arguments into a dict. You'll rarely need it for DSA.

## The mutable default argument trap

Default values are evaluated **once**, when the function is defined. A mutable default is shared by every call:

```python
def add(x, bucket=[]):     # BUG
    bucket.append(x)
    return bucket

add(1)   # [1]
add(2)   # [1, 2]  — the same list!
```

The fix is `None` as a sentinel:

```python
def add(x, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(x)
    return bucket
```

This catches people in recursive helpers like `def dfs(node, path=[])`. It's also a favourite interview question.

## Scope: LEGB, and `nonlocal`

Names are looked up Local → Enclosing function → Global → Built-in. A nested function can **read** variables from the function around it. To **reassign** one, declare it `nonlocal`:

```python
def count_nodes(root):
    count = 0
    def dfs(node):
        nonlocal count            # without this: UnboundLocalError
        if not node:
            return
        count += 1
        dfs(node.left)
        dfs(node.right)
    dfs(root)
    return count
```

Mutating a container doesn't need `nonlocal`, because you aren't rebinding the name: `result.append(x)` or `best[0] = max(best[0], x)` work fine. Using `nonlocal` is clearer.

Don't shadow built-ins: naming a variable `list`, `sum`, `max`, `min`, `input`, `id` or `map` breaks the built-in for the rest of that scope.

## Lambdas

A lambda is a one-expression anonymous function, used almost only as a `key=`:

```python
pairs.sort(key=lambda p: p[1])
```

If it needs more than one expression, write a `def`.

::: exercise mutable-default | Fix the mutable default
`collect(x, acc=...)` should return a list containing the items of `acc` (if one is given) followed by `x`. Each call without `acc` must start from an empty list. The starter has the classic bug.

--- starter
def collect(x, acc=[]):
    acc.append(x)
    return acc
--- tests
collect(99); assert collect(1) == [1], "calls without acc must not share a list"
assert collect(2) == [2]
assert collect(3, [1, 2]) == [1, 2, 3]
--- solution
def collect(x, acc=None):
    if acc is None:
        acc = []
    acc.append(x)
    return acc
:::

::: exercise nonlocal-counter | A counter with nonlocal
`make_counter()` returns a function. Each call of that function returns the next integer, starting at 1. Two counters must be independent.

--- starter
def make_counter():
    count = 0
    def nxt():
        count += 1
        return count
    return nxt
--- tests
c = make_counter(); assert [c(), c(), c()] == [1, 2, 3]
a = make_counter(); b = make_counter(); a(); a(); assert b() == 1, "counters must be independent"
--- solution
def make_counter():
    count = 0
    def nxt():
        nonlocal count
        count += 1
        return count
    return nxt
--- hint
The starter raises `UnboundLocalError`: `count += 1` assigns, so Python treats `count` as local to `nxt`.
:::

=== lesson: recursion | Recursion in Python
Recursion is how you'll write tree problems, backtracking and top-down DP. Python has two limits C++ doesn't.

## 1. The recursion limit

Python stops at about 1000 nested calls with `RecursionError: maximum recursion depth exceeded`. A DFS on a linked-list-shaped tree with 10⁵ nodes will crash.

```python
import sys
sys.setrecursionlimit(10**6)
```

On LeetCode this usually works. In some environments the actual C stack is smaller and the process crashes instead; if that happens, convert to an iterative version with an explicit stack (covered in the trees and graphs lessons).

## 2. Calls are slow

A Python function call costs far more than in C++. Recursive solutions that pass in C++ with 10⁷ calls can time out in Python. When a DP is deep and simple, prefer the bottom-up (loop) form.

## Shape of a recursive function

Write the base case first, then trust the recursive call on a smaller input:

```python
def power(x, n):           # x ** n in O(log n) multiplications
    if n == 0:
        return 1
    half = power(x, n // 2)
    return half * half * (x if n % 2 else 1)
```

## Avoid slicing in recursion

`solve(nums[1:])` copies the list each time: O(n²) time and memory. Pass an index:

```python
def total(nums, i=0):
    if i == len(nums):
        return 0
    return nums[i] + total(nums, i + 1)
```

## Returning vs collecting

Two styles you'll use constantly:

```python
# 1. return the answer up the tree
def height(node):
    if not node:
        return 0
    return 1 + max(height(node.left), height(node.right))

# 2. collect into an outer list while walking down
def all_paths(root):
    res = []
    def dfs(node, path):
        if not node:
            return
        path.append(node.val)
        if not node.left and not node.right:
            res.append(path[:])     # copy! path keeps changing
        dfs(node.left, path)
        dfs(node.right, path)
        path.pop()                  # undo: backtracking
    dfs(root, [])
    return res
```

The `path[:]` copy is the most common backtracking bug in Python. Appending `path` itself stores a reference to a list that you then empty.

::: exercise fast-power | Fast power (LeetCode 50 for integers)
`fast_pow(x, n)` returns `x ** n` for an integer `x` and a non-negative integer `n`, using O(log n) multiplications recursively. Don't use `**` or `pow`.

--- starter
def fast_pow(x, n):
    pass
--- tests
assert fast_pow(2, 10) == 1024
assert fast_pow(3, 0) == 1
assert fast_pow(-2, 3) == -8
assert fast_pow(7, 1) == 7
assert fast_pow(2, 1000) == 2 ** 1000
--- solution
def fast_pow(x, n):
    if n == 0:
        return 1
    half = fast_pow(x, n // 2)
    return half * half * (x if n % 2 else 1)
:::

::: exercise subsets | Subsets (LeetCode 78)
`subsets(nums)` returns every subset of the distinct numbers. Generate them with recursion that chooses "take" before "skip" at each index, so the output order is fixed: for `[1, 2]` it is `[[1, 2], [1], [2], []]`.

--- starter
def subsets(nums):
    res = []
    def go(i, path):
        pass
    go(0, [])
    return res
--- tests
assert subsets([1, 2]) == [[1, 2], [1], [2], []]
assert subsets([]) == [[]]
assert subsets([1, 2, 3]) == [[1, 2, 3], [1, 2], [1, 3], [1], [2, 3], [2], [3], []]
--- solution
def subsets(nums):
    res = []
    def go(i, path):
        if i == len(nums):
            res.append(path[:])
            return
        path.append(nums[i])
        go(i + 1, path)
        path.pop()
        go(i + 1, path)
    go(0, [])
    return res
--- hint
At index `i`: append `nums[i]`, recurse, pop it, recurse again. At `i == len(nums)` append a **copy** of `path`.
:::

=== lesson: memoization | Memoization with @cache
Top-down DP in Python is a recursive function plus a cache. `functools.cache` (3.9+) or `lru_cache(None)` remembers results by arguments:

```python
from functools import cache

@cache
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

fib(200)   # instant
```

Rules for it to work:

- **Arguments must be hashable.** Ints, strings and tuples are fine; lists are not. Pass indexes into an outer list instead of the list itself.
- **Define it inside the solving function** on LeetCode, so the cache is fresh for each test case and can see that test's data:

```python
class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        @cache
        def go(r, c):
            if r == m - 1 or c == n - 1:
                return 1
            return go(r + 1, c) + go(r, c + 1)
        return go(0, 0)
```

- The recursion limit still applies. Deep DPs (n around 10⁴ or more) need `sys.setrecursionlimit`, or a bottom-up table.
- Cached functions use more stack per call than plain ones. In this site's in-browser Python, an `@cache` function can nest about 450 deep before the browser runs out of stack; on LeetCode the limit is much higher. Either way, if depth equals n and n is large, write it bottom-up.
- `go.cache_clear()` empties it if you ever need to.

## Doing it by hand

Interviewers sometimes ask you not to use the decorator. The manual version is a dict:

```python
def climb(n):
    memo = {}
    def go(i):
        if i <= 1:
            return 1
        if i in memo:
            return memo[i]
        memo[i] = go(i - 1) + go(i - 2)
        return memo[i]
    return go(n)
```

The DP module later turns these into tables.

::: exercise climb-stairs | Climbing stairs with @cache (LeetCode 70)
`climb(n)` returns the number of ways to climb `n` steps taking 1 or 2 steps at a time. Use a memoised recursive helper. It must be fast for `n = 300`.

--- starter
from functools import cache

def climb(n):
    pass
--- tests
assert climb(1) == 1
assert climb(2) == 2
assert climb(5) == 8
assert climb(300) == 359579325206583560961765665172189099052367214309267232255589801
--- solution
from functools import cache

def climb(n):
    @cache
    def go(i):
        if i <= 1:
            return 1
        return go(i - 1) + go(i - 2)
    return go(n)
:::

::: exercise grid-paths-obstacles | Unique paths with obstacles (LeetCode 63)
`paths(grid)` counts paths from the top-left to the bottom-right moving only right or down, where cells with `1` are blocked. Use `@cache` on `(r, c)`.

--- starter
from functools import cache

def paths(grid):
    pass
--- tests
assert paths([[0, 0, 0], [0, 1, 0], [0, 0, 0]]) == 2
assert paths([[0, 1], [0, 0]]) == 1
assert paths([[1]]) == 0
assert paths([[0] * 15 for _ in range(15)]) == 40116600
--- solution
from functools import cache

def paths(grid):
    R, C = len(grid), len(grid[0])

    @cache
    def go(r, c):
        if r >= R or c >= C or grid[r][c] == 1:
            return 0
        if r == R - 1 and c == C - 1:
            return 1
        return go(r + 1, c) + go(r, c + 1)

    return go(0, 0)
--- hint
Out of bounds or blocked: 0 paths. Bottom-right: 1. Otherwise the sum of going down and going right.
:::
