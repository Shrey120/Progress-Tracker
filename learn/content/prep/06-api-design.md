---
course: prep
module: api-design
title: API design
order: 106
---
=== lesson: rest-resource-modeling | REST resource modeling
REST models an API as **resources** (nouns) identified by URLs, manipulated with standard HTTP methods.

## Naming

```
GET    /users                 list users
POST   /users                 create a user
GET    /users/42              one user
PATCH  /users/42              partial update
DELETE /users/42              delete
GET    /users/42/orders       a user's orders (sub-collection)
POST   /orders/7/cancel       an action that isn't CRUD
```

- Plural nouns, lowercase, hyphens: `/order-items`, not `/getOrderItems`.
- Nest only for real ownership, one level deep. `/orders/7` is better than `/users/42/orders/7` when orders have their own identity.
- Actions that don't fit CRUD (cancel, refund, publish) are sub-resources or state changes: `POST /orders/7/cancel` or `PATCH /orders/7 {"status": "cancelled"}`. Both are defensible; be consistent.

## Representations

- JSON with consistent casing (pick camelCase or snake_case once).
- Return the created/updated resource so clients don't need a second GET.
- Consistent envelopes for lists: `{ "data": [...], "next_cursor": "..." }`.
- A consistent error format, such as RFC 9457 problem details: `{ "type", "title", "status", "detail", "errors": [...] }`.

## Design from the client's needs

Don't mirror database tables. Think about what screens need: a mobile app may need an order with its items and product names in one call. Expansion parameters (`?include=items.product`) or a BFF (backend-for-frontend) handle that without bloating every response.

> **"Design the API for X"** — start with the resources and their relationships, list the endpoints with methods, show request/response shapes for the important ones, then cover auth, pagination, errors, and versioning.

=== lesson: verb-semantics-put-vs-patch-vs-post | Verb semantics: PUT vs PATCH vs POST
| Method | Meaning | Safe? | Idempotent? |
|---|---|---|---|
| `GET` | read | yes | yes |
| `POST` | create, or run an action | no | **no** |
| `PUT` | **replace** the whole resource at this URL (or create it at a known URL) | no | yes |
| `PATCH` | **partially** update | no | not guaranteed |
| `DELETE` | remove | no | yes |

- **Safe**: no side effects on the server (crawlers and prefetchers may call it freely).
- **Idempotent**: calling it N times has the same effect as calling it once. Retrying a `PUT` or `DELETE` after a timeout is safe; retrying a `POST` may create two orders.

## PUT vs PATCH

```
PUT /users/42            { "name": "Asha", "email": "a@x.com", "city": "Kanpur" }
                         → the user is exactly this; omitted fields are cleared or defaulted
PATCH /users/42          { "city": "Pune" }
                         → only city changes
```

PATCH is idempotent if it sets values (`city = Pune`) but not if it applies relative changes (`{"op": "increment", "path": "/count"}`). JSON Merge Patch (RFC 7396) and JSON Patch (RFC 6902) are the standard formats.

## Common mistakes

- `GET` endpoints that change data (`GET /users/42/delete`): browsers, caches and link previews will trigger them.
- `POST` for everything (RPC-style): fine for internal APIs if consistent, but you lose caching and idempotency semantics.
- Making non-idempotent `POST`s safely retryable needs an **idempotency key** (see that lesson).

=== lesson: status-code-discipline | Status code discipline
Clients, caches, retries and monitoring all rely on status codes. Returning `200 { "error": … }` breaks every one of them.

## The ones to use

| Code | When |
|---|---|
| **200 OK** | success with a body |
| **201 Created** | resource created; include a `Location` header |
| **202 Accepted** | queued for async processing |
| **204 No Content** | success, no body (DELETE) |
| **301 / 308** | moved permanently (308 keeps the method) |
| **304 Not Modified** | conditional GET, cached copy still valid |
| **400 Bad Request** | malformed request |
| **401 Unauthorized** | not authenticated (missing/invalid credentials) |
| **403 Forbidden** | authenticated but not allowed |
| **404 Not Found** | doesn't exist (or you're hiding that it does) |
| **409 Conflict** | state conflict: duplicate, version mismatch |
| **412 Precondition Failed** | `If-Match` ETag didn't match |
| **422 Unprocessable Content** | well-formed but fails validation |
| **429 Too Many Requests** | rate limited; send `Retry-After` |
| **500** | unexpected server error |
| **502 / 503 / 504** | bad gateway / unavailable / upstream timeout |

