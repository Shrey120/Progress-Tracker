---
course: prep
module: design-and-engineering-practice
title: Design and engineering practice
order: 118
---
=== lesson: separation-of-concerns | Separation of concerns
Each part of the code should deal with **one concern**, so changes to one concern don't ripple through everything.

## In a typical full-stack app

| Concern | Lives in |
|---|---|
| HTTP details (parsing, status codes) | route handlers / controllers |
| business rules (pricing, permissions) | services / domain functions |
| data access (SQL, ORM) | repositories / data layer |
| presentation | components |
| data fetching and caching on the client | hooks / a query library |
| cross-cutting: auth, logging, validation | middleware, shared utilities |

```ts
// mixed concerns: hard to test, hard to change
app.post("/orders", async (req, res) => {
  if (!req.body.items?.length) return res.status(400).send("no items");
  const total = req.body.items.reduce((s, i) => s + i.price * i.qty, 0) * 1.18;
  await db.query("INSERT INTO orders ...", [req.user.id, total]);
  await sendgrid.send({ to: req.user.email, subject: "Order placed" });
  res.json({ total });
});

// separated: the handler only translates HTTP ↔ domain
app.post("/orders", validate(CreateOrder), async (req, res) => {
  const order = await orderService.place(req.user, req.body);   // rules + persistence + events inside
  res.status(201).json(order);
});
```

## Why it matters

Testable pieces (pricing logic tested without HTTP or a database), replaceable parts (swap SendGrid for SES in one place), and code that's easier to read because each file answers one question.

Don't overdo it: three layers of indirection for a CRUD endpoint is its own problem. Separate where change and complexity actually live.

=== lesson: solid-applied-single-responsibility | SOLID applied: single responsibility
SOLID is five principles of object-oriented design. Interviewers want practical examples, not definitions.

| Letter | Principle | One line |
|---|---|---|
| S | Single responsibility | a module should have one reason to change |
| O | Open/closed | extend behaviour without editing existing code |
| L | Liskov substitution | subtypes must work wherever the base type is expected |
| I | Interface segregation | many small interfaces beat one large one |
| D | Dependency inversion | depend on abstractions, not concrete implementations |

## Single responsibility, applied

"One reason to change" means one **actor** or concern that would ask for changes.

```ts
// three reasons to change: report format, data source, delivery
class SalesReport {
  async generate() { const rows = await db.query("…"); return toCsv(rows); }
  async email(to: string) { await mailer.send(to, await this.generate()); }
}

// split by reason to change
const fetchSales = (range) => salesRepo.find(range);          // data
const formatCsv = (rows) => toCsv(rows);                      // presentation
const deliver = (to, file) => mailer.send(to, file);          // delivery
```

In React, the same idea: a component that fetches data, manages a form, and renders a complex layout is easier as a custom hook (data), a form component, and presentational pieces.

## Open/closed and Liskov, briefly

- **Open/closed**: add a new payment method by adding a class/strategy, not by editing a giant `switch` (see the Strategy pattern).
- **Liskov**: a `ReadOnlyFile` subclass whose `write()` throws breaks code expecting a `File`. Prefer composition or a different interface.
- **Interface segregation**: a component that needs `onSave` shouldn't receive the entire `formApi` object.

=== lesson: solid-applied-dependency-inversion | SOLID applied: dependency inversion
High-level code (business rules) shouldn't depend on low-level details (a specific database, email provider, payment SDK). **Both should depend on an abstraction**, an interface defined by the high-level code.

```ts
// the business layer defines what it needs
interface PaymentGateway {
  charge(amountPaise: number, customerId: string): Promise<{ id: string }>;
}

class CheckoutService {
  constructor(private payments: PaymentGateway, private orders: OrderRepo) {}
  async checkout(cart: Cart, user: User) {
    const charge = await this.payments.charge(cart.totalPaise, user.paymentCustomerId);
    return this.orders.create({ userId: user.id, items: cart.items, chargeId: charge.id });
  }
}

// details implement it
class RazorpayGateway implements PaymentGateway { /* SDK calls */ }
class FakeGateway implements PaymentGateway {
  async charge() { return { id: "test_charge" }; }
}

new CheckoutService(new RazorpayGateway(), prismaOrderRepo);   // production
new CheckoutService(new FakeGateway(), inMemoryOrderRepo);     // tests
```

