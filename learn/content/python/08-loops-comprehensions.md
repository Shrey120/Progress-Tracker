---
course: python
module: loops-comprehensions
title: Loop tricks, comprehensions and sorting
level: Intermediate
icon: ✨
tagline: enumerate, zip, comprehensions, list costs and sorting by key
order: 8
---
=== lesson: loops | Loop tricks: enumerate, zip, for-else
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

```pyrun
def find(grid, target):
    for r, row in enumerate(grid):
        for c, val in enumerate(row):
            if val == target:
                return (r, c)
    return None

# try it
grid = [[1, 2], [3, 4]]
print(find(grid, 3))
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

=== lesson: list-ops | Lists in depth: what each operation costs
A `list` is a dynamic array, like `vector`. Knowing which operations are O(1) and which are O(n) is most of the battle.

| Operation | Cost | Notes |
|---|---|---|
| `a[i]`, `a[i] = x` | O(1) | |
| `len(a)` | O(1) | |
| `a.append(x)` | O(1) amortised | |
| `a.pop()` | O(1) | removes the last element |
| `a.pop(0)`, `a.insert(0, x)` | **O(n)** | shifts everything; use `deque` for queues |
| `a.pop(i)`, `a.insert(i, x)` | O(n − i) | |
| `x in a`, `a.index(x)`, `a.count(x)`, `a.remove(x)` | **O(n)** | linear scan; use a `set` for membership |
| `a[i:j]` | O(j − i) | copies |
| `a + b` | O(len(a) + len(b)) | new list |
| `a.extend(b)`, `a += b` | O(len(b)) | in place |
| `a.sort()`, `sorted(a)` | O(n log n) | |
| `a.reverse()`, `a[::-1]` | O(n) | first is in place, second copies |
| `min(a)`, `max(a)`, `sum(a)` | O(n) | |

## Creating lists

```python
a = []
a = [0] * n                    # n zeros
a = list(range(5))             # [0, 1, 2, 3, 4]
a = list("abc")                # ['a', 'b', 'c']
a = [x * 2 for x in nums]
```

## As a stack

`append` and `pop` at the end are both O(1), so a plain list is the stack:

```pyrun
stack = []
stack.append(1)
stack.append(2)
top = stack[-1]      # peek
print(stack.pop())   # 2
if stack: ...        # non-empty check
```

## Slicing, copying and in-place edits

All of the slicing rules from strings apply. Slices can also be assigned:

```python
a[1:3] = [9, 9, 9]      # replace a range (can change length)
a[:] = sorted(a)        # replace contents in place (other references see it)
del a[0]                # O(n)
a[::-1]                 # reversed copy
```

`b = a` does not copy; both names now refer to one list. `b = a[:]`, `b = a.copy()` or `b = list(a)` copy the outer list only (a **shallow** copy). For a 2D grid, copy each row: `[row[:] for row in grid]`, or `copy.deepcopy(grid)` for arbitrary nesting.

## Built-ins that save lines

```python
sum(a); min(a); max(a)
max(a, key=len)                  # longest string
max(range(n), key=lambda i: a[i])  # index of the max
a.index(max(a))                  # same, two passes
any(...), all(...)
sorted(a, reverse=True)
list(reversed(a))
```

::: exercise move-zeroes | Move zeroes in place (LeetCode 283)
`move_zeroes(nums)` moves every 0 to the end **in place**, keeping the order of the non-zero elements, and returns `nums`. Don't build a new list and don't use `remove`/`insert` (they're O(n) each).

--- starter
def move_zeroes(nums):
    pass
--- tests
assert move_zeroes([0, 1, 0, 3, 12]) == [1, 3, 12, 0, 0]
assert move_zeroes([0]) == [0]
assert move_zeroes([1, 2]) == [1, 2]
a = [0, 0, 1]; r = move_zeroes(a); assert r is a and a == [1, 0, 0], "must modify and return the same list"
--- solution
def move_zeroes(nums):
    w = 0
    for x in nums:
        if x != 0:
            nums[w] = x
            w += 1
    for i in range(w, len(nums)):
        nums[i] = 0
    return nums
--- hint
Keep a write index `w`. Copy each non-zero forward to `nums[w]`, then fill the rest with zeros.
:::


::: exercise rotate-array | Rotate an array in place (LeetCode 189)
`rotate_right(nums, k)` rotates the list to the right by `k` steps **in place** and returns it. Aim for O(1) extra space using three reversals.

--- starter
def rotate_right(nums, k):
    pass
--- tests
assert rotate_right([1, 2, 3, 4, 5, 6, 7], 3) == [5, 6, 7, 1, 2, 3, 4]
assert rotate_right([-1, -100, 3, 99], 2) == [3, 99, -1, -100]
assert rotate_right([1, 2], 5) == [2, 1]
assert rotate_right([], 3) == []
a = [1, 2, 3]; assert rotate_right(a, 1) is a, "rotate in place and return the same list"
--- solution
def rotate_right(nums, k):
    n = len(nums)
    if n == 0:
        return nums
    k %= n

    def rev(i, j):
        while i < j:
            nums[i], nums[j] = nums[j], nums[i]
            i += 1
            j -= 1

    rev(0, n - 1)
    rev(0, k - 1)
    rev(k, n - 1)
    return nums
--- hint
Reverse the whole list, then reverse the first `k`, then reverse the rest. `nums[:] = nums[-k:] + nums[:-k]` also works in place but uses O(n) extra space.
:::


::: exercise copy-grid | Shallow vs deep copy
`flip_copy(grid)` returns a copy of the 2D grid with every value negated, **without changing the original**.

--- starter
def flip_copy(grid):
    out = grid[:]
    for row in out:
        for j in range(len(row)):
            row[j] = -row[j]
    return out
--- tests
g = [[1, 2], [3, 4]]; r = flip_copy(g); assert r == [[-1, -2], [-3, -4]]
g = [[1, 2], [3, 4]]; flip_copy(g); assert g == [[1, 2], [3, 4]], "the original grid was modified"
--- solution
def flip_copy(grid):
    return [[-x for x in row] for row in grid]
--- hint
`grid[:]` copies only the outer list; the rows are still shared.
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

=== lesson: sorting | Sorting with keys
- `a.sort()` sorts in place and returns `None`. A frequent bug is `a = a.sort()`.
- `sorted(iterable)` returns a new list and works on anything iterable (strings, sets, dict keys).
- Both are stable (equal elements keep their order) and O(n log n). The algorithm is Timsort.

## `key=`

Instead of a comparator, Python sorts by a key computed once per element:

```python
words.sort(key=len)                              # by length
words.sort(key=str.lower)                        # case-insensitive
intervals.sort(key=lambda iv: iv[0])             # by start
people.sort(key=lambda p: (-p.age, p.name))      # age desc, then name asc
sorted(counts, key=counts.get, reverse=True)     # dict keys by value, desc
```

Two tricks in that list are worth memorising:

- **Multi-level sort**: return a tuple from the key.
- **Descending on one field only**: negate numbers inside the tuple. For strings you can't negate, sort twice using stability: first by the secondary key, then by the primary.

## Custom comparators

When the order can't be expressed as a key (the classic is "Largest Number", LeetCode 179), write a comparator and convert it:

```python
from functools import cmp_to_key