## Distinctions interviewers probe

- **401 vs 403**: who are you vs you can't do that.
- **400 vs 422**: can't parse it vs parsed but invalid. Many APIs use 400 for both; just be consistent.
- **404 vs 403 for private resources**: returning 404 avoids revealing that the resource exists.
- **4xx vs 5xx**: client's fault vs server's fault. Retries make sense for 5xx and 429, not for 4xx.

=== lesson: filtering-sorting | Filtering and sorting
```
GET /products?category=electronics&min_price=500&in_stock=true
GET /products?sort=-price,name           (minus = descending)
GET /orders?status=paid,shipped&created_after=2026-01-01
GET /products?q=keyboard                 (full-text search)
GET /users?fields=id,name                (sparse fieldsets)
```

## Guidelines

- **Allowlist** filterable and sortable fields. Never pass arbitrary field names into SQL (injection, and unindexed queries that take down the database).
- Validate and type every parameter; reject unknown ones or ignore them consistently.
- Support the filters that real screens need, and **index for them**.
- For complex filters, either a small documented syntax (`price[gte]=500`) or a POST search endpoint with a JSON body. Don't invent a query language unless you must (that's what GraphQL or OData are).
- Sort must be **deterministic** for pagination: add a unique tiebreaker (`ORDER BY price DESC, id DESC`).

## Search vs filter

Filtering on exact fields belongs in the database with indexes. Fuzzy, ranked, typo-tolerant text search usually belongs in a search engine (Postgres full-text search to start; Elasticsearch, OpenSearch, Typesense or Meilisearch at scale).

=== lesson: pagination-offset-vs-cursor | Pagination: offset vs cursor
## Offset pagination

```
GET /posts?limit=20&offset=40
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 40;
```

- Easy, supports "jump to page 7", total counts.
- **Slow for deep pages**: the database still reads and discards all skipped rows.
- **Unstable**: if a row is inserted or deleted while you page, items shift: you skip or repeat items.

## Cursor (keyset) pagination

The client sends the last item's sort key; the query continues after it.

```
GET /posts?limit=20&after=eyJjIjoiMjAyNi0xMC0xMlQxMDowMCIsImlkIjo5OTF9
SELECT * FROM posts
WHERE (created_at, id) < ($1, $2)            -- the last seen item
ORDER BY created_at DESC, id DESC
LIMIT 21;                                    -- one extra tells you if there's a next page
```

- Uses an index seek: constant speed at any depth.
- Stable under inserts and deletes.
- No random page jumps, and the sort order must be fixed and unique (hence `id` as tiebreaker).
- Encode the cursor (base64 JSON) so clients treat it as opaque.

## Choosing

| Offset | Cursor |
|---|---|
| admin tables with page numbers | infinite feeds, timelines, chat history |
| small datasets | large or fast-changing data |
| need total counts | public APIs, sync jobs |

Total counts (`COUNT(*)`) are expensive on big tables; consider estimates or "1,000+".

> **"Why is page 5,000 slow?"** OFFSET makes the database walk past every skipped row. Keyset pagination seeks straight to the last-seen key using the index.

=== lesson: versioning-strategies | Versioning strategies
APIs evolve; clients you don't control (mobile apps that users never update, partners) can't all change at once.

## Avoid breaking changes first

Additive changes are safe: new endpoints, new optional fields, new optional parameters, new enum values **if** clients were told to tolerate unknown ones. Breaking: removing or renaming fields, changing types or meaning, making an optional field required, changing error formats.

## When you must break

| Strategy | Example | Notes |
|---|---|---|
| URL path | `/v1/orders`, `/v2/orders` | most visible, easy to route and cache; the common choice |
| Header | `Accept: application/vnd.acme.v2+json`, `API-Version: 2` | clean URLs, harder to test in a browser |
| Query param | `/orders?version=2` | simple, easy to forget |
| Date-based | `Stripe-Version: 2024-06-20` | each account pinned to the version it started with; per-change upgrades |

## Running versions

- Translate old versions to the new internal model at the edge, rather than maintaining two code paths everywhere.
- **Deprecation**: announce, add `Deprecation` and `Sunset` headers, monitor who still calls the old version, contact them, then remove.
- Mobile apps: support old versions for as long as old app versions are in use; consider a forced-upgrade mechanism.

