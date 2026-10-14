---
course: python
module: toolbox
title: The DSA toolbox
order: 8
---
=== lesson: deque | deque: queues and sliding windows
`collections.deque` is a double-ended queue: O(1) append and pop at **both** ends. Use it for every queue, BFS, and sliding-window maximum. Never use `list.pop(0)`; it's O(n).

```python
from collections import deque

q = deque()
q = deque([1, 2, 3])
q.append(4)          # right end
q.appendleft(0)      # left end
q.pop()              # from the right
q.popleft()          # from the left — the queue "dequeue"
q[0], q[-1]          # peek at either end, O(1)
len(q); bool(q)
dq = deque(maxlen=3) # keeps only the last 3 items
q.rotate(1)          # rotate right by 1
```

Indexing into the middle (`q[i]`) is O(n). A deque is for the ends.

## BFS template

```python
def bfs(start, graph):
    dist = {start: 0}
    q = deque([start])
    while q:
        u = q.popleft()
        for v in graph[u]:
            if v not in dist:
                dist[v] = dist[u] + 1
                q.append(v)
    return dist
```

Mark nodes visited when you **enqueue** them, not when you dequeue them, or the same node gets added many times.

## Level-by-level BFS

When the answer depends on the level (tree level order, "minimum minutes" problems), process one level per outer loop:

```python
while q:
    for _ in range(len(q)):     # len is read once, before the loop runs
        node = q.popleft()
        ...
    level += 1
```

## Monotonic deque: sliding window maximum

Keep indexes whose values are decreasing. The front is always the max of the current window.

```python
def max_sliding_window(nums, k):
    dq, out = deque(), []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:   # smaller values can never be a max again
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:                # front fell out of the window
            dq.popleft()
        if i >= k - 1:
            out.append(nums[dq[0]])
    return out
```

::: exercise sliding-max | Sliding window maximum (LeetCode 239)
`max_sliding_window(nums, k)` returns the maximum of every window of size `k`, in O(n).

--- starter
from collections import deque

def max_sliding_window(nums, k):
    pass
--- tests
assert max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3) == [3, 3, 5, 5, 6, 7]
assert max_sliding_window([1], 1) == [1]
assert max_sliding_window([9, 8, 7, 6], 2) == [9, 8, 7]
assert max_sliding_window([4, 4, 4], 2) == [4, 4]
assert max_sliding_window(list(range(100000)), 1000)[-1] == 99999
--- solution
from collections import deque

def max_sliding_window(nums, k):
    dq, out = deque(), []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            out.append(nums[dq[0]])
    return out
--- hint
Store indexes in the deque, keep their values decreasing, and drop the front when it leaves the window.
:::

::: exercise grid-bfs | Shortest path in a grid with BFS
`shortest(grid)` returns the number of steps to go from the top-left to the bottom-right of a grid of `0` (open) and `1` (wall), moving up/down/left/right. Return `-1` if it's impossible. The start counts as step 0.

--- starter
from collections import deque

def shortest(grid):
    pass
--- tests
assert shortest([[0, 0, 0], [1, 1, 0], [0, 0, 0]]) == 4
assert shortest([[0, 1], [1, 0]]) == -1
assert shortest([[0]]) == 0
assert shortest([[1, 0], [0, 0]]) == -1
--- solution
from collections import deque

def shortest(grid):
    R, C = len(grid), len(grid[0])
    if grid[0][0] or grid[R - 1][C - 1]:
        return -1
    dist = {(0, 0): 0}
    q = deque([(0, 0)])
    while q:
        r, c = q.popleft()
        if (r, c) == (R - 1, C - 1):
            return dist[(r, c)]
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 0 and (nr, nc) not in dist:
                dist[(nr, nc)] = dist[(r, c)] + 1
                q.append((nr, nc))
    return -1
:::

=== lesson: heapq | heapq: priority queues
`heapq` turns a plain list into a binary **min**-heap. There is no heap class; you call functions on a list.

