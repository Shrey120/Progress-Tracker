---
course: python
module: linked-lists-trees
title: Linked lists and trees
level: Advanced
icon: 🌳
tagline: Pointer moves, traversals and BSTs
order: 15
---
=== lesson: linked-list-patterns | Linked list patterns
Every linked list problem is pointer bookkeeping. Draw it, then write it. Python's multiple assignment keeps most of them to a few lines.

## Reverse

```pyrun
def reverse(head):
    prev = None
    while head:
        head.next, prev, head = prev, head, head.next
    return prev

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
print(show(reverse(build([1, 2, 3, 4]))))
```

That single line works because the right side is evaluated first. If it reads as too clever in an interview, write the four-line version with a `nxt` temp.

## Fast and slow pointers

```pyrun
def middle(head):                  # second middle for even length
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    return slow

def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:           # identity, not ==
            return True
    return False

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
print(middle(build([1, 2, 3, 4, 5])).val, has_cycle(build([1, 2, 3])))
```

To find where the cycle starts (Floyd): after they meet, move one pointer back to `head` and step both one at a time; they meet at the cycle's start.

## Merge two sorted lists

```pyrun
def merge(a, b):
    dummy = tail = ListNode()
    while a and b:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b
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
print(show(merge(build([1, 3, 5]), build([2, 4]))))
```

## Remove the n-th node from the end

Start `fast` n steps ahead, then move both until `fast` reaches the end. Use a dummy so removing the head isn't a special case.

## Checklist for every list problem

1. Does the head change? Use a dummy.
2. Do I need the previous node? Keep `prev`.
3. Before overwriting `x.next`, have I saved what it pointed to?
4. Empty list, one node, two nodes: walk them through mentally.

::: exercise reverse-list | Reverse a linked list (LeetCode 206)
`reverse(head)` reverses the list iteratively and returns the new head. Helpers are provided.

--- starter
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build(vals):
    dummy = tail = ListNode()
    for v in vals:
        tail.next = ListNode(v); tail = tail.next
    return dummy.next

def to_list(h):
    out = []
    while h:
        out.append(h.val); h = h.next
    return out

def reverse(head):
    pass
--- tests
assert to_list(reverse(build([1, 2, 3, 4, 5]))) == [5, 4, 3, 2, 1]
assert to_list(reverse(build([1]))) == [1]
assert reverse(None) is None
assert to_list(reverse(build([1, 2]))) == [2, 1]
--- solution
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build(vals):
    dummy = tail = ListNode()
    for v in vals:
        tail.next = ListNode(v); tail = tail.next
    return dummy.next

def to_list(h):
    out = []
    while h:
        out.append(h.val); h = h.next
    return out

def reverse(head):
    prev = None
    while head:
        head.next, prev, head = prev, head, head.next
    return prev
:::


::: exercise remove-nth | Remove N-th node from end (LeetCode 19)
`remove_nth_from_end(head, n)` removes the n-th node from the end in one pass and returns the head.

--- starter
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build(vals):
    dummy = tail = ListNode()
    for v in vals:
        tail.next = ListNode(v); tail = tail.next
    return dummy.next

def to_list(h):
    out = []
    while h:
        out.append(h.val); h = h.next
    return out

def remove_nth_from_end(head, n):
    pass
--- tests
assert to_list(remove_nth_from_end(build([1, 2, 3, 4, 5]), 2)) == [1, 2, 3, 5]
assert to_list(remove_nth_from_end(build([1]), 1)) == []
assert to_list(remove_nth_from_end(build([1, 2]), 2)) == [2]
assert to_list(remove_nth_from_end(build([1, 2]), 1)) == [1]
--- solution
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build(vals):
    dummy = tail = ListNode()
    for v in vals:
        tail.next = ListNode(v); tail = tail.next
    return dummy.next

def to_list(h):
    out = []
    while h:
        out.append(h.val); h = h.next
    return out

def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n):
        fast = fast.next
    while fast.next:
        fast, slow = fast.next, slow.next
    slow.next = slow.next.next
    return dummy.next
--- hint
Start both pointers at a dummy, move `fast` n steps, then move both until `fast.next` is None. `slow.next` is the node to remove.
:::

=== lesson: tree-traversals | Binary tree traversals
## Recursive DFS

```pyrun
def inorder(root):
    res = []
    def go(node):
        if not node:
            return
        go(node.left)
        res.append(node.val)     # move this line for pre/post order
        go(node.right)
    go(root)
    return res

# try it
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

root = TreeNode(4, TreeNode(2, TreeNode(1), TreeNode(3)), TreeNode(6, None, TreeNode(7)))
print(inorder(root))
```

