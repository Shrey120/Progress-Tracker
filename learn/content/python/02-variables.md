---
course: python
module: variables
title: Variables and numbers
level: Beginner
icon: 📦
tagline: Store values and do maths with them
order: 2
---
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

```pyrun
print(7 // 2)  # 3   (same as C++)
print(-7 // 2)  # -4  (C++ gives -3)
print(-7 % 2)  # 1   (C++ gives -1)
print(int(-7 / 2))  # -3  truncation, C++ style
```

This matters in problems like "reverse integer" or "evaluate reverse Polish notation", where the spec says *truncate toward zero*. Use `int(a / b)` for small numbers, or the exact form:

```pyrun
def div_trunc(a, b):
    q = abs(a) // abs(b)
    return q if (a < 0) == (b < 0) else -q

# try it
print(div_trunc(-7, 2), div_trunc(7, -2), div_trunc(7, 2))
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
