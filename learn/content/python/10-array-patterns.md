---
course: python
module: array-patterns
title: Array and string patterns
order: 10
---
=== lesson: two-pointers | Two pointers
Two indexes that move toward each other, or in the same direction at different speeds. They turn many O(n²) pair searches into O(n).

## Opposite ends (sorted input)

```python
def pair_with_sum(nums, target):        # nums sorted
    i, j = 0, len(nums) - 1
    while i < j:
        s = nums[i] + nums[j]
        if s == target:
            return [i, j]
        if s < target:
            i += 1          # need a bigger sum
        else:
            j -= 1          # need a smaller sum
    return [-1, -1]
```

## Same direction: read/write pointers

One pointer reads every element; the other marks where the next kept element is written. Used for "remove duplicates", "move zeroes", "remove element".

```python
def dedupe_sorted(nums):
    w = 0
    for x in nums:
        if w == 0 or x != nums[w - 1]:
            nums[w] = x
            w += 1
    return w            # new length
```

## 3Sum pattern

Sort, fix one element, two-pointer the rest, and skip duplicates at each level:

```python
def three_sum(nums):
    nums.sort()
    res = []
    for i in range(len(nums) - 2):
        if i and nums[i] == nums[i - 1]:
            continue
        lo, hi = i + 1, len(nums) - 1
        while lo < hi:
            s = nums[i] + nums[lo] + nums[hi]
            if s < 0:
                lo += 1
            elif s > 0:
                hi -= 1
            else:
                res.append([nums[i], nums[lo], nums[hi]])
                lo += 1
                while lo < hi and nums[lo] == nums[lo - 1]:
                    lo += 1
                hi -= 1
    return res
```

::: exercise three-sum | 3Sum (LeetCode 15)
`three_sum(nums)` returns all unique triplets that sum to 0. Each triplet is sorted ascending, and the list of triplets is sorted too (the template above already produces that order).

--- starter
def three_sum(nums):
    pass
--- tests
assert three_sum([-1, 0, 1, 2, -1, -4]) == [[-1, -1, 2], [-1, 0, 1]]
assert three_sum([0, 1, 1]) == []
assert three_sum([0, 0, 0, 0]) == [[0, 0, 0]]
assert three_sum([-2, 0, 1, 1, 2]) == [[-2, 0, 2], [-2, 1, 1]]
--- solution
def three_sum(nums):
    nums = sorted(nums)
    res = []
    for i in range(len(nums) - 2):
        if i and nums[i] == nums[i - 1]:
            continue
        lo, hi = i + 1, len(nums) - 1
        while lo < hi:
            s = nums[i] + nums[lo] + nums[hi]
            if s < 0:
                lo += 1
            elif s > 0:
                hi -= 1
            else:
                res.append([nums[i], nums[lo], nums[hi]])
                lo += 1
                while lo < hi and nums[lo] == nums[lo - 1]:
                    lo += 1
                hi -= 1
    return res
:::

::: exercise container-water | Container with most water (LeetCode 11)
`max_area(height)` returns the most water two lines can hold: `min(h[i], h[j]) * (j - i)`. O(n) with two pointers.

--- starter
def max_area(height):
    pass
--- tests
assert max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]) == 49
assert max_area([1, 1]) == 1
assert max_area([4, 3, 2, 1, 4]) == 16
--- solution
def max_area(height):
    i, j, best = 0, len(height) - 1, 0
    while i < j:
        best = max(best, min(height[i], height[j]) * (j - i))
        if height[i] < height[j]:
            i += 1
        else:
            j -= 1
    return best
--- hint
Always move the shorter line inward: keeping it can never give a larger area.
:::

=== lesson: sliding-window | Sliding window
A window `[left, right]` that grows on the right and shrinks on the left, keeping some property true. Each index enters and leaves once: O(n).

## Variable-size template

```python
def longest_window(s):
    left = 0
    state = {}            # whatever describes the window
    best = 0
    for right, ch in enumerate(s):
        # 1. add s[right] to the window
        state[ch] = state.get(ch, 0) + 1
        # 2. shrink while the window is invalid
        while state[ch] > 1:
            state[s[left]] -= 1
            left += 1
        # 3. the window is valid: record the answer
        best = max(best, right - left + 1)
    return best
```

That's "Longest substring without repeating characters". Change step 2's condition and you get most window problems:

- at most k distinct characters: `while len(state) > k` (delete keys that hit 0)
- longest repeating replacement: `while (right - left + 1) - max_count > k`
- minimum window (shortest valid): shrink **while valid**, recording inside the loop

## Fixed-size windows

Add the new element, remove the one that fell out:

```python
window = sum(nums[:k])
best = window
for i in range(k, len(nums)):
    window += nums[i] - nums[i - k]
    best = max(best, window)
```