```python
import heapq

h = []
heapq.heappush(h, 5)
heapq.heappush(h, 1)
h[0]                      # 1 — peek at the smallest, O(1)
heapq.heappop(h)          # 1 — O(log n)
heapq.heapify(nums)       # turn a list into a heap in place, O(n)
heapq.heappushpop(h, x)   # push then pop, faster than both
heapq.heapreplace(h, x)   # pop then push
heapq.nlargest(k, nums)   # O(n log k)
heapq.nsmallest(k, nums, key=...)
```

## Max-heap: negate

```python
h = []
heapq.heappush(h, -x)
largest = -heapq.heappop(h)
```

(Python 3.14 adds `heapq.heappush_max` and friends; LeetCode and most judges are on older versions, so negation is the portable answer.)

## Priorities with tuples

Push `(priority, item)`. Tuples compare element by element, so the heap orders by priority. If two priorities tie, Python compares the items next, which crashes if they aren't comparable (like `ListNode`s). Add a tie-breaker counter:

```python
heapq.heappush(h, (dist, node))                 # fine when nodes are ints
heapq.heappush(h, (node.val, i, node))          # i breaks ties before node is compared
```

## Top-k with a size-k heap

To keep the k **largest**, keep a min-heap of size k: its root is the smallest of the top k, so anything smaller than the root can't belong.

```python
def kth_largest(nums, k):
    h = []
    for x in nums:
        heapq.heappush(h, x)
        if len(h) > k:
            heapq.heappop(h)
    return h[0]
```

O(n log k) time, O(k) space.

## Two heaps: running median

A max-heap for the lower half and a min-heap for the upper half, kept balanced, give the median in O(1) and inserts in O(log n). That's "Find Median from Data Stream".

::: exercise kth-largest | Kth largest element (LeetCode 215)
`kth_largest(nums, k)` returns the k-th largest value using a min-heap of size `k`.

--- starter
import heapq

def kth_largest(nums, k):
    pass
--- tests
assert kth_largest([3, 2, 1, 5, 6, 4], 2) == 5
assert kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4) == 4
assert kth_largest([1], 1) == 1
assert kth_largest([-1, -1], 2) == -1
--- solution
import heapq

def kth_largest(nums, k):
    h = []
    for x in nums:
        heapq.heappush(h, x)
        if len(h) > k:
            heapq.heappop(h)
    return h[0]
:::

::: exercise last-stone | Last stone weight with a max-heap (LeetCode 1046)
Repeatedly smash the two heaviest stones. If they're equal both disappear; otherwise the difference goes back. `last_stone(stones)` returns the last weight, or 0 if none remain.

--- starter
import heapq

def last_stone(stones):
    pass
--- tests
assert last_stone([2, 7, 4, 1, 8, 1]) == 1
assert last_stone([1]) == 1
assert last_stone([3, 3]) == 0
assert last_stone([10, 4]) == 6
--- solution
import heapq

def last_stone(stones):
    h = [-s for s in stones]
    heapq.heapify(h)
    while len(h) > 1:
        a = -heapq.heappop(h)
        b = -heapq.heappop(h)
        if a != b:
            heapq.heappush(h, -(a - b))
    return -h[0] if h else 0
--- hint
Negate every weight, `heapify`, and negate again when you pop.
:::

::: exercise merge-k | Merge k sorted lists
`merge_k(lists)` merges k sorted Python lists into one sorted list in O(N log k), using a heap of `(value, list_index, element_index)`. Don't just concatenate and sort.

--- starter
import heapq

def merge_k(lists):
    pass
--- tests
assert merge_k([[1, 4, 5], [1, 3, 4], [2, 6]]) == [1, 1, 2, 3, 4, 4, 5, 6]
assert merge_k([]) == []
assert merge_k([[], [1]]) == [1]
assert merge_k([[5], [1, 2, 3]]) == [1, 2, 3, 5]
--- solution
import heapq

def merge_k(lists):
    h = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
    heapq.heapify(h)
    out = []
    while h:
        val, i, j = heapq.heappop(h)
        out.append(val)
        if j + 1 < len(lists[i]):
            heapq.heappush(h, (lists[i][j + 1], i, j + 1))
    return out
--- hint
Seed the heap with the first element of each non-empty list. After popping `(val, i, j)`, push the next element from list `i`.
:::

=== lesson: bisect | bisect: binary search on sorted lists
`bisect` finds insertion points in a sorted list in O(log n).