## Iterative DFS with a stack

Needed when the tree can be deep (a skewed tree of 10⁵ nodes breaks the recursion limit), and a common follow-up question.

```pyrun
def preorder(root):
    res, st = [], [root] if root else []
    while st:
        node = st.pop()
        res.append(node.val)
        if node.right: st.append(node.right)    # right first so left is processed first
        if node.left: st.append(node.left)
    return res

def inorder_iter(root):
    res, st, cur = [], [], root
    while cur or st:
        while cur:              # go as far left as possible
            st.append(cur)
            cur = cur.left
        cur = st.pop()
        res.append(cur.val)
        cur = cur.right
    return res

# try it
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

root = TreeNode(4, TreeNode(2, TreeNode(1), TreeNode(3)), TreeNode(6, None, TreeNode(7)))
print(preorder(root), inorder_iter(root))
```

Postorder iteratively: do a modified preorder (node, right, left) and reverse the result.

## BFS: level order

```pyrun
from collections import deque

def level_order(root):
    if not root:
        return []
    res, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        res.append(level)
    return res

# try it
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

root = TreeNode(4, TreeNode(2, TreeNode(1), TreeNode(3)), TreeNode(6, None, TreeNode(7)))
print(level_order(root))
```

Right side view, zigzag, average of levels, and max width all start from this loop.

## Building a tree from LeetCode's list format

```python
def build_tree(vals):
    if not vals or vals[0] is None:
        return None
    root = TreeNode(vals[0])
    q, i = deque([root]), 1
    while q and i < len(vals):
        node = q.popleft()
        if i < len(vals) and vals[i] is not None:
            node.left = TreeNode(vals[i]); q.append(node.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            node.right = TreeNode(vals[i]); q.append(node.right)
        i += 1
    return root
```

## Thinking recursively about trees

Most tree problems are "what does each node need from its children, and what does it return to its parent?":

- **Height/depth**: children return heights; node returns `1 + max`.
- **Diameter**: children return heights; node updates a global best with `left + right` and returns the height.
- **Balanced**: return height, or -1 to mean "unbalanced", and short-circuit.
- **Max path sum**: return the best one-sided path; update the global with the two-sided one, ignoring negative branches with `max(0, ...)`.
- **LCA**: return the node if found in a subtree; if both sides return something, this node is the LCA.

::: exercise level-order | Level order traversal (LeetCode 102)
`level_order(root)` returns node values level by level. `TreeNode` and `build_tree` (LeetCode list format) are provided.

--- starter
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def build_tree(vals):
    if not vals or vals[0] is None:
        return None
    root = TreeNode(vals[0]); q = deque([root]); i = 1
    while q and i < len(vals):
        node = q.popleft()
        if i < len(vals) and vals[i] is not None:
            node.left = TreeNode(vals[i]); q.append(node.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            node.right = TreeNode(vals[i]); q.append(node.right)
        i += 1
    return root

def level_order(root):
    pass
--- tests
assert level_order(build_tree([3, 9, 20, None, None, 15, 7])) == [[3], [9, 20], [15, 7]]
assert level_order(build_tree([1])) == [[1]]
assert level_order(None) == []
--- solution
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def build_tree(vals):
    if not vals or vals[0] is None:
        return None
    root = TreeNode(vals[0]); q = deque([root]); i = 1
    while q and i < len(vals):
        node = q.popleft()
        if i < len(vals) and vals[i] is not None:
            node.left = TreeNode(vals[i]); q.append(node.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            node.right = TreeNode(vals[i]); q.append(node.right)
        i += 1
    return root

def level_order(root):
    if not root:
        return []
    res, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        res.append(level)
    return res
:::


::: exercise inorder-iter | Iterative inorder (LeetCode 94)
`inorder(root)` returns the inorder traversal **without recursion**. The last test is a 50,000-node left-skewed tree, which overflows a recursive version.

--- starter
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def inorder(root):
    pass
--- tests
r = TreeNode(1, None, TreeNode(2, TreeNode(3))); assert inorder(r) == [1, 3, 2]
assert inorder(None) == []
r = TreeNode(2, TreeNode(1), TreeNode(3)); assert inorder(r) == [1, 2, 3]
r = None; exec("for v in range(50000): r = TreeNode(v, r)"); assert inorder(r) == list(range(50000))
--- solution
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def inorder(root):
    res, st, cur = [], [], root
    while cur or st:
        while cur:
            st.append(cur)
            cur = cur.left
        cur = st.pop()
        res.append(cur.val)
        cur = cur.right
    return res
--- hint
Push nodes while going left; when you can't go further, pop, record, and step right.
:::


::: exercise diameter | Diameter of a binary tree (LeetCode 543)
`diameter(root)` returns the number of **edges** on the longest path between any two nodes.

--- starter
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def diameter(root):
    pass
--- tests
r = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3)); assert diameter(r) == 3
assert diameter(TreeNode(1, TreeNode(2))) == 1
assert diameter(TreeNode(1)) == 0
r = TreeNode(1, TreeNode(2, TreeNode(3, TreeNode(4)), TreeNode(5, None, TreeNode(6)))); assert diameter(r) == 4
--- solution
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def diameter(root):
    best = 0
    def height(node):
        nonlocal best
        if not node:
            return 0
        l, r = height(node.left), height(node.right)
        best = max(best, l + r)
        return 1 + max(l, r)
    height(root)
    return best
