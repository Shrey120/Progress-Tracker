---
course: prep
module: low-level-design
title: Low-level design
order: 126
---
=== lesson: oop-pillars | OOP pillars: encapsulation, abstraction, inheritance, polymorphism
The four ideas every LLD round assumes you can explain with examples.

| Pillar | Meaning | Example |
|---|---|---|
| **Encapsulation** | keep state private, expose behaviour; objects protect their own invariants | a `BankAccount` with `withdraw()` that refuses overdrafts, instead of a public `balance` anyone can set |
| **Abstraction** | expose what something does, hide how | a `PaymentGateway.charge()` interface; callers don't know about HTTP or the SDK |
| **Inheritance** | a class reuses and extends another (is-a) | `SavingsAccount extends BankAccount` |
| **Polymorphism** | one interface, many implementations, chosen at runtime | `notifier.send()` works for email, SMS and push |

```jsrun
class Account {
  #balance = 0;                                           // private field: encapsulation
  constructor(owner) { this.owner = owner; }
  deposit(amount) { if (amount <= 0) throw new Error("invalid amount"); this.#balance += amount; }
  withdraw(amount) { if (amount > this.#balance) throw new Error("insufficient funds"); this.#balance -= amount; }
  get balance() { return this.#balance; }
  monthlyFee() { return 100; }
}
class StudentAccount extends Account {                    // inheritance
  monthlyFee() { return 0; }                              // polymorphism: overridden behaviour
}
const accounts = [new Account("Asha"), new StudentAccount("Ravi")];
for (const a of accounts) { a.deposit(500); console.log(a.owner, a.balance, "fee:", a.monthlyFee()); }
try { accounts[0].withdraw(10_000); } catch (e) { console.log("blocked:", e.message); }
console.log("direct access to #balance is impossible:", Object.keys(accounts[0]));
```

Know the difference between **overloading** (same name, different parameters: not native in JS) and **overriding** (a subclass replaces a method), and **interfaces vs abstract classes** (TypeScript `interface` = contract only; abstract class = partial implementation).

=== lesson: how-to-approach-an-lld-round | How to approach an LLD round
LLD (machine design / object-oriented design) rounds ask you to design the classes for a small system in 45–60 minutes: a parking lot, Splitwise, a library, an elevator, a movie booking system, a rate limiter, a cache. Some want UML-style diagrams; many want working code.

## Steps

1. **Clarify requirements** (5 min): core use cases, actors, scale, what's out of scope. Write them down.
2. **Identify entities** (nouns): `ParkingLot`, `Floor`, `Spot`, `Vehicle`, `Ticket`, `Payment`.
3. **Define relationships**: has-a (composition), is-a (inheritance, sparingly), uses.
4. **Define behaviours** (verbs) as methods on the right class: who owns `park()`? `findSpot()`?
5. **Choose patterns where they fit**: Strategy (pricing, spot allocation), Factory (vehicle/notification creation), Observer (notifications), State (order or elevator states), Singleton (one lot instance, if asked).
6. **Write the core code** with interfaces, then one or two flows end to end.
7. **Handle concurrency and edge cases**: two cars taking the same spot, payment failure, full lot.
8. **Discuss extensions**: new vehicle types, pricing rules, multiple lots.

## What's graded

