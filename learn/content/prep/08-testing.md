---
course: prep
module: testing
title: Testing
order: 108
---
=== lesson: unit-vs-integration-vs-e2e | Unit vs integration vs E2E
| Type | Tests | Speed | Confidence | Breaks when |
|---|---|---|---|---|
| **Unit** | one function or component in isolation, dependencies mocked | ms | low–medium | implementation changes |
| **Integration** | several pieces together: a component with its hooks and a mocked network, an API route with a real test database | seconds | high | contracts between pieces change |
| **End-to-end** | the whole app in a real browser against real (or staging) services | slow | highest | anything changes, including timing |

## Examples

- **Unit**: `formatCurrency(4999) === "₹49.99"`, a reducer, a validation schema.
- **Integration**: render `<CheckoutForm>`, type into fields, submit, and assert the API was called and the success message appears (network mocked with MSW). Or: call `POST /orders` against a Postgres test container and check the database row.
- **E2E**: Playwright logs in, adds to cart, pays with a test card, sees the order page.

## What interviewers want to hear

That you choose deliberately: pure logic gets unit tests, user-facing behaviour gets integration tests (most of the value per minute spent), a handful of critical journeys (signup, checkout) get E2E, and everything runs in CI on every PR.

```jsrun
// a unit test in miniature: no framework needed to see the idea
const formatINR = paise => "₹" + (paise / 100).toFixed(2);
const cases = [[4999, "₹49.99"], [0, "₹0.00"], [100, "₹1.00"]];
for (const [input, expected] of cases) {
  const got = formatINR(input);
  console.log(got === expected ? "✓" : "✗", input, "→", got);
}
```

=== lesson: jest-vitest | Jest and Vitest
The two common JavaScript test runners. **Vitest** is Jest-compatible but uses Vite's pipeline: fast, native ESM and TypeScript, and the default in new Vite projects. **Jest** is still everywhere in existing codebases.

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyDiscount } from "./pricing";

describe("applyDiscount", () => {
  it("applies a percentage", () => {
    expect(applyDiscount(1000, { type: "percent", value: 10 })).toBe(900);
  });
  it("never goes below zero", () => {
    expect(applyDiscount(100, { type: "flat", value: 500 })).toBe(0);
  });
  it("rejects negative discounts", () => {
    expect(() => applyDiscount(100, { type: "flat", value: -5 })).toThrow(/negative/);
  });
});
```

## Matchers you'll use

`toBe` (identity, primitives), `toEqual` (deep equality), `toStrictEqual` (also checks undefined properties and types), `toMatchObject` (subset), `toThrow`, `toHaveBeenCalledWith`, `resolves`/`rejects` for promises, `toMatchInlineSnapshot`.

## Structure

- **Arrange, act, assert** in each test.
- One behaviour per test; the name says it ("never goes below zero").
- `beforeEach` to reset state; tests must not depend on each other's order.
- `it.each` for tables of cases.
- Fake timers (`vi.useFakeTimers()`) for debounce, retries and timeouts.

=== lesson: react-testing-library | React Testing Library
RTL tests components **the way users use them**: find elements by role and label, interact, and check what's on screen. It deliberately doesn't let you reach into state or instances.

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

test("shows an error for an invalid email", async () => {
  const user = userEvent.setup();
  render(<SignupForm onSubmit={vi.fn()} />);

  await user.type(screen.getByLabelText(/email/i), "not-an-email");
  await user.click(screen.getByRole("button", { name: /create account/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/valid email/i);
});
```

## Queries, in priority order

1. `getByRole` (with `name`) — mirrors accessibility; if you can't find it by role, maybe a screen reader can't either.
2. `getByLabelText`, `getByPlaceholderText`, `getByText`, `getByDisplayValue`.
3. `getByTestId` — last resort.

Variants: `getBy` throws if missing, `queryBy` returns null (to assert absence), `findBy` waits (async content).

## Habits that make tests reliable

