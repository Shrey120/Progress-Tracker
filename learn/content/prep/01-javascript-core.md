---
course: prep
module: javascript-core
title: JavaScript core
order: 101
---
=== lesson: data-types-null-vs-undefined-and-typeof | Data types, null vs undefined and typeof
JavaScript has **7 primitive types** and **objects**.

| Primitive | Example |
|---|---|
| `string` | `"hi"` |
| `number` | `42`, `3.14`, `NaN`, `Infinity` (one type for ints and floats) |
| `bigint` | `9007199254740993n` (integers beyond 2⁵³) |
| `boolean` | `true` |
| `undefined` | a variable declared but not assigned |
| `null` | "intentionally empty" |
| `symbol` | `Symbol("id")` (unique keys) |

Everything else (arrays, functions, dates, maps) is an **object**. Primitives are copied by value; objects by reference.

## typeof and its quirks

```jsrun
console.log(typeof "a", typeof 1, typeof 1n, typeof true, typeof undefined, typeof Symbol());
console.log(typeof null);          // "object" — a famous bug kept for compatibility
console.log(typeof [], typeof {}); // both "object"
console.log(typeof function () {});// "function"
console.log(Array.isArray([]), Number.isNaN(NaN), typeof NaN);
```

To check for arrays use `Array.isArray`; for null use `x === null`; for "null or undefined" use `x == null` (the one accepted use of `==`).

## null vs undefined

- `undefined` — the language's "no value yet": missing variables, missing properties, missing arguments, functions without `return`.
- `null` — a value you assign on purpose to mean "nothing".

```jsrun
let a;
const obj = {};
function f(x) { return x; }
console.log(a, obj.missing, f(), (() => {})());
console.log(null == undefined, null === undefined);
console.log(JSON.stringify({ a: undefined, b: null }));   // undefined keys are dropped
```

## Number gotchas

```jsrun
console.log(0.1 + 0.2, 0.1 + 0.2 === 0.3);           // floating point
console.log(Number.MAX_SAFE_INTEGER + 2);             // precision lost above 2^53
console.log(NaN === NaN, Object.is(NaN, NaN));
console.log(parseInt("08px"), Number("08px"), +"");   // parsing differences
```

Store money as integers (paise) or use a decimal library, never floats.

=== lesson: equality-and-type-coercion-vs | Equality and type coercion: == vs ===
- `===` (strict equality): equal only if same type **and** same value. No conversion.
- `==` (loose equality): converts the operands to a common type first, using rules that surprise people.

```jsrun
console.log(1 == "1", 1 === "1");
console.log(0 == "", 0 == "0", "" == "0");          // not transitive!
console.log(false == "0", null == 0, null == undefined);
console.log([] == false, [] == ![], [1] == 1);
```

## How coercion works

- `+` with a string concatenates; other arithmetic operators convert to numbers.
- Objects convert to primitives via `valueOf`/`toString` (`[]` → `""`, `[1,2]` → `"1,2"`, `{}` → `"[object Object]"`).
- In `if`, `&&`, `||`, `!`, values convert to booleans (truthy/falsy).

```jsrun
console.log("5" + 3, "5" - 3, "5" * "2", true + 1);
console.log([] + [], [] + {}, [1, 2] + [3]);
console.log(!!"", !!"0", !!0, !!NaN, !![], !!{});   // falsy: "", 0, NaN, null, undefined, false, 0n
```

## What to say in the interview

> "I always use `===`, which compares type and value with no conversion. `==` coerces types with rules like `0 == ""` being true, which causes bugs. The one exception some teams allow is `x == null` to check for both null and undefined. `Object.is` is like `===` except it treats `NaN` as equal to itself and distinguishes `0` from `-0`."

Objects are compared by **reference**: `{} === {}` is false; two variables are equal only if they point at the same object.

=== lesson: scope-chains | Scope chains
**Scope** decides where a variable can be seen. JavaScript has three kinds: global, function and block (`{ }` with `let`/`const`). `var` ignores blocks and is scoped to the whole function.

## How lookup works

When code uses a name, the engine looks in the current scope, then the scope that **encloses it in the source code**, outwards until global. That chain is fixed when the code is written (lexical scope), not when it's called.

```jsrun
const level = "global";
function outer() {
  const level = "outer";
  function inner() {
    console.log(level);   // found one scope out
  }
  return inner;
}
const fn = outer();
fn();
```

## var vs let in blocks

```jsrun
if (true) {
  var a = 1;
  let b = 2;
}
console.log(typeof a, typeof b);   // a leaked out of the block; b did not
```

