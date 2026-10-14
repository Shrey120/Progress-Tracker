---
course: prep
module: sql-and-postgres
title: SQL and Postgres
order: 105
---
=== lesson: aggregations-group-by | Aggregations and GROUP BY
Every SQL lesson here runs against a small **shop database** with three tables: `users` (id, name, city, joined_at), `products` (id, name, category, price) and `orders` (id, user_id, product_id, qty, status, created_at). Each **▶ Run** starts from a fresh copy, so you can't break anything. The engine is SQLite; where Postgres differs, the lesson says so.

```sqlrun
SELECT * FROM orders LIMIT 5;
```

## Aggregate functions

`COUNT`, `SUM`, `AVG`, `MIN`, `MAX` collapse many rows into one value. `GROUP BY` makes one group per distinct value, and the aggregates run per group.

```sqlrun
SELECT status, COUNT(*) AS orders, SUM(qty) AS items
FROM orders
GROUP BY status
ORDER BY orders DESC;
```

## WHERE vs HAVING

`WHERE` filters **rows before** grouping; `HAVING` filters **groups after** aggregating.

```sqlrun
-- users with 2+ non-cancelled orders
SELECT user_id, COUNT(*) AS n
FROM orders
WHERE status <> 'cancelled'
GROUP BY user_id
HAVING COUNT(*) >= 2;
```

## Rules interviewers check

- Every selected column must be grouped or aggregated. (MySQL and SQLite are lenient about this; Postgres errors.)
- `COUNT(*)` counts rows; `COUNT(col)` skips NULLs; `COUNT(DISTINCT col)` counts unique values.
- Logical order of a query: `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`. That's why you can't use a `SELECT` alias in `WHERE`.

```sqlrun
SELECT COUNT(*) AS users, COUNT(city) AS with_city, COUNT(DISTINCT city) AS cities FROM users;
```

=== lesson: joins | Joins
Joins combine rows from two tables on a condition.

| Join | Keeps |
|---|---|
| `INNER JOIN` | only rows with a match on both sides |
| `LEFT JOIN` | every row from the left table; NULLs where the right has no match |
| `RIGHT JOIN` | the mirror image (rarely used; swap the tables instead) |
| `FULL OUTER JOIN` | all rows from both, matched where possible |
| `CROSS JOIN` | every combination |
| self join | a table joined to itself (employees and their managers) |

## Inner join

```sqlrun
SELECT o.id, u.name, p.name AS product, o.qty * p.price AS amount
FROM orders o
JOIN users u    ON u.id = o.user_id
JOIN products p ON p.id = o.product_id
WHERE o.status <> 'cancelled'
ORDER BY amount DESC;
```

## Left join and the "anti-join"

Users who have never ordered: keep every user, then keep only those where the right side found nothing.

```sqlrun
SELECT u.name, COUNT(o.id) AS orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id
ORDER BY orders;
```

```sqlrun
SELECT u.name
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL;            -- or: WHERE NOT EXISTS (SELECT 1 FROM orders WHERE user_id = u.id)
```

## The trap: filtering a LEFT JOIN in WHERE

A condition on the right table in `WHERE` throws away the NULL rows and silently turns it into an inner join. Put it in `ON` instead:

```sqlrun
-- every user, with how many PAID orders they have (0 included)
SELECT u.name, COUNT(o.id) AS paid
FROM users u
LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid'
GROUP BY u.id;
```

## Duplicates from one-to-many joins

Joining users to orders repeats each user once per order. Summing a user column after that join double-counts. Aggregate in a subquery first, then join.

=== lesson: ctes | CTEs (WITH queries)
A **common table expression** names a subquery so you can read the query top to bottom.

```sqlrun
WITH spend AS (
  SELECT o.user_id, SUM(o.qty * p.price) AS total
  FROM orders o JOIN products p ON p.id = o.product_id
  WHERE o.status <> 'cancelled'
  GROUP BY o.user_id
)
SELECT u.name, s.total
FROM spend s JOIN users u ON u.id = s.user_id
WHERE s.total > (SELECT AVG(total) FROM spend)
ORDER BY s.total DESC;
```

## Recursive CTEs

For hierarchies and sequences: category trees, org charts, threaded comments, date ranges.

```sqlrun
WITH RECURSIVE days(d) AS (
  SELECT '2025-06-01'
  UNION ALL
  SELECT date(d, '+1 day') FROM days WHERE d < '2025-06-07'
)
SELECT days.d, COUNT(o.id) AS orders
FROM days LEFT JOIN orders o ON o.created_at = days.d
GROUP BY days.d;
```

