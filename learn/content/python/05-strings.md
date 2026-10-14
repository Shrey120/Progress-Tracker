---
course: python
module: strings
title: Strings
level: Beginner
icon: 📝
tagline: Index, slice and build text
order: 5
---
=== lesson: string-basics | Indexing and slicing
A string is an immutable sequence of characters. There is no separate `char` type: `s[0]` is a string of length 1.

## Indexing

```python
s = "python"
s[0]     # 'p'
s[-1]    # 'n'   negative indexes count from the end
s[-2]    # 'o'
len(s)   # 6
s[6]     # IndexError
```

## Slicing: `s[start:stop:step]`

`start` is included, `stop` is excluded, every part is optional, and slicing never raises an IndexError.

```pyrun
s = "python"
print(s[1:4])  # 'yth'
print(s[:3])  # 'pyt'      first 3
print(s[3:])  # 'hon'      from index 3
print(s[-3:])  # 'hon'      last 3
print(s[::2])  # 'pto'      every second char
print(s[::-1])  # 'nohtyp'   reversed
print(s[1:100])  # 'ython'    out of range is fine
```

A slice **copies**: `s[1:]` is O(k) time and memory where k is the slice length. Slicing in a loop or in recursion (`solve(s[1:])`) quietly turns O(n) into O(n²). Pass indexes instead:

```pyrun
def is_pal(s, i, j):          # O(1) extra space
    while i < j:
        if s[i] != s[j]:
            return False
        i, j = i + 1, j - 1
    return True

# try it
s = 'racecar'
print(is_pal(s, 0, len(s) - 1))
```

## Immutability

`s[0] = "P"` raises a TypeError. To change characters, either build a new string or convert to a list, edit it, and join:

```python
chars = list(s)
chars[0] = "P"
s = "".join(chars)      # 'Python'
```

## Comparing and looping

```python
"apple" < "banana"     # True, lexicographic
"a" * 3                # 'aaa'
"py" in "python"       # True — substring check
for ch in s: ...       # characters
for i, ch in enumerate(s): ...   # index and character
```

::: exercise is-palindrome | Palindrome with two pointers
`is_palindrome(s)` returns `True` if `s` reads the same forwards and backwards. Do it with two indexes, not `s[::-1]`, so it uses O(1) extra space.

--- starter
def is_palindrome(s):
    pass
--- tests
assert is_palindrome("racecar") == True
assert is_palindrome("abba") == True
assert is_palindrome("abca") == False
assert is_palindrome("") == True
assert is_palindrome("x") == True
--- solution
def is_palindrome(s):
    i, j = 0, len(s) - 1
    while i < j:
        if s[i] != s[j]:
            return False
        i += 1
        j -= 1
    return True
:::


::: exercise rotate-string | Rotate with slices
`rotate(s, k)` moves the last `k` characters to the front. `k` may be larger than the string's length; rotating by `len(s)` gives the original string.

--- starter
def rotate(s, k):
    pass
--- tests
assert rotate("abcdef", 2) == "efabcd"
assert rotate("abcdef", 0) == "abcdef"
assert rotate("abcdef", 8) == "efabcd"
assert rotate("", 3) == ""
--- solution
def rotate(s, k):
    if not s:
        return s
    k %= len(s)
    return s[-k:] + s[:-k] if k else s
--- hint
Reduce `k` with `k % len(s)` first, and watch out: `s[-0:]` is the whole string.
:::

=== lesson: string-methods | String methods you will actually use
Every method returns a **new** string; the original never changes.

| Method | Does | Example |
|---|---|---|
| `s.split()` | split on whitespace, drop empties | `"a  b c".split() == ['a','b','c']` |
| `s.split(",")` | split on a separator, keeps empties | `"a,,b".split(",") == ['a','','b']` |
| `sep.join(parts)` | glue strings together | `"-".join(['a','b']) == 'a-b'` |
| `s.strip()` | trim whitespace both ends | also `lstrip`, `rstrip`, `strip("0")` |
| `s.lower()`, `s.upper()` | case | |
| `s.isalpha()`, `s.isdigit()`, `s.isalnum()` | character class checks | `"a1".isalnum() == True` |
| `s.startswith(p)`, `s.endswith(p)` | prefix / suffix | |
| `s.find(t)` | first index of `t`, or `-1` | `s.index(t)` raises instead |
| `s.count(t)` | non-overlapping occurrences | |
| `s.replace(a, b)` | replace all | |
| `s.zfill(n)` | pad with leading zeros | `"7".zfill(3) == '007'` |

`find`, `count`, `replace` and `in` all scan the string, so they are O(n), not O(1).

## Character arithmetic: `ord` and `chr`

`ord("a") == 97`, `chr(97) == "a"`. This is how you index a 26-slot array by letter, or shift letters:

```python
counts = [0] * 26
for ch in s:
    counts[ord(ch) - ord("a")] += 1

def shift(ch, k):    # Caesar cipher on lowercase
    return chr((ord(ch) - ord("a") + k) % 26 + ord("a"))
```

## f-strings

