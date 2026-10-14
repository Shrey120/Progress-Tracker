---
course: python
module: hashing
title: Dicts, sets and counting
level: Intermediate
icon: 📖
tagline: O(1) lookups and the patterns built on them
order: 9
---
=== lesson: dicts | Dictionaries
A `dict` is a hash map. Average O(1) for get, set, delete and `in`. Since Python 3.7 it remembers insertion order.

```python
d = {}
d = {"a": 1, "b": 2}
d = dict(zip(keys, values))
d["c"] = 3              # insert or overwrite
d["a"]                  # 1; KeyError if missing
d.get("z")              # None if missing
d.get("z", 0)           # default if missing
"a" in d                # key membership, O(1)
del d["a"]              # KeyError if missing
d.pop("b", None)        # remove and return, with a default
len(d)
```

## Iterating

```python
for k in d: ...                 # keys
for k, v in d.items(): ...      # pairs
for v in d.values(): ...
max(d, key=d.get)               # key with the largest value
```

Don't add or remove keys while iterating over a dict; it raises a RuntimeError. Iterate over `list(d)` if you must.

## Counting the long way

```python
counts = {}
for x in nums:
    counts[x] = counts.get(x, 0) + 1
```

This is fine, but the next lesson's `Counter` and `defaultdict` make it shorter.

## What can be a key

Keys must be **hashable**: ints, strings, tuples of hashables, frozensets, `None`. Lists, dicts and sets are not hashable. To key on a list, convert it: `tuple(lst)`.

## The pattern behind most "Easy" hash problems

Store what you've seen so far, then ask the dict a question about the current element in O(1). Two Sum is the canonical example: instead of checking every pair (O(n²)), remember each value's index and look up its complement.

```pyrun
def two_sum(nums, target):
    seen = {}                      # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i

# try it
print(two_sum([2, 7, 11, 15], 9))
```

::: exercise two-sum | Two Sum (LeetCode 1)
`two_sum(nums, target)` returns the indexes `[i, j]` (with `i < j`) of the two numbers that add up to `target`. Exactly one answer exists. Do it in one pass with a dict.

--- starter
def two_sum(nums, target):
    pass
--- tests
assert two_sum([2, 7, 11, 15], 9) == [0, 1]
assert two_sum([3, 2, 4], 6) == [1, 2]
assert two_sum([3, 3], 6) == [0, 1]
assert two_sum([-1, -2, -3, -4, -5], -8) == [2, 4]
--- solution
def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
--- hint
Check for the complement **before** inserting the current value, so `[3, 3]` works.
:::


::: exercise subarray-sum-k | Subarray sum equals K (LeetCode 560)
`subarray_sum(nums, k)` counts the contiguous subarrays whose sum is `k`. Numbers can be negative, so a sliding window won't work. Use prefix sums and a dict counting how often each prefix sum has occurred.

--- starter
def subarray_sum(nums, k):
    pass
--- tests
assert subarray_sum([1, 1, 1], 2) == 2
assert subarray_sum([1, 2, 3], 3) == 2
assert subarray_sum([1, -1, 0], 0) == 3
assert subarray_sum([], 0) == 0
--- solution
def subarray_sum(nums, k):
    seen = {0: 1}
    total = count = 0
    for x in nums:
        total += x
        count += seen.get(total - k, 0)
        seen[total] = seen.get(total, 0) + 1
    return count
--- hint
If the running sum is `total` now and was `total - k` at some earlier point, the elements in between sum to `k`. Start with `{0: 1}` for the empty prefix.
:::

=== lesson: counter-defaultdict | Counter and defaultdict
Both live in `collections` and remove the "is this key there yet?" boilerplate.

## `Counter`

```python
from collections import Counter

c = Counter("mississippi")    # Counter({'i': 4, 's': 4, 'p': 2, 'm': 1})
c["s"]                         # 4
c["z"]                         # 0, missing keys count as zero (and are NOT inserted)
c.most_common(2)               # [('i', 4), ('s', 4)]
c.update("ss")                 # add counts
c["s"] -= 1
Counter(a) == Counter(b)       # anagram check (O(n))
Counter(a) - Counter(b)        # subtract, dropping zero/negative counts
Counter(a) & Counter(b)        # min of each count (multiset intersection)
sum(c.values())                # total items
```

`most_common(k)` is O(n log k). With no argument it sorts everything.

## `defaultdict`

A dict that creates a default value the first time you touch a missing key:

```python
from collections import defaultdict

graph = defaultdict(list)
for u, v in edges:
    graph[u].append(v)        # no need to check if graph[u] exists
    graph[v].append(u)

groups = defaultdict(list)
for w in words:
    groups["".join(sorted(w))].append(w)

count = defaultdict(int)      # int() is 0
count[x] += 1
```

The argument is a **function** that makes the default: `list`, `int`, `set`, or `lambda: float('inf')`.

