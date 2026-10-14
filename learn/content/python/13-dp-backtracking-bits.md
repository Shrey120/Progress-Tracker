---
course: python
module: dp-backtracking-bits
title: DP, backtracking and bits
order: 13
---
=== lesson: dp | Dynamic programming in Python
DP = recursion + reuse. Write it in three passes:

1. **Recursion**: define `f(state)` in words ("max money robbing houses `i..n-1`"), write the choices, write base cases.
2. **Memoise**: add `@cache`. Done for many interviews.
3. **Tabulate**: when depth or speed is a problem, fill a table in the order the recursion depends on, then shrink memory if each row only needs the previous one.

## The same problem three ways: House Robber

```python
from functools import cache

def rob_memo(nums):
    @cache
    def f(i):                      # best from house i onward
        if i >= len(nums):
            return 0
        return max(f(i + 1), nums[i] + f(i + 2))
    return f(0)

def rob_table(nums):
    n = len(nums)
    dp = [0] * (n + 2)
    for i in range(n - 1, -1, -1):
        dp[i] = max(dp[i + 1], nums[i] + dp[i + 2])
    return dp[0]

def rob_o1(nums):
    take = skip = 0               # best ending with / without robbing the previous house
    for x in nums:
        take, skip = skip + x, max(take, skip)
    return max(take, skip)
```

## 2D tables in Python

```python
dp = [[0] * (m + 1) for _ in range(n + 1)]     # never [[0] * (m + 1)] * (n + 1)
```

Index from 1 with a padding row and column of zeros: it removes the `i - 1 < 0` checks. LCS:

```python
def lcs(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[n][m]
```

## Families on the Striver sheet

| Family | State | Examples |
|---|---|---|
| 1D | index | climbing stairs, house robber, frog jump |
| Grid | (row, col) | unique paths, min path sum, triangle, cherry pickup |
| Subsequence/knapsack | (index, capacity) | subset sum, coin change, 0/1 knapsack, target sum |
| Strings | (i, j) in two strings | LCS, edit distance, wildcard matching |
| Stocks | (index, holding, transactions) | buy/sell stock I–VI |
| LIS | index (+ previous) | LIS, largest divisible subset |
| Partition / MCM | (i, j) range | matrix chain, burst balloons, palindrome partitioning |

## Python-specific advice

- `@cache` with tuple-free int arguments is the fastest memo. Avoid passing lists.
- Use `float('inf')` / `-float('inf')` for "impossible" in min/max DPs, and check for it at the end.
- Coin change style "unbounded" knapsack: loop amount ascending inside the coin loop. 0/1 knapsack with a 1D array: loop capacity **descending**, so each item is used once.

::: exercise coin-change | Coin change (LeetCode 322)
`coin_change(coins, amount)` returns the fewest coins that make `amount`, or `-1`. Write it bottom-up.

--- starter
def coin_change(coins, amount):
    pass
--- tests
assert coin_change([1, 2, 5], 11) == 3
assert coin_change([2], 3) == -1
assert coin_change([1], 0) == 0
assert coin_change([186, 419, 83, 408], 6249) == 20
--- solution
def coin_change(coins, amount):
    INF = float('inf')
    dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return dp[amount] if dp[amount] != INF else -1
:::

::: exercise lcs | Longest common subsequence (LeetCode 1143)
`lcs(a, b)` returns the length of the longest common subsequence of two strings.

--- starter
def lcs(a, b):
    pass