```python
name, n = "Shreyash", 3
f"{name} solved {n} problems"   # 'Shreyash solved 3 problems'
f"{3.14159:.2f}"                # '3.14'
f"{42:05d}"                     # '00042'
f"{255:b}"                      # '11111111'  binary
f"{x=}"                         # 'x=…' — handy for debugging
```

::: exercise valid-palindrome | Valid Palindrome (LeetCode 125)
`valid_palindrome(s)` ignores everything that is not a letter or digit, ignores case, and returns whether what remains is a palindrome.

--- starter
def valid_palindrome(s):
    pass
--- tests
assert valid_palindrome("A man, a plan, a canal: Panama") == True
assert valid_palindrome("race a car") == False
assert valid_palindrome(" ") == True
assert valid_palindrome("0P") == False
--- solution
def valid_palindrome(s):
    i, j = 0, len(s) - 1
    while i < j:
        if not s[i].isalnum():
            i += 1
        elif not s[j].isalnum():
            j -= 1
        else:
            if s[i].lower() != s[j].lower():
                return False
            i += 1
            j -= 1
    return True
--- hint
Two pointers that skip characters where `isalnum()` is false. Compare with `.lower()`.
:::


::: exercise reverse-words | Reverse words in a string (LeetCode 151)
`reverse_words(s)` returns the words of `s` in reverse order, separated by single spaces, with no leading or trailing spaces. Words may be separated by several spaces.

--- starter
def reverse_words(s):
    pass
--- tests
assert reverse_words("the sky is blue") == "blue is sky the"
assert reverse_words("  hello world  ") == "world hello"
assert reverse_words("a good   example") == "example good a"
--- solution
def reverse_words(s):
    return " ".join(reversed(s.split()))
--- hint
`split()` with no argument already handles repeated spaces.
:::


::: exercise caesar | Shift letters with ord and chr
`caesar(s, k)` shifts every lowercase letter forward by `k` places, wrapping from `z` to `a`. Other characters stay as they are. `k` can be large.

--- starter
def caesar(s, k):
    pass
--- tests
assert caesar("abc", 1) == "bcd"
assert caesar("xyz", 3) == "abc"
assert caesar("hello, world", 26) == "hello, world"
assert caesar("a-z", 53) == "b-a"
--- solution
def caesar(s, k):
    out = []
    for ch in s:
        if "a" <= ch <= "z":
            out.append(chr((ord(ch) - ord("a") + k) % 26 + ord("a")))
        else:
            out.append(ch)
    return "".join(out)
:::

=== lesson: building-strings | Building strings efficiently
Because strings are immutable, `s += ch` creates a new string each time. CPython sometimes optimises this in place, but you cannot rely on it (and Pyodide, PyPy and other runtimes don't). In a loop it's O(n²) in the worst case.

The idiom is: **collect pieces in a list, join once at the end.**

```python
# slow pattern
res = ""
for ch in s:
    if ch != " ":
        res += ch

# the idiom
parts = []
for ch in s:
    if ch != " ":
        parts.append(ch)
res = "".join(parts)

# or a generator expression
res = "".join(ch for ch in s if ch != " ")
```

## Run-length style problems

Problems like "string compression" or "count and say" build output as you scan groups:

```pyrun
def compress(s):
    out = []
    i = 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]:
            j += 1
        out.append(s[i] + str(j - i))
        i = j
    return "".join(out)

# try it
print(compress('aaabccdddd'))
```

`itertools.groupby` does the grouping for you, covered in the toolbox module:

```python
from itertools import groupby
"".join(ch + str(len(list(g))) for ch, g in groupby(s))
```

## Strings as dictionary keys

Strings are hashable, so they're natural keys. For anagram grouping, the sorted characters make a canonical key:

```python
key = "".join(sorted(word))     # 'eat' -> 'aet'
```

Sorting costs O(k log k) per word. A 26-count tuple is O(k) and also hashable: `tuple(counts)`.

::: exercise compress | Run-length encoding
`rle(s)` returns each run of equal characters as the character followed by its count: `"aaabcc"` becomes `"a3b1c2"`. Build the result with a list and `join`.

--- starter
def rle(s):
    pass
--- tests
assert rle("aaabcc") == "a3b1c2"
assert rle("") == ""
assert rle("z") == "z1"
assert rle("aaaaaaaaaaaa") == "a12"
assert rle("abab") == "a1b1a1b1"
--- solution
def rle(s):
    out = []
    i = 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]:
            j += 1
        out.append(s[i] + str(j - i))
        i = j
    return "".join(out)
:::


::: exercise longest-common-prefix | Longest common prefix (LeetCode 14)
`lcp(words)` returns the longest prefix shared by every string in the list, or `""` if there is none or the list is empty.

--- starter
def lcp(words):
    pass
--- tests
assert lcp(["flower", "flow", "flight"]) == "fl"
assert lcp(["dog", "racecar", "car"]) == ""
assert lcp(["alone"]) == "alone"
assert lcp([]) == ""
assert lcp(["ab", "a"]) == "a"
--- solution
def lcp(words):
    if not words:
        return ""
    first = words[0]
    for i, ch in enumerate(first):
        for w in words[1:]:
            if i >= len(w) or w[i] != ch:
                return first[:i]
    return first
--- hint
Walk the characters of the first word; stop at the first index where any other word is too short or differs.
:::