That's also how you fill gaps in a report (days with zero orders). Postgres has `generate_series` for this specific case.

## Notes

- A CTE is mainly for readability. Postgres 12+ inlines simple CTEs into the main query, so they're usually not slower than subqueries. `MATERIALIZED` / `NOT MATERIALIZED` force the choice.
- Data-modifying CTEs in Postgres (`WITH deleted AS (DELETE ... RETURNING *) INSERT INTO archive SELECT * FROM deleted`) move rows atomically in one statement.

=== lesson: window-functions | Window functions
A window function computes over a set of rows **related to the current row** without collapsing them, unlike `GROUP BY`. Syntax: `fn() OVER (PARTITION BY … ORDER BY …)`.

## Ranking

```sqlrun
SELECT name, category, price,
  ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn,
  RANK()       OVER (ORDER BY price DESC) AS overall_rank
FROM products;
```

`ROW_NUMBER` always 1,2,3; `RANK` leaves gaps after ties (1,1,3); `DENSE_RANK` doesn't (1,1,2).

## Top-N per group

The most common interview query: "the most expensive product in each category".

```sqlrun
SELECT category, name, price
FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn
  FROM products
)
WHERE rn = 1;
```

## Running totals and comparisons

```sqlrun
SELECT created_at, id,
  SUM(qty) OVER (ORDER BY created_at, id) AS running_items,
  LAG(created_at) OVER (ORDER BY created_at, id) AS previous_order_date
FROM orders
WHERE status <> 'cancelled';
```

`LAG`/`LEAD` read the previous/next row: day-over-day change, gaps between events, sessionisation. Frame clauses (`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`) give moving averages.

## Second-highest and Nth value

```sqlrun
SELECT DISTINCT price FROM (
  SELECT price, DENSE_RANK() OVER (ORDER BY price DESC) AS r FROM products
) WHERE r = 2;
```

=== lesson: indexes-b-trees | Indexes and B-trees
Without an index, finding rows means reading the whole table: a **sequential scan**, O(n). An index is a separate sorted structure that maps column values to row locations, so lookups are O(log n).

## B-trees

Postgres's default index is a **B-tree**: a balanced tree with wide nodes (hundreds of keys per page), so even millions of rows need only 3–4 page reads. Because keys are sorted, a B-tree serves:

- equality: `WHERE email = ?`
- ranges: `WHERE created_at > ?`, `BETWEEN`
- prefix `LIKE 'abc%'` (not `'%abc'`)
- `ORDER BY` and `MIN`/`MAX` without sorting

## See the plan change

```sqlrun
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE user_id = 3;
CREATE INDEX idx_orders_user ON orders(user_id);
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE user_id = 3;
```

(SQLite's plan output is shorter than Postgres's `EXPLAIN`, but the idea is the same: SCAN becomes SEARCH using the index.)

## Costs

- Every index slows `INSERT`/`UPDATE`/`DELETE` (it must be updated too) and uses disk and memory.
- Low-selectivity columns (a boolean, a status with 3 values) rarely benefit; the planner prefers a scan when many rows match.
- Functions on the column defeat it: `WHERE lower(email) = ?` needs an **expression index** on `lower(email)`.

## Other Postgres index types

`GIN` (JSONB, arrays, full-text search), `GiST` (geospatial, ranges), `BRIN` (huge append-only tables ordered by time), `HASH` (equality only). **Partial** indexes (`WHERE deleted_at IS NULL`) and **covering** indexes (`INCLUDE (col)`) for index-only scans.

> **"How does an index speed up a query, and what does it cost?"** It keeps the column sorted in a B-tree so the database can jump to matching rows in log time instead of scanning. The cost is extra writes on every insert/update and storage, so index the columns your queries filter, join and sort on.

=== lesson: composite-index-column-order | Composite index column order
An index on `(a, b, c)` is sorted by `a`, then by `b` within equal `a`, then `c`, like a phone book sorted by surname then first name.

## The leftmost prefix rule

It can be used for queries that filter on a **leading prefix** of its columns:

| Query filters | Uses `(a, b, c)`? |
|---|---|
| `a` | yes |
| `a, b` | yes |
| `a, b, c` | yes |
| `b` or `b, c` | no (usually a full scan) |
| `a, c` | partly: seeks on `a`, then filters `c` |

