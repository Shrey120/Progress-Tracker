---
course: python
module: start
title: Getting started
order: 1
---
=== lesson: how-this-works | How this course works
You already know how to program. This course is about the parts of Python that matter when you sit down to solve a DSA problem: what each line does, what it costs, and the idiom an interviewer expects to see.

## The order

1. **Core language** — types, operators, strings, control flow, lists, dicts and sets, functions, classes.
2. **The toolbox** — `collections`, `heapq`, `bisect`, `itertools`, `functools`, `math`. These are why Python solutions are short.
3. **Costs** — the Big-O of every built-in you will use, and the traps that turn O(n) into O(n²).
4. **Patterns in Python** — two pointers, sliding window, binary search, stacks, linked lists, trees, graphs, DP, backtracking, bits.

Work through it in order the first time. Later, use it as a reference while you do the Striver sheet: when a sheet section starts (say, Heaps), reread the matching lesson the day before.

## Running code

Every exercise has an editor and a **Run tests** button. Python runs inside your browser, so the first run takes a few seconds while it loads; after that, runs are instant. `print()` output appears under the editor, which is the fastest way to debug.

- A row of squares shows one square per test. Teal passes, brick fails.
- A failing equality test tells you what it expected and what your code returned.
- A run that takes longer than 8 seconds is stopped, which almost always means an infinite loop or recursion with no base case.
- Your code is saved as you type. **Reset code** brings back the starter.

## Coming from C++

You used C++ for LeetCode before, so here is the map in your head, translated:

| C++ | Python |
|---|---|
| `vector<int>` | `list` |
| `unordered_map<K,V>` | `dict` |
| `unordered_set<T>` | `set` |
| `map<K,V>` (ordered) | no built-in; sort keys, or use `bisect` on a sorted list |
| `priority_queue` (max-heap) | `heapq` (min-heap only; push negatives for max) |
| `deque`, `queue`, `stack` | `collections.deque`; a `list` works as a stack |
| `pair<int,int>` | `tuple` — `(a, b)` |
| `INT_MAX` | `float('inf')` or `math.inf` |
| `long long` overflow | ints never overflow in Python |
| `for (int i=0;i<n;i++)` | `for i in range(n):` |
| `a/b` on ints | `a // b` (and it floors, not truncates — see Operators) |

The two that bite most often: there is no ordered map, and integer division rounds toward negative infinity.

=== lesson: leetcode-format | The LeetCode format in Python
On LeetCode, Python solutions live inside a class:

```python
from typing import List, Optional

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, x in enumerate(nums):
            if target - x in seen:
                return [seen[target - x], i]
            seen[x] = i
```

Things worth knowing about this template:

