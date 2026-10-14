---
course: python
module: classes
title: Classes and problem formats
level: Intermediate
icon: 🏗️
tagline: Classes, the LeetCode template, linked-list nodes and OA input
order: 11
---
=== lesson: classes | Classes in five minutes
```pyrun
class Stack:
    def __init__(self):          # constructor
        self.items = []          # instance attribute

    def push(self, x):           # method: first parameter is the instance
        self.items.append(x)

    def pop(self):
        return self.items.pop()

    def __len__(self):           # makes len(s) work
        return len(self.items)

s = Stack()
print(s.push(1))
print(len(s))  # 1
```

- `self` is explicit. Every method takes it, and attributes are always reached through it (`self.items`, never just `items`).
- There are no access modifiers. A leading underscore (`self._cache`) means "internal, please don't touch".
- Attributes defined directly in the class body are **shared** by all instances. Put per-object state in `__init__`.

## Design problems

LeetCode's "Design" problems (Min Stack, LRU Cache, Implement Trie, Design Twitter) are just classes with given method names:

```python
class MinStack:
    def __init__(self):
        self.st = []                     # (value, min so far)

    def push(self, val: int) -> None:
        cur_min = min(val, self.st[-1][1]) if self.st else val
        self.st.append((val, cur_min))

    def pop(self) -> None:
        self.st.pop()

    def top(self) -> int:
        return self.st[-1][0]

    def getMin(self) -> int:
        return self.st[-1][1]
```

## Dunder methods worth knowing

| Method | Enables |
|---|---|
| `__init__` | construction |
| `__repr__` | readable `print()` output, great for debugging |
| `__eq__`, `__hash__` | `==`, and use as a dict key / set member |
| `__lt__` | `<`, which makes `sorted()` and `heapq` work on your objects |
| `__len__`, `__iter__`, `__contains__` | `len()`, `for x in obj`, `x in obj` |

If you define `__eq__`, Python sets `__hash__` to `None` (unhashable) unless you also define it.

## `@dataclass`

Generates `__init__`, `__repr__` and `__eq__` from type-annotated fields. `order=True` adds comparisons in field order, `frozen=True` makes it immutable and hashable:

```pyrun
from dataclasses import dataclass

@dataclass(order=True, frozen=True)
class Edge:
    w: int
    u: int
    v: int

print(sorted([Edge(5, 0, 1), Edge(2, 1, 2)]))  # sorts by w, then u, then v
```

::: exercise min-stack | Min Stack (LeetCode 155)
Implement `MinStack` with `push`, `pop`, `top` and `get_min`, all O(1).

--- starter
class MinStack:
    def __init__(self):
        pass

    def push(self, val):
        pass

    def pop(self):
        pass

    def top(self):
        pass

    def get_min(self):
        pass
--- tests
s = MinStack(); s.push(-2); s.push(0); s.push(-3); assert s.get_min() == -3
s = MinStack(); s.push(-2); s.push(0); s.push(-3); s.pop(); assert s.top() == 0
s = MinStack(); s.push(-2); s.push(0); s.push(-3); s.pop(); assert s.get_min() == -2
s = MinStack(); s.push(1); s.push(1); s.pop(); assert s.get_min() == 1
--- solution
class MinStack:
    def __init__(self):
        self.st = []

    def push(self, val):
        m = min(val, self.st[-1][1]) if self.st else val
        self.st.append((val, m))

    def pop(self):
        self.st.pop()

    def top(self):
        return self.st[-1][0]

    def get_min(self):
        return self.st[-1][1]
--- hint
Store `(value, minimum so far)` pairs on one list.
:::


::: exercise point-hash | Make an object usable as a dict key
`Point` objects with the same `x` and `y` should be equal **and** work as the same set member / dict key. Fill in `__eq__` and `__hash__`.

--- starter
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, other):
        pass

    def __hash__(self):
        pass
--- tests
assert Point(1, 2) == Point(1, 2)
assert Point(1, 2) != Point(2, 1)
assert len({Point(1, 2), Point(1, 2), Point(3, 4)}) == 2
d = {Point(0, 0): "origin"}; assert d[Point(0, 0)] == "origin"
--- solution
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, other):
        return isinstance(other, Point) and (self.x, self.y) == (other.x, other.y)

    def __hash__(self):
        return hash((self.x, self.y))
--- hint
Equal objects must have equal hashes. Hash the tuple `(self.x, self.y)`.
:::

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

=== lesson: listnode-treenode | ListNode, TreeNode and Optional
LeetCode defines these for you in a comment above the starter. You must be able to write them yourself, and to build them for local testing.

```python
from typing import Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

`Optional[ListNode]` in a signature means "a ListNode or None". An empty list or tree is `None`.

## Building them for testing

```python
def build_list(values):
    dummy = ListNode()
    tail = dummy
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out
```

LeetCode writes trees in level order with `None` for missing children: `[3, 9, 20, None, None, 15, 7]`. Building that needs a queue, which you'll see in the trees lesson.

## Identity, not value

Nodes compare by identity unless you define `__eq__`: two different nodes with `val = 3` are not `==`. That's what you want for "intersection of two linked lists", where you compare `a is b`. Nodes are hashable by identity too, so `seen = set()` of nodes works for cycle detection and for copying graphs (`old -> new` dicts).

## The dummy node

When the head of a list might change (removals, merges, insertions at the front), start with a dummy node that points at the head and return `dummy.next`. It removes every special case for "what if it's the first node".

```pyrun
def remove_val(head, val):
    dummy = ListNode(0, head)
    prev = dummy
    while prev.next:
        if prev.next.val == val:
            prev.next = prev.next.next
        else:
            prev = prev.next
    return dummy.next

# try it
class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def build(vals):
    head = None
    for v in reversed(vals):
        head = ListNode(v, head)
    return head

def show(h):
    out = []
    while h:
        out.append(h.val); h = h.next
    return out
print(show(remove_val(build([1, 2, 6, 3, 6]), 6)))
```

::: exercise build-list | Build and read a linked list
Write `build_list(values)` that returns the head of a linked list with those values (or `None` for an empty list), and `to_list(head)` that turns a list back into a Python list.

--- starter
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build_list(values):
    pass

def to_list(head):
    pass
--- tests
assert to_list(build_list([1, 2, 3])) == [1, 2, 3]
assert build_list([]) is None
assert to_list(None) == []
assert build_list([5]).next is None
--- solution
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build_list(values):
    dummy = ListNode()
    tail = dummy
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out
:::


::: exercise remove-elements | Remove linked list elements (LeetCode 203)
`remove_elements(head, val)` removes every node whose value is `val` and returns the new head. `ListNode`, `build_list` and `to_list` are provided.

--- starter
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build_list(values):
    dummy = tail = ListNode()
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

def remove_elements(head, val):
    pass
--- tests
assert to_list(remove_elements(build_list([1, 2, 6, 3, 4, 5, 6]), 6)) == [1, 2, 3, 4, 5]
assert to_list(remove_elements(build_list([7, 7, 7, 7]), 7)) == []
assert to_list(remove_elements(build_list([]), 1)) == []
assert to_list(remove_elements(build_list([1, 7]), 1)) == [7]
--- solution
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build_list(values):
    dummy = tail = ListNode()
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

def remove_elements(head, val):
    dummy = ListNode(0, head)
    prev = dummy
    while prev.next:
        if prev.next.val == val:
            prev.next = prev.next.next
        else:
            prev = prev.next
    return dummy.next
--- hint
Use a dummy node before the head; only advance `prev` when you didn't delete.
:::

=== lesson: input-output | Reading input in online assessments
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
