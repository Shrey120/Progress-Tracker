---
course: python
module: functions
title: Functions
level: Beginner
icon: ⚙️
tagline: Reusable code, return values and handling errors
order: 7
---
=== lesson: functions-101 | Functions 101
A function is a named, reusable block of code. You give it inputs (**parameters**), it does some work, and it can hand back a result with `return`.

## Defining and calling

```pyrun
def area(width, height):
    result = width * height
    return result

print(area(3, 4))
print(area(10, 2) + 1)
```

`def` defines it; nothing runs until you **call** it with `area(3, 4)`. Step through and watch a new box appear for `area()`, with its own `width` and `height`, then disappear when it returns.

## return vs print

This trips up almost everyone at first.

- `print` **shows** a value to a human. The function's result is still `None`.
- `return` **hands** a value back to the code that called the function, which can then use it.

```pyrun
def double_print(x):
    print(x * 2)

def double_return(x):
    return x * 2

a = double_print(5)     # shows 10, but a is None
b = double_return(5)    # shows nothing, b is 10
print(a, b)
```

LeetCode and every exercise here check what you **return**.

## return ends the function

As soon as `return` runs, the function stops. That makes "return early" a clean way to handle special cases:

```pyrun
def first_negative(nums):
    for x in nums:
        if x < 0:
            return x       # stop as soon as we find one
    return None            # only reached if none were negative

print(first_negative([3, -2, -7]))
print(first_negative([1, 2]))
```

## Local variables

Variables created inside a function exist only while it runs. Two functions can both use a variable called `total` without interfering.

::: exercise celsius | Write your own function
Write `to_fahrenheit(c)` that returns `c * 9 / 5 + 32`, and `describe(c)` that **uses** `to_fahrenheit` and returns text like `"30C is 86.0F"`.

--- starter
def to_fahrenheit(c):
    pass

def describe(c):
    pass
--- tests
assert to_fahrenheit(0) == 32
assert to_fahrenheit(100) == 212
assert describe(30) == "30C is 86.0F"
--- solution
def to_fahrenheit(c):
    return c * 9 / 5 + 32

def describe(c):
    return str(c) + "C is " + str(to_fahrenheit(c)) + "F"
--- hint
`describe` can call `to_fahrenheit(c)` and glue the pieces together with `str(...)` and `+`.
:::


::: exercise is-sorted | Return early
`is_sorted(nums)` returns `True` if the list is in non-decreasing order. Return `False` as soon as you find a pair out of order.

--- starter
def is_sorted(nums):
    pass
--- tests
assert is_sorted([1, 2, 2, 5]) == True
assert is_sorted([3, 1]) == False
assert is_sorted([]) == True
assert is_sorted([7]) == True
--- solution
def is_sorted(nums):
    for i in range(1, len(nums)):
        if nums[i] < nums[i - 1]:
            return False
    return True
:::

=== lesson: exceptions | Handling errors with try / except
Sometimes an error is expected: user input that isn't a number, a key that may be missing. `try`/`except` lets your program handle it instead of crashing.

## The shape

```pyrun
text = "42a"
try:
    n = int(text)
    print("got", n)
except ValueError:
    print("not a number:", text)
print("program continues")
```

Python runs the `try` block. If a `ValueError` happens, it jumps to the matching `except` block and carries on after it.

## Catch specific errors

Name the error you expect. A bare `except:` hides real bugs, like a typo raising `NameError`.

```python
try:
    value = data[key]
except KeyError:
    value = 0
```

(For dicts, `data.get(key, 0)` does the same in one line.)

## else and finally

- `else` runs if the `try` block didn't raise.
- `finally` always runs, error or not: used for cleanup like closing files.

```pyrun
def safe_divide(a, b):
    try:
        result = a / b
    except ZeroDivisionError:
        return None
    else:
        return result
    finally:
        print("tried", a, "/", b)

print(safe_divide(10, 2))
print(safe_divide(1, 0))
```

## Raising your own

`raise ValueError("...")` signals that something is wrong. Interviewers sometimes ask how you'd validate input; raising a clear exception is the Python answer.

In DSA problems you'll rarely need try/except, since inputs are guaranteed valid. It matters in OAs that read input and in real code.

::: exercise parse-ints | Parse what you can
`parse_ints(items)` takes a list of strings and returns a list of the ones that are valid integers, converted with `int()`. Skip the rest using `try`/`except ValueError`.

--- starter
def parse_ints(items):
    pass
--- tests
assert parse_ints(["1", "x", "-3", "4.5", " 7 "]) == [1, -3, 7]
assert parse_ints([]) == []
assert parse_ints(["abc"]) == []
--- solution
def parse_ints(items):
    out = []
    for s in items:
        try:
            out.append(int(s))
        except ValueError:
            pass
    return out
:::