## Payoffs

- **Testability**: business logic tested with fakes, no network.
- **Swappability**: switch Razorpay to Stripe by writing one adapter.
- **Clear boundaries**: the domain doesn't import vendor SDKs.

## In JavaScript practice

You don't need classes or a DI framework: pass functions or objects as parameters (`createCheckout({ charge, saveOrder })`). The principle is about **direction of dependencies**, not syntax.

=== lesson: error-handling-strategy | Error handling strategy (code design)
(See Node and backend → Error handling strategy for the server mechanics.)

Design decisions about errors across a codebase:

## Principles

1. **Fail fast at boundaries**: validate input where it enters (API handlers, forms, env config, external API responses), with schemas (Zod). Inside, trust the types.
2. **Distinguish expected from unexpected**: expected failures (validation, not found, payment declined) are part of the domain; return or throw typed errors and handle them. Unexpected ones (bugs) propagate to a central handler, get logged with context, and show a generic message.
3. **Don't swallow errors**: an empty `catch` hides bugs. Handle, rethrow with context (`new Error("loading invoice 42", { cause: err })`), or let it propagate.
4. **One place to translate errors**: domain errors → HTTP responses in one middleware; on the frontend, error boundaries plus a consistent toast/inline message strategy.
5. **User-facing messages are actionable**: "Card declined. Try another card." not "Error 402".

## Result types vs exceptions

Some teams return results instead of throwing for expected failures, making them visible in types:

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
async function placeOrder(cart: Cart): Promise<Result<Order, "OUT_OF_STOCK" | "PAYMENT_DECLINED">> { … }
const r = await placeOrder(cart);
if (!r.ok) return showError(r.error);   // the compiler makes you handle it
```

Exceptions for the unexpected, results (or typed errors) for the expected is a common, defensible split.

=== lesson: layering | Layering
A **layered architecture** organises code into horizontal layers, each depending only on the ones below it.

```text
presentation / API      routes, controllers, React pages
        ↓
application / services  use cases: "place order", "invite member"
        ↓
domain                  entities and rules: Order, pricing, permissions
        ↓