One trap: just *reading* `graph[node]` inserts an empty list for that node. If you then iterate over `graph` while doing that, you'll get a "dictionary changed size" error. Use `graph.get(node, [])` for read-only lookups.

::: exercise valid-anagram | Valid anagram (LeetCode 242)
`is_anagram(s, t)` returns whether `t` is a rearrangement of `s`.

--- starter
def is_anagram(s, t):
    pass
--- tests
assert is_anagram("anagram", "nagaram") == True
assert is_anagram("rat", "car") == False
assert is_anagram("", "") == True
assert is_anagram("ab", "a") == False
--- solution
from collections import Counter

def is_anagram(s, t):
    return Counter(s) == Counter(t)
:::


::: exercise group-anagrams | Group anagrams (LeetCode 49)
`group_anagrams(words)` groups words that are anagrams of each other. Return the groups in the order their first word appears, and keep words inside a group in input order.

--- starter
from collections import defaultdict

def group_anagrams(words):
    pass
--- tests
assert group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]) == [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]
assert group_anagrams([""]) == [[""]]
assert group_anagrams([]) == []
--- solution
from collections import defaultdict

def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        groups["".join(sorted(w))].append(w)
    return list(groups.values())
--- hint
Key each word by its sorted letters. Dicts keep insertion order, so `list(groups.values())` comes out in first-appearance order.
:::


::: exercise top-k-frequent | Top K frequent elements (LeetCode 347)
`top_k(nums, k)` returns the `k` most frequent values, most frequent first. Ties won't affect the tests.

--- starter
from collections import Counter

def top_k(nums, k):
    pass
--- tests
assert top_k([1, 1, 1, 2, 2, 3], 2) == [1, 2]
assert top_k([1], 1) == [1]
assert top_k([4, 4, 5, 5, 5, 6], 1) == [5]
--- solution
from collections import Counter

def top_k(nums, k):
    return [x for x, _ in Counter(nums).most_common(k)]
--- hint
`most_common(k)` gives `(value, count)` pairs. Interviewers may then ask for the O(n) bucket-sort version: index buckets by count.
:::

=== lesson: sets | Sets
A `set` is a hash set: unique, unordered, average O(1) add, remove and membership.

```python
s = set()                 # NOT {} — that's an empty dict
s = {1, 2, 3}
s = set(nums)             # dedupe, O(n)
s.add(4)
s.remove(4)               # KeyError if missing
s.discard(4)              # no error if missing
x in s                    # O(1) average — vs O(n) for a list
len(s)

a | b    # union            a.union(b)
a & b    # intersection     a.intersection(b)
a - b    # difference
a ^ b    # in exactly one
a <= b   # subset
```

Sets are unordered: never depend on iteration order. If you need sorted output, `sorted(s)`.

## `frozenset`

An immutable set, which is hashable, so it can be a dict key or a member of another set. Useful for memoising on "the set of things used so far" when bitmasks aren't convenient.

## The "convert to set first" move

Whenever an inner loop asks `if x in some_list`, ask whether a set would do. That single change is the difference between O(n²) and O(n) in many problems:

```python
banned = set(banned_list)
result = [w for w in words if w not in banned]
```

## Longest consecutive sequence

A great set problem. Only start counting from numbers that begin a run (`x - 1` not in the set), so each number is visited a constant number of times:

```pyrun
def longest_consecutive(nums):
    s = set(nums)
    best = 0
    for x in s:
        if x - 1 not in s:
            y = x
            while y + 1 in s:
                y += 1
            best = max(best, y - x + 1)
    return best

# try it
print(longest_consecutive([100, 4, 200, 1, 3, 2]))
```

::: exercise intersection | Intersection of two arrays (LeetCode 349)
`intersection(a, b)` returns the values that appear in both lists, each once, sorted ascending.

--- starter
def intersection(a, b):
    pass
--- tests
assert intersection([1, 2, 2, 1], [2, 2]) == [2]
assert intersection([4, 9, 5], [9, 4, 9, 8, 4]) == [4, 9]
assert intersection([], [1]) == []
--- solution
def intersection(a, b):
    return sorted(set(a) & set(b))
:::


::: exercise longest-consecutive | Longest consecutive sequence (LeetCode 128)
`longest_consecutive(nums)` returns the length of the longest run of consecutive integers that can be formed from the values (order in the list doesn't matter). Must be O(n): no sorting.

--- starter
def longest_consecutive(nums):
    pass
--- tests
assert longest_consecutive([100, 4, 200, 1, 3, 2]) == 4
assert longest_consecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1]) == 9
assert longest_consecutive([]) == 0
assert longest_consecutive([5, 5, 5]) == 1
assert longest_consecutive(list(range(200000, 0, -1))) == 200000
--- solution
def longest_consecutive(nums):
    s = set(nums)
    best = 0
    for x in s:
        if x - 1 not in s:
            y = x
            while y + 1 in s:
                y += 1
            best = max(best, y - x + 1)
    return best
--- hint
Only start counting at a number `x` where `x - 1` is not in the set.
:::