def cmp(a, b):          # negative: a first, positive: b first, 0: equal
    if a + b > b + a:
        return -1
    if a + b < b + a:
        return 1
    return 0

parts = sorted(map(str, nums), key=cmp_to_key(cmp))
```

## Sorting indexes instead of values

When you need the original positions, sort the indexes:

```python
order = sorted(range(len(nums)), key=lambda i: nums[i])
```

## Partial order statistics

For the k smallest or largest, `heapq.nsmallest(k, a)` / `heapq.nlargest(k, a)` run in O(n log k), better than sorting when k is small.

::: exercise sort-intervals | Merge intervals (LeetCode 56)
`merge(intervals)` merges all overlapping intervals and returns them sorted by start. Intervals that touch (`[1,4]` and `[4,5]`) overlap.

--- starter
def merge(intervals):
    pass
--- tests
assert merge([[1, 3], [2, 6], [8, 10], [15, 18]]) == [[1, 6], [8, 10], [15, 18]]
assert merge([[1, 4], [4, 5]]) == [[1, 5]]
assert merge([[4, 7], [1, 4]]) == [[1, 7]]
assert merge([[1, 10], [2, 3], [4, 5]]) == [[1, 10]]
assert merge([]) == []
--- solution
def merge(intervals):
    out = []
    for s, e in sorted(intervals, key=lambda iv: iv[0]):
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out
--- hint
Sort by start. Then each interval either extends the last merged one (`s <= out[-1][1]`) or starts a new one. Remember `max` — a short interval can sit inside a long one.
:::


::: exercise sort-freq | Sort by frequency, then value
`freq_sort(nums)` sorts numbers by how often they occur, **most frequent first**; numbers with equal frequency go in increasing order. Every copy stays in the output.

--- starter
from collections import Counter

def freq_sort(nums):
    pass
--- tests
assert freq_sort([1, 1, 2, 2, 2, 3]) == [2, 2, 2, 1, 1, 3]
assert freq_sort([4, 6, 6, 4, 5]) == [4, 4, 6, 6, 5]
assert freq_sort([]) == []
--- solution
from collections import Counter

def freq_sort(nums):
    cnt = Counter(nums)
    return sorted(nums, key=lambda x: (-cnt[x], x))
--- hint
Key: `(-count, value)`. Negating the count sorts it descending while the value stays ascending.
:::


::: exercise largest-number | Largest number (LeetCode 179)
`largest_number(nums)` arranges non-negative integers to form the largest possible number and returns it as a string. `[0, 0]` should give `"0"`, not `"00"`.

--- starter
from functools import cmp_to_key

def largest_number(nums):
    pass
--- tests
assert largest_number([10, 2]) == "210"
assert largest_number([3, 30, 34, 5, 9]) == "9534330"
assert largest_number([0, 0]) == "0"
assert largest_number([1]) == "1"
--- solution
from functools import cmp_to_key

def largest_number(nums):
    def cmp(a, b):
        if a + b > b + a:
            return -1
        if a + b < b + a:
            return 1
        return 0
    s = "".join(sorted(map(str, nums), key=cmp_to_key(cmp)))
    return "0" if s[0] == "0" else s
--- hint
Compare two strings `a`, `b` by which concatenation is bigger: `a + b` or `b + a`.
:::