## What interviewers ask

> **"What is lexical scope?"** Scope is determined by where a function is *defined*, not where it's *called*. A function carries a reference to the scope it was created in, which is also what makes closures work.

Follow-ups: shadowing (an inner variable with the same name hides the outer one), and why `let`/`const` in loops create a fresh binding per iteration.

=== lesson: hoisting-tdz | Hoisting and the TDZ
Before running a scope, the engine registers every declaration in it. That's **hoisting**. What you can do with a name before its line differs by keyword.

| Declaration | Hoisted? | Before its line |
|---|---|---|
| `function f() {}` | yes, with its body | callable |
| `var x` | yes, set to `undefined` | reads `undefined` |
| `let` / `const` / `class` | yes, but uninitialised | **ReferenceError** (temporal dead zone) |

## See it

```jsrun
console.log(typeof sayHi, v);
function sayHi() {}
var v = 5;

try {
  console.log(n);
} catch (e) {
  console.log(e.name + ": " + e.message);
}
let n = 1;
```

## The temporal dead zone

The TDZ is the span from the start of the scope to the `let`/`const` line. The variable exists (it shadows any outer one) but touching it throws. That's deliberate: it turns silent `undefined` bugs into loud errors.

## What interviewers ask

> **"Are let and const hoisted?"** Yes. They're registered at the start of the block, but left uninitialised until their declaration runs, so accessing them earlier throws a ReferenceError. `var` is hoisted and initialised to `undefined`.

Function *expressions* (`const f = () => {}`) follow the rules of their keyword, so they can't be called before their line.

=== lesson: closures | Closures
A **closure** is a function plus the variables from the scope it was created in. The function keeps those variables alive and can read and change them even after the outer function has returned.

## A private counter

```jsrun
function makeCounter() {
  let count = 0;            // lives on inside the closure
  return {
    inc: () => ++count,
    get: () => count,
  };
}
const c = makeCounter();
c.inc(); c.inc();
console.log(c.get());
const d = makeCounter();
console.log(d.get());       // separate count
```

## The classic loop question

```jsrun
for (var i = 0; i < 3; i++) setTimeout(() => console.log("var", i));
for (let j = 0; j < 3; j++) setTimeout(() => console.log("let", j));
```

`var` has one `i` shared by all three callbacks, which is 3 by the time they run. `let` creates a new `j` for each iteration, so each callback closes over its own.

## Where closures show up

Data privacy (module pattern), function factories, memoization, event handlers that remember state, `debounce`/`throttle`, React hooks (the stale-closure bug is a closure capturing an old value).

## What interviewers ask

> **"What is a closure?"** A function that remembers the variables of the scope where it was defined, so it can use them later from anywhere. Every function in JS forms one; it matters when an inner function outlives its outer function.

Follow-up: closures can cause memory leaks when a long-lived function (a listener, a timer) holds a reference to a large object it no longer needs.

=== lesson: this-binding-all-four-rules | this binding: the four rules
`this` is decided by **how a function is called**, not where it's defined. Four rules, in priority order:

1. **new binding** — `new Foo()`: `this` is the new object.
2. **Explicit** — `f.call(obj)`, `f.apply(obj)`, `f.bind(obj)`: `this` is `obj`.
3. **Implicit** — `obj.f()`: `this` is the object before the dot.
4. **Default** — plain `f()`: `undefined` in strict mode (modules, classes), the global object otherwise.

**Arrow functions** ignore all four: they take `this` from the enclosing scope.

## See every rule

```jsrun
"use strict";
function who() { return this ? this.name : String(this); }
const a = { name: "a", who };
const b = { name: "b" };

console.log(a.who());            // implicit: a
console.log(who.call(b));        // explicit: b
const lost = a.who;
console.log(lost());             // default: undefined (method "lost" its object)
function Person(n) { this.name = n; }
console.log(new Person("p").name); // new
```

## Losing this

Passing a method as a callback detaches it from its object: `setTimeout(obj.method)` or `onClick={this.handle}` in old class components. Fixes: `.bind(obj)`, an arrow wrapper `() => obj.method()`, or class fields with arrow functions.

```jsrun
const timer = {
  seconds: 0,
  start() {
    [1, 2, 3].forEach(() => this.seconds++);   // arrow: this is timer
    return this.seconds;
  },
};
console.log(timer.start());
```

## What interviewers ask

> **"What determines this?"** The call site. new beats explicit binding beats a method call beats a plain call; arrow functions don't have their own `this` and use the surrounding one.