Sliding windows need the window's property to change monotonically as it grows. With negative numbers and "sum equals k", use prefix sums with a dict instead (Hashing module).

::: exercise longest-unique | Longest substring without repeating characters (LeetCode 3)
`length_of_longest(s)` returns the length of the longest substring with no repeated characters.

--- starter
def length_of_longest(s):
    pass
--- tests
assert length_of_longest("abcabcbb") == 3
assert length_of_longest("bbbbb") == 1
assert length_of_longest("pwwkew") == 3
assert length_of_longest("") == 0
assert length_of_longest("abba") == 2
--- solution
def length_of_longest(s):
    last = {}
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best
:::

::: exercise min-window | Minimum size subarray sum (LeetCode 209)
`min_sub_len(target, nums)` returns the length of the shortest contiguous subarray of positive integers whose sum is at least `target`, or 0 if none.

--- starter
def min_sub_len(target, nums):
    pass
--- tests
assert min_sub_len(7, [2, 3, 1, 2, 4, 3]) == 2
assert min_sub_len(4, [1, 4, 4]) == 1
assert min_sub_len(11, [1, 1, 1, 1, 1, 1, 1, 1]) == 0
assert min_sub_len(15, [1, 2, 3, 4, 5]) == 5
--- solution
def min_sub_len(target, nums):
    left = total = 0
    best = float('inf')
    for right, x in enumerate(nums):
        total += x
        while total >= target:
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return 0 if best == float('inf') else best
--- hint
Shortest-valid windows: record the answer **inside** the shrinking loop.
:::

::: exercise char-replacement | Longest repeating character replacement (LeetCode 424)
`character_replacement(s, k)` returns the length of the longest substring you can make of one repeated letter by changing at most `k` characters. `s` is uppercase.

--- starter
def character_replacement(s, k):
    pass
--- tests
assert character_replacement("ABAB", 2) == 4
assert character_replacement("AABABBA", 1) == 4
assert character_replacement("A", 0) == 1
assert character_replacement("ABCDE", 1) == 2
--- solution
def character_replacement(s, k):
    count = {}
    left = max_f = best = 0
    for right, ch in enumerate(s):
        count[ch] = count.get(ch, 0) + 1
        max_f = max(max_f, count[ch])
        while (right - left + 1) - max_f > k:
            count[s[left]] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best
--- hint
A window is valid when `window length - count of its most frequent letter <= k`.
:::

=== lesson: binary-search | Binary search templates
Off-by-one errors in binary search come from mixing conventions. Pick one template and use it everywhere. This one finds the **first index where a condition becomes true**:

```python
def first_true(lo, hi, ok):        # search in [lo, hi); ok is False...False True...True
    while lo < hi:
        mid = (lo + hi) // 2
        if ok(mid):
            hi = mid               # mid might be the answer
        else:
            lo = mid + 1           # mid is definitely not
    return lo                      # == hi if nothing is True
```

Every binary search problem becomes "what's the monotonic condition?":

| Problem | Condition `ok(i)` |
|---|---|
| lower bound of x | `nums[i] >= x` |
| upper bound of x | `nums[i] > x` |
| first bad version | `isBad(i)` |
| min in rotated array | `nums[i] <= nums[-1]` |
| search insert position | `nums[i] >= target` |

## Binary search on the answer

When the answer is a number in a range and "can we do it with value v?" is monotonic, search over v. Koko Eating Bananas, Capacity to Ship Packages, Split Array Largest Sum, Aggressive Cows, Book Allocation all have this shape:

```python
def min_eating_speed(piles, h):
    def ok(speed):
        return sum((p + speed - 1) // speed for p in piles) <= h
    return first_true(1, max(piles) + 1, ok)
```

`bisect` already implements the sorted-array cases; this template handles the rest.

## The classic `lo <= hi` version

You'll also see this one, which returns as soon as it finds an exact match:

```python
lo, hi = 0, len(nums) - 1
while lo <= hi:
    mid = (lo + hi) // 2
    if nums[mid] == target:
        return mid
    if nums[mid] < target:
        lo = mid + 1
    else:
        hi = mid - 1
return -1
```

Both are fine. Don't mix their update rules.

::: exercise koko | Koko eating bananas (LeetCode 875)
`min_speed(piles, h)` returns the smallest integer eating speed `k` such that all piles are finished within `h` hours. Each hour Koko eats up to `k` bananas from one pile.

--- starter
def min_speed(piles, h):
    pass