- `userEvent` over `fireEvent`: it simulates real sequences (focus, keydown, input, click).
- `await findBy…` or `waitFor` for anything async; never fixed `setTimeout` sleeps.
- Mock the network (MSW), not your own hooks.
- Test behaviour, not implementation: renaming a state variable shouldn't break a test.

=== lesson: mocking-spies | Mocking and spies
- **Spy**: wraps a real function to record calls, optionally still calling through.
- **Mock / stub**: replaces a function or module with a fake that returns what you tell it.
- **Fake**: a working lightweight implementation (in-memory database, fake clock).

```ts
const send = vi.fn().mockResolvedValue({ ok: true });
await notifyUser({ id: 1 }, { send });
expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 1 }));
expect(send).toHaveBeenCalledTimes(1);

vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
vi.mock("./payments", () => ({ charge: vi.fn().mockResolvedValue({ id: "ch_1" }) }));
```

## What to mock

Mock at the **boundaries** of your system: network, time, randomness, the file system, third-party SDKs (payments, email). Don't mock your own modules just because you can: tests that mock everything pass while the real integration is broken, and break on every refactor.

## Smells

- Asserting a mock was called with exactly what the code does, line by line: you're testing the implementation.
- Mocks that drift from the real API. Prefer contract tests or MSW handlers built from the API schema.
- Forgetting to reset mocks between tests (`vi.restoreAllMocks()` in `afterEach`, or `restoreMocks: true` in config).

Dependency injection (passing `send` in above) makes mocking trivial without module-mocking magic.

=== lesson: what-is-actually-worth-testing | What is actually worth testing
Tests cost time to write, run and maintain. Spend them where bugs are likely and expensive.

## High value

- **Business rules with edge cases**: pricing, discounts, tax, permissions, date and timezone logic, state machines.
- **Critical user journeys**: signup, login, checkout, payments, anything that loses money or data if broken.
- **Bugs you've fixed**: a regression test for each.
- **Integration points**: your API's contract, database queries with real Postgres, auth middleware.
- **Complex UI behaviour**: forms with validation, conditional flows.

## Low value

- Trivial getters, framework code, simple pass-through components.
- Exact markup or styling (brittle snapshots).
- Implementation details: internal state, private functions, which hook was called.
- Third-party libraries themselves.

## Signals of good tests

They fail when behaviour breaks and **don't** fail when you refactor. They read like a specification. They're fast enough to run on every save.

> **"How do you decide what to test?"** By risk: how likely it is to break and how bad it is if it does. Critical paths and complex logic get thorough tests, mostly at the integration level; trivial code gets little; every production bug gets a regression test.

=== lesson: playwright-cypress | Playwright and Cypress
Tools for end-to-end tests in real browsers.

```ts
import { test, expect } from "@playwright/test";

test("user can check out", async ({ page }) => {
  await page.goto("/products/keyboard");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("link", { name: "Cart (1)" }).click();
  await page.getByRole("button", { name: "Checkout" }).click();
  await page.getByLabel("Card number").fill("4111 1111 1111 1111");
  await page.getByRole("button", { name: "Pay" }).click();
  await expect(page.getByRole("heading", { name: "Order confirmed" })).toBeVisible();
});
```

| | Playwright | Cypress |
|---|---|---|
| Browsers | Chromium, Firefox, WebKit | Chromium family, Firefox (WebKit experimental) |
| Model | out-of-process, real multi-tab, multi-origin | runs inside the browser |
| Parallelism | built in, free | paid cloud for best parallelism |
| Waiting | auto-waits on locators and assertions | auto-retries commands |
| DX | codegen, trace viewer with DOM snapshots | excellent interactive runner |

Playwright has become the more common choice for new projects.

## Practices

- Use role/label locators, not CSS paths.
- Seed test data through the API or database, not by clicking through setup screens.
- Reuse a logged-in state (`storageState`) instead of logging in each test.
- Isolate tests (each creates its own data) so they can run in parallel.
- Keep the E2E suite small and focused on critical journeys; record traces on failure in CI.

