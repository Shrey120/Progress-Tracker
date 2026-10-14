---
course: python
module: classes
title: Classes and the LeetCode node types
order: 7
---
=== lesson: classes | Classes in five minutes
```python
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
s.push(1)
len(s)    # 1
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

```python
from dataclasses import dataclass

@dataclass(order=True, frozen=True)
class Edge:
    w: int
    u: int
    v: int

sorted([Edge(5, 0, 1), Edge(2, 1, 2)])   # sorts by w, then u, then v
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

```python
def remove_val(head, val):
    dummy = ListNode(0, head)
    prev = dummy
    while prev.next:
        if prev.next.val == val:
            prev.next = prev.next.next
        else:
            prev = prev.next
    return dummy.next
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
