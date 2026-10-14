---
course: python
module: control-flow
title: Control flow and comprehensions
order: 3
---
=== lesson: loops | Loops the Python way
## `range`

`range(stop)`, `range(start, stop)`, `range(start, stop, step)`. Stop is excluded. It produces numbers lazily, so `range(10**9)` costs nothing until you iterate.

```python
for i in range(n): ...            # 0 .. n-1
for i in range(1, n + 1): ...     # 1 .. n
for i in range(n - 1, -1, -1): ...  # n-1 down to 0
for i in range(0, n, 2): ...      # even indexes
```

`reversed(range(n))` reads better than `range(n - 1, -1, -1)` and does the same thing.

## `enumerate` and `zip`

Stop writing `for i in range(len(nums))` when you need both index and value:

```python
for i, x in enumerate(nums): ...
for i, x in enumerate(nums, start=1): ...   # 1-based index
for a, b in zip(xs, ys): ...                # pairs, stops at the shorter one
for i, (a, b) in enumerate(zip(xs, ys)): ...
for prev, cur in zip(nums, nums[1:]): ...   # adjacent pairs (makes a copy)
```

## `break`, `continue`, and `for ... else`

The `else` on a loop runs only if the loop finished **without** `break`. It replaces a `found = False` flag:

```python
for d in range(2, int(n ** 0.5) + 1):
    if n % d == 0:
        print("composite")
        break
else:
    print("prime")
```

## `while` loops

Two-pointer and binary-search code is mostly `while`:

```python
lo, hi = 0, len(nums) - 1
while lo <= hi:
    mid = (lo + hi) // 2
    ...
```

There is no `do ... while`; write `while True:` with a `break`.

## Nested loops and breaking out

`break` leaves only the innermost loop. To leave several, put the loops in a function and `return`, which is also cleaner:

```python
def find(grid, target):
    for r, row in enumerate(grid):
        for c, val in enumerate(row):
            if val == target:
                return (r, c)
    return None
```

## Conditional expressions

```python
sign = 1 if x >= 0 else -1
```

Python also has `match` (3.10+), but you won't need it for DSA.

::: exercise first-repeat | First index of a repeated value
`first_repeat(nums)` returns the index of the first element whose value has appeared earlier in the list, or `-1` if no value repeats.

--- starter
def first_repeat(nums):
    pass
--- tests
assert first_repeat([3, 1, 4, 1, 5]) == 3
assert first_repeat([1, 2, 3]) == -1
assert first_repeat([7, 7]) == 1
assert first_repeat([]) == -1
--- solution
def first_repeat(nums):
    seen = set()
    for i, x in enumerate(nums):
        if x in seen:
            return i
        seen.add(x)
    return -1
--- hint
`enumerate` for the index, a `set` for what you've seen.
:::

::: exercise is-prime | Prime check with for-else
`is_prime(n)` returns whether `n` is prime. Only test divisors up to the square root of `n`. Use `math.isqrt` or `int(n ** 0.5)`.

--- starter
def is_prime(n):
    pass
--- tests
assert is_prime(2) == True
assert is_prime(1) == False
assert is_prime(0) == False
assert is_prime(97) == True
assert is_prime(91) == False
assert is_prime(1_000_000_007) == True
--- solution
import math

def is_prime(n):
    if n < 2:
        return False
    for d in range(2, math.isqrt(n) + 1):
        if n % d == 0:
            return False
    return True
:::

::: exercise count-increases | Adjacent pairs with zip
`count_increases(nums)` returns how many times an element is strictly greater than the one before it.

--- starter
def count_increases(nums):
    pass
--- tests
assert count_increases([1, 2, 2, 3, 1, 5]) == 3
assert count_increases([5]) == 0
assert count_increases([]) == 0
assert count_increases([3, 2, 1]) == 0
--- solution
def count_increases(nums):
    return sum(1 for a, b in zip(nums, nums[1:]) if b > a)
:::

=== lesson: comprehensions | Comprehensions and generator expressions
A comprehension builds a collection in one expression. It's shorter than a loop with `append`, and usually faster.

```python
squares = [x * x for x in range(10)]
evens   = [x for x in nums if x % 2 == 0]
labels  = ["even" if x % 2 == 0 else "odd" for x in nums]   # if/else goes BEFORE for
pairs   = [(i, j) for i in range(3) for j in range(i)]       # nested, outer loop first
flat    = [x for row in grid for x in row]                   # flatten a 2D list

index_of = {x: i for i, x in enumerate(nums)}   # dict comprehension
uniq     = {x % 10 for x in nums}               # set comprehension
```

Read nested comprehensions left to right as if they were nested `for` lines.

## Generator expressions

Swap the brackets for parentheses and nothing is built in memory; values are produced one at a time. When you pass one directly to a function, you can drop the extra parentheses:

```python
total = sum(x * x for x in nums)
has_neg = any(x < 0 for x in nums)      # stops at the first True
all_pos = all(x > 0 for x in nums)      # stops at the first False
longest = max(len(w) for w in words)
```

Use a list when you need to index, reuse, or know the length. Use a generator when you only consume it once.

## Building grids (and the classic bug)

```python
grid = [[0] * cols for _ in range(rows)]   # correct: a new row each time
grid = [[0] * cols] * rows                 # BUG: every row is the same list
```

With the bug, `grid[0][0] = 1` changes column 0 of every row. This appears in DP tables all the time. `[0] * cols` is fine because ints are immutable; the problem is only when the repeated thing is a list.

::: exercise flatten | Flatten and filter in one comprehension
`positive_flat(grid)` returns every positive number from a 2D list, row by row, left to right, as a flat list.

--- starter
def positive_flat(grid):
    pass
--- tests
assert positive_flat([[1, -2], [0, 3], [4]]) == [1, 3, 4]
assert positive_flat([]) == []
assert positive_flat([[], [-1]]) == []
--- solution
def positive_flat(grid):
    return [x for row in grid for x in row if x > 0]
:::

::: exercise make-grid | Build a DP table correctly
`make_grid(rows, cols, fill)` returns a `rows × cols` list of lists filled with `fill`, where every row is an independent list.

--- starter
def make_grid(rows, cols, fill):
    return [[fill] * cols] * rows
--- tests
assert make_grid(2, 3, 0) == [[0, 0, 0], [0, 0, 0]]
g = make_grid(3, 2, 0); g[0][0] = 9; assert g == [[9, 0], [0, 0], [0, 0]], "changing one cell changed other rows"
assert make_grid(0, 5, 1) == []
--- solution
def make_grid(rows, cols, fill):
    return [[fill] * cols for _ in range(rows)]
--- hint
The starter has the shared-row bug. Use a comprehension so each row is created separately.
:::

::: exercise transpose | Transpose a matrix
`transpose(m)` returns the transpose of a rectangular matrix (rows become columns). Try it two ways: with a nested comprehension, and with `zip(*m)`.

--- starter
def transpose(m):
    pass
--- tests
assert transpose([[1, 2, 3], [4, 5, 6]]) == [[1, 4], [2, 5], [3, 6]]
assert transpose([[1]]) == [[1]]
assert transpose([[1, 2]]) == [[1], [2]]
--- solution
def transpose(m):
    return [list(col) for col in zip(*m)]
--- hint
`zip(*m)` passes each row as a separate argument, so it yields the columns as tuples.
:::
