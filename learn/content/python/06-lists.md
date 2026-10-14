---
course: python
module: lists
title: Lists and tuples
level: Beginner
icon: 📋
tagline: Ordered collections you can change, and ones you can't
order: 6
---
=== lesson: lists-101 | Lists 101
A list holds many values in order, inside square brackets. Lists are the most used data structure in DSA; in C++ terms, a `vector`.

## Creating and reading

```pyrun
nums = [10, 20, 30, 40]
print(nums[0])      # first item: indexes start at 0
print(nums[3])      # fourth item
print(nums[-1])     # last item: negative counts from the end
print(len(nums))    # how many items
```

The positions are called **indexes**. A list of 4 items has indexes 0, 1, 2, 3. Asking for `nums[4]` is an `IndexError`.

## Changing a list

Lists are **mutable**: you can change them after creating them.

```pyrun
tasks = ["gym"]
tasks.append("DSA")       # add to the end
tasks.append("work")
tasks[0] = "run"          # replace an item
removed = tasks.pop()     # remove and return the last item
print(tasks, removed)
tasks.insert(0, "coffee") # insert at a position
print(tasks)
```

Step through it to see the boxes change.

## Looping with indexes

Sometimes you need the position as well as the value. `enumerate` gives you both:

```pyrun
scores = [70, 95, 88]
for i, s in enumerate(scores):
    print("index", i, "has", s)
```

## Useful built-ins

```pyrun
nums = [5, 1, 4]
print(sum(nums), min(nums), max(nums))
print(sorted(nums))     # a new sorted list
print(4 in nums)        # is 4 in the list?
nums.sort()             # sorts this list in place
print(nums)
```

## Two names, one list

Assignment doesn't copy a list. Both names point at the **same** list, so a change through one is visible through the other. Step through this and look at the "same object" note:

```pyrun
a = [1, 2, 3]
b = a
b.append(4)
print(a)
c = a.copy()      # a real copy
c.append(5)
print(a, c)
```

::: exercise second-largest | Second largest value
`second_largest(nums)` returns the second-largest **distinct** value, or `None` if there isn't one. Do it in one pass, without sorting.

--- starter
def second_largest(nums):
    pass
--- tests
assert second_largest([3, 9, 4, 7]) == 7
assert second_largest([5, 5, 5]) == None
assert second_largest([1]) == None
assert second_largest([10, 10, 8]) == 8
assert second_largest([-1, -5]) == -5
--- solution
def second_largest(nums):
    first = second = None
    for x in nums:
        if first is None or x > first:
            if first is not None:
                second = first
            first = x
        elif x != first and (second is None or x > second):
            second = x
    return second
--- hint
Keep two variables, `first` and `second`. When a new biggest arrives, the old biggest becomes `second`. Ignore values equal to `first`.
:::


::: exercise reverse-in-place | Reverse a list in place
`reverse_in_place(nums)` reverses the list **in place** by swapping from both ends, and returns it. Don't use `reverse()`, `reversed()` or slicing.

--- starter
def reverse_in_place(nums):
    pass
--- tests
assert reverse_in_place([1, 2, 3, 4]) == [4, 3, 2, 1]
assert reverse_in_place([1, 2, 3]) == [3, 2, 1]
assert reverse_in_place([]) == []
a = [1, 2]; assert reverse_in_place(a) is a, "return the same list, changed in place"
--- solution
def reverse_in_place(nums):
    i, j = 0, len(nums) - 1
    while i < j:
        nums[i], nums[j] = nums[j], nums[i]
        i += 1
        j -= 1
    return nums
--- hint
One index starts at 0, another at the end. Swap, move both inward, stop when they meet.
:::


::: exercise swap-ends | Swap with tuple unpacking
`swap_ends(nums)` should swap the first and last elements of the list **in place** and return the list. A list of length 0 or 1 is returned unchanged.

--- starter
def swap_ends(nums):
    pass
--- tests
assert swap_ends([1, 2, 3, 4]) == [4, 2, 3, 1]
assert swap_ends([7]) == [7]
assert swap_ends([]) == []
assert swap_ends(["a", "b"]) == ["b", "a"]
--- solution
def swap_ends(nums):
    if len(nums) > 1:
        nums[0], nums[-1] = nums[-1], nums[0]
    return nums
--- hint
`nums[-1]` is the last element. `a, b = b, a` swaps.
:::


::: exercise min-max | Track a minimum and maximum
`min_max(nums)` returns a tuple `(smallest, largest)` in a single pass, without calling `min()` or `max()` on the list. For an empty list, return `(None, None)`.

--- starter
def min_max(nums):
    pass
--- tests
assert min_max([3, 1, 4, 1, 5]) == (1, 5)
assert min_max([-2]) == (-2, -2)
assert min_max([]) == (None, None)
assert min_max([10**20, -10**20]) == (-10**20, 10**20)
--- solution
def min_max(nums):
    if not nums:
        return (None, None)
    lo, hi = float('inf'), -float('inf')
    for x in nums:
        if x < lo:
            lo = x
        if x > hi:
            hi = x
    return (lo, hi)
--- hint
Start `lo` at `float('inf')` and `hi` at `-float('inf')`, then check `if not nums` first.
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

```pyrun
print((1, 5) < (2, 0))  # True
print((1, 5) < (1, 6))  # True
print(sorted([(2, "b"), (1, "z"), (2, "a")]))  # [(1,'z'), (2,'a'), (2,'b')]
```

3. **Multiple return values** are tuples: `return lo, hi`.

## namedtuple

For readability, `collections.namedtuple` gives fields names and still behaves like a tuple:

```pyrun
from collections import namedtuple
Point = namedtuple("Point", "x y")
p = Point(1, 2)
print(p.x, p[1])    # 1, 2
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
