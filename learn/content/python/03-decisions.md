---
course: python
module: decisions
title: Making decisions
level: Beginner
icon: 🔀
tagline: True and False, if, elif and else
order: 3
---
=== lesson: booleans-comparisons | True, False and comparisons
Programs make decisions with questions that have a yes/no answer. In Python, the answers are `True` and `False` (capitalised), and they're called **booleans**.

## Comparison operators

| Operator | Means | Example | Result |
|---|---|---|---|
| `==` | equal to | `5 == 5` | `True` |
| `!=` | not equal to | `5 != 3` | `True` |
| `<`, `>` | less / greater than | `2 < 1` | `False` |
| `<=`, `>=` | or equal | `3 >= 3` | `True` |

```pyrun
age = 25
print(age >= 18)
print(age == 30)
print("apple" < "banana")   # strings compare alphabetically
```

> `=` **stores** a value (`x = 5`). `==` **asks** whether two values are equal (`x == 5`). Mixing them up is the most common beginner bug.

## Combining questions: and, or, not

- `a and b` is True only when **both** are True.
- `a or b` is True when **at least one** is True.
- `not a` flips True and False.

```pyrun
hours = 6
has_coffee = True
print(hours >= 7 and has_coffee)
print(hours >= 7 or has_coffee)
print(not has_coffee)
```

Python also lets you chain comparisons the way you'd write them in maths: `0 <= x < 10`.

## Truthy and falsy

Any value can be used where Python expects True/False. These count as **False**: `0`, `0.0`, `""` (empty text), `[]` (empty list), `{}`, `None`. Everything else counts as True.

```pyrun
print(bool(0), bool(42), bool(""), bool("hi"), bool([]), bool([1]))
```

That's why `if nums:` means "if the list is not empty". You'll see it everywhere in DSA code.

::: exercise in-range | Check a range
`is_teen(age)` returns `True` when `age` is from 13 to 19 inclusive, otherwise `False`. Write it as a single `return` line.

--- starter
def is_teen(age):
    pass
--- tests
assert is_teen(13) == True
assert is_teen(19) == True
assert is_teen(12) == False
assert is_teen(20) == False
assert is_teen(16) == True
--- solution
def is_teen(age):
    return 13 <= age <= 19
--- hint
A comparison already *is* `True` or `False`, so you can return it directly. Chain them: `13 <= age <= 19`.
:::

=== lesson: if-elif-else | if, elif and else
`if` runs a block of code only when a condition is True. The block is the indented lines underneath.

## if / else

```pyrun
temperature = 31
if temperature > 30:
    print("Hot day")
    print("Drink water")
else:
    print("Pleasant day")
print("This line always runs")
```

Step through it, then change `31` to `20` and step through again. Watch which lines get highlighted.

## elif: more than two choices

`elif` ("else if") is checked only if everything above it was False. Python takes the **first** branch that matches and skips the rest.

```pyrun
score = 72
if score >= 90:
    grade = "A"
elif score >= 75:
    grade = "B"
elif score >= 60:
    grade = "C"
else:
    grade = "F"
print(grade)
```

Order matters: if you checked `score >= 60` first, a 95 would get a C.

## Nesting

An `if` can go inside another. Each level indents 4 more spaces. Keep nesting shallow; often `and` reads better.

```python
if user_logged_in:
    if is_admin:
        show_admin_panel()
# the same thing, flatter
if user_logged_in and is_admin:
    show_admin_panel()
```

## One-line if (conditional expression)

When you're just choosing between two values:

```pyrun
n = 7
kind = "even" if n % 2 == 0 else "odd"
print(n, "is", kind)
```

`%` gives the remainder of a division, so `n % 2 == 0` means "n is even". You'll use it constantly.

::: exercise fizzbuzz | FizzBuzz
`fizzbuzz(n)` returns `"FizzBuzz"` if `n` is divisible by both 3 and 5, `"Fizz"` if only by 3, `"Buzz"` if only by 5, and otherwise the number as text (`str(n)`).

--- starter
def fizzbuzz(n):
    pass
--- tests
assert fizzbuzz(3) == "Fizz"
assert fizzbuzz(10) == "Buzz"
assert fizzbuzz(15) == "FizzBuzz"
assert fizzbuzz(7) == "7"
assert fizzbuzz(30) == "FizzBuzz"
--- solution
def fizzbuzz(n):
    if n % 15 == 0:
        return "FizzBuzz"
    elif n % 3 == 0:
        return "Fizz"
    elif n % 5 == 0:
        return "Buzz"
    else:
        return str(n)
--- hint
Check the "both" case first. `n % 3 == 0` means n divides evenly by 3.
:::


::: exercise leap-year | Leap year
A year is a leap year if it's divisible by 4, **except** years divisible by 100, which are leap years only if they're also divisible by 400. Write `is_leap(year)`.

--- starter
def is_leap(year):
    pass
--- tests
assert is_leap(2024) == True
assert is_leap(2023) == False
assert is_leap(1900) == False
assert is_leap(2000) == True
--- solution
def is_leap(year):
    if year % 400 == 0:
        return True
    if year % 100 == 0:
        return False
    return year % 4 == 0
--- hint
Start with the most specific rule (divisible by 400), then 100, then 4.
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
