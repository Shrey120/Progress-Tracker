---
course: prep
module: typescript
title: TypeScript
order: 102
---
=== lesson: structural-typing | Structural typing
TypeScript checks the **shape** of a value, not its declared name. If an object has the properties a type requires, it fits, whatever it's called. This is "structural typing" (sometimes "duck typing at compile time"); Java and C# use nominal typing instead.

## Shapes, not names

```ts
interface Point { x: number; y: number }
class Pixel { constructor(public x: number, public y: number, public color: string) {} }

function length(p: Point) { return Math.hypot(p.x, p.y); }
length(new Pixel(3, 4, "red"));   // fine: a Pixel has x and y
length({ x: 3, y: 4 });           // fine
```

## Excess property checks

There's one exception. An object **literal** passed directly is checked for extra properties, because a typo is likely:

```ts
length({ x: 1, y: 2, z: 3 });     // error: 'z' does not exist in type 'Point'
const p = { x: 1, y: 2, z: 3 };
length(p);                         // fine: not a fresh literal
```

## When you want nominal types

Two IDs that are both `string` can be mixed up. A "branded" type makes them incompatible:

```ts
type UserId = string & { readonly __brand: "UserId" };
type OrderId = string & { readonly __brand: "OrderId" };
const asUserId = (s: string) => s as UserId;
function getUser(id: UserId) {}
getUser(asUserId("u1"));
getUser("o1" as OrderId);          // error
```

## What interviewers ask

> **"Is TypeScript nominally or structurally typed?"** Structurally: compatibility depends on the members a type has. That's why a class instance can satisfy an interface it never mentions. Excess-property checks on object literals and branded types are the two places it feels nominal.

=== lesson: unknown-vs-any-vs-never | unknown vs any vs never
Three special types that come up in nearly every TS interview.

| Type | Means | You can… |
|---|---|---|
| `any` | "stop type-checking this" | do anything with it; errors spread silently |
| `unknown` | "some value, type not known yet" | nothing until you narrow it |
| `never` | "this can't happen" | nothing; no value has this type |

## unknown is the safe any

```ts
function parse(json: string): unknown {
  return JSON.parse(json);
}
const data = parse('{"n": 1}');
data.n;                                   // error: data is unknown
if (typeof data === "object" && data && "n" in data) {
  console.log(data.n);                    // narrowed, allowed
}
```

Use `unknown` for anything from outside your code: `JSON.parse`, API responses, `catch (e)` (which is `unknown` with `useUnknownInCatchVariables`). Then validate, ideally with a schema library like Zod.

## never

- A function that never returns: `function fail(msg: string): never { throw new Error(msg); }`
- An empty union after narrowing. That makes **exhaustiveness checks** possible:

```ts
type Shape = { kind: "circle"; r: number } | { kind: "square"; s: number };
function area(s: Shape) {
  switch (s.kind) {
    case "circle": return Math.PI * s.r ** 2;
    case "square": return s.s ** 2;
    default: {
      const unreachable: never = s;   // error here if a new kind is added and not handled
      return unreachable;
    }
  }
}
```

## What interviewers ask

> **"When would you use unknown over any?"** Almost always. `unknown` forces you to check the value before using it; `any` turns off checking and lets mistakes flow into the rest of the code. `any` is an escape hatch for migrations, not a type.

=== lesson: type-narrowing-type-guards | Type narrowing and type guards
A union type (`string | number`) can't be used as either until TypeScript knows which it is. **Narrowing** is how code proves that, and TS follows the control flow to track it.

## Built-in narrowing

```ts
function format(v: string | number | Date | null) {
  if (v === null) return "—";                 // equality
  if (typeof v === "string") return v.trim(); // typeof
  if (v instanceof Date) return v.toISOString(); // instanceof
  return v.toFixed(2);                         // only number is left
}

type Res = { ok: true; data: string } | { ok: false; error: string };
function show(r: Res) {
  if ("error" in r) return r.error;            // the in operator
  return r.data;
}
```

## User-defined type guards

When the check is your own logic, return a **type predicate** `x is T`:

```ts
interface Fish { swim(): void }
interface Bird { fly(): void }
function isFish(a: Fish | Bird): a is Fish {
  return (a as Fish).swim !== undefined;
}
const pets: (Fish | Bird)[] = [];
const fish = pets.filter(isFish);   // Fish[]
```

Assertion functions narrow by throwing: `function assertDefined<T>(v: T): asserts v is NonNullable<T>`.

## What interviewers ask

> **"How do you narrow a union?"** `typeof`, `instanceof`, `in`, equality checks, discriminant properties, and custom type predicates. TypeScript tracks narrowing through `if`, `switch`, early returns and `&&`.

A type predicate is a promise you make to the compiler. If its logic is wrong, TS believes you anyway, so keep guards small and tested.