## Ordering the columns

1. **Equality columns first**, then the range or sort column. For `WHERE user_id = ? AND created_at > ? ORDER BY created_at`, index `(user_id, created_at)`. Put the range first and the equality can't narrow the range.
2. Among equality columns, order by what other queries need as a prefix too (not strictly by selectivity).
3. Include the `ORDER BY` column after the equality columns so the database can read rows already sorted and stop after `LIMIT`.

```sqlrun
CREATE INDEX idx_user_date ON orders(user_id, created_at);
EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE user_id = 1 AND created_at >= '2025-06-02' ORDER BY created_at;
EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE created_at >= '2025-06-02';
```

The first query searches the index; the second can't use it (no `user_id`) and scans.

> **"Index on (status, created_at) or (created_at, status)?"** For `WHERE status = ? AND created_at > ?`, status first: equality before range, so the index narrows to one status and then reads a contiguous date range.

=== lesson: explain-query-plans | EXPLAIN and query plans
`EXPLAIN` shows how the database plans to run a query. `EXPLAIN ANALYZE` (Postgres) actually runs it and shows real times and row counts.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;

Limit  (cost=0.43..8.95 rows=20) (actual time=0.031..0.060 rows=20 loops=1)
  ->  Index Scan Backward using idx_orders_user_created on orders
        Index Cond: (user_id = 42)
        Buffers: shared hit=24
