---
course: python
module: first-steps
title: First steps
level: Beginner
icon: 🐍
tagline: What a program is, print(), and reading errors
order: 1
---
=== lesson: how-this-works | How this course works
This course takes you from "I've forgotten everything" to solving Striver-sheet and LeetCode problems in Python. No prior Python is assumed.

## Three levels

- **Beginner** — what a program is, variables, strings, if/else, loops, lists, functions. Go slowly here; everything later stands on it.
- **Intermediate** — comprehensions, sorting, dicts and sets, recursion, classes, and the standard-library tools that make Python solutions short.
- **Advanced** — the cost of every operation, then the DSA patterns: two pointers, sliding window, binary search, stacks, linked lists, trees, graphs, DP, backtracking, bits.

Each topic card on the home page shows how far you've got. Do them in order the first time.

## Slides

Every lesson is a short deck. One idea per slide.

- **Next →** and **← Previous**, or the arrow keys on your keyboard.
- The dots at the top show where you are. Yellow dots are practice problems; they turn green when solved.
- **Mark complete** when you're done with a lesson.
- **Revise later** adds it to your Revise list, which reminds you after 1 day, then 3, 7, 14, 30 and 60 days as you keep revising it.

## Code you can run

Grey code boxes with a **▶ Run** button are live. Press it now:

```pyrun
print("Hello, Shreyash!")
print(2 + 3)
```

The first run takes a few seconds while Python loads in your browser. After that, it's instant.

## Step through

The yellow **Step through** button replays the code one line at a time. The left side highlights the line about to run; the right side shows every variable, with lists drawn as boxes. Try it, then press **▶ Next** a few times:

```pyrun
total = 0
for n in [4, 8, 15]:
    total = total + n
print(total)
```

When something confuses you later, this is the tool to reach for. Watching the variables change explains most bugs.

## Practice slides

At the end of most lessons there are problems with a code editor and **▶ Run tests**. One square per test: green passes, red fails. A failing test shows what it expected and what your code returned. Hints and a reference solution are there when you're stuck; try for a few minutes first.

Every exercise gives you a **function** to fill in: a `def name(...):` line with your code indented under it, and a `return` that hands back the answer. You'll learn functions properly in the Functions topic; until then, treat it as a template. Write your code under the `def` line, indented by 4 spaces, and end with `return answer`.

::: exercise hello | Your first exercise
Make `greet()` **return** the text `Hello, world!` exactly (capital H, a comma, an exclamation mark).

--- starter
def greet():
    return "change me"
--- tests
assert greet() == "Hello, world!"
--- solution
def greet():
    return "Hello, world!"
--- hint
Replace the text between the quotes. Capitals and punctuation have to match exactly.
:::

=== lesson: how-code-runs | What a program is
A program is a list of instructions. Python runs them **from top to bottom, one line at a time**, unless a line tells it to jump (an `if`, a loop, or a function call).

## Instructions run in order

```pyrun
print("one")
print("two")
print("three")
```

Step through it: the highlight moves down a line each step. Change the order of the lines and the output changes with it.

## print() shows things

`print(...)` writes whatever is inside the brackets to the output. You can print text (in quotes), numbers, and the results of calculations. Several things separated by commas are printed with spaces between them.

```pyrun
print("Score:", 10 * 3)
print(7 / 2)
print("Python", "is", "fun")
```

## Comments are for humans

Anything after `#` on a line is ignored by Python. Use comments to explain *why* a line exists.

```pyrun
# work out the area of a 4 by 5 rectangle
width = 4
height = 5   # metres
print(width * height)
```

## Indentation is part of the language

Python uses indentation (4 spaces) to group lines that belong together, where other languages use `{ }`. You'll see it with `if`, loops and functions. Getting it wrong is an error, not a style issue:

```pyrun
if 3 > 2:
    print("this line belongs to the if")
print("this line always runs")
```

::: exercise three-lines | Print three lines
Write a function `show()` that **prints** these three lines, in this order:

```
I am learning Python
for DSA
day 1
```

--- starter
def show():
    print("I am learning Python")
--- tests
import io, contextlib; buf = io.StringIO(); exec("with contextlib.redirect_stdout(buf): show()"); assert buf.getvalue() == "I am learning Python\nfor DSA\nday 1\n", "printed: " + repr(buf.getvalue())
--- solution
def show():
    print("I am learning Python")
    print("for DSA")
    print("day 1")
--- hint
Each `print` puts its text on a new line. Keep every `print` indented by 4 spaces so it belongs to `show()`.
:::

=== lesson: reading-errors | Reading error messages
You will see errors constantly. They're not a judgement; they're Python telling you exactly what went wrong and where. Learning to read them is the single fastest way to get better.

## Anatomy of an error

Run this; it has a mistake on purpose:

```pyrun
prices = [100, 250, 75]
print(prices[3])
```

Read the **last line first**: `IndexError: list index out of range`. The type of error, then a description. The lines above it say which line it happened on.

## The errors you'll meet most

| Error | Usually means |
|---|---|
| `SyntaxError` | Python couldn't read the code: a missing `:`, bracket or quote |
| `IndentationError` | Spaces at the start of a line don't line up |
| `NameError: name 'x' is not defined` | A typo in a name, or using it before assigning it |
| `TypeError` | Wrong type: adding a number to a string, calling something that isn't a function, wrong number of arguments |
| `IndexError` | Index past the end of a list or string |
| `KeyError` | Looking up a dictionary key that isn't there |
| `ZeroDivisionError` | Dividing by zero |
| `AttributeError` | Calling a method that type doesn't have, often on `None` |
| `RecursionError` | A function calling itself forever (missing base case) |

## A TypeError to try

```pyrun
age = 25
print("I am " + age + " years old")
```

You can't glue text and a number with `+`. Fix it with `str(age)`, or use an f-string: `f"I am {age} years old"` (covered in Strings).

## How to debug

1. Read the last line of the error. 2. Go to the line number. 3. If it's still unclear, add `print()` calls to see the values just before the crash, or use **Step through**. 4. Change one thing at a time.

::: exercise fix-errors | Fix three mistakes
This function should return the average of a list of numbers, but it has three bugs: a syntax error, a name typo and a type problem. Fix them so the tests pass.

--- starter
def average(nums)
    total = sum(nums)
    return totl / len(nums)

def describe(nums):
    return "Average: " + average(nums)
--- tests
assert average([2, 4, 6]) == 4
assert average([5]) == 5
assert describe([1, 2, 3]) == "Average: 2.0"
--- solution
def average(nums):
    total = sum(nums)
    return total / len(nums)

def describe(nums):
    return "Average: " + str(average(nums))
--- hint
Run it and fix the errors one at a time, top to bottom. `def` lines end with `:`. `str(...)` turns a number into text.
:::