infrastructure          database, email, payments, queues (implementing interfaces the layers above define)
```

## Rules

- Dependencies point **one way** (downwards, or inward towards the domain).
- Controllers don't contain business rules; repositories don't decide permissions.
- Each layer can be tested on its own with the layer below faked.

## Common forms in JS/TS projects

- **Feature folders** (vertical slices): `features/orders/{routes, service, repo, schema}.ts`. Groups by feature first, layers inside. Often easier to navigate than giant `controllers/`, `services/` folders.
- In Next.js: server components and actions call a service layer (`lib/services`), never raw SQL scattered through components.

## Smells

A "service" that just forwards to a repository (needless layer), circular imports between layers, the UI importing the database client, business rules duplicated in frontend and backend (share them in a package instead).

=== lesson: refactoring-code-smells | Refactoring and code smells
**Refactoring** changes the structure of code without changing its behaviour, in small, safe steps, with tests as the safety net.

## Smells and their usual refactorings

| Smell | Refactoring |
|---|---|
| Long function doing many things | extract functions with descriptive names |
| Duplicated logic | extract a shared function (after the third copy; two may be coincidence) |
| Long parameter lists, boolean flags (`render(x, true, false)`) | parameter object; separate functions |
| Deep nesting | guard clauses / early returns |
| Large `switch` on type, repeated in places | polymorphism / strategy map |
| Feature envy (a function mostly using another object's data) | move it to that object |
| Primitive obsession (money as raw numbers, IDs as strings) | small types/value objects |
| Comments explaining confusing code | rename and restructure so the comment isn't needed |
| Dead code, unused flags | delete it |

```jsrun
// deep nesting → guard clauses
function shippingFeeBefore(order) {
  if (order) { if (order.items.length > 0) { if (order.total < 500) { return 40; } else { return 0; } } else { return 0; } } else { return 0; }
}
function shippingFee(order) {
  if (!order || order.items.length === 0) return 0;
  return order.total < 500 ? 40 : 0;
}
const o = { items: [1], total: 300 };
console.log(shippingFeeBefore(o), shippingFee(o), shippingFee(null));
```

## How to refactor safely

Tests first (characterisation tests if there are none), one small step at a time, commit often, separate refactoring PRs from behaviour changes, and use the IDE's automated refactorings (rename, extract). The "boy scout rule": leave code a bit cleaner than you found it, within the scope of your change.

=== lesson: technical-debt-trade-offs | Technical debt trade-offs
**Technical debt** is the future cost of shortcuts taken now. Like financial debt, it can be a smart tool (ship before a deadline, validate an idea) or a slow disaster (interest paid on every change).

## Kinds

- **Deliberate and prudent**: "We'll hard-code the two supported currencies to launch on time, and add a currency table next sprint."
- **Deliberate and reckless**: "No time for tests."
- **Inadvertent**: you learn a better design after building it.
- **Bit rot**: outdated dependencies, abandoned patterns.

## Managing it

- Make it **visible**: tickets with the cost described in business terms ("adding a payment method takes 2 weeks instead of 2 days because…").
- **Pay it down where you work**: refactor the area you're changing; it's cheapest then.
- Reserve capacity (e.g. 15–20% of each sprint) or tie debt work to features that need it.
- Prioritise by **interest rate**: debt in code that changes often costs far more than debt in stable code.
- Upgrade dependencies regularly in small steps rather than one painful jump.

> Interview answer shape: "I take on debt deliberately when time-to-market matters, write down what we cut and why, and pay it back when we next touch that area. I push to fix debt that slows us every week, like a flaky test suite or a tangled module we change constantly."

=== lesson: code-review-standards | Code review standards
(See Git and workflow → PR review practice for the reviewer/author workflow.)

Team-level standards that make reviews fast and consistent:

## Agree on and automate

- **Formatting and linting**: Prettier + ESLint (or Biome) in CI; no human comments about style.
- **Type checking** in CI; `strict` TypeScript.
- **PR template**: what, why, testing, screenshots, risk.
- **Size guideline**: aim for small PRs; large ones split or reviewed with a walkthrough.
- **Required approvals** (one or two) and CODEOWNERS for sensitive areas (auth, payments, migrations).
- **Turnaround expectation**: first review within a few working hours.

## What "approve" means

The reviewer understands the change, believes it's correct and maintainable, and would be comfortable supporting it in production. Not "I skimmed it".

## Checklist for risky areas

Auth and permission checks present; input validated; no secrets; migrations backwards compatible; errors handled and logged; tests for edge cases; performance of new queries (indexes, N+1); feature flagged if risky; documentation updated.

Good reviews are a team culture signal interviewers care about: kind, specific, prompt, and focused on what matters.

=== lesson: dependency-injection | Dependency injection
**Dependency injection (DI)** means a piece of code **receives** its dependencies instead of creating them. It's how you apply dependency inversion in practice.

```js
// creates its own dependencies: hard to test or configure
class UserService {
  constructor() { this.db = new PostgresClient(process.env.DATABASE_URL); this.mailer = new SesMailer(); }
}

// injected: tests pass fakes, production passes real ones
class UserService {
  constructor({ db, mailer, clock = () => new Date() }) { Object.assign(this, { db, mailer, clock }); }
}
```

## Forms

- **Constructor injection** (above): the most common.
- **Function parameters / factories**: `createUserService({ db, mailer })` returning functions. Idiomatic in JS.
- **DI containers**: NestJS, Angular, InversifyJS wire dependencies automatically using decorators and types.
- In React, **context** injects dependencies (an API client, feature flags) into components; tests wrap them in a provider with fakes.

## Benefits and costs

Easy testing (inject fakes for time, randomness, network), configurable implementations per environment, explicit dependencies. Overuse adds indirection; for simple modules, importing a function directly is fine. Inject the things you need to swap: I/O, time, randomness, third-party services.

=== lesson: factory-pattern | Factory pattern
A **factory** is a function or method that creates objects, hiding which concrete class or configuration is used.

```jsrun
class EmailNotifier { send(to, msg) { return `email to ${to}: ${msg}`; } }
class SmsNotifier { send(to, msg) { return `sms to ${to}: ${msg}`; } }
class PushNotifier { send(to, msg) { return `push to ${to}: ${msg}`; } }