=== lesson: msw | MSW (Mock Service Worker)
MSW intercepts network requests **at the network level** and returns mocked responses. In the browser it uses a Service Worker; in Node (tests) it patches the request modules. Your app code is unchanged: it still calls `fetch`.

```ts
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const server = setupServer(
  http.get("/api/user", () => HttpResponse.json({ id: 1, name: "Asha" })),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("shows an error when the API fails", async () => {
  server.use(http.get("/api/user", () => new HttpResponse(null, { status: 500 })));   // override per test
  render(<Profile />);
  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
```

## Why it beats mocking fetch or your hooks

- Tests exercise your real data layer (TanStack Query, error handling, parsing).
- The same handlers work in unit tests, Storybook and local development (build the UI before the API exists).
- Easy to simulate errors, slow responses and edge cases.

Keep handlers realistic: generate them from your OpenAPI spec, or share fixtures with backend tests so they don't drift.

=== lesson: testing-pyramid-and-trophy | Testing pyramid and testing trophy
## The pyramid

Many unit tests at the bottom, fewer integration tests, very few E2E tests at the top. Rationale: unit tests are fast and cheap; E2E tests are slow and flaky.

## The trophy (Kent C. Dodds)

```
        E2E          (a few)
   ┌─────────────┐
   │ Integration │  ← the biggest layer
   └─────────────┘
      Unit         (some)
   Static          (TypeScript, ESLint — the base)
```

For frontend apps, integration tests (render a component tree, mock only the network) give the most confidence per test, because most bugs live in how pieces fit together. Static analysis catches whole classes of errors for free.

## How to answer

They're not rules; they're about trade-offs between cost, speed and confidence. A backend with heavy domain logic may look more like a pyramid; a UI-heavy frontend more like a trophy. "Write tests. Not too many. Mostly integration."

=== lesson: flaky-tests | Flaky tests
A **flaky** test passes and fails without code changes. Flakes erode trust: people start re-running CI until it's green and ignore real failures.

## Common causes

| Cause | Fix |
|---|---|
| Timing: fixed sleeps, animations, racing async work | wait for a condition (`findBy`, `expect.poll`, auto-waiting locators) |
| Shared state between tests (DB rows, globals, localStorage) | isolate: fresh data per test, reset mocks, transactions rolled back |
| Test order dependence | run in random order to expose it |
| Real time and dates | fake timers, fixed clocks, explicit timezones |
| Randomness | seed it or remove it |
| External services / network | mock at the boundary or use stable test environments |
| Resource limits in CI (slow machines) | avoid tight timeouts; parallelise sensibly |

## Process