GraphQL typically avoids versions: add fields, mark old ones `@deprecated`, and track field usage before removing.

=== lesson: idempotency | Idempotency
A request is **idempotent** if repeating it has the same effect as doing it once. That matters because networks fail **after** the server has done the work: the client sees a timeout and retries.

Without idempotency: a payment retried after a timeout charges the customer twice.

## Idempotency keys

The client generates a unique key per logical operation and sends it with the request. The server stores the key with the result; a retry with the same key returns the stored result instead of repeating the work.

```
POST /payments
Idempotency-Key: 6f1e2c4a-...
{ "amount": 4999, "currency": "INR" }
```

Server logic:

1. Look up the key (scoped to the user/account).
2. **Not found**: insert it as "in progress" (a unique constraint makes concurrent duplicates fail), do the work, store the response.
3. **Found and complete**: return the stored response.
4. **Found and in progress**: return 409, so the client retries later.
5. Same key with a **different body**: reject (422).
6. Expire keys after a window (Stripe keeps them 24 hours).

## Other ways to get idempotency

- Natural keys and unique constraints: `INSERT ... ON CONFLICT DO NOTHING` on an external `order_reference`.
- Conditional updates: `UPDATE ... WHERE status = 'pending'`.
- Consumers of queues and webhooks deduplicate by event ID (they're delivered **at least once**).

> **"How do you avoid double charges when a client retries?"** Idempotency keys: the client sends a unique key per payment attempt, the server records it atomically before processing, and returns the original result for any retry with that key.

=== lesson: webhooks | Webhooks
A webhook is an HTTP callback: when something happens in system A (payment succeeded, PR merged), A sends a POST to a URL that B registered.

## Receiving webhooks reliably

```js
app.post("/webhooks/razorpay", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.header("X-Razorpay-Signature");
  if (!verifyHmac(req.body, signature, process.env.WEBHOOK_SECRET)) return res.sendStatus(401);
  const event = JSON.parse(req.body);
  const firstTime = await db.processedEvents.insertIfAbsent(event.id);   // dedupe
  if (firstTime) await queue.add("payment-event", event);                 // process later
  res.sendStatus(200);                                                   // acknowledge fast
});
```

1. **Verify the signature** (HMAC of the raw body with a shared secret, compared in constant time). Check a timestamp to reject replays.
2. **Respond quickly** (2xx within a few seconds); do the real work in a background job. Slow handlers cause timeouts and retries.
3. **Be idempotent**: providers retry and deliver duplicates. Store processed event IDs.
4. **Don't assume order**: events can arrive out of order. Use timestamps or versions, or re-fetch the current state from the provider's API.

## Sending webhooks

Sign payloads, include an event ID and timestamp, retry with exponential backoff (for days), let consumers see delivery logs and replay events, and disable endpoints that keep failing. Many teams use a service (Svix, Hookdeck) rather than building this.

=== lesson: openapi-contract-first | OpenAPI and contract-first design
**OpenAPI** (formerly Swagger) is a YAML/JSON spec describing an HTTP API: paths, methods, parameters, request and response schemas, auth, errors.

```yaml
paths:
  /orders/{id}:
    get:
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        "200": { content: { application/json: { schema: { $ref: "#/components/schemas/Order" } } } }
        "404": { $ref: "#/components/responses/NotFound" }
```

## Code-first vs contract-first

- **Code-first**: write the server, generate the spec from annotations or schemas (FastAPI, NestJS, zod-to-openapi). Fast, but the spec follows whatever the code happens to do.
- **Contract-first**: write and review the spec first, then generate server stubs, typed clients and mocks from it. Frontend and backend work in parallel against a mock; the API is designed for its consumers.

## What the spec gives you

Typed clients (`openapi-typescript`, Orval), interactive docs (Swagger UI, Redoc, Scalar), mock servers (Prism), request validation middleware, contract tests, and linting for consistency (Spectral). Breaking-change detection in CI (oasdiff) catches removed fields before they ship.

> **"How do frontend and backend agree on an API?"** A reviewed OpenAPI spec as the contract, with generated types on both sides, a mock server so the frontend isn't blocked, and CI checks for breaking changes.

=== lesson: api-gateways | API gateways
An API gateway is a single entry point in front of your services. Clients call the gateway; it routes to the right backend.

## What it handles

- **Routing**: `/orders/*` → order service, `/users/*` → user service.
- **Authentication**: verify JWTs or API keys once, pass identity downstream.
- **Rate limiting and quotas** per client or API key.
- **TLS termination**, request/response transformation, CORS.
- **Observability**: logging, metrics, tracing headers.
- Caching, request size limits, IP allow/deny lists.

Examples: AWS API Gateway, Kong, Apigee, Envoy-based gateways, Cloudflare, NGINX.

## Gateway vs load balancer vs BFF

- A **load balancer** spreads traffic across instances of one service.
- A **gateway** routes across services and applies cross-cutting policy.
- A **BFF** (backend for frontend) is a service per client type (web, mobile) that aggregates calls and shapes responses for that client.

## Risks

A single point of failure (run it redundantly), added latency, and a temptation to put business logic in it (keep it thin).

=== lesson: graphql-schema-design | GraphQL schema design
GraphQL exposes a **typed schema**; clients ask for exactly the fields they need in one request.

```graphql
type User {
  id: ID!
  name: String!
  orders(first: Int = 20, after: String): OrderConnection!
}
type Order {
  id: ID!
  status: OrderStatus!
  total: Money!
  items: [OrderItem!]!
}
enum OrderStatus { PAID SHIPPED CANCELLED }
type Query {
  me: User
  order(id: ID!): Order
}
type Mutation {
  cancelOrder(input: CancelOrderInput!): CancelOrderPayload!
}
```

## Design guidelines

- Design around the **domain and the UI's needs**, not database tables.
- **Nullability**: `!` means guaranteed. Be careful: if a non-null field fails, the error nulls out its parent, possibly the whole response. Make fields nullable where failure is possible (data from other services).
- **Mutations**: one input object and a payload type (`{ order, errors }`), named as specific actions (`cancelOrder`, not `updateOrder`).
- **Pagination**: the Relay connection pattern (`edges`, `node`, `pageInfo { hasNextPage, endCursor }`).
- **Errors**: GraphQL returns 200 with an `errors` array. Model expected errors (validation, "out of stock") as typed results in the payload; reserve `errors` for unexpected failures.
- Evolve without versions: add fields, `@deprecated(reason: "...")` old ones, remove when unused.

## Protecting the server

Clients can write expensive queries: limit **query depth** and **complexity**, paginate every list, and in production allow only **persisted queries** (a known list of query hashes).

=== lesson: resolvers | Resolvers
A **resolver** is the function that returns the value for one field. GraphQL executes a query by calling resolvers from the top down, passing each parent's result into its children.

```js
const resolvers = {
  Query: {
    order: (_parent, { id }, ctx) => ctx.db.order.findUnique({ where: { id } }),
  },
  Order: {
    // parent is the order returned above
    customer: (order, _args, ctx) => ctx.loaders.user.load(order.userId),
    total: (order) => ({ amount: order.totalPaise / 100, currency: "INR" }),
  },
};
```

Signature: `(parent, args, context, info)`.

- **parent** — the object resolved one level up.
- **args** — the field's arguments.
- **context** — per-request state: the authenticated user, DB client, DataLoaders.
- **info** — the query AST (used for advanced optimisations).

Fields without a resolver default to `parent[fieldName]`.

## Where things go

- **Authorization** in resolvers or the service layer they call (not only at the top), since any field can be reached by many query paths.
- **Business logic** in services; resolvers stay thin.
- A new **context** per request, so DataLoader caches and user identity don't leak between users.

Because each field resolves independently, naive resolvers create the N+1 problem. That's the next lesson.

=== lesson: n-1-dataloader | N+1 and DataLoader
A query for 50 orders, each with its `customer`:

```graphql
{ orders(first: 50) { id customer { name } } }
```

The `customer` resolver runs once **per order**: 1 query for orders + 50 queries for users. That's N+1, and nested lists multiply it.

## DataLoader

DataLoader collects all `.load(id)` calls made in the same tick of the event loop, then calls your **batch function** once with every ID.

```js
import DataLoader from "dataloader";

function createLoaders(db) {
  return {
    user: new DataLoader(async (ids) => {
      const users = await db.user.findMany({ where: { id: { in: ids } } });  // one query
      const byId = new Map(users.map(u => [u.id, u]));
      return ids.map(id => byId.get(id) ?? null);                            // same order as ids!
    }),
  };
}
// a new set per request: context: () => ({ loaders: createLoaders(db) })
```

Rules: the batch function must return results **in the same order and length** as the keys; create loaders **per request** (its cache would otherwise leak data between users); it also deduplicates repeated IDs within the request.

## Other approaches

Look-ahead with `info` to join in the parent query, or ORMs and GraphQL engines (Prisma's fluent API, Hasura, PostGraphile) that compile a query into SQL with joins.

> **"How does DataLoader solve N+1?"** It defers individual loads to the end of the tick, batches them into one `WHERE id IN (...)` query, and caches results for the rest of the request.

=== lesson: graphql-vs-rest-trade-offs | GraphQL vs REST trade-offs
| | REST | GraphQL |
|---|---|---|
| Fetching | fixed responses: over-fetching, or several round trips | client picks fields: one round trip |
| Typing | optional (OpenAPI) | built-in schema, introspection, codegen |
| HTTP caching | easy (GET + URLs, CDNs) | harder (POSTs to one URL); needs persisted queries or client caches |
| Errors | status codes | 200 with `errors` array |
| Versioning | URL/header versions | evolve schema, deprecate fields |
| Server complexity | low | resolvers, N+1, query cost limits |
| File uploads, streaming | natural | awkward (separate endpoints usually) |
| Monitoring | per endpoint | per operation name; one URL hides everything |

## When GraphQL fits

- Many clients (web, iOS, Android) needing different shapes of the same data.
- Deeply related data (social graphs, e-commerce catalogues) where REST means chains of requests.
- A strong typed contract with codegen across teams.
- Aggregating several backends behind one schema (federation).

## When REST fits

- Public APIs, simple CRUD, heavy CDN caching, webhooks, file handling.
- Small teams where GraphQL's tooling overhead isn't paid back.

Many companies use both: REST for public and partner APIs, GraphQL (or tRPC) for their own frontends.

> **"Why would you pick GraphQL?"** When clients need flexible, nested data from one typed schema and over-fetching or round trips hurt, typically with multiple frontends. The costs are caching, query cost control and resolver performance work.

=== lesson: subscriptions | GraphQL subscriptions
**Subscriptions** let a client receive pushed updates when an event happens.

```graphql
subscription OnMessage($roomId: ID!) {
  messageAdded(roomId: $roomId) { id text author { name } }
}
```

## How they work

- Transport: usually **WebSockets** (the `graphql-ws` protocol), sometimes Server-Sent Events.
- The server subscribes the connection to an event source (an in-memory pub/sub for one instance; **Redis pub/sub**, Kafka or a database's change stream when there are many server instances).
- When an event is published, the server runs the subscription's selection set for each subscriber and pushes the result.

## Concerns at scale

- Long-lived connections need sticky sessions or a dedicated realtime service; serverless platforms struggle with them.
- Authenticate at connection time **and** authorise per event (users must only receive rooms they belong to).
- Fan-out cost: one event × thousands of subscribers each running resolvers.
- Reconnection and missed events: clients should refetch state after reconnecting.

## Alternatives

Polling (simple, often good enough), live queries, or using a realtime service directly (Supabase Realtime, Pusher, Ably, Firebase) for chat and presence.

=== lesson: hasura-permissions-row-level-rules | Hasura permissions and row-level rules
**Hasura** generates a GraphQL API directly from a Postgres schema. Its security model is **role-based, row- and column-level permissions** defined per table.

## How it works

- Requests carry session variables, typically from JWT claims: `x-hasura-role`, `x-hasura-user-id`.
- For each table and role you define what's allowed for **select, insert, update, delete**:
  - a **row filter** (boolean expression),
  - allowed **columns**,
  - for inserts/updates, **column presets** and checks.

```yaml
# role: user, table: orders, select permission
filter:
  user_id: { _eq: X-Hasura-User-Id }          # only your own orders
columns: [id, status, total, created_at]       # not internal_notes
# insert permission
check:  { user_id: { _eq: X-Hasura-User-Id } }
set:    { user_id: X-Hasura-User-Id }          # server sets it, client can't spoof
```

Relationships can be used in filters: `{ project: { members: { user_id: { _eq: X-Hasura-User-Id } } } }`.

## The same idea elsewhere

Postgres **row-level security** (RLS) enforces it inside the database itself; Supabase relies on it:

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_orders ON orders FOR SELECT USING (user_id = auth.uid());
```

## Discussion points

- Pros: authorization declared once, close to the data, enforced for every query path.
- Cons: complex rules get hard to read and test; business logic still needs actions or remote schemas; misconfigured permissions expose data, so review them like code and test with each role.