SOLID applied naturally, clear responsibilities, extensibility (adding a type shouldn't require editing ten `if` statements), correct handling of state, readable code, and how you explain trade-offs.

=== lesson: composition-over-inheritance | Composition over inheritance
Inheritance couples a subclass tightly to its parent: changes ripple down, hierarchies get deep and rigid, and real-world things rarely fit one tree ("a flying, swimming, quacking duck that is also a toy").

**Composition** builds objects from smaller parts and delegates to them: has-a instead of is-a.

```jsrun
// inheritance trouble: what is a RobotDog? an Animal (barks) or a Machine (charges)?
// composition: give objects the capabilities they need
const canBark = (self) => ({ bark: () => `${self.name}: woof` });
const canCharge = (self) => ({ charge: () => `${self.name}: charging to ${(self.battery = 100)}%` });
const canSwim = (self) => ({ swim: () => `${self.name}: swimming` });

function createDog(name) { const self = { name }; return { ...self, ...canBark(self), ...canSwim(self) }; }
function createRobotDog(name) { const self = { name, battery: 20 }; return { ...self, ...canBark(self), ...canCharge(self) }; }

const rex = createDog("Rex"), robo = createRobotDog("Robo");
console.log(rex.bark(), "|", rex.swim());
console.log(robo.bark(), "|", robo.charge());
```

## Guidelines

- Use inheritance for genuine is-a relationships with a shallow hierarchy (one level is common; three is a smell) and shared behaviour that won't diverge.
- Prefer composition plus interfaces for capabilities that mix and match (strategies, behaviours, services injected into a class).
- React's whole model is composition: components containing components, hooks composing behaviour; class inheritance between components is discouraged.

=== lesson: design-a-parking-lot | Design a parking lot
The most common LLD question.

## Requirements (agree on them)

Multiple floors; spot sizes (small, medium, large); vehicles (bike, car, truck) fit in suitable spots; issue a ticket at entry; compute a fee at exit by duration and vehicle type; show free spots per floor; several entry gates at once.

## Classes

```text
ParkingLot ── floors: Floor[] ── spots: Spot[]
   │  park(vehicle) → Ticket          Spot: id, size, vehicle?
   │  unpark(ticketId) → Receipt      Vehicle: plate, type
   ├─ SpotAllocationStrategy (nearest first, by floor…)
   ├─ PricingStrategy (hourly by vehicle type, weekend rates…)
   └─ tickets: Map<id, Ticket>        Ticket: id, vehicle, spot, entryTime
```

```jsrun
const SIZE_FOR = { bike: ["small", "medium", "large"], car: ["medium", "large"], truck: ["large"] };
class Spot { constructor(id, size) { Object.assign(this, { id, size, vehicle: null }); } get free() { return !this.vehicle; } }
const firstFit = (spots, vehicle) => spots.find(s => s.free && SIZE_FOR[vehicle.type].includes(s.size));
const hourly = { bike: 20, car: 50, truck: 100 };
const pricing = (ticket, exitTime) => Math.max(1, Math.ceil((exitTime - ticket.entryTime) / 3.6e6)) * hourly[ticket.vehicle.type];

class ParkingLot {
  constructor(spots, { allocate = firstFit, price = pricing } = {}) { Object.assign(this, { spots, allocate, price, tickets: new Map(), seq: 0 }); }
  park(vehicle, now = Date.now()) {
    const spot = this.allocate(this.spots, vehicle);
    if (!spot) throw new Error(`no spot for ${vehicle.type}`);
    spot.vehicle = vehicle;                                   // in a real system: an atomic DB update or a lock
    const ticket = { id: `T${++this.seq}`, vehicle, spot, entryTime: now };
    this.tickets.set(ticket.id, ticket);
    return ticket;
  }
  unpark(ticketId, now = Date.now()) {
    const t = this.tickets.get(ticketId);
    if (!t) throw new Error("invalid ticket");
    t.spot.vehicle = null; this.tickets.delete(ticketId);
    return { ticketId, spot: t.spot.id, fee: this.price(t, now) };
  }
  freeCount() { return this.spots.filter(s => s.free).length; }
}

const lot = new ParkingLot([new Spot("A1", "small"), new Spot("A2", "medium"), new Spot("B1", "large")]);
const t1 = lot.park({ plate: "UP78 AB 1234", type: "car" }, 0);
const t2 = lot.park({ plate: "UP78 CD 9", type: "bike" }, 0);
console.log(t1.spot.id, t2.spot.id, "free:", lot.freeCount());
try { lot.park({ plate: "X", type: "car" }); } catch (e) { console.log(e.message); }
console.log(lot.unpark(t1.id, 2.5 * 3.6e6));                  // 2.5 hours → 3 hours billed
```

## Discussion points

- **Strategies** for allocation and pricing: new rules without touching `ParkingLot` (open/closed).
- **Concurrency**: two gates assigning the same spot → lock per spot, or atomic `UPDATE spots SET vehicle = ? WHERE id = ? AND vehicle IS NULL` in the database.
- Persisting tickets, payment as a separate service, display boards via the Observer pattern, EV charging spots as a new spot type.

=== lesson: design-an-lru-cache-class | Design an LRU cache class
A frequent LLD and DSA crossover (LeetCode 146): `get(key)` and `put(key, value)` in **O(1)**, evicting the least recently used entry when over capacity.

## Design

A **hash map** (key → node) for O(1) lookup, and a **doubly linked list** ordered by recency for O(1) move-to-front and evict-from-back. Sentinel head and tail nodes remove edge cases.

```jsrun
class Node { constructor(key, val) { this.key = key; this.val = val; this.prev = this.next = null; } }
class LRUCache {
  constructor(capacity) {
    this.cap = capacity; this.map = new Map();
    this.head = new Node(); this.tail = new Node();          // sentinels: head.next = most recent
    this.head.next = this.tail; this.tail.prev = this.head;
  }
  #remove(n) { n.prev.next = n.next; n.next.prev = n.prev; }
  #addFront(n) { n.next = this.head.next; n.prev = this.head; this.head.next.prev = n; this.head.next = n; }
  get(key) {
    const n = this.map.get(key);
    if (!n) return -1;
    this.#remove(n); this.#addFront(n);                      // mark as recently used
    return n.val;
  }
  put(key, val) {
    if (this.map.has(key)) { const n = this.map.get(key); n.val = val; this.#remove(n); this.#addFront(n); return; }
    if (this.map.size === this.cap) { const lru = this.tail.prev; this.#remove(lru); this.map.delete(lru.key); }
    const n = new Node(key, val); this.map.set(key, n); this.#addFront(n);
  }
}
const c = new LRUCache(2);
c.put(1, 1); c.put(2, 2); console.log(c.get(1));   // 1
c.put(3, 3);                                       // evicts key 2
console.log(c.get(2), c.get(3));                   // -1 3
c.put(4, 4);                                       // evicts key 1
console.log(c.get(1), c.get(3), c.get(4));         // -1 3 4
```

(In JavaScript a `Map` alone works, since it preserves insertion order: see Caching → Eviction policies. Interviewers usually want the linked list to see you can build it.)

## Extensions to discuss

TTL per entry, thread safety (a lock around operations, or segmented caches), LFU eviction (frequency buckets), cache statistics (hit rate), and a generic `Cache` interface with pluggable eviction policies (Strategy pattern).

=== lesson: design-splitwise-expense-sharing | Design Splitwise (expense sharing)
## Requirements

Users and groups; add an expense paid by one person and split **equally**, by **exact amounts**, or by **percentage**; show who owes whom; simplify debts; settle up.

## Classes

```text
User(id, name)          Group(id, members, expenses)
Expense(id, paidBy, amount, splits: Split[], description)
Split: EqualSplit | ExactSplit | PercentSplit      (validated by a SplitStrategy)
BalanceSheet: Map<user, Map<user, amount>>  or net balance per user
```

```jsrun
function makeSplits(type, amount, users, values) {
  if (type === "equal") {
    const share = Math.floor((amount * 100) / users.length) / 100;           // work in paise in real code
    const rest = Math.round((amount - share * users.length) * 100) / 100;    // the paise left over go to the first person
    return users.map((u, i) => [u, i === 0 ? share + rest : share]);
  }
  if (type === "exact") {
    if (values.reduce((a, b) => a + b, 0) !== amount) throw new Error("exact splits must add up to the amount");
    return users.map((u, i) => [u, values[i]]);
  }
  if (type === "percent") {
    if (values.reduce((a, b) => a + b, 0) !== 100) throw new Error("percentages must add up to 100");
    return users.map((u, i) => [u, (amount * values[i]) / 100]);
  }
}
const net = new Map();                                                    // + is owed, - owes
function addExpense(paidBy, amount, type, users, values) {
  for (const [u, share] of makeSplits(type, amount, users, values)) {
    net.set(u, (net.get(u) ?? 0) - share);
  }
  net.set(paidBy, (net.get(paidBy) ?? 0) + amount);
}
// simplify: repeatedly match the biggest debtor with the biggest creditor
function settle() {
  const people = [...net].map(([u, v]) => ({ u, v: Math.round(v * 100) / 100 })).filter(p => p.v !== 0);
  const tx = [];
  while (people.some(p => p.v < 0)) {
    people.sort((a, b) => a.v - b.v);
    const debtor = people[0], creditor = people[people.length - 1];
    const amt = Math.min(-debtor.v, creditor.v);
    tx.push(`${debtor.u} pays ${creditor.u} ₹${amt.toFixed(2)}`);
    debtor.v += amt; creditor.v -= amt;
  }
  return tx;
}
addExpense("Asha", 900, "equal", ["Asha", "Ravi", "Meera"]);
addExpense("Ravi", 600, "exact", ["Asha", "Ravi", "Meera"], [100, 200, 300]);
addExpense("Meera", 1000, "percent", ["Asha", "Ravi", "Meera"], [50, 25, 25]);
console.log(Object.fromEntries(net));
console.log(settle());
```

## Discussion points

- **Money as integers** (paise) to avoid floating-point errors; rounding rules for equal splits.
- Split types as a **Strategy** with validation per type; adding "split by shares" is a new class, not a new `if`.
- Debt simplification: the greedy approach minimises transactions well in practice (the exact minimum is NP-hard in general).
- Persistence (expenses as an append-only ledger; balances derived), concurrency on edits, currencies, notifications.

=== lesson: design-a-rate-limiter-class | Design a rate limiter class
(The distributed version is in System design → Design a rate limiter.) In LLD, design the in-process library.

## Requirements

`isAllowed(clientId)` with pluggable algorithms (token bucket, sliding window), per-client limits, different rules per endpoint, thread safety, easy to test (injectable clock).

```jsrun
class TokenBucket {
  constructor({ capacity, refillPerSec, now }) { Object.assign(this, { capacity, refillPerSec, now, tokens: capacity, last: now() }); }
  tryTake() {
    const t = this.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((t - this.last) / 1000) * this.refillPerSec);
    this.last = t;
    if (this.tokens >= 1) { this.tokens -= 1; return true; }
    return false;
  }
}
class SlidingWindowLog {
  constructor({ limit, windowMs, now }) { Object.assign(this, { limit, windowMs, now, hits: [] }); }
  tryTake() {
    const t = this.now();
    while (this.hits.length && this.hits[0] <= t - this.windowMs) this.hits.shift();
    if (this.hits.length < this.limit) { this.hits.push(t); return true; }
    return false;
  }
}
class RateLimiter {
  constructor(factory) { this.factory = factory; this.buckets = new Map(); }   // one limiter per client
  isAllowed(clientId) {
    if (!this.buckets.has(clientId)) this.buckets.set(clientId, this.factory());
    return this.buckets.get(clientId).tryTake();
  }
}
let fakeTime = 0; const now = () => fakeTime;                                     // injectable clock for tests
const limiter = new RateLimiter(() => new SlidingWindowLog({ limit: 3, windowMs: 1000, now }));
const results = [0, 100, 200, 300, 1150, 1200].map(t => { fakeTime = t; return `${t}ms:${limiter.isAllowed("user1") ? "ok" : "429"}`; });
console.log(results.join("  "));
const tb = new RateLimiter(() => new TokenBucket({ capacity: 2, refillPerSec: 1, now }));
fakeTime = 0; console.log([tb.isAllowed("u"), tb.isAllowed("u"), tb.isAllowed("u")], "then after 1s:", (fakeTime = 1000, tb.isAllowed("u")));
```

## Design points

Strategy pattern for algorithms (a common `tryTake()` interface), a factory per rule, an injected clock for deterministic tests, eviction of idle clients' state (memory), and locking or atomic operations in multithreaded languages.

=== lesson: design-bookmyshow-seat-booking | Design BookMyShow seat booking
## Requirements

Cities → theatres → screens → shows (movie + time); a seat map per show; users select seats, which are **held** for a few minutes during payment; on payment success the booking is confirmed; on failure or timeout the seats are released. No double booking.

## Core classes

```text
Movie, Theatre, Screen(seats layout), Show(movie, screen, startTime, price rules)
ShowSeat(showId, seatId, status: AVAILABLE | HELD | BOOKED, heldBy, holdExpiresAt)
Booking(id, user, show, seats, status: PENDING | CONFIRMED | CANCELLED, payment)
SeatHoldService, BookingService, PaymentService, PricingStrategy
```

## The hard part: concurrency

Two users clicking the same seat at the same moment must not both get it.

- **Hold atomically** in the database:

```sql
UPDATE show_seats SET status = 'HELD', held_by = $user, hold_expires_at = now() + interval '7 minutes'
WHERE show_id = $show AND seat_id = ANY($seats)
  AND (status = 'AVAILABLE' OR (status = 'HELD' AND hold_expires_at < now()));
-- if fewer rows were updated than seats requested: roll back and tell the user some seats were taken
```

- On payment success: `HELD → BOOKED` only if still held by this user and not expired (with idempotency on the payment callback).
- Expired holds are released lazily (the condition above) or by a sweeper job.
- Alternatives: Redis `SET seat:show:42:A7 user NX EX 420` per seat for holds, with the database as the source of truth for bookings.

## Other discussion points

Seat-map reads are very frequent: cache them with short TTLs and push updates over WebSockets; pricing strategies (premium rows, weekend, dynamic); cancellations and refunds; the State pattern for booking status transitions.

=== lesson: design-an-elevator-system | Design an elevator system
## Requirements

N elevators serving M floors; hall calls (up/down buttons on floors) and car calls (buttons inside); efficient scheduling; doors, overload and maintenance states.

## Classes

```text
ElevatorSystem ── elevators: Elevator[] ── dispatcher: DispatchStrategy
Elevator: id, currentFloor, direction (UP | DOWN | IDLE), state (MOVING | DOORS_OPEN | MAINTENANCE), stops: sorted sets per direction
Request: floor, direction (hall call) or destination (car call)
```

## Scheduling

- **SCAN / elevator algorithm**: keep moving in one direction serving all stops that way, then reverse. Avoids starvation.
- **Dispatcher strategy** for hall calls: choose the elevator with the lowest estimated cost (an idle one nearby, or one already moving towards the floor in the same direction), as a pluggable Strategy.

```jsrun
function cost(e, floor, dir) {
  if (e.state === "MAINTENANCE") return Infinity;
  if (e.direction === "IDLE") return Math.abs(e.floor - floor);
  const onTheWay = e.direction === dir && (dir === "UP" ? e.floor <= floor : e.floor >= floor);
  return onTheWay ? Math.abs(e.floor - floor) : Math.abs(e.floor - floor) + 20;   // penalty: must finish its sweep first
}
const elevators = [
  { id: "E1", floor: 2, direction: "UP", state: "MOVING" },
  { id: "E2", floor: 9, direction: "DOWN", state: "MOVING" },
  { id: "E3", floor: 5, direction: "IDLE", state: "IDLE" },
];
for (const [floor, dir] of [[4, "UP"], [7, "DOWN"], [1, "UP"]]) {
  const best = elevators.reduce((a, b) => (cost(b, floor, dir) < cost(a, floor, dir) ? b : a));
  console.log(`hall call floor ${floor} ${dir} → ${best.id}`);
}
```

## Discussion points

The **State pattern** for elevator states (what each button does depends on the state), the Observer pattern for floor displays, concurrency (requests arriving while moving), and simulation/testing with a fake clock.

=== lesson: uml-class-diagrams-basics | UML class diagrams basics
Some LLD rounds want a quick class diagram before code. You only need a handful of notations.

```text
┌──────────────────────┐
│ ParkingLot            │   class name
├──────────────────────┤
│ - floors: Floor[]     │   attributes: - private, + public, # protected
├──────────────────────┤
│ + park(v): Ticket     │   methods
│ + unpark(id): Receipt │
└──────────────────────┘
```

| Relationship | Notation | Meaning | Example |
|---|---|---|---|
| Inheritance | `──▷` (hollow triangle) | is-a | `Car ──▷ Vehicle` |
| Interface implementation | `- - ▷` (dashed) | implements | `RazorpayGateway - - ▷ PaymentGateway` |
| Composition | `◆──` (filled diamond) | owns; part dies with the whole | `Floor ◆── Spot` |
| Aggregation | `◇──` (hollow diamond) | has, but parts live independently | `Team ◇── Player` |
| Association | `──` | uses / knows about | `Ticket ── Vehicle` |
| Dependency | `- - >` | temporarily uses | `Checkout - - > PricingStrategy` |

Multiplicity on the ends: `1`, `0..1`, `*`, `1..*` (`ParkingLot 1 ◆── 1..* Floor`).

In practice, draw boxes with key attributes and methods, the important relationships, and the interfaces where you'll use patterns; it's a communication tool, not a formal spec. Mermaid's `classDiagram` syntax is a quick way to draw them in docs.
