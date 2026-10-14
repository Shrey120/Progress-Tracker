---
course: prep
module: auth-and-web-security
title: Auth and web security
order: 107
---
=== lesson: session-vs-token-auth | Session vs token auth
Two ways for a server to remember who you are after login.

## Sessions (stateful)

The server creates a session record (in Redis or the database) and sends the browser a random **session ID** in a cookie. Every request sends the cookie; the server looks the session up.

- Revocation is instant: delete the session.
- The cookie holds nothing readable.
- Needs a shared session store when you have many servers.

## Tokens (stateless)

The server issues a **signed token** (usually a JWT) containing the user's ID and claims. The server verifies the signature on each request without a lookup.

- No session store; works across services and domains.
- **Hard to revoke** before expiry: a stolen token works until it expires. So access tokens are short-lived (minutes) and paired with refresh tokens, or checked against a denylist (which brings state back).
- Tokens grow with claims and go stale (role changes don't apply until refresh).

## Where to store them in a browser

| Storage | XSS can steal it? | CSRF risk? |
|---|---|---|
| `HttpOnly` cookie | no (JS can't read it) | yes → mitigate with SameSite + CSRF tokens |
| `localStorage` | **yes** | no |
| memory (JS variable) | only during the attack; lost on reload | no |

For browser apps, the common recommendation is an `HttpOnly; Secure; SameSite` cookie, whether it holds a session ID or a token.

> **"Sessions or JWTs?"** For a typical web app with one backend, server sessions in HttpOnly cookies: simple, instantly revocable. JWTs suit stateless verification across services or for third-party API access, with short expiry and refresh tokens.

=== lesson: password-hashing-bcrypt-argon2 | Password hashing: bcrypt and argon2
Never store passwords. Store a **hash** that's deliberately slow to compute, so a stolen database can't be cracked quickly.

## Why not SHA-256?

General-purpose hashes are designed to be **fast**: GPUs compute billions per second, so common passwords fall immediately. Password hashes are **slow and salted**.

- **Salt**: a random value per user, stored next to the hash. Identical passwords get different hashes, and precomputed rainbow tables are useless.
- **Work factor**: tunable cost, so you can make hashing slower as hardware gets faster.

## The algorithms

| Algorithm | Notes |
|---|---|
| **Argon2id** | current OWASP recommendation; memory-hard (resists GPU/ASIC attacks) |
| **bcrypt** | battle-tested, widely available; cost ≥ 10–12; only uses the first 72 bytes of input |
| **scrypt** | memory-hard, fine choice |
| PBKDF2 | acceptable where FIPS compliance is required, needs very high iterations |

```js
import argon2 from "argon2";
const hash = await argon2.hash(password);              // salt and params embedded in the string
const ok = await argon2.verify(hash, attempt);
```

Libraries embed the salt and parameters in the hash string, and verify in constant time.

## Around the hash

Rate-limit and lock out login attempts, check new passwords against breached-password lists (Have I Been Pwned's k-anonymity API), support MFA and passkeys, and rehash with stronger parameters when a user logs in.

=== lesson: secure-cookie-flags-httponly-samesite-secure | Secure cookie flags
```
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400
```

| Flag | Does |
|---|---|
| `HttpOnly` | JavaScript can't read it (`document.cookie`), so XSS can't steal it |
| `Secure` | only sent over HTTPS |
| `SameSite=Strict` | never sent on requests started from another site |
| `SameSite=Lax` | sent on top-level navigation GETs from other sites, not on cross-site POSTs, iframes or fetches. The browser default |
| `SameSite=None` | sent everywhere; requires `Secure`. Needed for genuine cross-site use (embedded widgets) |
| `Domain` | which hosts receive it; omit it to restrict to the exact host |
| `Path` | which paths receive it |
| `Max-Age` / `Expires` | lifetime; without them it's a session cookie |

## Prefixes

- `__Host-session=...` must be `Secure`, have `Path=/` and **no** `Domain`, so a subdomain can't overwrite it. The strongest choice for session cookies.
- `__Secure-` requires `Secure`.

## Why SameSite matters

It's the main browser-level defence against CSRF: a malicious site's form POST to your API doesn't carry the user's `Lax` or `Strict` cookie. "Same site" means same registrable domain (`app.acme.com` and `api.acme.com` are same-site), so sibling subdomains you don't control can still be a risk.

=== lesson: jwt-structure-signing-expiry-refresh-flows | JWT: structure, signing, expiry and refresh flows
A JWT is three base64url parts joined by dots: `header.payload.signature`.

```
header   {"alg": "RS256", "typ": "JWT", "kid": "key-2026-10"}
payload  {"sub": "user_42", "role": "admin", "iat": 1760500000, "exp": 1760500900, "iss": "auth.acme.com", "aud": "api.acme.com"}
signature  RS256(base64url(header) + "." + base64url(payload), private key)
```

The payload is **encoded, not encrypted**: anyone can read it. Never put secrets in it. The signature only proves it wasn't changed.

```jsrun
const payload = { sub: "user_42", role: "admin", exp: 1760500900 };
const b64url = s => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const part = b64url(JSON.stringify(payload));
console.log(part);
console.log(JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))));   // anyone can decode it
```

## Signing

- **HS256**: one shared secret signs and verifies. Every verifier can also forge tokens.
- **RS256 / ES256**: a private key signs, a public key verifies. Services verify without being able to issue. Public keys are published at a JWKS endpoint; `kid` picks the key, which allows rotation.

## Verify properly

Check the signature with an **allowlisted** algorithm (reject `alg: none` and algorithm-switching tricks), then `exp`, `nbf`, `iss` and `aud`. Use a maintained library, never hand-rolled parsing.

## Access + refresh tokens

- **Access token**: short-lived (5–15 min), sent with each API call.
- **Refresh token**: long-lived, stored securely (HttpOnly cookie), used only to get new access tokens.
- **Rotation**: each refresh returns a new refresh token and invalidates the old one. If an old one is reused, assume theft and revoke the whole family.
- Logout or a password change revokes refresh tokens server-side; access tokens die on their own soon after.

=== lesson: oauth-2-0-oidc | OAuth 2.0 and OIDC
- **OAuth 2.0** is **authorization**: letting an app access a user's resources at another service (read my Google Calendar) without getting the password. It issues **access tokens**.
- **OpenID Connect (OIDC)** is an identity layer on top: **authentication** ("Sign in with Google"). It adds an **ID token** (a JWT about the user) and a `userinfo` endpoint.

## Authorization Code flow with PKCE

The flow for web, mobile and SPAs today:

1. The app creates a random `code_verifier` and its hash, `code_challenge`.
2. It redirects the user to the provider's `/authorize` with `client_id`, `redirect_uri`, `scope`, `state` (CSRF protection) and `code_challenge`.
3. The user logs in and consents. The provider redirects back with a one-time `code` (and the same `state`).
4. The app exchanges `code` + `code_verifier` at `/token` (server-side, with the client secret if it has one).
5. It receives an access token (and an ID token for OIDC, and a refresh token if requested).

PKCE ensures a stolen `code` is useless without the verifier. The **implicit flow** (tokens in the URL) is deprecated.

## Other grants

- **Client credentials**: service-to-service, no user.
- **Device code**: TVs and CLIs (log in on your phone).
- Resource owner password: deprecated.

## Terms to use correctly

Scopes (`calendar.read`), consent, redirect URI allowlisting (exact match), `state` and `nonce`, access vs ID token (an ID token is for the client to learn who logged in, never for calling APIs).

> **"OAuth vs OIDC?"** OAuth delegates access to resources with access tokens; OIDC builds login on top of it by adding an ID token that tells the app who the user is.

=== lesson: sso | SSO
**Single sign-on**: log in once with a central identity provider (IdP: Okta, Microsoft Entra ID, Google Workspace, Auth0) and access many apps without logging in again.

## Protocols

- **SAML 2.0**: XML-based, older, everywhere in enterprises. The IdP posts a signed assertion to the app's ACS URL.
- **OIDC**: JSON/JWT-based, modern, used by newer apps and mobile.

## Flows

- **SP-initiated**: the user opens your app, gets redirected to the IdP, comes back authenticated.
- **IdP-initiated**: the user clicks your app's tile in their Okta dashboard (more exposed to attacks; validate carefully).

## What B2B SaaS needs to support

- SSO per customer organisation, with domain-based discovery (`@acme.com` → Acme's IdP).
- **SCIM** provisioning: the customer's IdP creates, updates and deactivates users automatically, so leavers lose access.
- Just-in-time user creation, mapping IdP groups to roles, and enforcing SSO (disabling password login for that org).

Many teams use a service (WorkOS, Auth0, Clerk, Keycloak) instead of implementing SAML themselves.

=== lesson: authorization-models-rbac-row-level | Authorization models: RBAC and row-level
**Authentication** answers who you are; **authorization** answers what you may do. Most real security bugs are authorization bugs: missing checks that let user A read user B's data (IDOR, insecure direct object reference).

## The models

- **RBAC (role-based)**: users get roles, roles get permissions (`admin`, `editor`, `viewer`). Simple and auditable; becomes "role explosion" when you need exceptions.
- **ABAC (attribute-based)**: rules over attributes of the user, resource and context ("managers can approve expenses under ₹50,000 in their own department").
- **ReBAC (relationship-based)**: permissions follow relationships ("can edit if you're a member of the doc's folder's team"). Google Zanzibar; OpenFGA, SpiceDB, Permit.
- **Row-level**: every query is scoped to what the user owns or their tenant (`WHERE tenant_id = ?`), ideally enforced by the database (Postgres RLS).

## Implementation advice

- Check on the **server**, on **every** request and resource access; hiding a button isn't security.
- Centralise it: one `can(user, action, resource)` function or policy engine (CASL, Oso, OPA, Cedar), not ad-hoc `if`s.
- Scope queries by ownership: `findFirst({ where: { id, userId: user.id } })`, not `findFirst({ where: { id } })` then forget to check.
- Deny by default; test with each role, including "another tenant".

> **"How do you prevent users accessing others' data?"** Every data access goes through a check that includes the current user or tenant, enforced server-side, ideally centrally (a policy function or database row-level security), plus tests that attempt cross-tenant access.

=== lesson: cors-preflight | CORS and preflight
Browsers enforce the **same-origin policy**: JavaScript on `https://app.com` can't read responses from `https://api.other.com`. An origin is scheme + host + port. **CORS** is how a server opts in to letting other origins read its responses.

## Simple requests

GET/HEAD/POST with only simple headers and content types (form data, plain text). The browser sends it with an `Origin` header; if the response lacks a matching `Access-Control-Allow-Origin`, the browser blocks **JavaScript from reading** the response (the request still reached the server).

## Preflight

Anything else (PUT, DELETE, `Content-Type: application/json`, an `Authorization` header) triggers an `OPTIONS` request first:

```
OPTIONS /orders
Origin: https://app.com
Access-Control-Request-Method: PATCH
Access-Control-Request-Headers: content-type, authorization

204
Access-Control-Allow-Origin: https://app.com
Access-Control-Allow-Methods: GET, POST, PATCH
Access-Control-Allow-Headers: content-type, authorization
Access-Control-Max-Age: 600              ← cache the preflight
```

## Credentials

With cookies (`fetch(..., { credentials: "include" })`) the server must send `Access-Control-Allow-Credentials: true` and a **specific** origin, never `*`.

## Common mistakes

- Reflecting any `Origin` back with credentials allowed: any site can read your users' data.
- Thinking CORS protects the server: it's enforced only by browsers. curl, Postman and other servers ignore it. Authentication is still required.
- Fixing a CORS error in the frontend: it can only be fixed by the server's headers (or by proxying through your own origin).

=== lesson: xss-stored-reflected-dom | XSS: stored, reflected and DOM
**Cross-site scripting**: an attacker gets their JavaScript to run in your page, in your users' browsers, with their session. It can read data, act as the user, steal tokens in localStorage, or show a fake login.

## The three kinds

- **Stored**: malicious input saved (a comment, a profile name) and shown to other users.
- **Reflected**: input from the URL echoed in the response (`/search?q=<script>…`), delivered via a crafted link.
- **DOM-based**: client-side code writes untrusted data into the DOM (`innerHTML = location.hash`), never touching the server.

## Defences

1. **Output encoding by default**: React, Vue and Angular escape text in templates. `<div>{comment}</div>` is safe.
2. **Avoid the escape hatches**: `dangerouslySetInnerHTML`, `v-html`, `innerHTML`, `document.write`, `eval`. If you must render user HTML (rich text), sanitise with **DOMPurify**.
3. **URLs**: `href={userUrl}` can be `javascript:alert(1)`. Allow only `http:`/`https:`.
4. **Content Security Policy** as a second layer: blocks inline scripts and unknown sources.
5. **HttpOnly cookies** so a successful XSS can't steal the session (it can still act as the user while on the page).

```jsrun
const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const input = '<img src=x onerror="steal(document.cookie)">';
console.log(escapeHtml(input));   // shown as text, never executed
```

Context matters: escaping for HTML text differs from attributes, URLs, JS strings and CSS. Frameworks handle the common contexts; template strings building HTML by hand don't.

=== lesson: csrf-tokens | CSRF and CSRF tokens
**Cross-site request forgery**: a malicious site makes the user's browser send a request to your site, and the browser attaches your site's cookies automatically. If your server trusts cookies alone, the request runs as the user.

```html
<!-- on evil.com -->
<form action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker"><input type="hidden" name="amount" value="50000">
</form>
<script>document.forms[0].submit()</script>
```

The attacker can't **read** the response (same-origin policy), but the state change already happened.

## Defences

1. **SameSite cookies** (`Lax` or `Strict`): cross-site POSTs don't carry the cookie. Today's main defence.
2. **CSRF tokens**: a random per-session value embedded in forms or sent in a header, which the server checks. evil.com can't read it.
   - *Synchronizer token*: stored server-side in the session.
   - *Double-submit cookie*: token in a cookie and in a header; must match (sign it with the session to avoid cookie-injection bypasses).
3. **Check `Origin`** (and `Sec-Fetch-Site`) on state-changing requests.
4. Never change state on GET.

## When it doesn't apply

APIs that authenticate with an `Authorization: Bearer` header (not cookies) aren't vulnerable, since browsers don't attach that header automatically. But storing that token in localStorage makes it an XSS target, so it's a trade-off.

> **"How do you prevent CSRF?"** SameSite cookies, plus CSRF tokens or Origin checks for state-changing requests, and never mutating state on GET.

=== lesson: csp | Content Security Policy
CSP is a response header that tells the browser which sources of scripts, styles, images and connections are allowed. Even if an attacker injects HTML, the browser refuses to run scripts the policy doesn't allow.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-r4nd0m' 'strict-dynamic';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://cdn.acme.com;
  connect-src 'self' https://api.acme.com;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  report-to csp-endpoint
```

## Key directives

- `script-src` — the important one. Avoid `'unsafe-inline'` and `'unsafe-eval'`.
- **Nonces**: a random value per response; only `<script nonce="…">` tags with it run. `'strict-dynamic'` lets those trusted scripts load others.
- `frame-ancestors` — who may embed your page (clickjacking defence).
- `connect-src` — where `fetch`/WebSockets may go (limits exfiltration).

## Rolling it out

Start with `Content-Security-Policy-Report-Only` to collect violations without breaking anything, fix them, then enforce. Next.js supports nonces via middleware/proxy. Third-party scripts (analytics, chat widgets) are the usual pain point.

> **"Is CSP enough to stop XSS?"** It's defence in depth: correct output encoding is the primary defence, and a strict nonce-based CSP limits damage when something slips through.

=== lesson: clickjacking | Clickjacking
The attacker loads your site in an invisible `<iframe>` on their page and positions it so the user's click on a visible "Play" button actually lands on your "Delete account" or "Confirm transfer" button.

## Defence

Tell browsers not to let other sites frame you:

```
Content-Security-Policy: frame-ancestors 'none';        (or 'self', or a list of partners)
X-Frame-Options: DENY                                    (older header, still worth sending)
```

If you must be embeddable (a widget), allow specific origins in `frame-ancestors`, and require explicit confirmation for sensitive actions inside the frame. `SameSite` cookies also help, since a cross-site frame doesn't get `Lax`/`Strict` cookies.

=== lesson: sql-injection | SQL injection
Building SQL by concatenating user input lets the input change the query's structure.

```js
// vulnerable
db.query(`SELECT * FROM users WHERE email = '${email}' AND password_hash = '${hash}'`);
// email = "' OR 1=1 --"  →  WHERE email = '' OR 1=1 --' ...   logs in as the first user
```

## The fix: parameterised queries

```js
db.query("SELECT * FROM users WHERE email = $1", [email]);   // the value is sent separately, never parsed as SQL
```

ORMs and query builders (Prisma, Drizzle, Knex) parameterise for you, **until** you use raw queries with string interpolation (`$queryRawUnsafe`, template strings in `.raw()`).

```sqlrun
-- what the attacker's input does to a concatenated query
SELECT name FROM users WHERE name = '' OR 1=1 --';
```

## Things parameters can't cover

Identifiers like column names in `ORDER BY` or table names can't be parameters. **Allowlist** them:

```js
const SORTABLE = { price: "price", newest: "created_at" };
const col = SORTABLE[req.query.sort] ?? "created_at";
```

## Defence in depth

Least-privilege database users (the app account can't drop tables), no detailed SQL errors shown to users, input validation, and a WAF as an extra layer. The same idea applies to NoSQL injection (`{"$ne": null}` in MongoDB filters) and command injection.

=== lesson: rate-limiting | Rate limiting
Limit how many requests a client can make in a time window, to protect against abuse (brute-force logins, scraping, spam), noisy neighbours and accidental overload.

## What to key on

User ID or API key when authenticated; IP when not (careful: many users share an IP behind NAT or mobile carriers); for logins, also per **account** to stop distributed password guessing.

## Algorithms (in brief)

- **Fixed window**: count per minute; allows bursts at window edges.
- **Sliding window**: smooths the edges.
- **Token bucket**: refills at a steady rate, allows bursts up to the bucket size. The most common.
- **Leaky bucket**: processes at a constant rate.

(See System design → Rate limiting algorithms for the details and code.)

## Implementation

In a multi-server app the counter must be shared: **Redis** with atomic operations (`INCR` + `EXPIRE`, or a Lua script), or at the edge (Cloudflare, API gateway, Nginx `limit_req`).

## Response

```
429 Too Many Requests
Retry-After: 30
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 30
```

Clients should back off with jitter. Different limits per endpoint (login much stricter than reads) and per plan tier.

=== lesson: secrets-management | Secrets management
API keys, database passwords, signing keys and tokens must not live in code.

## Rules

- **Never commit secrets.** `.env` files in `.gitignore`; scan with gitleaks or GitHub secret scanning and push protection.
- If one is committed, **rotate it immediately**: removing it from history isn't enough, since it may already be cloned.
- Keep them in environment variables at minimum, a **secrets manager** ideally: AWS Secrets Manager or SSM, GCP Secret Manager, HashiCorp Vault, Doppler, or the platform's encrypted env vars (Vercel, Supabase).
- **Least privilege and separate per environment**: dev keys can't touch production.
- **Rotate** regularly and when people leave; prefer short-lived credentials (OIDC from CI to the cloud instead of long-lived keys; IAM roles instead of access keys).
- Don't log them; redact `Authorization` headers and env dumps.

## Frontend secrets

Anything shipped to the browser is public. `NEXT_PUBLIC_*` and `VITE_*` variables end up in the bundle. Secret keys (Stripe secret key, OpenAI key, a Supabase service-role key) must only be used server-side; the browser gets publishable or anon keys protected by row-level security.

=== lesson: dependency-supply-chain-risk | Dependency and supply-chain risk
A typical JavaScript app pulls in hundreds or thousands of transitive npm packages. Any of them can be vulnerable or malicious.

## Real threats

- **Known vulnerabilities** in dependencies (CVEs).
- **Malicious packages**: typosquats (`reqeusts`), compromised maintainer accounts publishing poisoned versions (event-stream in 2018; in September 2025 a phishing attack compromised popular packages like `chalk` and `debug`, and the self-spreading "Shai-Hulud" worm stole tokens from many more).
- **Install scripts** (`postinstall`) running arbitrary code on developer machines and CI.

## Defences

- **Lockfiles** committed, and `npm ci` in CI so builds use exactly what was reviewed.
- Automated scanning: `npm audit`, Dependabot or Renovate, Snyk, Socket (which flags suspicious behaviour, not just CVEs).
- Update deliberately: review changes, and consider a cooldown (don't take versions published in the last few days).
- Fewer, well-maintained dependencies; don't add a package for a one-liner.
- Disable install scripts where possible (`npm config set ignore-scripts true`, pnpm's allowlist).
- CI with least privilege: scoped tokens, OIDC for publishing, provenance attestations, pinned GitHub Actions by commit SHA.
- An SBOM (software bill of materials) to know what you ship.

=== lesson: owasp-top-10 | OWASP Top 10
The OWASP Top 10 is the standard list of the most critical web application risk categories. The 2021 list (the 2025 update keeps most of these, with supply chain risks moving up):

| # | Category | Example |
|---|---|---|
| A01 | **Broken access control** | user changes `/orders/123` to `/orders/124` and sees someone else's order |
| A02 | **Cryptographic failures** | plain HTTP, weak hashing, sensitive data unencrypted |
| A03 | **Injection** | SQL, NoSQL, command injection, XSS |
| A04 | **Insecure design** | no rate limit on OTP verification; flawed business logic |
| A05 | **Security misconfiguration** | default passwords, verbose errors, open S3 buckets, permissive CORS |
| A06 | **Vulnerable and outdated components** | unpatched dependencies |
| A07 | **Identification and authentication failures** | credential stuffing, weak session handling, no MFA |
| A08 | **Software and data integrity failures** | unsigned updates, CI/CD pipeline compromise, insecure deserialisation |
| A09 | **Security logging and monitoring failures** | breaches nobody notices |
| A10 | **Server-side request forgery (SSRF)** | "fetch this URL" feature used to reach `http://169.254.169.254` cloud metadata |

## How to use it in an interview

Don't recite the list. Pick the ones relevant to what you've built and say how you handled them: "In my last project, access control was the biggest risk, so every query is scoped by tenant through a single repository layer, and we had integration tests that try to read another tenant's records."