--- hint
Return the height from each call, and update an outer `best` with `left + right` at every node.
:::

=== lesson: bst | Binary search trees
In a BST, every value in a node's left subtree is smaller and every value in its right subtree is larger. Inorder traversal visits values in sorted order, which solves half the BST problems on its own (k-th smallest, validate, two-sum in BST, recover BST).

## Search and insert

```pyrun
def search(root, x):
    while root and root.val != x:
        root = root.left if x < root.val else root.right
    return root

def insert(root, x):
    if not root:
        return TreeNode(x)
    if x < root.val:
        root.left = insert(root.left, x)
    else:
        root.right = insert(root.right, x)
    return root

# try it
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

root = TreeNode(4, TreeNode(2, TreeNode(1), TreeNode(3)), TreeNode(6, None, TreeNode(7)))
insert(root, 5)
print(search(root, 5).val, search(root, 8))
```

## Validate with bounds

Checking only `left.val < node.val < right.val` is wrong; a value deep in the left subtree can still be too big. Carry the allowed range down:

```pyrun
def is_valid_bst(root, lo=float('-inf'), hi=float('inf')):
    if not root:
        return True
    if not (lo < root.val < hi):
        return False
    return is_valid_bst(root.left, lo, root.val) and is_valid_bst(root.right, root.val, hi)

# try it
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

root = TreeNode(4, TreeNode(2, TreeNode(1), TreeNode(3)), TreeNode(6, None, TreeNode(7)))
print(is_valid_bst(root))
```

## LCA in a BST

Walk down from the root: if both values are smaller, go left; both larger, go right; otherwise you're at the split point, which is the LCA.

## Deletion

Three cases: leaf (remove), one child (replace with the child), two children (copy the inorder successor's value in, then delete the successor from the right subtree).

::: exercise validate-bst | Validate a BST (LeetCode 98)
`is_valid_bst(root)` returns whether the tree is a valid BST with strictly increasing inorder values.

--- starter
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def is_valid_bst(root):
    pass
--- tests
assert is_valid_bst(TreeNode(2, TreeNode(1), TreeNode(3))) == True
assert is_valid_bst(TreeNode(5, TreeNode(1), TreeNode(4, TreeNode(3), TreeNode(6)))) == False
assert is_valid_bst(TreeNode(5, TreeNode(4), TreeNode(6, TreeNode(3), TreeNode(7)))) == False
assert is_valid_bst(None) == True
assert is_valid_bst(TreeNode(1, TreeNode(1))) == False
--- solution
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def is_valid_bst(root, lo=float('-inf'), hi=float('inf')):
    if not root:
        return True
    if not (lo < root.val < hi):
        return False
    return is_valid_bst(root.left, lo, root.val) and is_valid_bst(root.right, root.val, hi)
--- hint
The third test has a 3 in the right subtree of 5. Pass `(low, high)` bounds down the recursion.
:::


::: exercise kth-smallest | Kth smallest in a BST (LeetCode 230)
`kth_smallest(root, k)` returns the k-th smallest value (1-indexed). Stop as soon as you've found it.

--- starter
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def kth_smallest(root, k):
    pass
--- tests
r = TreeNode(3, TreeNode(1, None, TreeNode(2)), TreeNode(4)); assert kth_smallest(r, 1) == 1
r = TreeNode(3, TreeNode(1, None, TreeNode(2)), TreeNode(4)); assert kth_smallest(r, 3) == 3
r = TreeNode(5, TreeNode(3, TreeNode(2, TreeNode(1)), TreeNode(4)), TreeNode(6)); assert kth_smallest(r, 6) == 6
--- solution
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def kth_smallest(root, k):
    st, cur = [], root
    while cur or st:
        while cur:
            st.append(cur)
            cur = cur.left
        cur = st.pop()
        k -= 1
        if k == 0:
            return cur.val
        cur = cur.right
--- hint
Iterative inorder, counting down `k` as you visit nodes.
:::