Planning Time: 0.1 ms
Execution Time: 0.08 ms
```

## What to look for

- **Seq Scan** on a big table with a selective `WHERE` → a missing or unusable index.
- **Estimated rows vs actual rows** far apart → stale statistics; run `ANALYZE`.
- **Sort** with "external merge Disk" → not enough `work_mem`, or an index could provide the order.
- **Nested Loop** over many outer rows → fine for few rows, bad for many; Hash Join or Merge Join is better for big joins.
- **Rows Removed by Filter** large → the index found too much; a composite or partial index would be tighter.
- The node with the largest **actual time** (times are cumulative; read inner nodes first).

## Join algorithms

| Join | Best when |
|---|---|
| Nested loop | small outer side + index on the inner join key |
| Hash join | large, unsorted inputs, equality joins |
| Merge join | both inputs already sorted on the key |

## Try the SQLite version

```sqlrun
EXPLAIN QUERY PLAN
SELECT u.name, COUNT(*) FROM orders o JOIN users u ON u.id = o.user_id GROUP BY u.id;
```

> **"A query got slow. What do you do?"** Get the real plan with EXPLAIN ANALYZE, find the expensive node, check for sequential scans and bad row estimates, add or adjust an index (or rewrite the query), and confirm the new plan. `pg_stat_statements` tells you which queries to look at in the first place.

=== lesson: n-1-queries | N+1 queries
Loading a list, then running **one more query per item** to fetch related data: 1 query for 50 posts + 50 queries for their authors = 51 round trips.

```js
const posts = await db.query("SELECT * FROM posts LIMIT 50");
for (const p of posts) {
  p.author = await db.query("SELECT * FROM users WHERE id = $1", [p.author_id]);  // N queries
}
```

ORMs make this easy to do by accident: accessing `post.author` lazily triggers a query each time.

## Fixes

1. **Join** in one query:

```sqlrun
SELECT o.id, o.status, u.name
FROM orders o JOIN users u ON u.id = o.user_id;
```

2. **Batch** with `IN` (2 queries total):

```sqlrun
SELECT * FROM users WHERE id IN (1, 2, 3, 4);
```

3. **ORM eager loading**: Prisma `include`, Sequelize `include`, Django `select_related`/`prefetch_related`, Rails `includes`.
4. **DataLoader** in GraphQL: collects all IDs requested in one tick and batches them.

## Spotting it

Query logs showing the same statement repeated with different IDs, an APM trace with dozens of identical spans, or response time growing linearly with page size.

> **"Your endpoint runs fine with 10 items and times out with 500. Why?"** Most likely N+1: one query per item. Confirm in the query log, then replace it with a join, an `IN` batch, or eager loading.

=== lesson: normalization-vs-denormalization | Normalization vs denormalization
**Normalization** stores each fact once and links tables with keys, so data can't contradict itself. **Denormalization** deliberately duplicates data to make reads cheaper.

## The normal forms, practically

- **1NF** — atomic values, no repeating groups (no `phone1, phone2, phone3` columns, no comma-separated lists).
- **2NF** — every non-key column depends on the **whole** key (matters with composite keys).
- **3NF** — non-key columns depend **only** on the key, not on other non-key columns. If `orders` stored `customer_city`, it depends on the customer, not the order: move it to `users`.

Our shop schema is 3NF: an order stores `user_id` and `product_id`, never the user's name or the product's price.

## Why denormalize

Joins and aggregations get expensive at scale. Common denormalizations:

- **Counters**: `posts.comment_count` instead of `COUNT(*)` on every page view.
- **Snapshot values**: an order line should store the **price at purchase time**; that's not duplication, it's a different fact (product price can change later).
- **Read models**: a flattened table or materialized view built for a dashboard.
- **Document stores**: embedding related data for one-read access.

## The cost

Duplicated data must be kept in sync (triggers, application code, events), and it can drift. Every write path has to remember to update it.

> **"Normalize or denormalize?"** Normalize by default for correctness. Denormalize specific, measured hot paths, and own the mechanism that keeps the copy in sync.

=== lesson: sql-vs-nosql-how-to-choose | SQL vs NoSQL: how to choose
Asked in almost every full-stack interview, usually as "Why did you use MongoDB / Postgres in your project?"

## The real differences

| | Relational (Postgres, MySQL) | Document (MongoDB, Firestore, DynamoDB) |
|---|---|---|
| Data model | tables, rows, fixed schema, relations via foreign keys | JSON-like documents, flexible schema per document |
| Queries | SQL: joins, aggregations, ad-hoc questions | best at fetching by key or known access patterns; joins limited or absent |
| Integrity | constraints, foreign keys, multi-row ACID transactions | mostly enforced in application code; multi-document transactions exist but cost more |
| Scaling | vertical first; read replicas; sharding is harder | designed to shard horizontally (DynamoDB, Mongo sharding) |
| Schema changes | migrations | add fields freely (and handle old shapes in code) |

## How to decide

Start from the **data and the queries**:

- Data is relational (users, orders, products, payments), needs consistency, and you'll ask questions you can't predict (reports, admin search) → **Postgres**. This is most business apps.
- Access patterns are known and simple (get by key), data is naturally a self-contained document, scale is massive or spiky → a document or key-value store.
- Special shapes need special stores: time series (Timescale), search (Elasticsearch), graphs (Neo4j), cache (Redis), vectors (pgvector, Pinecone).

## A strong answer

> "I default to Postgres: most product data is relational, I get joins, constraints and transactions, and `jsonb` covers the flexible parts. I'd pick a document store when the access pattern is known up front and mostly key-based at very high scale, like a session store or an event feed, or when the team's infrastructure is already built around it. 'NoSQL scales better' alone isn't a reason: Postgres handles far more than most apps ever need."

If your project used MongoDB, explain the reason honestly (schema flexibility while iterating, team familiarity) and what you'd do differently, such as where you missed joins or transactions.

=== lesson: transactions-acid | Transactions and ACID
A **transaction** groups statements so they succeed or fail together.

- **Atomicity** — all or nothing. A failure rolls back everything in the transaction.
- **Consistency** — constraints (foreign keys, checks, uniqueness) hold before and after.
- **Isolation** — concurrent transactions don't see each other's half-finished work (to a degree set by the isolation level).
- **Durability** — once committed, it survives a crash (write-ahead log flushed to disk).

## See atomicity

The second insert breaks a `NOT NULL` constraint, so the whole transaction is rolled back, including the first insert. The final count is still 12.

```sqlrun
SELECT COUNT(*) AS before FROM orders;
BEGIN;
INSERT INTO orders (user_id, product_id, qty, status, created_at) VALUES (1, 2, 1, 'paid', '2025-07-01');
INSERT OR ROLLBACK INTO orders (user_id, product_id, qty, status, created_at) VALUES (1, 2, 1, NULL, '2025-07-01');
COMMIT;
SELECT COUNT(*) AS after FROM orders;
```

Postgres aborts the whole transaction on any error (every later statement fails until `ROLLBACK`). SQLite by default only undoes the failing statement, which is why this example needs `OR ROLLBACK` to behave the same way.

```sqlrun
-- the classic: move money atomically
CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER CHECK (balance >= 0));
INSERT INTO accounts VALUES (1, 500), (2, 100);
BEGIN;
UPDATE accounts SET balance = balance - 200 WHERE id = 1;
UPDATE accounts SET balance = balance + 200 WHERE id = 2;
COMMIT;
SELECT * FROM accounts;
```

## In application code

```js
await db.transaction(async (tx) => {
  const [acct] = await tx.query("SELECT balance FROM accounts WHERE id = $1 FOR UPDATE", [from]);
  if (acct.balance < amount) throw new Error("insufficient funds");   // rolls back
  await tx.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [amount, from]);
  await tx.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [amount, to]);
});
```

Keep transactions **short**: no network calls (payment APIs, emails) inside them, since they hold locks the whole time.

=== lesson: isolation-levels | Isolation levels
Isolation decides which effects of **concurrent** transactions you can see. Stronger isolation prevents more anomalies but costs more (blocking or retries).

## The anomalies

- **Dirty read** — reading another transaction's uncommitted change.
- **Non-repeatable read** — reading the same row twice and getting different values because someone committed in between.
- **Phantom read** — re-running a range query and getting new rows.
- **Lost update** — two transactions read, modify and write the same value; one overwrites the other.
- **Write skew** — two transactions each check a condition, then write different rows, together breaking the rule (two doctors both going off call).

## The levels (Postgres behaviour)

| Level | Prevents | Notes |
|---|---|---|
| Read uncommitted | (behaves as read committed in Postgres) | |
| **Read committed** (default) | dirty reads | each **statement** sees a fresh snapshot |
| **Repeatable read** | + non-repeatable and phantom reads | one snapshot for the **whole transaction**; conflicting writes fail with a serialization error |
| **Serializable** | + write skew | as if transactions ran one at a time; may abort and require a retry |

## Handling lost updates at read committed

```sql
-- atomic update: no read-modify-write in application code
UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock > 0;