=== lesson: discriminated-unions | Discriminated unions
A union of object types that share one literal property (the **discriminant**), such as `status` or `kind`. Checking that property narrows to exactly one member.

## Modelling state that can't be wrong

Instead of a bag of optional fields where impossible combinations type-check:

```ts
// allows { loading: true, data: ..., error: ... }
type Bad = { loading: boolean; data?: User; error?: string };

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: User }
  | { status: "error"; error: string };

function render(s: State) {
  switch (s.status) {
    case "loading": return "Spinner";
    case "success": return s.data.name;   // data exists here
    case "error":   return s.error;       // and error here
    case "idle":    return null;
  }
}
```

"Make illegal states unrepresentable" is the phrase interviewers like.

## Where they show up

Redux/reducer actions (`{ type: "add"; item } | { type: "remove"; id }`), API results, form steps, websocket messages, state machines. Add the `never` exhaustiveness check from the previous lesson so adding a variant forces you to handle it everywhere.

## What interviewers ask

> **"How would you type an async request's state?"** As a discriminated union on `status`, so `data` only exists when it succeeded and `error` only when it failed, and the compiler checks every branch is handled.

=== lesson: generics-constraints | Generics and constraints
**Generics** let a function or type work with many types while keeping track of which one. A type parameter is a variable for a type.

## The basic idea

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}
const n = first([1, 2, 3]);      // number | undefined
const s = first(["a", "b"]);     // string | undefined
```

Without generics you'd write `any[]` and lose the type of the result.

## Constraints with extends

`T extends X` says "T can be anything that has at least X's shape":

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
longest("abc", "de");           // string
longest([1, 2], [1, 2, 3]);     // number[]
longest(10, 20);                // error: number has no length

// keyof constraint: a key that must exist on the object
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
pluck({ id: 1, name: "a" }, "name");   // string
pluck({ id: 1 }, "nope");              // error
```

## Generic types and defaults

```ts
type ApiResponse<T, E = string> = { data: T; error: null } | { data: null; error: E };
interface Repository<T extends { id: string }> {
  get(id: string): Promise<T | undefined>;
  save(item: T): Promise<void>;
}
```

## What interviewers ask

> **"Why generics instead of any?"** Generics keep the relationship between inputs and outputs: what goes in is what comes out, checked. Constraints let you use properties of the type while staying generic.

A good rule: if a type parameter appears only once in a signature, you probably don't need it.

=== lesson: utility-types-partial-pick-omit-record-returntype | Utility types
Built-in generic types that transform other types. Know these cold:

| Utility | Gives you |
|---|---|
| `Partial<T>` | all properties optional |
| `Required<T>` | all properties required |
| `Readonly<T>` | all properties readonly |
| `Pick<T, "a" \| "b">` | only those keys |
| `Omit<T, "a">` | every key except those |
| `Record<K, V>` | an object with keys K and values V |
| `ReturnType<typeof fn>` | what a function returns |
| `Parameters<typeof fn>` | its parameter types as a tuple |
| `Awaited<P>` | what a promise resolves to |
| `NonNullable<T>` | T without null and undefined |
| `Exclude<U, X>` / `Extract<U, X>` | remove / keep union members |

## In practice

```ts
interface User { id: string; name: string; email: string; passwordHash: string }

type PublicUser = Omit<User, "passwordHash">;
type UserUpdate = Partial<Pick<User, "name" | "email">>;   // PATCH body
type UsersById = Record<string, PublicUser>;

async function fetchUser() { return { id: "1", name: "A" }; }
type Fetched = Awaited<ReturnType<typeof fetchUser>>;     // { id: string; name: string }
```

## How they're built

They're mapped types (see the advanced lesson). Being able to write one shows you understand them:

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
```

## What interviewers ask

> **"How would you type a PATCH request body for a User?"** `Partial<Pick<User, editable fields>>`, so only editable fields are allowed and all are optional. Derive types from one source of truth instead of writing near-duplicates by hand.

=== lesson: satisfies | satisfies
`satisfies` (TS 4.9+) checks that a value matches a type **without changing the type TypeScript infers for it**.

## The problem it solves

```ts
type Theme = Record<"primary" | "secondary", string | [number, number, number]>;

const a: Theme = { primary: "#4B8BF5", secondary: [255, 212, 59] };
a.primary.toUpperCase();     // error: could be a tuple — the annotation widened it