function createNotifier(channel) {
  const notifiers = { email: EmailNotifier, sms: SmsNotifier, push: PushNotifier };
  const Notifier = notifiers[channel];
  if (!Notifier) throw new Error(`unknown channel: ${channel}`);
  return new Notifier();
}

for (const ch of ["email", "sms", "push"]) console.log(createNotifier(ch).send("user_42", "Your order shipped"));
```

## When it helps

- The concrete type depends on runtime data (config, user preference, environment).
- Construction is complex (several dependencies, validation) and you want one place for it.
- Tests need to swap implementations.

In JavaScript, plain factory functions returning objects are often preferred over classes: `createStore()`, `createClient({ baseUrl })`, React's `createContext`. Don't add a factory when `new Thing()` is all you need.

=== lesson: strategy-pattern | Strategy pattern
The **strategy** pattern defines a family of interchangeable algorithms behind one interface, chosen at runtime. It replaces growing `if/else` or `switch` chains.

```jsrun
// pricing strategies
const strategies = {
  regular: (total) => total,
  festive: (total) => Math.round(total * 0.8),               // 20% off
  member: (total) => (total > 1000 ? total - 150 : total),
  bulk: (total, qty) => (qty >= 10 ? Math.round(total * 0.9) : total),
};

function checkout(cart, strategyName) {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const qty = cart.reduce((s, i) => s + i.qty, 0);
  const strategy = strategies[strategyName] ?? strategies.regular;
  return strategy(total, qty);
}

const cart = [{ price: 250, qty: 4 }, { price: 100, qty: 8 }];
for (const s of Object.keys(strategies)) console.log(s.padEnd(8), checkout(cart, s));
```

Adding a new discount means adding an entry, not editing `checkout`: the open/closed principle in action.

## Real uses

Payment gateways, shipping cost calculators, sorting/ranking algorithms, auth providers (Passport.js strategies are exactly this), retry/backoff policies, validation rules, export formats (CSV/PDF/Excel).

=== lesson: observer-pattern | Observer pattern
An **observer** (publish/subscribe within a program) lets objects subscribe to events from a subject without the subject knowing who they are.

```jsrun
function createEmitter() {
  const listeners = new Map();
  return {
    on(event, fn) {
      (listeners.get(event) ?? listeners.set(event, new Set()).get(event)).add(fn);
      return () => listeners.get(event).delete(fn);        // unsubscribe function
    },
    emit(event, payload) { listeners.get(event)?.forEach(fn => fn(payload)); },
  };
}
const orders = createEmitter();
const off = orders.on("placed", o => console.log("email: confirmation for", o.id));
orders.on("placed", o => console.log("analytics: revenue +", o.total));
orders.emit("placed", { id: "o_1", total: 4999 });
off();                                                     // email listener removed
orders.emit("placed", { id: "o_2", total: 999 });
```

## You use it constantly

DOM `addEventListener`, Node's `EventEmitter`, RxJS observables, state stores (Redux `subscribe`, Zustand), React's `useSyncExternalStore`, WebSocket message handlers.

## Pitfalls

Forgetting to unsubscribe (memory leaks, updates to unmounted components), hard-to-trace control flow when many listeners react to one event, and errors in one listener affecting others (wrap them). Across services, the same idea becomes pub/sub with a message broker.

=== lesson: adapter-pattern | Adapter pattern
An **adapter** converts one interface into another that your code expects. It lets you use a third-party or legacy component without spreading its API through your codebase.

```js
// your app's interface
// interface Storage { put(key, data): Promise<string>; getUrl(key): Promise<string> }

