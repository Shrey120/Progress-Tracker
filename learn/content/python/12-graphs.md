---
course: python
module: graphs
title: Graphs
order: 12
---
=== lesson: graph-representation | Representing graphs, DFS and BFS
## Adjacency list

Almost always a dict (or list) of lists:

```python
from collections import defaultdict

graph = defaultdict(list)
for u, v in edges:
    graph[u].append(v)
    graph[v].append(u)          # omit for directed graphs

# nodes are 0..n-1: a list is faster than a dict
graph = [[] for _ in range(n)]
for u, v in edges:
    graph[u].append(v)

# weighted
graph = [[] for _ in range(n)]
for u, v, w in edges:
    graph[u].append((v, w))
```

A grid is a graph whose neighbours you compute on the fly with a direction list; don't build an explicit adjacency list for it.

## DFS (recursive and iterative)

```python
def dfs(start):
    seen = {start}
    def go(u):
        for v in graph[u]:
            if v not in seen:
                seen.add(v)
                go(v)
    go(start)
    return seen

def dfs_iter(start):
    seen, st = {start}, [start]
    while st:
        u = st.pop()
        for v in graph[u]:
            if v not in seen:
                seen.add(v)
                st.append(v)
    return seen
```

For grids of 10⁵+ cells, use the iterative version or BFS; recursion depth will be a problem.

## Counting components

```python
def count_components(n, edges):
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v); graph[v].append(u)
    seen = [False] * n
    count = 0
    for s in range(n):
        if not seen[s]:
            count += 1
            seen[s] = True
            st = [s]
            while st:
                u = st.pop()
                for v in graph[u]:
                    if not seen[v]:
                        seen[v] = True
                        st.append(v)
    return count
```

## Multi-source BFS

Rotting oranges, 01-matrix, walls and gates: put **every** source in the queue at distance 0 before starting. One BFS then gives each cell its distance to the nearest source.

## Grid flood fill without a visited set

When you're allowed to modify the grid, overwrite visited cells (`grid[r][c] = "0"`) instead of keeping a set. It's faster and simpler. Mention it to the interviewer, since it mutates the input.

::: exercise num-islands | Number of islands (LeetCode 200)
`num_islands(grid)` counts groups of `"1"` connected up/down/left/right in a grid of strings. Use an iterative DFS or BFS (the last test is a 300×300 all-land grid).

--- starter
def num_islands(grid):
    pass