--- tests
assert lcs("abcde", "ace") == 3
assert lcs("abc", "abc") == 3
assert lcs("abc", "def") == 0
assert lcs("", "a") == 0
--- solution
def lcs(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[n][m]
:::

::: exercise subset-sum | Partition equal subset sum (LeetCode 416)
`can_partition(nums)` returns whether the positive numbers can be split into two groups with equal sums. Use a 1D boolean DP (or a set of reachable sums).

--- starter
def can_partition(nums):
    pass
--- tests
assert can_partition([1, 5, 11, 5]) == True
assert can_partition([1, 2, 3, 5]) == False
assert can_partition([2, 2]) == True
assert can_partition([1]) == False
--- solution
def can_partition(nums):
    total = sum(nums)
    if total % 2:
        return False
    target = total // 2
    dp = [True] + [False] * target
    for x in nums:
        for s in range(target, x - 1, -1):
            if dp[s - x]:
                dp[s] = True
    return dp[target]
--- hint
`dp[s]` = can some subset sum to `s`. For each number, update `s` from high to low so it's used at most once.
:::

=== lesson: backtracking | Backtracking
Build a candidate step by step; undo each step after exploring it. The template:

```python
def backtrack(state, choices):
    if is_complete(state):
        res.append(state[:])        # COPY
        return
    for choice in choices:
        if not valid(choice):
            continue
        state.append(choice)        # do
        backtrack(state, next_choices)
        state.pop()                 # undo
```

## Three shapes you must know cold

```python
def subsets(nums):                  # take/skip from index onward
    res = []
    def go(start, path):
        res.append(path[:])
        for i in range(start, len(nums)):
            path.append(nums[i])
            go(i + 1, path)
            path.pop()
    go(0, [])
    return res

def permutations(nums):             # use each element once, any order
    res, used = [], [False] * len(nums)
    def go(path):
        if len(path) == len(nums):
            res.append(path[:])
            return
        for i in range(len(nums)):
            if not used[i]:
                used[i] = True
                path.append(nums[i])
                go(path)
                path.pop()
                used[i] = False
    go([])
    return res

def combination_sum(cands, target):  # reuse allowed: recurse with i, not i + 1
    res = []
    def go(start, path, remaining):
        if remaining == 0:
            res.append(path[:]); return
        for i in range(start, len(cands)):
            if cands[i] <= remaining:
                path.append(cands[i])
                go(i, path, remaining - cands[i])
                path.pop()
    go(0, [], target)
    return res
```

## Duplicates in the input

Sort first, then skip a value equal to the previous one **at the same level**: `if i > start and nums[i] == nums[i - 1]: continue`. That's Subsets II and Combination Sum II.

## Pruning

Sort candidates ascending and `break` (not `continue`) once a candidate exceeds what's left. N-Queens prunes with sets of used columns and diagonals (`r - c` and `r + c`).

::: exercise permutations | Permutations (LeetCode 46)
`permute(nums)` returns all permutations of distinct numbers, in the order produced by trying indexes left to right (the template above).

--- starter
def permute(nums):
    pass
--- tests
assert permute([1, 2, 3]) == [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]
assert permute([0, 1]) == [[0, 1], [1, 0]]
assert permute([1]) == [[1]]
--- solution
def permute(nums):
    res, used = [], [False] * len(nums)
    def go(path):
        if len(path) == len(nums):
            res.append(path[:])
            return
        for i in range(len(nums)):
            if not used[i]:
                used[i] = True
                path.append(nums[i])
                go(path)
                path.pop()
                used[i] = False
    go([])
    return res
:::

::: exercise combination-sum-2 | Combination sum II (LeetCode 40)
`combination_sum2(cands, target)` returns unique combinations (each candidate used at most once) summing to `target`. Sort first; each combination ascending; the list in the order your sorted backtracking produces.

--- starter
def combination_sum2(cands, target):
    pass
--- tests
assert combination_sum2([10, 1, 2, 7, 6, 1, 5], 8) == [[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]
assert combination_sum2([2, 5, 2, 1, 2], 5) == [[1, 2, 2], [5]]
assert combination_sum2([3], 1) == []
--- solution
def combination_sum2(cands, target):
    cands = sorted(cands)
    res = []
    def go(start, path, remaining):
        if remaining == 0:
            res.append(path[:])
            return
        for i in range(start, len(cands)):
            if i > start and cands[i] == cands[i - 1]:
                continue
            if cands[i] > remaining:
                break
            path.append(cands[i])
            go(i + 1, path, remaining - cands[i])
            path.pop()
    go(0, [], target)
    return res
--- hint
Skip `cands[i] == cands[i - 1]` when `i > start`, and `break` once a candidate is bigger than what remains.
:::

::: exercise n-queens | N-Queens count (LeetCode 52)
`total_n_queens(n)` returns the number of ways to place n non-attacking queens on an n×n board. Track used columns and both diagonals in sets.

--- starter
def total_n_queens(n):
    pass
--- tests
assert total_n_queens(1) == 1
assert total_n_queens(4) == 2
assert total_n_queens(6) == 4
assert total_n_queens(8) == 92
--- solution
def total_n_queens(n):
    cols, d1, d2 = set(), set(), set()
    def go(r):
        if r == n:
            return 1
        count = 0
        for c in range(n):
            if c in cols or r - c in d1 or r + c in d2:
                continue
            cols.add(c); d1.add(r - c); d2.add(r + c)
            count += go(r + 1)
            cols.remove(c); d1.remove(r - c); d2.remove(r + c)
        return count
    return go(0)
:::

=== lesson: bits | Bit manipulation in Python
## Operators

| Op | Meaning | Example |
|---|---|---|
| `a & b` | and | `6 & 3 == 2` |
| `a \| b` | or | `6 \| 3 == 7` |
| `a ^ b` | xor | `6 ^ 3 == 5` |
| `~a` | not | `~5 == -6` |
| `a << k` | multiply by 2ᵏ | `1 << 4 == 16` |
| `a >> k` | floor-divide by 2ᵏ | `-5 >> 1 == -3` |

## Tricks you'll use

```python
x & 1                 # odd?
x & (x - 1)           # clear the lowest set bit; == 0 means power of two (for x > 0)
x & -x                # isolate the lowest set bit
(x >> i) & 1          # i-th bit
x | (1 << i)          # set bit i
x & ~(1 << i)         # clear bit i
x ^ (1 << i)          # toggle bit i
bin(x)                # '0b1011'
x.bit_count()         # popcount (3.10+); bin(x).count("1") otherwise
x.bit_length()        # number of bits needed
int("1011", 2)        # 11
```

XOR facts: `a ^ a == 0`, `a ^ 0 == a`, order doesn't matter. XOR-ing everything finds the single non-duplicated number.

## The Python difference: unbounded ints

Python ints have no fixed width, and negative numbers behave as if they had infinitely many leading 1s. So `~5` is `-6`, not `4294967290`, and problems that assume 32-bit overflow (Sum of Two Integers, Reverse Bits, Number of 1 Bits on negative input) need a mask:

```python
MASK = 0xFFFFFFFF
x & MASK                         # view as unsigned 32-bit
x if x <= 0x7FFFFFFF else ~(x ^ MASK)   # back to a signed 32-bit int
```

## Subsets as bitmasks

For n up to about 20, every subset is a number from `0` to `2ⁿ - 1`:

```python
for mask in range(1 << n):
    subset = [nums[i] for i in range(n) if mask >> i & 1]
```

Bitmask DP (TSP-like problems, "visit all nodes") uses masks as part of the memo key.

::: exercise single-number | Single number (LeetCode 136)
Every element appears twice except one. `single_number(nums)` returns it in O(n) time and O(1) space.

--- starter
def single_number(nums):
    pass
--- tests
assert single_number([2, 2, 1]) == 1
assert single_number([4, 1, 2, 1, 2]) == 4
assert single_number([-3]) == -3
--- solution
def single_number(nums):
    x = 0
    for v in nums:
        x ^= v
    return x
:::

::: exercise power-of-two | Power of two and bit counts
Write `is_power_of_two(n)` (no loops) and `count_bits(n)` returning a list where index `i` holds the number of 1 bits in `i`, for `0..n`, in O(n) using `ans[i] = ans[i >> 1] + (i & 1)`.

--- starter
def is_power_of_two(n):
    pass

def count_bits(n):
    pass
--- tests
assert is_power_of_two(1) == True
assert is_power_of_two(16) == True
assert is_power_of_two(6) == False
assert is_power_of_two(0) == False
assert is_power_of_two(-8) == False
assert count_bits(5) == [0, 1, 1, 2, 1, 2]
--- solution
def is_power_of_two(n):
    return n > 0 and n & (n - 1) == 0

def count_bits(n):
    ans = [0] * (n + 1)
    for i in range(1, n + 1):
        ans[i] = ans[i >> 1] + (i & 1)
    return ans
:::

::: exercise subsets-mask | Subsets with bitmasks
`subsets_mask(nums)` returns all subsets by iterating masks `0` to `2ⁿ - 1`; for each mask, take `nums[i]` for each set bit `i` in increasing `i`.

--- starter
def subsets_mask(nums):
    pass
--- tests
assert subsets_mask([1, 2, 3]) == [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
assert subsets_mask([]) == [[]]
--- solution
def subsets_mask(nums):
    n = len(nums)
    return [[nums[i] for i in range(n) if mask >> i & 1] for mask in range(1 << n)]
:::