```python
from bisect import bisect_left, bisect_right, insort

a = [1, 2, 4, 4, 4, 7]
bisect_left(a, 4)    # 2 — first index where 4 could go (first index with a[i] >= 4)
bisect_right(a, 4)   # 5 — after the last 4 (first index with a[i] > 4)
bisect_left(a, 5)    # 5
bisect_right(a, 4) - bisect_left(a, 4)    # 3 — how many 4s
insort(a, 3)         # insert keeping it sorted: O(log n) search + O(n) shift
```

The two definitions to remember:

- `bisect_left(a, x)` = **lower bound** = number of elements `< x`.
- `bisect_right(a, x)` = **upper bound** = number of elements `<= x`.

## Common uses

```python
# does x exist?
i = bisect_left(a, x)
found = i < len(a) and a[i] == x

# largest element <= x (floor)
i = bisect_right(a, x) - 1          # -1 means none

# smallest element >= x (ceiling)
i = bisect_left(a, x)               # len(a) means none

# count values in [lo, hi]
bisect_right(a, hi) - bisect_left(a, lo)
```

## `key=` (Python 3.10+)

```python
intervals.sort(key=lambda iv: iv[0])
i = bisect_left(intervals, 5, key=lambda iv: iv[0])
```

## Longest increasing subsequence in O(n log n)

`tails[k]` holds the smallest possible tail of an increasing subsequence of length k + 1:

```python
def lis(nums):
    tails = []
    for x in nums:
        i = bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)
```

## No ordered map

Python has no built-in balanced tree. When a problem needs a sorted container with fast inserts and deletes, you have three options: `bisect` on a list (inserts are O(n), often fast enough up to ~10⁵), a heap with lazy deletion, or `sortedcontainers.SortedList`, which LeetCode provides (most other judges don't).

::: exercise search-range | First and last position (LeetCode 34)
`search_range(nums, target)` returns `[first, last]` indexes of `target` in a sorted list, or `[-1, -1]`. Use `bisect_left` and `bisect_right`.

--- starter
from bisect import bisect_left, bisect_right

def search_range(nums, target):
    pass
--- tests
assert search_range([5, 7, 7, 8, 8, 10], 8) == [3, 4]
assert search_range([5, 7, 7, 8, 8, 10], 6) == [-1, -1]
assert search_range([], 0) == [-1, -1]
assert search_range([2, 2], 2) == [0, 1]
--- solution
from bisect import bisect_left, bisect_right

def search_range(nums, target):
    lo = bisect_left(nums, target)
    if lo == len(nums) or nums[lo] != target:
        return [-1, -1]
    return [lo, bisect_right(nums, target) - 1]
:::

::: exercise lis | Longest increasing subsequence (LeetCode 300)
`lis(nums)` returns the length of the longest strictly increasing subsequence in O(n log n).

--- starter
from bisect import bisect_left

def lis(nums):
    pass
--- tests
assert lis([10, 9, 2, 5, 3, 7, 101, 18]) == 4
assert lis([0, 1, 0, 3, 2, 3]) == 4
assert lis([7, 7, 7, 7]) == 1
assert lis([]) == 0
assert lis(list(range(50000))) == 50000
--- solution
from bisect import bisect_left

def lis(nums):
    tails = []
    for x in nums:
        i = bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)
--- hint
Keep `tails`. For each `x`, `bisect_left(tails, x)` tells you which tail to replace (or to append).
:::

=== lesson: itertools-functools-math | itertools, functools and math
## itertools

```python
from itertools import permutations, combinations, product, accumulate, groupby, chain, pairwise

list(permutations([1, 2, 3]))        # all 6 orderings, as tuples
list(permutations([1, 2, 3], 2))     # ordered pairs
list(combinations([1, 2, 3], 2))     # [(1,2), (1,3), (2,3)]
list(product("ab", repeat=2))        # [('a','a'), ('a','b'), ('b','a'), ('b','b')]
list(accumulate([1, 2, 3, 4]))       # [1, 3, 6, 10] — prefix sums
list(accumulate([3, 1, 4], max))     # [3, 3, 4] — running max
[(k, len(list(g))) for k, g in groupby("aaabcc")]   # [('a',3), ('b',1), ('c',2)]
list(chain([1, 2], [3]))             # [1, 2, 3]
list(pairwise([1, 2, 3]))            # [(1,2), (2,3)]  (3.10+)
```