- `self` is the first parameter of every method. You can ignore it, but you must keep it.
- The type hints (`List[int]`, `Optional[TreeNode]`) are only documentation. Python does not check them. Modern Python also accepts `list[int]`, which LeetCode supports.
- **Helper functions** can be nested inside the method (they see the method's variables) or written as another method and called with `self.helper(...)`.
- LeetCode imports most of the standard library for you (`collections`, `heapq`, `math`...), but write the imports anyway — interviewers notice, and other judges don't do it.
- State that must persist across calls on the same object goes on `self`. State that must not persist (almost everything) stays local, because LeetCode may reuse the object between test cases.

```python
class Solution:
    def maxDepth(self, root) -> int:
        def depth(node):          # nested helper: sees nothing it doesn't need
            if not node:
                return 0
            return 1 + max(depth(node.left), depth(node.right))
        return depth(root)
```

In this course, exercises ask for plain functions so the tests can call them directly. Wrapping one in `class Solution` is mechanical.

::: exercise solution-class | Write a method inside Solution
Complete `Solution.containsDuplicate`, which returns `True` when any value appears at least twice in `nums`.

--- starter
from typing import List

class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        pass
--- tests
assert Solution().containsDuplicate([1, 2, 3, 1]) == True
assert Solution().containsDuplicate([1, 2, 3, 4]) == False
assert Solution().containsDuplicate([]) == False
--- solution
from typing import List

class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        return len(set(nums)) != len(nums)
--- hint
A `set` keeps one copy of each value. Compare sizes.
:::

=== lesson: variables-types | Variables and core types
Variables are names bound to objects. There are no declarations and no fixed types: `x = 5` then `x = "five"` is legal (and in real code, a smell).

## The types you will use in DSA

| Type | Example | Mutable? | Notes |
|---|---|---|---|
| `int` | `42`, `-7`, `10**18` | no | unlimited size, never overflows |
| `float` | `3.14`, `float('inf')` | no | 64-bit double; avoid for exact comparisons |
| `bool` | `True`, `False` | no | a subclass of `int`: `True + True == 2` |
| `str` | `"abc"` | no | Unicode text |
| `NoneType` | `None` | no | "nothing"; what a function returns by default |
| `list` | `[1, 2, 3]` | yes | dynamic array |
| `tuple` | `(1, 2)` | no | fixed record; hashable if its contents are |
| `dict` | `{"a": 1}` | yes | hash map, keeps insertion order |
| `set` | `{1, 2}` | yes | hash set; `set()` for empty (`{}` is an empty dict) |

## Truthiness

Every value is truthy or falsy in an `if`. Falsy: `0`, `0.0`, `""`, `[]`, `{}`, `set()`, `()`, `None`, `False`. Everything else is truthy. That's why you'll see:

```python
if not nums:       # empty list
    return 0
while stack:       # until the stack is empty
    stack.pop()
if node:           # node is not None
    ...
```

> Careful with `if x:` when `x` can legitimately be `0`. If you mean "is not None", write `if x is not None:`.

## Multiple assignment and swapping

```python
a, b = 1, 2
a, b = b, a            # swap, no temp variable
x = y = 0              # both names point at the same 0
i, (j, k) = 1, (2, 3)  # unpacking nests
first, *rest = [1, 2, 3, 4]   # first = 1, rest = [2, 3, 4]
```

The right-hand side is evaluated fully before anything is assigned, which is why the swap works. Linked-list reversal relies on this:

```python
prev, curr = None, head
while curr:
    curr.next, prev, curr = prev, curr, curr.next
```

## Infinity

`float('inf')` and `-float('inf')` (or `math.inf`) compare correctly with any int, which makes them the natural starting value for min/max tracking:

```python
best = float('inf')
for x in nums:
    best = min(best, x)
```

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

=== lesson: operators | Operators and number gotchas
## Arithmetic

| Operator | Meaning | Example |
|---|---|---|
| `/` | true division, always a float | `7 / 2 == 3.5`, `4 / 2 == 2.0` |
| `//` | floor division | `7 // 2 == 3` |
| `%` | modulo, sign follows the divisor | `-7 % 3 == 2` |
| `**` | power | `2 ** 10 == 1024` |
| `divmod(a, b)` | `(a // b, a % b)` | `divmod(17, 5) == (3, 2)` |
| `abs(x)` | absolute value | |
| `pow(a, b, m)` | `a**b % m`, fast | modular exponentiation for free |

## The floor-division trap

C++ truncates toward zero; Python floors toward negative infinity.

```python
7 // 2      # 3   (same as C++)
-7 // 2     # -4  (C++ gives -3)
-7 % 2      # 1   (C++ gives -1)
int(-7 / 2) # -3  truncation, C++ style
```

This matters in problems like "reverse integer" or "evaluate reverse Polish notation", where the spec says *truncate toward zero*. Use `int(a / b)` for small numbers, or the exact form:

```python
def div_trunc(a, b):
    q = abs(a) // abs(b)
    return q if (a < 0) == (b < 0) else -q
```

For midpoints in binary search, `(lo + hi) // 2` is safe: Python ints don't overflow, so you don't need the C++ `lo + (hi - lo) / 2` trick (it still works if you prefer it).

## Comparison and logic

- Comparisons chain: `0 <= i < n` means `0 <= i and i < n`.
- `and`, `or`, `not` are words. They short-circuit, and they return one of their operands, not necessarily a bool: `x or default` gives `default` when `x` is falsy.
- `==` compares values; `is` compares identity. Use `is` only with `None` (`if node is None`).

## Rounding

`round(2.5) == 2` and `round(3.5) == 4` — Python rounds halves to the nearest even number. For "round half up", use `math.floor(x + 0.5)`. For ceiling division of positive ints, avoid floats entirely:

```python
pages = (n + k - 1) // k     # ceil(n / k) without floats
pages = -(-n // k)           # same thing, another common spelling
```

Ceil division shows up constantly in binary-search-on-answer problems (Koko eating bananas, ship packages).

## Big numbers and the modulus

Because ints are unbounded, `10**18 * 10**18` is exact. Problems still ask for answers "modulo 1e9+7" — take the mod as you go to keep numbers small and fast:

```python
MOD = 10**9 + 7       # an int; 1e9+7 would be a float
total = (total + x) % MOD
```

::: exercise ceil-div | Ceiling division without floats
`ceil_div(a, b)` returns the ceiling of `a / b` for positive integers. Don't use floats or `math.ceil` — this has to stay exact for very large numbers.

--- starter
def ceil_div(a, b):
    pass
--- tests
assert ceil_div(7, 2) == 4
assert ceil_div(8, 2) == 4
assert ceil_div(1, 5) == 1
assert ceil_div(10**30 + 1, 10**15) == 10**15 + 1
--- solution
def ceil_div(a, b):
    return (a + b - 1) // b
--- hint
`(a + b - 1) // b`, or `-(-a // b)`.
:::

::: exercise trunc-div | Division that truncates toward zero
`trunc_div(a, b)` divides two integers and truncates toward zero, as C++ and Java do. `b` is never 0. Avoid floats so it stays exact for large values.

--- starter
def trunc_div(a, b):
    pass
--- tests
assert trunc_div(7, 2) == 3
assert trunc_div(-7, 2) == -3
assert trunc_div(7, -2) == -3
assert trunc_div(-7, -2) == 3
assert trunc_div(-(10**30) - 1, 10**15) == -(10**15)
--- solution
def trunc_div(a, b):
    q = abs(a) // abs(b)
    return q if (a < 0) == (b < 0) else -q
--- hint
Divide the absolute values, then put the sign back: the result is negative when exactly one of `a`, `b` is negative.
:::

::: exercise last-digit | Digits with % and //
`digit_sum(n)` returns the sum of the decimal digits of a non-negative integer, using `%` and `//` (no string conversion).

--- starter
def digit_sum(n):
    pass
--- tests
assert digit_sum(0) == 0
assert digit_sum(9) == 9
assert digit_sum(12345) == 15
assert digit_sum(10**50) == 1
--- solution
def digit_sum(n):
    total = 0
    while n:
        total += n % 10
        n //= 10
    return total
--- hint
`n % 10` is the last digit; `n // 10` drops it.
:::

=== lesson: input-output | Input and output
LeetCode passes arguments to your function, so you rarely read input. But online assessments (HackerRank, CodeChef-style rounds, many Indian company OAs) give you raw stdin. Know both.

## Reading input

```python
n = int(input())                        # one integer on a line
a, b = map(int, input().split())        # two integers on a line
nums = list(map(int, input().split()))  # a whole line of integers
grid = [input() for _ in range(rows)]   # several lines of text
```

`input()` returns one line as a string without the newline. `split()` with no argument splits on any whitespace and ignores repeats.

## Fast input for big tests

`input()` is slow when a test has 10⁵+ lines. Read everything at once:

```python
import sys
data = sys.stdin.buffer.read().split()   # every token, as bytes
n = int(data[0])
nums = list(map(int, data[1:1 + n]))
```

Or line by line, faster than `input()`:

```python
import sys
input = sys.stdin.readline     # note: keeps the trailing "\n"; strip if you read strings
n = int(input())
```

## Printing

```python
print(a, b)                  # "3 4" — space separated by default
print(a, b, sep=",")         # "3,4"
print(*nums)                 # spread a list: "1 2 3"
print(x, end="")             # no newline
print(f"{name}: {score:.2f}")  # f-string with formatting
```

Printing thousands of lines one `print` at a time is slow. Build one string:

```python
print("\n".join(map(str, answers)))
```

## The solve() pattern

Wrap the logic in a function and keep input parsing separate. It's faster (local variables are quicker than globals) and it lets you test the logic directly:

```python
import sys

def solve(nums):
    return sum(nums)

def main():
    data = sys.stdin.read().split()
    t = int(data[0]); idx = 1
    out = []
    for _ in range(t):
        n = int(data[idx]); idx += 1
        nums = list(map(int, data[idx:idx + n])); idx += n
        out.append(str(solve(nums)))
    print("\n".join(out))

main()
```

::: exercise read-tests | Parse a multi-test-case input
The input (already fed to stdin when you run) is: a line with `t`, then for each test case a line with `n` followed by a line with `n` integers. Write `main()` so it reads stdin and **returns** a list with the maximum of each test case. (Returning instead of printing lets the tests check it.)

The stdin for this exercise is:

```
3
4
3 9 -2 5
1
-7
3
0 0 1
```

--- starter
import sys

def main():
    data = sys.stdin.read().split()
    # your parsing here
    pass
--- stdin
3
4
3 9 -2 5
1
-7
3
0 0 1
--- tests
import io, sys; sys.stdin = io.StringIO("3\n4\n3 9 -2 5\n1\n-7\n3\n0 0 1\n"); assert main() == [9, -7, 1]
import io, sys; sys.stdin = io.StringIO("1\n2\n5 5\n"); assert main() == [5]
--- solution
import sys

def main():
    data = sys.stdin.read().split()
    t = int(data[0]); idx = 1
    res = []
    for _ in range(t):
        n = int(data[idx]); idx += 1
        res.append(max(map(int, data[idx:idx + n]))); idx += n
    return res
--- hint
Keep an index into `data`. Read `t`, then for each case read `n`, slice the next `n` tokens, convert with `map(int, ...)`.
:::

::: exercise format-out | Format output in one go
`render(rows)` takes a list of lists of numbers and returns the text you would print: each row's numbers separated by single spaces, rows separated by newlines, no trailing newline.

--- starter
def render(rows):
    pass
--- tests
assert render([[1, 2, 3], [4, 5, 6]]) == "1 2 3\n4 5 6"
assert render([[7]]) == "7"
assert render([]) == ""
--- solution
def render(rows):
    return "\n".join(" ".join(map(str, row)) for row in rows)
--- hint
`" ".join(...)` needs strings, so `map(str, row)` first.
:::