-- or lock the row while deciding
SELECT stock FROM products WHERE id = $1 FOR UPDATE;

-- or optimistic concurrency with a version column
UPDATE docs SET body = $1, version = version + 1 WHERE id = $2 AND version = $3;  -- 0 rows → retry
```

> **"What isolation level do you use?"** Read committed by default, with atomic updates, row locks (`SELECT … FOR UPDATE`) or version columns where read-modify-write races matter. Serializable for invariants spanning several rows, with retry logic for serialization failures.

=== lesson: mvcc | MVCC
**Multi-Version Concurrency Control** is how Postgres lets readers and writers work at the same time without blocking each other.

## How it works

- An `UPDATE` doesn't overwrite a row. It writes a **new version** and marks the old one as expired. Each version records which transaction created it (`xmin`) and which deleted it (`xmax`).
- Each transaction reads from a **snapshot**: it sees only versions committed before its snapshot was taken.
- So readers never block writers and writers never block readers. Only two writers to the same row conflict.

## The cost: dead tuples and VACUUM

Old versions stay on disk until no running transaction could need them. **VACUUM** (usually autovacuum) reclaims that space; without it, tables and indexes **bloat**. Problems to mention:

- A **long-running transaction** (or an idle-in-transaction connection) holds back cleanup for the whole database.
- Update-heavy tables need tuned autovacuum.
- **Transaction ID wraparound**: IDs are 32-bit, so vacuum must "freeze" old rows; ignoring it can force the database into read-only protection mode.

Postgres's HOT updates (heap-only tuples) avoid index updates when no indexed column changed, which is a reason not to index columns that change constantly.

> **"Why don't reads block writes in Postgres?"** MVCC: writers create new row versions and readers keep seeing the version that matches their snapshot. The trade-off is dead row versions that VACUUM has to clean up.

=== lesson: locking-deadlocks | Locking and deadlocks
## Row locks

- `UPDATE` and `DELETE` lock the rows they change until the transaction ends.
- `SELECT … FOR UPDATE` locks rows you read, so nobody else changes them while you decide.
- `FOR UPDATE SKIP LOCKED` skips rows other transactions hold: the standard way to build a **job queue** in Postgres where many workers each grab different jobs.
- `FOR UPDATE NOWAIT` errors instead of waiting.

## Table locks to watch

Some DDL takes heavy locks: `ALTER TABLE ... ADD COLUMN ... DEFAULT volatile()`, adding a non-concurrent index, or changing a column type can block all reads and writes on a busy table (see the migrations lessons).

## Deadlocks

Transaction A locks row 1 then wants row 2; B locks row 2 then wants row 1. Each waits for the other forever. Postgres detects the cycle (after `deadlock_timeout`, 1 s by default) and aborts one with a deadlock error.

```
A: UPDATE accounts SET … WHERE id = 1;   B: UPDATE accounts SET … WHERE id = 2;
A: UPDATE accounts SET … WHERE id = 2;   B: UPDATE accounts SET … WHERE id = 1;   ← deadlock
```

## Preventing them

- **Lock in a consistent order** (always lower id first): `ORDER BY id FOR UPDATE`.
- Keep transactions short; no user or network waits inside.
- Retry the aborted transaction (it's safe, since it was rolled back).
- Advisory locks (`pg_advisory_xact_lock(key)`) for application-level mutual exclusion.

> **"How do you avoid deadlocks?"** Acquire locks in the same order everywhere, keep transactions short, and retry on deadlock errors, which the database resolves by aborting one side.

=== lesson: connection-pooling | Connection pooling
Opening a Postgres connection is expensive (a new server process, authentication, a few MB of memory). And Postgres handles hundreds of connections, not thousands: each one is a process, and too many hurt throughput.

A **pool** keeps a set of open connections and lends them out per query or transaction.

## Where pooling happens

- **In the app**: `pg.Pool`, Prisma's pool, HikariCP. Each app instance has its own pool.
- **External pooler**: **PgBouncer**, Supavisor, RDS Proxy. Many app instances share a small number of real database connections.

## Why serverless makes it urgent

Each serverless function instance opens its own connections. A traffic spike can create thousands of instances and exhaust `max_connections`. Use a pooler (Supabase and Neon provide one) or an HTTP-based driver.

## Pool modes (PgBouncer)

| Mode | Connection held for | Caveat |
|---|---|---|
| session | the client's whole session | least gain |
| **transaction** | one transaction | most common; no session state (session `SET`, advisory locks, some prepared statements) across transactions |
| statement | one statement | no multi-statement transactions |

## Sizing

More connections isn't faster. A rule of thumb from the Postgres community: start around `(CPU cores × 2) + effective disk spindles` active connections and measure. Watch for **pool exhaustion** (requests waiting for a connection): usually caused by slow queries, transactions held open across network calls, or leaked connections not released on errors.

=== lesson: schema-migrations-on-live-tables | Schema migrations on live tables
Running `ALTER TABLE` on a table serving traffic can lock it and take the site down. The two dangers: **long-held locks** and **long rewrites**.

## Lock queue gotcha

`ALTER TABLE` needs an `ACCESS EXCLUSIVE` lock. If a long query is running, the ALTER waits, and **every query after it queues behind the ALTER**, even plain SELECTs. Always set:

```sql
SET lock_timeout = '3s';     -- fail fast and retry instead of blocking everyone
```

## Safe vs dangerous operations (Postgres)

| Operation | Safe? |
|---|---|
| Add nullable column | yes, instant |
| Add column with a constant default | yes since Postgres 11 (no rewrite) |
| Add NOT NULL column without default | fails if rows exist |
| `CREATE INDEX` | **blocks writes** → use `CREATE INDEX CONCURRENTLY` |
| Add foreign key | scans the table under lock → add `NOT VALID`, then `VALIDATE CONSTRAINT` |
| Add `NOT NULL` | scans → add a `CHECK (col IS NOT NULL) NOT VALID`, validate, then set NOT NULL |
| Change column type | usually a full rewrite → new column + backfill |
| Rename column / drop column | instant, but breaks running app code → expand/contract |

## Tooling

Migration files in version control (Prisma Migrate, Knex, Flyway, Alembic), applied by CI, with linters like `squawk` that flag dangerous statements. Run migrations separately from app deploys so you can do them in safe steps.

=== lesson: zero-downtime-column-changes-backfills | Zero-downtime column changes and backfills
During a deploy, old and new app versions run at the same time. Any schema change must work with both. The pattern is **expand / migrate / contract**.

## Renaming `name` to `full_name`

1. **Expand**: add `full_name` (nullable). Deploy code that **writes both** columns and still reads `name`.
2. **Backfill**: copy existing data in batches.
3. **Switch reads**: deploy code that reads `full_name` (still writing both).
4. **Contract**: deploy code that stops writing `name`; then drop the column.

Each step is a separate deploy, and each is safe to roll back.

## Backfilling safely

One giant `UPDATE` locks millions of rows, bloats the table and floods replication. Batch it:

```sql
UPDATE users SET full_name = name
WHERE id IN (
  SELECT id FROM users WHERE full_name IS NULL ORDER BY id LIMIT 5000
);
-- repeat (from a script or job) until 0 rows, with a short pause between batches
```

Monitor replication lag and database load while it runs; make the job resumable.

## Same pattern for

Changing a type (int → bigint IDs before they overflow), splitting a table, moving data to a new service. Feature flags can control which column the code reads.

> **"How would you rename a column in production without downtime?"** Expand and contract: add the new column, dual-write, backfill in batches, switch reads, stop writing the old one, then drop it, with each step deployed separately.

=== lesson: soft-deletes | Soft deletes
Instead of `DELETE`, set a flag: `deleted_at TIMESTAMP NULL`. The row stays, invisible to normal queries.

```sqlrun
ALTER TABLE users ADD COLUMN deleted_at TEXT;
UPDATE users SET deleted_at = '2025-07-01' WHERE id = 6;
SELECT id, name FROM users WHERE deleted_at IS NULL;
```

## Why

Undo / trash bins, audit history, legal retention, and keeping foreign keys from orders to a deleted user valid.

## Costs to mention

- **Every query must filter** `deleted_at IS NULL`. Forget once and deleted data leaks. Mitigate with a view, ORM default scopes, or Postgres row-level security.
- **Unique constraints break**: a deleted user's email blocks a new signup. Use a partial unique index: `CREATE UNIQUE INDEX ON users(email) WHERE deleted_at IS NULL`.
- Tables grow forever; indexes include dead rows (partial indexes help).
- **Privacy laws** (GDPR, India's DPDP Act) may require real deletion or anonymisation on request.

Alternatives: move deleted rows to an archive table, or keep an audit/event log and delete for real.

=== lesson: jsonb | JSONB
Postgres stores JSON two ways: `json` (text, kept as written) and **`jsonb`** (binary, parsed, keys deduplicated, indexable). Use `jsonb`.

```sql
CREATE TABLE events (id bigserial PRIMARY KEY, payload jsonb NOT NULL);

