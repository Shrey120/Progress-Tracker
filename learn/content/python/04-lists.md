---
course: python
module: lists
title: Lists, tuples and sorting
order: 4
---
=== lesson: list-ops | Lists and what each operation costs
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

```python
stack = []
stack.append(1)
stack.append(2)
top = stack[-1]      # peek
stack.pop()          # 2
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

=== lesson: tuples | Tuples
A tuple is an immutable, fixed-length sequence. Use it for small records that travel together: coordinates, `(distance, node)` pairs, `(value, index)` pairs.

```python
p = (3, 4)
x, y = p                   # unpacking
single = (5,)              # the comma makes it a tuple; (5) is just 5
r, c = divmod(idx, cols)   # functions return tuples
```

## Why tuples matter in DSA

1. **They're hashable** (when their contents are), so they can be dict keys and set members. Lists can't.

```python
visited = set()
visited.add((r, c))          # grid cells
memo[(i, j)] = ans           # 2D memoisation
```

2. **They compare lexicographically**: first elements, then the second if the first are equal, and so on. That's what makes heaps and sorting of pairs work without a custom comparator:

```python
(1, 5) < (2, 0)     # True
(1, 5) < (1, 6)     # True
sorted([(2, "b"), (1, "z"), (2, "a")])   # [(1,'z'), (2,'a'), (2,'b')]
```

3. **Multiple return values** are tuples: `return lo, hi`.

## namedtuple

For readability, `collections.namedtuple` gives fields names and still behaves like a tuple:

```python
from collections import namedtuple
Point = namedtuple("Point", "x y")
p = Point(1, 2)
p.x, p[1]           # 1, 2
```

::: exercise grid-neighbours | Tuples as grid coordinates
`neighbours(r, c, rows, cols)` returns the list of `(row, col)` tuples for the up, down, left and right cells of `(r, c)` that are inside a `rows × cols` grid, in the order up, down, left, right.

--- starter
DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]

def neighbours(r, c, rows, cols):
    pass
--- tests
assert neighbours(1, 1, 3, 3) == [(0, 1), (2, 1), (1, 0), (1, 2)]
assert neighbours(0, 0, 3, 3) == [(1, 0), (0, 1)]
assert neighbours(0, 0, 1, 1) == []
--- solution
DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]

def neighbours(r, c, rows, cols):
    out = []
    for dr, dc in DIRS:
        nr, nc = r + dr, c + dc
        if 0 <= nr < rows and 0 <= nc < cols:
            out.append((nr, nc))
    return out
--- hint
Loop over `DIRS`, add the offsets, and keep the cell when `0 <= nr < rows and 0 <= nc < cols`.
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
