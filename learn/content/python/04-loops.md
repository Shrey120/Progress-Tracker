---
course: python
module: loops
title: Loops
level: Beginner
icon: 🔄
tagline: Repeat work with while and for
order: 4
---
=== lesson: while-loops | while loops
A `while` loop repeats its block **as long as** its condition is True. It checks the condition before every round.

## Counting with while

```pyrun
count = 1
while count <= 3:
    print("round", count)
    count = count + 1
print("done")
```

Step through it. Watch `count` go up, and see the condition being checked each time the highlight jumps back to the `while` line.

If nothing inside the loop ever makes the condition False, it runs forever. Forgetting `count = count + 1` is the classic way to do that. (Here, runs stop after 8 seconds, so you can't break anything.)

## += and friends

`count = count + 1` is so common it has a short form: `count += 1`. The same works for `-=`, `*=`, `//=`.

## When you don't know how many rounds

`while` fits when the number of repetitions depends on the data. Counting the digits of a number: keep chopping off the last digit until nothing is left.

```pyrun
n = 90210
digits = 0
while n > 0:
    n //= 10        # 90210 -> 9021 -> 902 -> 90 -> 9 -> 0
    digits += 1
print(digits)
```

`//` is whole-number division: `17 // 5` is `3`.

## break and continue

- `break` leaves the loop immediately.
- `continue` skips the rest of this round and goes back to the condition.

```pyrun
n = 0
while True:          # loops until a break
    n += 1
    if n % 2 == 0:
        continue     # skip even numbers
    if n > 7:
        break
    print(n)
```

::: exercise count-digits | Count down to one
`collatz_steps(n)` counts how many steps it takes to reach 1 if, at each step, you halve `n` when it's even and replace it with `3 * n + 1` when it's odd. `collatz_steps(1)` is 0.

--- starter
def collatz_steps(n):
    pass
--- tests
assert collatz_steps(1) == 0
assert collatz_steps(2) == 1
assert collatz_steps(6) == 8
assert collatz_steps(27) == 111
--- solution
def collatz_steps(n):
    steps = 0
    while n != 1:
        if n % 2 == 0:
            n //= 2
        else:
            n = 3 * n + 1
        steps += 1
    return steps
--- hint
`while n != 1:` then an `if`/`else` inside, and add 1 to a counter each round. Use `//` to halve so `n` stays a whole number.
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

=== lesson: for-range | for loops and range
A `for` loop goes through a sequence **one item at a time**. You'll use it far more than `while`.

## Looping over a list or a string

```pyrun
for fruit in ["mango", "apple", "kiwi"]:
    print("I like", fruit)

for ch in "abc":
    print(ch)
```

The loop variable (`fruit`, `ch`) takes each value in turn. You choose its name.

## range(): loops over numbers

| Call | Numbers |
|---|---|
| `range(5)` | 0, 1, 2, 3, 4 |
| `range(2, 6)` | 2, 3, 4, 5 |
| `range(0, 10, 3)` | 0, 3, 6, 9 |
| `range(5, 0, -1)` | 5, 4, 3, 2, 1 |

The end number is **never included**. That feels odd at first, but `range(n)` gives exactly n numbers, and `range(len(nums))` gives every valid index of a list.

```pyrun
for i in range(1, 6):
    print(i, "squared is", i * i)
```

## Accumulating a result

Most loops build something up: a total, a count, a best-so-far. Start it before the loop, update it inside, use it after.

```pyrun
nums = [3, 9, 2, 7]
total = 0
biggest = nums[0]
for x in nums:
    total += x
    if x > biggest:
        biggest = x
print("total", total, "biggest", biggest)
```

Step through this one and watch `total` and `biggest` change. This shape is the skeleton of hundreds of LeetCode solutions.

## Loops inside loops

The inner loop runs completely for **each** round of the outer loop.

```pyrun
for row in range(1, 4):
    line = ""
    for col in range(1, 4):
        line += str(row * col) + " "
    print(line)
```

3 outer rounds × 3 inner rounds = 9 inner steps. Nested loops over n items cost n × n work, which is why "O(n²)" comes up later.

::: exercise sum-evens | Sum of even numbers
`sum_evens(nums)` returns the sum of the even numbers in the list.

--- starter
def sum_evens(nums):
    pass
--- tests
assert sum_evens([1, 2, 3, 4]) == 6
assert sum_evens([7, 9]) == 0
assert sum_evens([]) == 0
assert sum_evens([-2, 10]) == 8
--- solution
def sum_evens(nums):
    total = 0
    for x in nums:
        if x % 2 == 0:
            total += x
    return total
:::


::: exercise count-vowels | Count vowels
`count_vowels(s)` returns how many characters of `s` are vowels (`a e i o u`, lowercase or uppercase).

--- starter
def count_vowels(s):
    pass
--- tests
assert count_vowels("hello") == 2
assert count_vowels("PYTHON") == 1
assert count_vowels("rhythm") == 0
assert count_vowels("AeIoU") == 5
--- solution
def count_vowels(s):
    count = 0
    for ch in s.lower():
        if ch in "aeiou":
            count += 1
    return count
--- hint
Loop over the characters. `ch in "aeiou"` checks whether a character is one of those letters. `.lower()` handles capitals.
:::


::: exercise multiplication | Multiplication table
`table(n)` returns a list of lists: row `i` (from 1 to n) contains `i*1, i*2, ..., i*n`.

--- starter
def table(n):
    pass
--- tests
assert table(1) == [[1]]
assert table(3) == [[1, 2, 3], [2, 4, 6], [3, 6, 9]]
assert table(0) == []
--- solution
def table(n):
    rows = []
    for i in range(1, n + 1):
        row = []
        for j in range(1, n + 1):
            row.append(i * j)
        rows.append(row)
    return rows
--- hint
Two nested `for` loops with `range(1, n + 1)`. Build each row as a new list, then `append` it to the outer list.
:::