SELECT payload->>'type' AS type,                -- ->> returns text, -> returns jsonb
       payload->'user'->>'id' AS user_id
FROM events
WHERE payload @> '{"type": "signup"}';          -- containment: uses a GIN index

CREATE INDEX ON events USING GIN (payload jsonb_path_ops);
CREATE INDEX ON events ((payload->>'type'));     -- expression index for one hot key
UPDATE events SET payload = jsonb_set(payload, '{seen}', 'true') WHERE id = 1;
```

SQLite has JSON functions too:

```sqlrun
SELECT json_extract('{"user": {"id": 7, "plan": "pro"}}', '$.user.plan') AS plan;
```

## When to use it

- Data that's genuinely variable: webhook payloads, event properties, per-tenant custom fields, feature settings.
- Storing an external API response as-is.

## When not to

Anything you filter, join or constrain often belongs in real columns: you get types, foreign keys, NOT NULL and smaller indexes. A common good design is a hybrid: core fields as columns, the long tail in a `jsonb` column.

> **"JSONB vs a NoSQL database?"** For most apps, a `jsonb` column inside Postgres gives schema flexibility where needed while keeping transactions, joins and constraints for everything else.

=== lesson: materialized-views | Materialized views
A **view** is a saved query, run every time you select from it. A **materialized view** stores the query's **result** as a table, so reads are fast, but it only updates when you refresh it.

```sql
CREATE MATERIALIZED VIEW daily_revenue AS
SELECT created_at::date AS day, SUM(qty * price) AS revenue
FROM orders JOIN products ON products.id = orders.product_id
WHERE status <> 'cancelled'
GROUP BY 1;