--- tests
assert num_islands([["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]) == 3
assert num_islands([["0"]]) == 0
assert num_islands([["1","0","1"],["0","1","0"],["1","0","1"]]) == 5
assert num_islands([["1"] * 300 for _ in range(300)]) == 1
--- solution
def num_islands(grid):
    R, C = len(grid), len(grid[0])
    seen = set()
    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == "1" and (r, c) not in seen:
                count += 1
                seen.add((r, c))
                st = [(r, c)]
                while st:
                    i, j = st.pop()
                    for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                        if 0 <= ni < R and 0 <= nj < C and grid[ni][nj] == "1" and (ni, nj) not in seen:
                            seen.add((ni, nj))
                            st.append((ni, nj))
    return count
:::

::: exercise rotting-oranges | Rotting oranges (LeetCode 994)
`oranges_rotting(grid)` returns the minutes until no fresh orange (`1`) remains, where each minute rotten oranges (`2`) rot their 4 neighbours. Return `-1` if some orange never rots. Use multi-source BFS.

--- starter
from collections import deque

def oranges_rotting(grid):
    pass
--- tests
assert oranges_rotting([[2, 1, 1], [1, 1, 0], [0, 1, 1]]) == 4
assert oranges_rotting([[2, 1, 1], [0, 1, 1], [1, 0, 1]]) == -1
assert oranges_rotting([[0, 2]]) == 0
assert oranges_rotting([[0]]) == 0
--- solution
from collections import deque

def oranges_rotting(grid):
    R, C = len(grid), len(grid[0])
    q = deque()
    fresh = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == 2:
                q.append((r, c))
            elif grid[r][c] == 1:
                fresh += 1
    minutes = 0
    while q and fresh:
        for _ in range(len(q)):
            r, c = q.popleft()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    fresh -= 1
                    q.append((nr, nc))
        minutes += 1
    return -1 if fresh else minutes
--- hint
Queue every rotten orange first, count fresh ones, then BFS level by level, counting minutes.
:::

=== lesson: topo-sort | Topological sort and cycle detection
## Kahn's algorithm (BFS on in-degrees)

Repeatedly take nodes with no remaining prerequisites. If you can't take all n, there's a cycle.

```python
from collections import deque

def topo_sort(n, edges):          # edge (u, v): u must come before v
    graph = [[] for _ in range(n)]
    indeg = [0] * n
    for u, v in edges:
        graph[u].append(v)
        indeg[v] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return order if len(order) == n else []     # [] means a cycle
```

Course Schedule I and II, Alien Dictionary, and "find eventual safe states" (on the reversed graph) are this algorithm.

## Cycle detection with DFS colours (directed graphs)

```python
def has_cycle(n, graph):
    WHITE, GREY, BLACK = 0, 1, 2      # unvisited, on the current path, finished
    color = [WHITE] * n
    def dfs(u):
        color[u] = GREY
        for v in graph[u]:
            if color[v] == GREY:      # back edge: cycle
                return True
            if color[v] == WHITE and dfs(v):
                return True
        color[u] = BLACK
        return False
    return any(color[u] == WHITE and dfs(u) for u in range(n))
```

## Undirected cycles

In an undirected graph, a neighbour that's already visited and isn't the node you came from means a cycle. Pass the parent along in DFS/BFS. Union-Find (next lesson) is the other way.

::: exercise course-schedule | Course schedule II (LeetCode 210)
`find_order(n, prereqs)` returns an order to take courses `0..n-1`, where `[a, b]` means you must take `b` before `a`. Return `[]` if impossible. When several courses are available, take the smallest-numbered first (use a heap), so the answer is unique.

--- starter
import heapq

def find_order(n, prereqs):
    pass
--- tests
assert find_order(2, [[1, 0]]) == [0, 1]
assert find_order(4, [[1, 0], [2, 0], [3, 1], [3, 2]]) == [0, 1, 2, 3]
assert find_order(2, [[1, 0], [0, 1]]) == []
assert find_order(3, []) == [0, 1, 2]
assert find_order(3, [[0, 2]]) == [1, 2, 0]
--- solution
import heapq

def find_order(n, prereqs):
    graph = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in prereqs:
        graph[b].append(a)
        indeg[a] += 1
    h = [i for i in range(n) if indeg[i] == 0]
    heapq.heapify(h)
    order = []
    while h:
        u = heapq.heappop(h)
        order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heapq.heappush(h, v)
    return order if len(order) == n else []
--- hint
Kahn's algorithm with a min-heap instead of a deque. Note the edge direction: `[a, b]` is an edge `b -> a`.
:::

=== lesson: shortest-paths | Dijkstra and union-find
## Dijkstra with heapq

Non-negative weights. Use "lazy deletion": push duplicates, and skip popped entries that are stale.

```python
import heapq

def dijkstra(n, graph, src):          # graph[u] = [(v, w), ...]
    dist = [float('inf')] * n
    dist[src] = 0
    h = [(0, src)]
    while h:
        d, u = heapq.heappop(h)
        if d > dist[u]:               # stale entry
            continue
        for v, w in graph[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(h, (nd, v))
    return dist
```

O((V + E) log V). Variants: Network Delay Time (max of dist), Path With Minimum Effort (the "distance" is the max edge so far), Cheapest Flights Within K Stops (state is `(cost, node, stops)`, and it's often easier as Bellman-Ford/BFS by levels).

## Union-Find (Disjoint Set Union)

Answers "are these two in the same group?" in near O(1), and merges groups. Path compression plus union by size:

```python
class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]   # path halving
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False                                  # already joined: this edge makes a cycle
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]
        return True
```

The iterative `find` avoids recursion-depth problems. Uses: number of provinces, redundant connection, accounts merge, Kruskal's MST (sort edges by weight, union if not already joined), making a network connected.

::: exercise network-delay | Network delay time (LeetCode 743)
`network_delay(times, n, k)` returns how long it takes for a signal from node `k` to reach all nodes `1..n` along directed edges `(u, v, w)`, or `-1` if some node is unreachable.

--- starter
import heapq

def network_delay(times, n, k):
    pass
--- tests
assert network_delay([[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2) == 2
assert network_delay([[1, 2, 1]], 2, 1) == 1
assert network_delay([[1, 2, 1]], 2, 2) == -1
assert network_delay([[1, 2, 5], [1, 3, 1], [3, 2, 1]], 3, 1) == 2
--- solution
import heapq

def network_delay(times, n, k):
    graph = [[] for _ in range(n + 1)]
    for u, v, w in times:
        graph[u].append((v, w))
    dist = [float('inf')] * (n + 1)
    dist[k] = 0
    h = [(0, k)]
    while h:
        d, u = heapq.heappop(h)
        if d > dist[u]:
            continue
        for v, w in graph[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(h, (d + w, v))
    ans = max(dist[1:])
    return -1 if ans == float('inf') else ans
:::

::: exercise redundant-connection | Redundant connection (LeetCode 684)
A tree on nodes `1..n` had one extra edge added. `redundant(edges)` returns the edge that can be removed to leave a tree; if several could, return the one that appears last in the input. Use union-find.

--- starter
def redundant(edges):
    pass
--- tests
assert redundant([[1, 2], [1, 3], [2, 3]]) == [2, 3]
assert redundant([[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]) == [1, 4]
--- solution
def redundant(edges):
    parent = list(range(len(edges) + 1))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for u, v in edges:
        ru, rv = find(u), find(v)
        if ru == rv:
            return [u, v]
        parent[ru] = rv
--- hint
The first edge whose endpoints already share a root is the answer.
:::