--- tests
assert min_speed([3, 6, 7, 11], 8) == 4
assert min_speed([30, 11, 23, 4, 20], 5) == 30
assert min_speed([30, 11, 23, 4, 20], 6) == 23
assert min_speed([1000000000], 2) == 500000000
--- solution
def min_speed(piles, h):
    lo, hi = 1, max(piles)
    while lo < hi:
        mid = (lo + hi) // 2
        if sum((p + mid - 1) // mid for p in piles) <= h:
            hi = mid
        else:
            lo = mid + 1
    return lo
--- hint
`ok(speed)`: total hours `sum(ceil(p / speed))` is at most `h`. Find the first speed where that's true.
:::

::: exercise rotated-min | Minimum in rotated sorted array (LeetCode 153)
`find_min(nums)` returns the minimum of a sorted array of distinct values that was rotated, in O(log n).

--- starter
def find_min(nums):
    pass
--- tests
assert find_min([3, 4, 5, 1, 2]) == 1
assert find_min([4, 5, 6, 7, 0, 1, 2]) == 0
assert find_min([11, 13, 15, 17]) == 11
assert find_min([2, 1]) == 1
assert find_min([5]) == 5
--- solution
def find_min(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] <= nums[-1]:
            hi = mid
        else:
            lo = mid + 1
    return nums[lo]
--- hint
Elements in the lower (rotated-to-the-end) part are `<= nums[-1]`; the minimum is the first such index.
:::

=== lesson: stacks-monotonic | Stacks and monotonic stacks
A plain list is the stack. Two families of problems:

## Matching and nesting

Push openers, pop on closers:

```python
def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    st = []
    for ch in s:
        if ch in pairs:
            if not st or st.pop() != pairs[ch]:
                return False
        else:
            st.append(ch)
    return not st
```

## Monotonic stack: next greater / smaller element

Keep a stack of indexes whose values are decreasing. When a bigger value arrives, it's the "next greater element" for everything it pops:

```python
def next_greater(nums):
    res = [-1] * len(nums)
    st = []                           # indexes, values decreasing
    for i, x in enumerate(nums):
        while st and nums[st[-1]] < x:
            res[st.pop()] = x
        st.append(i)
    return res
```

Each index is pushed and popped once: O(n). Variations:

- previous greater: scan left to right, the answer is whatever is on top **after** popping
- next smaller: flip the comparison
- circular array: loop `for i in range(2 * n)` with `nums[i % n]`
- daily temperatures: store `i - j` instead of the value
- largest rectangle in histogram, trapping rain water, stock span, sum of subarray minimums all build on it

::: exercise valid-parens | Valid parentheses (LeetCode 20)
`is_valid(s)` returns whether every bracket in `s` is closed by the right type in the right order.

--- starter
def is_valid(s):
    pass
--- tests
assert is_valid("()[]{}") == True
assert is_valid("([)]") == False
assert is_valid("{[]}") == True
assert is_valid("(") == False
assert is_valid("]") == False
assert is_valid("") == True
--- solution
def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    st = []
    for ch in s:
        if ch in pairs:
            if not st or st.pop() != pairs[ch]:
                return False
        else:
            st.append(ch)
    return not st
:::

::: exercise daily-temps | Daily temperatures (LeetCode 739)
`daily_temperatures(t)` returns, for each day, how many days you wait for a warmer one (0 if never). O(n) with a monotonic stack.

--- starter
def daily_temperatures(t):
    pass
--- tests
assert daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]) == [1, 1, 4, 2, 1, 1, 0, 0]
assert daily_temperatures([30, 40, 50, 60]) == [1, 1, 1, 0]
assert daily_temperatures([30, 30]) == [0, 0]
--- solution
def daily_temperatures(t):
    res = [0] * len(t)
    st = []
    for i, x in enumerate(t):
        while st and t[st[-1]] < x:
            j = st.pop()
            res[j] = i - j
        st.append(i)
    return res
:::

::: exercise largest-rect | Largest rectangle in histogram (LeetCode 84)
`largest_rectangle(heights)` returns the area of the largest rectangle in the histogram. O(n) with a stack of increasing heights.

--- starter
def largest_rectangle(heights):
    pass
--- tests
assert largest_rectangle([2, 1, 5, 6, 2, 3]) == 10
assert largest_rectangle([2, 4]) == 4
assert largest_rectangle([1]) == 1
assert largest_rectangle([3, 3, 3]) == 9
--- solution
def largest_rectangle(heights):
    st = []          # indexes, heights increasing
    best = 0
    for i, h in enumerate(heights + [0]):
        while st and heights[st[-1]] >= h:
            height = heights[st.pop()]
            left = st[-1] if st else -1
            best = max(best, height * (i - left - 1))
        st.append(i)
    return best
--- hint
When a bar is popped, the bar that popped it is its right boundary and the new stack top is its left boundary. Append a 0 at the end to flush the stack.
:::