Track flaky tests (CI dashboards, Playwright's retries report "flaky"), quarantine them so they don't block merges, fix or delete them quickly, and never leave `retry: 3` as the permanent fix.

=== lesson: coverage-and-its-limits | Coverage and its limits
**Code coverage** measures which lines, branches and functions ran during tests (`vitest --coverage`, Istanbul/V8).

## What it tells you

Code with **0%** coverage is definitely untested. Coverage reports are good at finding forgotten areas: an untested error branch, a module nobody wrote tests for.

## What it doesn't

Running a line isn't testing it. This test gives 100% coverage and checks nothing:

```ts
test("calculate", () => { calculateTax(order); });   // no assertion
```

High coverage with weak assertions is common. Coverage also says nothing about missing code (the edge case you never handled).

## Using it well

- Look at **branch** coverage, not just lines.
- Use it to find gaps in important modules, not as a single number to hit.
- A minimum threshold in CI can stop coverage dropping; chasing 100% leads to low-value tests.
- **Mutation testing** (Stryker) checks test quality: it changes your code (flips `>` to `>=`) and sees whether any test fails.

=== lesson: tdd | TDD
**Test-driven development**: red, green, refactor.

1. **Red**: write a failing test for the next small piece of behaviour.
2. **Green**: write the simplest code that passes.
3. **Refactor**: clean up with the test as a safety net.

## Benefits

Forces you to define behaviour and interfaces before implementation; produces testable, loosely coupled code; every line has a reason to exist; regression suite for free.

## Where it shines

Pure logic with clear rules (parsers, pricing, validation), bug fixes (write the test that reproduces the bug first), and APIs with defined contracts.

## Where it's awkward

Exploratory UI work, spikes and prototypes, unclear requirements. Many developers write tests right after a small piece of code instead, which keeps most of the benefit.

> A good interview answer: "I use TDD for logic-heavy code and for every bug fix: reproduce it with a failing test, then fix it. For UI I usually build first and add integration tests once the behaviour settles."

=== lesson: snapshot-testing | Snapshot testing
A snapshot test serialises output (rendered markup, a JSON object) to a file the first time, then fails if later output differs.

```ts
expect(render(<Badge status="paid" />).container).toMatchSnapshot();
expect(formatInvoice(order)).toMatchInlineSnapshot(`"INV-0042 · ₹1,250.00"`);
```

## Problems with large component snapshots

- They break on any markup change, even harmless ones.
- Reviewers rubber-stamp `-u` (update all) because the diffs are huge.
- They don't say what's **important** about the output.

## Where they're useful

- Small, focused **inline** snapshots of data transformations or error messages.
- Serialised API responses or generated code (to notice unexpected changes).
- Visual regression testing (screenshot comparison with Playwright, Chromatic) is the better version for UI appearance.

Prefer explicit assertions about what matters ("shows the paid badge in green").

=== lesson: contract-testing | Contract testing
Between services (or frontend and backend), integration bugs come from one side changing what the other relies on. Full E2E environments to catch this are slow and fragile. **Contract tests** check each side against a shared contract independently.

## Consumer-driven contracts (Pact)

1. The **consumer** (frontend or calling service) writes tests describing the requests it makes and the response fields it needs. These produce a **pact file**.
2. The pact is published to a broker.
3. The **provider** runs the pact against its real API in its own CI. If it removed a field the consumer uses, its build fails.
4. "Can I deploy?" checks which versions are compatible before deploying.

## Schema-based alternative

Validate responses against an **OpenAPI** or GraphQL schema in tests, and check schema changes for breaking differences in CI (oasdiff, GraphQL Inspector). Simpler, but tells you the schema is honoured, not which fields consumers actually depend on.

Most useful in microservice setups with independently deployed services and separate teams.

=== lesson: load-testing-basics | Load testing basics
Load testing measures how a system behaves under traffic, before real users find out.

## Types

- **Load**: expected peak traffic. Does it meet latency targets?
- **Stress**: beyond peak until it breaks. How does it fail, and does it recover?
- **Spike**: sudden jumps (a sale starts, a push notification goes out).
- **Soak**: steady load for hours to reveal memory leaks and connection exhaustion.

## Tools

**k6** (JavaScript scripts), Artillery, Locust (Python), Gatling, JMeter.

```js
import http from "k6/http";
import { check, sleep } from "k6";
export const options = { stages: [{ duration: "2m", target: 200 }, { duration: "5m", target: 200 }, { duration: "1m", target: 0 }],
                         thresholds: { http_req_duration: ["p(95)<400"], http_req_failed: ["rate<0.01"] } };
export default function () {
  const res = http.get("https://staging.acme.com/api/products");
  check(res, { "status 200": r => r.status === 200 });
  sleep(1);
}
```

## Reading the results

Look at **percentiles** (p95, p99), not averages: an average of 100 ms can hide 5% of users waiting 3 s. Watch throughput, error rate, and resource saturation (CPU, DB connections, memory) to find the bottleneck. Test against production-like data and infrastructure; a staging database with 100 rows tells you nothing.
