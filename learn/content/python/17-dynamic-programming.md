---
course: python
module: dynamic-programming
title: Dynamic programming
level: Advanced
icon: 🧮
tagline: From recursion to memo to tables
order: 17
---
=== lesson: dp | Dynamic programming in Python
DP = recursion + reuse. Write it in three passes:

1. **Recursion**: define `f(state)` in words ("max money robbing houses `i..n-1`"), write the choices, write base cases.
2. **Memoise**: add `@cache`. Done for many interviews.
3. **Tabulate**: when depth or speed is a problem, fill a table in the order the recursion depends on, then shrink memory if each row only needs the previous one.

## The same problem three ways: House Robber

```pyrun
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

# try it
nums = [2, 7, 9, 3, 1]
print(rob_memo(nums), rob_table(nums), rob_o1(nums))
```

## 2D tables in Python

```python
dp = [[0] * (m + 1) for _ in range(n + 1)]     # never [[0] * (m + 1)] * (n + 1)
```

Index from 1 with a padding row and column of zeros: it removes the `i - 1 < 0` checks. LCS:

```pyrun
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

# try it
print(lcs('abcde', 'ace'))
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