class S3Storage {
  constructor(s3, bucket) { this.s3 = s3; this.bucket = bucket; }
  async put(key, data) { await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data })); return key; }
  async getUrl(key) { return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: 300 }); }
}
class SupabaseStorage {
  constructor(client, bucket) { this.bucket = client.storage.from(bucket); }
  async put(key, data) { const { error } = await this.bucket.upload(key, data); if (error) throw error; return key; }
  async getUrl(key) { const { data } = await this.bucket.createSignedUrl(key, 300); return data.signedUrl; }
}
```

The rest of the app calls `storage.put()` and doesn't care which provider is behind it.

## Uses

Wrapping vendor SDKs (payments, email, storage, analytics), normalising different API response shapes into one model (an anti-corruption layer), making old code fit a new interface during a migration.

Adapter vs facade: an adapter **changes** an interface to match an expected one; a facade **simplifies** a complex subsystem behind a new interface.

=== lesson: facade | Facade pattern
A **facade** provides one simple interface over a complex subsystem.

```js
// callers just say what they want
const checkout = {
  async placeOrder(user, cart) {
    await inventory.reserve(cart.items);
    const charge = await payments.charge(user, cart.total);
    const order = await orders.create(user, cart, charge.id);
    await notifications.send(user, "order-placed", { orderId: order.id });
    analytics.track("order_placed", { total: cart.total });
    return order;
  },
};
```

Instead of every controller orchestrating five services in the right order, they call `checkout.placeOrder`.

## Where you see facades

API clients wrapping many endpoints (`api.users.get(id)`), SDKs (the AWS SDK is a facade over HTTP signing and retries), jQuery over the DOM, a `useCheckout()` hook combining several queries and mutations for a component.

## Caution

A facade that keeps absorbing responsibilities becomes a "god object". Keep it a thin coordinator; the logic stays in the underlying services.

=== lesson: singleton | Singleton
A **singleton** ensures one instance of something exists and provides global access to it.

In JavaScript, **ES modules are already singletons**: a module is evaluated once, and every import gets the same exports.

```js
// db.js — every importer shares this one pool
import pg from "pg";
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
```

## A real-world gotcha: Next.js dev mode

Hot reloading re-evaluates modules, creating a new Prisma client (and connection pool) on every save until the database runs out of connections. The standard fix stores it on `globalThis`:

```js
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

## Why it's often called an anti-pattern

Hidden global state, hard to replace in tests, hidden coupling, and trouble with concurrency or per-request state. Prefer creating shared resources once at startup and **injecting** them. Singletons are fine for genuinely process-wide resources (a connection pool, a logger, configuration); never for per-user or per-request data.

=== lesson: documentation | Documentation
Documentation that's actually useful, at the right level:

| Doc | Purpose | Audience |
|---|---|---|
| **README** | what it is, how to run, test and deploy it | every new developer, day one |
| **Architecture overview** | the big pieces and how they talk (a diagram) | anyone changing the system |
| **ADRs** (architecture decision records) | one page per significant decision: context, decision, alternatives, consequences | future you, wondering "why is it like this?" |
| **API docs** | endpoints, schemas, errors (generated from OpenAPI) | API consumers |
| **Runbooks** | what to do when alert X fires | on-call engineers |
| **Code comments** | **why** something non-obvious is done | the next reader of that line |
| **PR descriptions and commit messages** | the context of each change | reviewers, `git blame` readers |

## Principles

- Docs live **next to the code** (in the repo, reviewed in PRs), so they change with it.
- Document decisions and reasons; the code already shows the what.
- Automate what can be generated (API reference, types, changelogs).
- Keep onboarding docs tested: a new hire following the README is the test.
- Delete stale docs; wrong docs are worse than none.

=== lesson: clean-architecture-as-a-formal-thing | Clean architecture
**Clean architecture** (Robert C. Martin; closely related to hexagonal "ports and adapters" and onion architecture) arranges code in concentric layers with one rule: **dependencies point inward**.

```text
  frameworks & drivers   (Express/Next.js, Postgres, Stripe SDK, UI)
    interface adapters   (controllers, presenters, repository implementations)
      use cases          (application logic: PlaceOrder, CancelSubscription)
        entities         (core business rules, no imports from outer layers)
```

- Inner layers define **interfaces** (ports); outer layers implement them (adapters).
- The core doesn't know about HTTP, the database, or the framework, so it can be tested in isolation and survives framework changes.

## When it pays off

Large, long-lived systems with complex business rules, several delivery mechanisms (web, mobile API, CLI, queue consumers) sharing logic, or teams expecting to swap infrastructure.

## When it's too much

CRUD-heavy apps and small teams: strict layering adds files, mapping between layers, and indirection for little gain. A pragmatic version, feature folders with a service layer and injected infrastructure, gets most of the benefit.

> "I know clean/hexagonal architecture: keep business logic independent of frameworks and I/O behind interfaces. I apply it in proportion to the domain's complexity rather than to every CRUD endpoint."