CREATE UNIQUE INDEX ON daily_revenue(day);
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_revenue;   -- needs the unique index; readers aren't blocked
```

## Good for

Dashboards and reports over large tables, leaderboards, search facets: expensive aggregations that can be minutes or hours stale.

## Trade-offs

- Data is stale between refreshes; schedule them (pg_cron, a job) or refresh after relevant writes.
- A full refresh recomputes everything; for very large data, maintain a summary table incrementally instead (update counters on write, or roll up only new data).
- Without `CONCURRENTLY`, a refresh locks out readers.

=== lesson: read-replicas-replication-lag | Read replicas and replication lag
A **read replica** is a copy of the primary database that receives its changes (Postgres streams the write-ahead log) and serves read-only queries. It scales reads and isolates heavy queries (reports, analytics) from the primary.

## Replication lag

Replication is usually **asynchronous**: the primary commits, and the replica applies the change milliseconds (or under load, seconds) later. Reading from a replica right after writing can return old data.

The classic bug: a user updates their profile, the page reloads, the read goes to a replica, and they see the old name.

## Handling it

- **Read-your-writes**: send a user's reads to the primary for a few seconds after they write (track a timestamp in their session).
- Route by consistency need: payments and anything just written → primary; feeds, search, reports → replicas.
- Compare log positions (LSN): read from a replica only if it has caught up to the position of the user's last write.
- Synchronous replication removes lag for durability but makes every commit wait for the replica.

## Also

Replicas don't help write throughput (that's sharding). A replica can be promoted to primary on failure (managed services automate failover). Monitor lag; a long query on a replica can make it fall behind or get cancelled.

=== lesson: partitioning | Partitioning
**Partitioning** splits one logical table into smaller physical tables on the **same** database server, by a key. Queries still use the parent table name.

```sql
CREATE TABLE events (
  id bigint, created_at timestamptz NOT NULL, payload jsonb
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_10 PARTITION OF events
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
```

Strategies: **range** (time: the most common), **list** (region, tenant tier), **hash** (spread evenly).

## Why

- **Partition pruning**: a query for last week only scans last week's partition.
- **Cheap retention**: dropping an old partition is instant; `DELETE` of millions of rows is slow and causes bloat.
- Smaller indexes per partition; maintenance (vacuum) per partition.

## Caveats

- Queries that don't filter on the partition key scan every partition.
- Unique constraints must include the partition key.
- Too many partitions (thousands) slow planning. Tools like `pg_partman` create future partitions automatically.

> **"Partitioning vs sharding?"** Partitioning splits a table within one database server for manageability and pruning. Sharding splits data across multiple servers to scale writes and storage beyond one machine.

=== lesson: sharding | Sharding
**Sharding** splits data across several independent database servers. Each shard holds a subset of rows; together they hold everything. It's how you scale **writes** and storage past one machine.

## Choosing a shard key

The most important decision. A good key:

- **spreads load evenly** (no hot shard),
- **keeps related data together** so most queries hit one shard (e.g. `tenant_id` for B2B SaaS, `user_id` for a social app),
- **doesn't change** for a row.

Strategies: **hash** of the key (even spread, range queries scatter), **range** (good for ranges, risks hot spots on the newest range), **directory/lookup** (a mapping table; flexible, extra hop).

## The costs

- **Cross-shard queries and joins** must fan out and merge in the application.
- **Cross-shard transactions** need two-phase commit or sagas; most designs avoid them.
- **Resharding** when shards fill up is painful; consistent hashing or many small logical shards mapped to fewer machines makes it easier.
- Global unique IDs can't come from one sequence (see Unique ID generation in System design).

## Before you shard

Read replicas, caching, better indexes, partitioning, vertical scaling and archiving old data usually get you very far. Tools like **Citus** (Postgres), Vitess (MySQL), or distributed SQL (CockroachDB, YugabyteDB, Spanner) handle sharding for you.

> **"How would you shard this?"** Pick a key that matches the dominant access pattern so most queries stay on one shard, use hashing to spread load, and plan for cross-shard queries and resharding up front.

=== lesson: triggers | Triggers
A **trigger** runs a function automatically on `INSERT`, `UPDATE` or `DELETE`, before or after the change, per row or per statement.

```sqlrun
CREATE TABLE audit (order_id INTEGER, old_status TEXT, new_status TEXT);
CREATE TRIGGER order_status_audit AFTER UPDATE OF status ON orders
BEGIN
  INSERT INTO audit VALUES (OLD.id, OLD.status, NEW.status);
END;
UPDATE orders SET status = 'shipped' WHERE id = 1;
SELECT * FROM audit;
```

In Postgres a trigger calls a function written in PL/pgSQL (`CREATE FUNCTION … RETURNS trigger`).

## Good uses

- `updated_at` timestamps maintained automatically.
- Audit logs that can't be skipped by any client.
- Enforcing invariants constraints can't express.
- Keeping a denormalized counter or search vector in sync.

## Why many teams avoid business logic in triggers

- **Hidden behaviour**: reading the app code doesn't show it.
- Harder to test, version and debug; errors surface far from their cause.
- Performance: per-row triggers on bulk updates add up.
- Cascades of triggers firing triggers.

A reasonable stance: triggers for small, data-integrity concerns (timestamps, audit), application code or events (outbox pattern, change data capture with Debezium) for business logic.