In interviews, interviewers usually want you to write permutations/combinations by hand with backtracking, since that's the skill being tested. Use `itertools` for brute-force checks and in OAs.

Prefix sums with a leading zero, which makes `sum(nums[i:j]) == pre[j] - pre[i]`:

```python
pre = [0, *accumulate(nums)]
```

## functools

```python
from functools import cache, lru_cache, reduce, cmp_to_key

reduce(lambda a, b: a * b, nums, 1)   # product (or math.prod)
```

`cache` and `cmp_to_key` were covered in earlier lessons.

## math

```python
import math
math.inf
math.gcd(12, 18)        # 6   (math.gcd(*nums) in 3.9+)
math.lcm(4, 6)          # 12  (3.9+)
math.isqrt(17)          # 4   exact integer square root, no float error
math.comb(5, 2)         # 10  nCr
math.perm(5, 2)         # 20  nPr
math.factorial(5)       # 120
math.prod([2, 3, 4])    # 24
math.log2(8)            # 3.0
math.ceil(x), math.floor(x)
```

Prefer `math.isqrt(n)` to `int(n ** 0.5)`: for large n, the float square root can be off by one.

## Built-ins you'll lean on

`sum`, `min`, `max` (with `key=` and `default=`), `abs`, `divmod`, `pow(b, e, mod)`, `sorted`, `reversed`, `enumerate`, `zip`, `map`, `filter`, `any`, `all`, `len`, `range`, `bin`, `int(s, 2)`, `ord`, `chr`, `hash`, `id`, `isinstance`.

`max([], default=0)` avoids the "max() arg is an empty sequence" error.

::: exercise prefix-sums | Range sums with accumulate
`range_sums(nums, queries)` answers each `(i, j)` query with the sum of `nums[i..j]` inclusive, in O(1) per query after building prefix sums with `accumulate`.

--- starter
from itertools import accumulate

def range_sums(nums, queries):
    pass
--- tests
assert range_sums([-2, 0, 3, -5, 2, -1], [(0, 2), (2, 5), (0, 5)]) == [1, -1, -3]
assert range_sums([5], [(0, 0)]) == [5]
assert range_sums([1, 2, 3], []) == []
--- solution
from itertools import accumulate

def range_sums(nums, queries):
    pre = [0, *accumulate(nums)]
    return [pre[j + 1] - pre[i] for i, j in queries]
--- hint
`pre = [0, *accumulate(nums)]`, then the sum of `nums[i..j]` is `pre[j + 1] - pre[i]`.
:::

::: exercise gcd-array | GCD and LCM of a list
`gcd_lcm(nums)` returns a tuple `(gcd of all, lcm of all)` for a non-empty list of positive integers. Use `math` and `functools.reduce`.

--- starter
import math
from functools import reduce

def gcd_lcm(nums):
    pass
--- tests
assert gcd_lcm([12, 18, 24]) == (6, 72)
assert gcd_lcm([7]) == (7, 7)
assert gcd_lcm([4, 6]) == (2, 12)
--- solution
import math
from functools import reduce

def gcd_lcm(nums):
    return reduce(math.gcd, nums), reduce(lambda a, b: a * b // math.gcd(a, b), nums)
:::

::: exercise count-pairs-sum | Brute-force checker with combinations
Write `count_pairs(nums, target)` that counts index pairs `i < j` with `nums[i] + nums[j] == target`, using `itertools.combinations`. (This is the kind of brute force you'd use to check a faster solution.)

--- starter
from itertools import combinations

def count_pairs(nums, target):
    pass
--- tests
assert count_pairs([1, 2, 3, 4, 3], 6) == 2
assert count_pairs([1, 1, 1], 2) == 3
assert count_pairs([], 0) == 0
--- solution
from itertools import combinations

def count_pairs(nums, target):
    return sum(1 for a, b in combinations(nums, 2) if a + b == target)
:::