const b = { primary: "#4B8BF5", secondary: [255, 212, 59] } satisfies Theme;
b.primary.toUpperCase();     // fine: still inferred as string
b.secondary[0];              // fine: still a tuple
const c = { primary: "#fff" } satisfies Theme;   // error: secondary is missing
```

An annotation (`: Theme`) says "treat this as Theme". `satisfies` says "check it's a valid Theme, but keep the precise type".

## Good uses

Config objects, route maps, lookup tables of handlers, design tokens: anywhere you want validation **and** autocomplete on the exact keys. Combine with `as const` for literal types: `{...} as const satisfies Config`.

> **"Annotation vs as vs satisfies?"** An annotation checks and widens to the declared type. `as` is an unchecked assertion that can lie. `satisfies` checks and keeps the inferred type.

=== lesson: strict-mode-flags | Strict mode flags
`"strict": true` in `tsconfig.json` turns on a family of checks. New projects should always use it.

| Flag | Catches |
|---|---|
| `strictNullChecks` | using a value that might be `null`/`undefined`. The most valuable one |
| `noImplicitAny` | parameters and variables silently typed `any` |
| `strictFunctionTypes` | unsafe function parameter types in callbacks |
| `strictPropertyInitialization` | class properties never assigned in the constructor |
| `useUnknownInCatchVariables` | makes `catch (e)` `unknown` instead of `any` |
| `alwaysStrict` | emits `"use strict"` |
| `noImplicitThis` | `this` with an implicit `any` type |

## Worth adding beyond strict

- `noUncheckedIndexedAccess` — `arr[i]` and `record[key]` become `T | undefined`, which matches reality.
- `exactOptionalPropertyTypes` — distinguishes "missing" from "explicitly undefined".
- `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`.

## Migrating a loose codebase

Turn flags on one at a time, starting with `noImplicitAny` and `strictNullChecks`. Fix per folder, or use `// @ts-expect-error` with a ticket to track leftovers. Tools like `typescript-strict-plugin` let you enforce strict mode file by file.

> **"Which strict flag matters most?"** `strictNullChecks`. Without it, `null` and `undefined` are assignable to everything, so the most common runtime error ("cannot read properties of undefined") is invisible to the compiler.

=== lesson: type-safe-api-contracts-and-codegen | Type-safe API contracts and codegen
Types inside one app are easy. The hard boundary is between frontend and backend: if the API changes, the client's types silently lie. Ways to keep both sides in sync:

## Options

1. **Shared types in a monorepo** — export request/response types from a shared package. Simple, but only types, no runtime check.
2. **Schema-first with validation** — define a Zod (or Valibot) schema once, infer the TS type from it, and validate at runtime at the boundary.

```ts
import { z } from "zod";
const User = z.object({ id: z.string(), email: z.string().email(), age: z.number().int().optional() });
type User = z.infer<typeof User>;
const user = User.parse(await res.json());   // throws if the API sent something else
```

3. **Codegen from a spec** — generate clients and types from OpenAPI (`openapi-typescript`, Orval) or GraphQL (GraphQL Code Generator). The spec is the contract; CI fails if generated code is stale.
4. **End-to-end typed RPC** — tRPC (or Next.js server actions): the client imports the server's router type, no schema file at all. Best when you own both sides in TypeScript.

## Trade-offs to discuss

- Types alone don't protect you at runtime; external data still needs validation.
- Codegen adds a build step but works across languages and for public APIs.
- tRPC is the least ceremony but couples the client to a TS backend.

> **"How do you keep frontend and backend types in sync?"** One source of truth (an OpenAPI/GraphQL schema or a Zod schema), types generated or inferred from it, and runtime validation at the boundary. CI regenerates and type-checks so drift fails the build.

=== lesson: conditional-mapped-types | Conditional and mapped types
The type-level programming that powers the utility types.

## Mapped types

Loop over keys to build a new type:

```ts
type Flags<T> = { [K in keyof T]: boolean };
type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
type Mutable<T> = { -readonly [K in keyof T]: T[K] };   // remove readonly
interface Person { name: string; age: number }
type PersonGetters = Getters<Person>;   // { getName: () => string; getAge: () => number }
```

`as` renames keys (key remapping); template literal types build the new names.

## Conditional types

`T extends U ? X : Y` — a type-level if:

```ts
type IsString<T> = T extends string ? true : false;
type ElementOf<T> = T extends (infer E)[] ? E : never;    // infer pulls a type out
type Unwrap<T> = T extends Promise<infer V> ? Unwrap<V> : T;
type A = ElementOf<number[]>;          // number
type B = Unwrap<Promise<Promise<1>>>;  // 1
```

**Distribution:** when `T` is a union, a conditional type is applied to each member: `Exclude<"a" | "b", "a">` is `"b"`. Wrap in brackets (`[T] extends [U]`) to stop it.

## Interview-style exercise

"Write `DeepReadonly<T>`":

```ts
type DeepReadonly<T> = T extends (...args: any[]) => any
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
```

These come up mostly in senior or library-heavy roles. For most full-stack interviews, being able to read them and write `Partial`/`Pick`/`ReturnType` yourself is enough.