=== lesson: arrow-functions-vs-regular-functions | Arrow functions vs regular functions
```js
function add(a, b) { return a + b; }        // declaration (hoisted)
const add2 = function (a, b) { return a + b; };
const add3 = (a, b) => a + b;               // arrow: implicit return for one expression
const toObj = (id) => ({ id });             // wrap object literals in ( )
```

## The real differences

| | Regular function | Arrow function |
|---|---|---|
| `this` | set by how it's called | inherited from the surrounding scope |
| `arguments` object | yes | no (use `...args`) |
| can be used with `new` | yes | no |
| has `prototype` | yes | no |
| hoisted (declarations) | yes | no (it's a variable) |
| good as object methods | yes | usually not |

## this is the one that matters

```jsrun
const counter = {
  count: 0,
  regular() {
    setTimeout(function () { console.log("regular: is this the counter?", this === counter); }, 0);
  },
  arrow() {
    setTimeout(() => { this.count++; console.log("arrow:", this.count); }, 0);
  },
};
counter.regular();
counter.arrow();

const obj = { name: "box", hi: () => this?.name, hello() { return this.name; } };
console.log(obj.hi(), obj.hello());   // arrow method: no own this → undefined; shorthand method: "box"
```

Arrows are ideal for callbacks inside methods (they keep the method's `this`), array methods, and React components and handlers. Use regular functions (or method shorthand) for object methods, constructors, and when you need dynamic `this` (event listeners that use `this` as the element).

=== lesson: prototypes-the-prototype-chain | Prototypes and the prototype chain
Every object has a hidden link, `[[Prototype]]`, to another object. When you read a property that isn't on the object itself, JS follows the link, and keeps following until it finds it or reaches `null`. That's the **prototype chain**, and it's how inheritance works in JS.

## See the chain

```jsrun
const animal = { eats: true, speak() { return "..."; } };
const dog = Object.create(animal);   // dog's prototype is animal
dog.barks = true;
console.log(dog.barks, dog.eats);           // own, inherited
console.log(Object.getPrototypeOf(dog) === animal);
console.log(dog.hasOwnProperty("eats"));    // false: it's on the prototype
```

## Classes are prototypes underneath

`class` is syntax over the same mechanism. Methods live on `Foo.prototype`, shared by every instance; `extends` links one prototype to another.

```jsrun
class Animal { speak() { return "generic"; } }
class Dog extends Animal { speak() { return "woof, then " + super.speak(); } }
const d = new Dog();
console.log(d.speak());
console.log(Object.getPrototypeOf(d) === Dog.prototype,
            Object.getPrototypeOf(Dog.prototype) === Animal.prototype);
```

## `__proto__` vs `prototype`

- `obj.__proto__` (or `Object.getPrototypeOf(obj)`) is an object's link.
- `Func.prototype` is the object that **instances created with `new Func`** will link to.

## What interviewers ask

> **"How does inheritance work in JavaScript?"** Through prototype links. Property lookup walks the chain; methods defined once on a prototype are shared by all instances. ES6 classes are a cleaner syntax for the same thing.

Follow-ups: what `new` does (create an object, link it to `Func.prototype`, run the function with `this` bound to it, return it), and why adding methods to built-in prototypes is a bad idea.

=== lesson: map-filter-reduce | map, filter and reduce
The three array methods that replace most loops. None of them changes the original array.

- `map(fn)` — a new array of the same length, each item transformed.
- `filter(fn)` — a new array with the items where `fn` returned truthy.
- `reduce(fn, initial)` — folds the array into one value.

## In use

```jsrun
const orders = [
  { item: "pen", price: 20, qty: 3 },
  { item: "book", price: 450, qty: 1 },
  { item: "bag", price: 1200, qty: 0 },
];
const inStock = orders.filter(o => o.qty > 0);
const lineTotals = inStock.map(o => o.price * o.qty);
const total = lineTotals.reduce((sum, x) => sum + x, 0);
console.log(lineTotals, total);

// reduce can build any shape: group by first letter
const byLetter = ["apple", "avocado", "banana"].reduce((acc, w) => {
  (acc[w[0]] ||= []).push(w);
  return acc;
}, {});
console.log(byLetter);
```

Always pass the initial value to `reduce`. Without it, an empty array throws, and the first element's type silently becomes the accumulator's type.

## Write map yourself

A common warm-up: implement `map` with `reduce`, or polyfill `Array.prototype.map`.

```jsrun
Array.prototype.myMap = function (fn, thisArg) {
  const out = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this) out[i] = fn.call(thisArg, this[i], i, this);   // skip holes like the real one
  }
  return out;
};
console.log([1, 2, 3].myMap(x => x * 10));
```

## What interviewers ask

> **"forEach vs map?"** `map` returns a new array and is for transforming; `forEach` returns `undefined` and is for side effects. You can't `break` out of either; use `for...of`, `some` or `find` when you need to stop early.

=== lesson: spread-rest-and-destructuring | Spread, rest and destructuring
Three pieces of syntax you'll write constantly in React and Node.

## Destructuring

```jsrun
const user = { id: 7, name: "Asha", address: { city: "Kanpur" }, roles: ["admin", "dev"] };
const { name, address: { city }, phone = "n/a" } = user;   // nested + default
const [firstRole, ...otherRoles] = user.roles;
console.log(name, city, phone, firstRole, otherRoles);

let a = 1, b = 2;
[a, b] = [b, a];                                          // swap
console.log(a, b);
```

In parameters: `function Card({ title, children })`, `useState` returns `[value, setValue]`.

## Spread `...` (expands)

```jsrun
const base = { theme: "dark", lang: "en" };
const settings = { ...base, lang: "hi" };    // copy and override (later wins)
const nums = [3, 1, 2];
console.log(settings, Math.max(...nums), [...nums, 4]);
```

Spread copies are **shallow** (see Deep vs shallow copy): nested objects are still shared. That's why immutable React updates spread each level you change:

```js
setUser(u => ({ ...u, address: { ...u.address, city: "Pune" } }));
```

## Rest `...` (collects)

```jsrun
function log(level, ...messages) { console.log(`[${level}]`, messages.join(" | ")); }
log("info", "server started", "port 3000");
const { password, ...safeUser } = { id: 1, email: "a@x.com", password: "secret" };
console.log(safeUser);                     // remove a key without mutating
```

Same `...` symbol: **spread** when it appears where values are used, **rest** when it appears where variables are declared or parameters are listed.

=== lesson: optional-chaining-nullish-coalescing | Optional chaining and nullish coalescing
Two operators for values that might be `null` or `undefined`.

## `?.` optional chaining

Stops and returns `undefined` if the thing on its left is `null`/`undefined`, instead of throwing.

```jsrun
const user = { profile: null, tags: ["a"] };
console.log(user.profile?.name);       // undefined, no TypeError
console.log(user.tags?.[0]);           // works with [ ]
console.log(user.notify?.());          // and with calls
```

## `??` nullish coalescing

`a ?? b` gives `b` only when `a` is `null` or `undefined`. `a || b` gives `b` for **any** falsy value, including `0`, `""` and `false`, which is usually a bug for settings like counts and toggles.

```jsrun
const settings = { volume: 0, name: "" };
console.log(settings.volume || 50);   // 50  — wrong, 0 was a real value
console.log(settings.volume ?? 50);   // 0
console.log(settings.name ?? "anon"); // ""
let limit;
limit ??= 10;                         // assign only if null/undefined
console.log(limit);
```

## What interviewers ask

> **"Difference between || and ???"** `||` falls back on any falsy value; `??` only on null or undefined. Use `??` for defaults where 0, false or an empty string are valid.

Don't overuse `?.`: chaining it everywhere hides data that *should* exist. Use it where absence is a normal case.

=== lesson: deep-vs-shallow-copy | Deep vs shallow copy
Objects and arrays are held **by reference**. Assigning one to a new variable copies the reference, not the data.

- **Shallow copy** — a new outer object, but nested objects are still shared: `{...obj}`, `[...arr]`, `Object.assign({}, obj)`, `arr.slice()`.
- **Deep copy** — every nested level copied: `structuredClone(obj)`.

## See the difference

```jsrun
const original = { name: "A", address: { city: "Kanpur" } };
const shallow = { ...original };
const deep = structuredClone(original);

shallow.address.city = "Delhi";
console.log(original.address.city);   // Delhi — shared nested object
deep.address.city = "Pune";
console.log(original.address.city);   // still Delhi
```

## The JSON trick and its limits

`JSON.parse(JSON.stringify(obj))` deep-copies plain data but loses `Date` (becomes a string), `undefined`, functions, `Map`/`Set`, `Infinity`/`NaN`, and throws on circular references. `structuredClone` handles dates, maps, sets and cycles (not functions or class prototypes).

## Write a deep clone

```jsrun
function deepClone(v, seen = new WeakMap()) {
  if (v === null || typeof v !== "object") return v;
  if (seen.has(v)) return seen.get(v);              // handles cycles
  const out = Array.isArray(v) ? [] : Object.create(Object.getPrototypeOf(v));
  seen.set(v, out);
  for (const key of Reflect.ownKeys(v)) out[key] = deepClone(v[key], seen);
  return out;
}
const a = { list: [1, { x: 2 }] };
a.self = a;
const b = deepClone(a);
console.log(b.list[1] !== a.list[1], b.self === b);
```

## What interviewers ask

> **"Why does spreading state not fully copy it in React?"** Spread is shallow; nested objects stay shared, so you must copy each level you change. Immutable updates copy the path to the change, not the whole tree.

=== lesson: es-modules-vs-commonjs | ES modules vs CommonJS
Two module systems. ES modules (ESM) are the standard; CommonJS (CJS) is Node's original one.

| | ES modules | CommonJS |
|---|---|---|
| Syntax | `import` / `export` | `require()` / `module.exports` |
| Loading | static: parsed before running, async-friendly | dynamic: `require` runs when reached |
| Bindings | live (you see updates to exported `let`) | a copy of the value at require time |
| Top-level `await` | yes | no |
| Tree shaking | possible (static structure) | hard |
| `this` at top | `undefined` | `module.exports` |

## Why "static" matters

Because `import` statements can't sit inside an `if` and must use string literals, tools know the full dependency graph without running code. That's what lets bundlers **tree-shake** unused exports. Dynamic loading still exists: `await import("./heavy.js")` returns a promise, which is how code splitting works.

## In Node

`.mjs` or `"type": "module"` in package.json means ESM; `.cjs` means CommonJS. ESM can import CJS (as a default export); CJS needs dynamic `import()` to load ESM (newer Node versions can `require` synchronous ESM).

## What interviewers ask

> **"What's the difference between ESM and CommonJS?"** ESM is static and asynchronous, with live bindings, which enables tree shaking and top-level await. CommonJS is synchronous and dynamic, and exports a copied value. New code should use ESM.

Follow-up: circular imports. Both allow them, but you can read an import before it's initialised; ESM throws a TDZ error, CJS gives you a partially filled `module.exports`.

=== lesson: event-loop-microtasks-macrotasks | The event loop: microtasks and macrotasks
JavaScript runs on **one thread**. It can wait for timers and network without blocking because of the **event loop**.

1. Run the current script to completion (the call stack empties).
2. Run **all** microtasks: promise callbacks (`.then`, `await` continuations), `queueMicrotask`.
3. Render if needed (browsers).
4. Take **one** macrotask (a timer, an I/O callback, a message) and run it. Back to step 2.

## Predict the output

Before running it, write down the order.

```jsrun
console.log("1 script start");
setTimeout(() => console.log("5 timeout (macrotask)"), 0);
Promise.resolve()
  .then(() => console.log("3 promise then (microtask)"))
  .then(() => console.log("4 chained then"));
queueMicrotask(() => console.log("3b queueMicrotask"));
console.log("2 script end");
```

Synchronous code first, then every microtask (including ones queued by other microtasks), then the timer. `setTimeout(fn, 0)` means "at least 0 ms", never "now".

## async/await is microtasks

```jsrun
async function f() {
  console.log("B inside f, before await");
  await null;
  console.log("D after await (microtask)");
}
console.log("A");
f();
console.log("C after calling f");
```

Code after `await` is scheduled as a microtask, so it runs after the current synchronous code finishes.

## Why it matters

- A long synchronous task (or an endless microtask chain) blocks rendering and input. Break heavy work into chunks or move it to a Web Worker.
- Node's loop has extra phases (timers, poll, check for `setImmediate`); `process.nextTick` runs even before promise microtasks.

## What interviewers ask

> **"Explain the event loop."** One call stack runs code to completion. When it's empty, the loop drains the microtask queue (promises), then takes one macrotask (timers, I/O, events), repeating. That's why promise callbacks run before a `setTimeout(…, 0)` queued earlier.

=== lesson: promises-async-await-error-propagation | Promises, async/await and errors
A **promise** represents a value that will exist later. It's *pending*, then settles once: *fulfilled* with a value or *rejected* with a reason. `.then` callbacks run as microtasks after it settles.

## Chaining

Each `.then` returns a new promise, resolved with whatever its callback returns. Returning a promise waits for it. Throwing inside rejects the chain, and the next `.catch` handles it.

```jsrun
const wait = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));

wait(10, 2)
  .then(x => x * 10)
  .then(x => { if (x > 5) throw new Error("too big: " + x); return x; })
  .then(() => console.log("skipped"))
  .catch(e => console.log("caught", e.message))
  .finally(() => console.log("cleanup runs either way"));
```

## async/await

`async` functions always return a promise. `await` pauses the function until a promise settles; a rejection becomes a thrown error you can `try/catch`.

```jsrun
async function load(id) {
  if (id < 0) throw new Error("bad id");
  return { id };
}
async function main() {
  try {
    console.log(await load(1));
    await load(-1);
  } catch (e) {
    console.log("handled:", e.message);
  }
}
main();
```

## The mistakes interviewers look for

- **Forgetting to return** inside `.then`: the next step doesn't wait.
- **Forgetting `await`**: you get a promise, not a value, and its rejection escapes your `try`.
- **Sequential awaits that could be parallel**: `await a(); await b();` takes a+b; `await Promise.all([a(), b()])` takes max(a, b).
- **`forEach` with async callbacks** doesn't wait for them. Use `for...of` with `await`, or `Promise.all(arr.map(...))`.
- **Unhandled rejections** crash Node processes. Always end chains with `.catch` or `try/catch`.

> **"How do errors propagate in async code?"** A rejection travels down the chain to the nearest `.catch`, skipping `.then` handlers, exactly like an exception up the call stack. In async functions, `await` rethrows it so `try/catch` works.

=== lesson: promise-all-allsettled-race | Promise.all, allSettled, race and any
Four ways to wait for several promises:

| Method | Resolves when | Rejects when | Use for |
|---|---|---|---|
| `Promise.all` | all fulfil (array of values, in input order) | **any** rejects (first reason) | everything is required |
| `Promise.allSettled` | all settle (array of `{status, value/reason}`) | never | partial success is fine |
| `Promise.race` | first to settle (fulfil **or** reject) | first to settle rejects | timeouts |
| `Promise.any` | first to **fulfil** | all reject (`AggregateError`) | fastest mirror wins |

## All four, side by side

```jsrun
const ok = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));
const fail = (ms, why) => new Promise((_, j) => setTimeout(() => j(new Error(why)), ms));

Promise.all([ok(20, "a"), ok(10, "b")]).then(v => console.log("all:", v));
Promise.all([ok(20, "a"), fail(10, "boom")]).catch(e => console.log("all failed:", e.message));
Promise.allSettled([ok(5, "a"), fail(5, "x")]).then(r => console.log("allSettled:", r.map(x => x.status)));
Promise.race([ok(30, "slow"), ok(5, "fast")]).then(v => console.log("race:", v));
Promise.any([fail(5, "x"), ok(15, "second")]).then(v => console.log("any:", v));
```

## A timeout with race

```jsrun
function withTimeout(p, ms) {
  const t = new Promise((_, rej) => setTimeout(() => rej(new Error("timed out")), ms));
  return Promise.race([p, t]);
}
withTimeout(new Promise(r => setTimeout(() => r("done"), 100)), 20)
  .then(console.log, e => console.log(e.message));
```

Note that `race` doesn't cancel the loser; use an `AbortController` to actually stop a fetch.

## Implement Promise.all

A very common interview task:

```jsrun
function promiseAll(items) {
  return new Promise((resolve, reject) => {
    const results = [];
    let remaining = items.length;
    if (remaining === 0) return resolve(results);
    items.forEach((item, i) => {
      Promise.resolve(item).then(v => {
        results[i] = v;                     // keep input order
        if (--remaining === 0) resolve(results);
      }, reject);                           // first rejection wins
    });
  });
}
promiseAll([1, Promise.resolve(2), new Promise(r => setTimeout(() => r(3), 10))]).then(console.log);
```

=== lesson: generators-iterators | Generators and iterators
An **iterator** is any object with a `next()` method returning `{ value, done }`. An **iterable** has a `[Symbol.iterator]()` method returning an iterator. `for...of`, spread and destructuring all work on iterables.

## Generators make iterators easy

A `function*` pauses at each `yield` and resumes when `next()` is called. Values are produced lazily.

```jsrun
function* range(start, end, step = 1) {
  for (let i = start; i < end; i += step) yield i;
}
console.log([...range(0, 10, 3)]);

function* fibonacci() {          // infinite, but lazy
  let [a, b] = [0, 1];
  while (true) { yield a; [a, b] = [b, a + b]; }
}
const it = fibonacci();
console.log(Array.from({ length: 8 }, () => it.next().value));
```

## Making your own class iterable

```jsrun
class Countdown {
  constructor(n) { this.n = n; }
  *[Symbol.iterator]() { for (let i = this.n; i > 0; i--) yield i; }
}
for (const x of new Countdown(3)) console.log(x);
```

## Async generators

`async function*` with `for await...of` is how you consume paginated APIs or streams one chunk at a time.

## What interviewers ask

> **"What are generators for?"** Lazy sequences (including infinite ones), custom iteration, and pausing/resuming logic. They were the basis of async/await before it existed (co, Redux-Saga still uses them).

=== lesson: currying-partial-application | Currying and partial application
- **Partial application**: fix some arguments now, get a function that takes the rest. `fn.bind(null, a)` does it.
- **Currying**: turn `f(a, b, c)` into `f(a)(b)(c)`, one argument at a time.

## Implement curry

The interview version supports any grouping: `sum(1)(2)(3)`, `sum(1, 2)(3)`, `sum(1)(2, 3)`.

```jsrun
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn.apply(this, args);
    return (...more) => curried.apply(this, [...args, ...more]);
  };
}
const add3 = (a, b, c) => a + b + c;
const c = curry(add3);
console.log(c(1)(2)(3), c(1, 2)(3), c(1)(2, 3));

const add10 = add3.bind(null, 10);   // partial application
console.log(add10(1, 2));
```

`fn.length` is the number of declared parameters (not counting defaults or rest), which is how `curry` knows when to stop.

## The infinite sum variant

`sum(1)(2)(3)()` returns 6: keep returning a function until called with no arguments.

```jsrun
const sum = a => b => (b === undefined ? a : sum(a + b));
console.log(sum(1)(2)(3)());
```

## Why it's useful

Building specialised functions from general ones (`const logError = log("error")`), and point-free composition with `map`. Mostly, interviewers use it to test closures and recursion.

=== lesson: implement-debounce-and-throttle | Implement debounce and throttle
Both limit how often a function runs when an event fires rapidly (typing, scrolling, resizing).

- **Debounce**: wait until the events **stop** for `ms`, then run once. Search-as-you-type.
- **Throttle**: run at most once every `ms`, no matter how many events. Scroll position, mouse moves.

## Debounce

```jsrun
function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);                       // cancel the previous call
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
const search = debounce(q => console.log("search:", q), 50);
search("r"); search("re"); search("rea"); search("react");   // only the last one runs
```

## Throttle

```jsrun
function throttle(fn, ms) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn.apply(this, args);
    }
  };
}
const onScroll = throttle(y => console.log("scroll at", y), 100);
for (let y = 0; y < 5; y++) onScroll(y * 100);   // only the first runs within 100 ms
```

## Follow-ups to be ready for

- **Leading vs trailing**: run on the first event, the last, or both. Lodash exposes both options.
- **A trailing throttle call**, so the final position isn't lost: store the latest args and schedule one more call.
- **`cancel()`** to clear a pending call, for example on component unmount.
- **Why `fn.apply(this, args)`**: so the wrapped function keeps its `this` and arguments.
- In React, create the debounced function once (`useMemo`/`useRef`), not on every render, or every render gets a new timer.

=== lesson: polyfills-bind-call-apply-promise | Polyfills: bind, call, apply, Promise
Writing a polyfill proves you understand what a built-in really does.

## call and apply

Make `fn` a temporary method of the target object, so the implicit-binding rule sets `this`.

```jsrun
Function.prototype.myCall = function (ctx, ...args) {
  ctx = ctx ?? globalThis;
  const key = Symbol("fn");          // avoid clobbering real properties
  ctx[key] = this;
  const result = ctx[key](...args);
  delete ctx[key];
  return result;
};
Function.prototype.myApply = function (ctx, args = []) { return this.myCall(ctx, ...args); };

function greet(greeting) { return greeting + ", " + this.name; }
console.log(greet.myCall({ name: "Asha" }, "Hi"), greet.myApply({ name: "Ravi" }, ["Hey"]));
```

## bind

Returns a new function with `this` and leading arguments fixed. The detail people miss: when the bound function is used with `new`, `this` must be the new object, not the bound one.

```jsrun
Function.prototype.myBind = function (ctx, ...preset) {
  const fn = this;
  function bound(...later) {
    const isNew = this instanceof bound;
    return fn.apply(isNew ? this : ctx, [...preset, ...later]);
  }
  bound.prototype = Object.create(fn.prototype);
  return bound;
};
function greet(greeting) { return greeting + ", " + this.name; }
const hi = greet.myBind({ name: "Meera" }, "Hello");
console.log(hi());
```

## A minimal Promise

The core: state, a queue of callbacks, and running them as microtasks.

```jsrun
class MyPromise {
  constructor(executor) {
    this.state = "pending"; this.value = undefined; this.handlers = [];
    const settle = (state, value) => {
      if (this.state !== "pending") return;
      this.state = state; this.value = value;
      this.handlers.forEach(h => h());
    };
    try { executor(v => settle("fulfilled", v), e => settle("rejected", e)); }
    catch (e) { settle("rejected", e); }
  }
  then(onOk, onErr) {
    return new MyPromise((resolve, reject) => {
      const run = () => queueMicrotask(() => {
        const cb = this.state === "fulfilled" ? onOk : onErr;
        if (!cb) return (this.state === "fulfilled" ? resolve : reject)(this.value);
        try {
          const r = cb(this.value);
          r && typeof r.then === "function" ? r.then(resolve, reject) : resolve(r);
        } catch (e) { reject(e); }
      });
      this.state === "pending" ? this.handlers.push(run) : run();
    });
  }
  catch(onErr) { return this.then(null, onErr); }
}
new MyPromise(r => setTimeout(() => r(2), 10))
  .then(x => x * 3)
  .then(x => { throw new Error("got " + x); })
  .catch(e => console.log(e.message));
```

Talk through: settles once, callbacks run asynchronously, `then` returns a new promise, returned promises are adopted, thrown errors become rejections.

=== lesson: memory-leaks | Memory leaks
JavaScript frees memory automatically, but only for objects nothing references anymore. A **leak** is memory that's still referenced but no longer needed.

## The usual causes

1. **Forgotten listeners and timers** — `addEventListener` or `setInterval` whose callback closes over large objects, never removed.
2. **Detached DOM nodes** — removed from the page but still referenced from a JS variable or cache.
3. **Unbounded caches** — a `Map` used as a cache that only grows.
4. **Closures holding more than they need** — a long-lived callback capturing a big scope.
5. **Accidental globals** — assigning to an undeclared variable in sloppy mode.
6. In React: effects without cleanup (subscriptions, sockets, intervals) and `setState` after unmount.

## Fixes

```js
useEffect(() => {
  const id = setInterval(tick, 1000);
  const onResize = () => setWidth(window.innerWidth);
  window.addEventListener("resize", onResize);
  return () => {                         // cleanup on unmount or re-run
    clearInterval(id);
    window.removeEventListener("resize", onResize);
  };
}, []);
```

- Use `AbortController` to remove many listeners or cancel fetches at once.
- Bound caches (LRU), or use `WeakMap`/`WeakRef` for caches keyed by objects, so entries die with their key.

## Finding one

Chrome DevTools → Memory: take a heap snapshot, do the action several times, take another, and compare (filter "Detached" for DOM leaks). The Performance monitor shows JS heap and listener counts growing over time.

> **"How would you debug a memory leak in a SPA?"** Reproduce a repeatable action, take heap snapshots before and after repeating it, compare to see which object types keep growing, and follow their retainers back to the listener, timer or cache holding them.

=== lesson: garbage-collection | Garbage collection
V8 (Chrome, Node) frees memory with a **tracing** collector: starting from roots (globals, the current call stack), it marks everything reachable; anything not marked is garbage. Reference cycles are fine, since an unreachable cycle isn't marked.

## Generational collection

Most objects die young, so V8 splits the heap:

- **Young generation** — small, collected often and fast (a "scavenge" that copies survivors).
- **Old generation** — objects that survived a couple of scavenges; collected less often with mark-sweep-compact, mostly incrementally and concurrently to avoid long pauses.

## What this means for your code

- Short-lived temporary objects are cheap.
- Allocation-heavy hot loops still cause frequent collections; reuse buffers in performance-critical code.
- GC pauses show up as jank; "Major GC" in the Performance panel is the clue.
- `WeakMap`/`WeakSet` keys don't keep their objects alive, which makes them safe for metadata caches.

## What interviewers ask

> **"How does garbage collection work in JS?"** Mark-and-sweep from roots: reachable objects are kept, everything else is freed, so circular references aren't a problem. V8 adds generations, because most objects die young, and does most of the work incrementally to keep pauses short.

Reference counting (the older approach) can't free cycles; that's the classic contrast to mention.
