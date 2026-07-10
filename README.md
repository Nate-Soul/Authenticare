# ARC Node.js Boilerplate

A production-grade, typed Node.js + Express API template, built to the ARC backend standard.
Clone it, delete what you don't need, and build your product's modules on top of the auth/users
foundation that's already here.

Built for TypeScript. **A note on TypeScript 7**: TS7 (the native Go-ported compiler) hit GA on
July 8, 2026 with identical type-checking semantics to TS 6.0, just far faster. This template
currently pins `typescript@6.0.3` rather than 7, because as of this writing `@typescript-eslint`'s
entire 8.x line fails to load against TS7 (it reaches into TS compiler-internal APIs that changed
shape in the Go port) — not just a peer-range warning, an actual crash on `npm run lint`. Since
type-checking semantics are unchanged, nothing about the app's correctness depends on which one
you use. Once `@typescript-eslint` ships a compatible release (worth checking — it shipped a day
after this template was written), bump `typescript` to `^7.0.0` in `package.json`; nothing else
changes.

## Why this exists

This started as a review of a small auth API (Authenticare `https://github.com/Nate-Soul/Authenticare`) that had good bones but real bugs:
a password re-hashing bug that silently broke logins on profile updates, and a public endpoint
that returned every user's password hash. This template fixes those classes of bug at the
architecture level — not just patches them — so a new project built on it starts from a correct
foundation instead of inheriting the same mistakes.

## What's included

- **Swappable data layer** — a `UserRepository` interface with both a MongoDB (Mongoose) and a
  PostgreSQL (Prisma) implementation behind it. Services depend only on the interface, so they're
  testable with an in-memory fake and the database is a configuration choice, not an architecture
  choice.
- **Real auth** — short-lived access tokens (15m) + rotating refresh tokens (30d) in an httpOnly
  cookie. Reusing a stale refresh token is rejected; logout revokes every outstanding refresh
  token via a `tokenVersion` counter.
- **Real RBAC** — `requireRole()` and `requireSelfOrAdmin()` middleware, backed by an actual
  `role` field on the user, unlike a same-named check that only verified ownership.
- **Validation everywhere** — every route body/params/query is parsed through Zod before it
  reaches a controller.
- **Rate limiting** — a general API limiter plus a tighter one on `/auth/*` to blunt brute force.
- **Consistent responses** — every success is `{ success: true, data, meta? }`, every error is
  `{ success: false, error: { code, message, details? } }`.
- **Soft delete** everywhere in the data layer instead of destructive deletes.
- **Fail-fast config** — `src/config/env.ts` validates `process.env` with Zod at boot; the app
  refuses to start with a missing or malformed secret instead of failing weirdly at request time.
- **Tests** — Vitest unit tests against a fake repository (no DB required) plus a Supertest
  integration smoke test, including regression tests for both original bugs.
- **Email verification & password reset** — DB-stored, single-use, SHA-256-hashed tokens with
  expiry; the mailer and queue are both pluggable so the flow works with zero infra by default.
- **Pluggable mailer** — `MAIL_DRIVER=console` (default, logs the email — no SMTP needed) or
  `MAIL_DRIVER=smtp` (nodemailer, loaded via dynamic import only when selected).
- **Pluggable queue** — `QUEUE_DRIVER=inline` (default, in-process, no Redis needed) or
  `QUEUE_DRIVER=bullmq` (Redis-backed, loaded via dynamic import only when selected). Email
  sends run through the queue so they never block the request path.
- **OpenAPI docs generated from the Zod schemas** — no hand-maintained spec to drift from the
  validation. See "API docs" below.

## Getting started

```bash
cp .env.example .env          # then fill in real secrets
npm install --legacy-peer-deps  # see "TypeScript 7" note above for why
docker compose up -d mongo    # or `postgres`, matching DB_DRIVER in .env
npm run prisma:generate       # only needed if you're using the postgres driver — requires network access to fetch the query engine binary
npm run dev
```

## API docs

Interactive Swagger UI is served at `GET /api/v1/docs`; the raw OpenAPI 3.0 document is at
`GET /api/v1/docs.json`. It's generated from the same Zod schemas that validate requests, so it
can't drift from the actual validation rules. Currently covers the `auth` module — see
`src/shared/openapi/registry.ts` for how to register additional modules.

## Auth endpoints

| Method | Path | Auth required | Purpose |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | Create an account; sends a verification email |
| POST | `/api/v1/auth/login` | — | Exchange credentials for access + refresh tokens |
| POST | `/api/v1/auth/refresh` | refresh cookie | Rotate the refresh token, issue a new access token |
| POST | `/api/v1/auth/logout` | access token | Revoke all outstanding refresh tokens (`tokenVersion` bump) |
| POST | `/api/v1/auth/verify-email` | — | Consume a verification token, mark the account verified |
| POST | `/api/v1/auth/resend-verification` | — | Re-issue a verification email (always 200 — no enumeration) |
| POST | `/api/v1/auth/forgot-password` | — | Issue a password-reset email (always 200 — no enumeration) |
| POST | `/api/v1/auth/reset-password` | — | Consume a reset token, set a new password, revoke all sessions |

Gate any route on a verified email with the `requireVerified()` middleware
(`src/shared/middleware/auth.ts`) — it runs after `requireAuth` and returns 403
`EMAIL_NOT_VERIFIED` otherwise.

## Mailer & queue drivers

Both default to zero-infra, in-process implementations so the template runs with nothing but
`npm install`. Swap in real infra by env var only — no code changes:

| Concern | Env var | Default | Alternative |
|---|---|---|---|
| Mailer | `MAIL_DRIVER` | `console` (logs the email body, no SMTP) | `smtp` (nodemailer; requires `SMTP_HOST`, `SMTP_PORT`, optionally `SMTP_USER`/`SMTP_PASS`/`SMTP_SECURE`) |
| Queue | `QUEUE_DRIVER` | `inline` (in-process, no Redis) | `bullmq` (Redis-backed; requires `REDIS_URL`) |

Both real-infra drivers (`smtp.mailer.ts`, `bullmq.queue.ts`) are loaded via dynamic `import()`
only when selected, so `nodemailer`/`bullmq` never touch the module graph — and therefore never
open a socket — unless you opt in. See `src/shared/email/` and `src/shared/queue/`.

## Using this as a template for a new project

1. **Pick a database and delete the other driver.**
   - Delete `src/shared/db/mongo/` or `src/shared/db/postgres/`.
   - In `src/shared/db/index.ts`, delete the branch you don't need and export the repository directly.
   - Remove `DB_DRIVER` from `src/config/env.ts` — it becomes a hardcoded fact, not a runtime switch.
   - Remove the unused dependency (`mongoose`, or `@prisma/client` + `prisma`) from `package.json`.
   - Delete the matching service from `docker-compose.yml`.

2. **Rename the domain.** `modules/auth` and `modules/users` are the reference implementation —
   keep them, since almost everything needs auth, but add your product's real modules alongside:
   ```
   src/modules/
   ├── auth/          (keep)
   ├── users/          (keep)
   ├── your-domain/    (new — controller/service/routes/schemas, same shape)
   └── index.ts
   ```
   Register new routes in `src/routes/v1/index.ts`.

3. **Extend the User entity if needed** (e.g. add `avatarUrl`, `phone`) in both
   `src/shared/types/user.ts` and whichever driver you kept — the interface is the contract,
   update it first and let the type errors show you every place that needs a change.

4. **Generate real secrets** before deploying:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

5. **Drop what you don't need.** If the product has no email flows, delete `src/shared/email/`,
   `src/shared/queue/`, the `verify-email`/`resend-verification`/`forgot-password`/`reset-password`
   routes, and the `nodemailer`/`bullmq` dependencies. If you keep email but never need a real
   queue, delete `src/shared/queue/bullmq.queue.ts` and the `bullmq` dependency — `inline.queue.ts`
   has no external dependency and needs nothing removed.

## Project structure

```
src/
├── modules/                # Business domains (auth, users, ...)
│   └── <domain>/
│       ├── <domain>.controller.ts   # HTTP layer only
│       ├── <domain>.service.ts      # business logic, depends on interfaces only
│       ├── <domain>.routes.ts
│       ├── <domain>.schemas.ts      # Zod
│       └── index.ts
├── routes/v1/               # Route aggregation + health check
├── shared/
│   ├── db/                  # Swappable data layer (mongo/, postgres/, index.ts)
│   ├── middleware/           # auth, rbac, rate limiting, validation, error handling
│   ├── types/                # Domain types + Express request augmentation
│   └── utils/                # AppError, response envelope, tokens, logger, asyncHandler
├── config/env.ts             # Zod-validated environment config
├── app.ts                    # Express app (no listen() — importable for tests)
└── server.ts                 # Entrypoint: connect DB, listen, graceful shutdown
tests/
├── unit/                     # Service tests against FakeUserRepository
└── integration/              # Supertest against the real app, no DB needed for these routes
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start with hot reload (tsx watch) |
| `npm run build` / `start` | Compile and run the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `lint:fix` | ESLint |
| `npm test` / `test:watch` / `test:coverage` | Vitest |
| `npm run prisma:generate` / `prisma:migrate` | Only relevant if you kept the Postgres driver |

## Deliberate deviations from the raw ARC template

- Added a repository-pattern data layer (`shared/db/{mongo,postgres}`) instead of a single
  `shared/db.ts`, specifically to support the dual-driver requirement — document this choice if
  you diverge further.
- No websocket layer included; add `shared/websocket/` per the ARC template when a project
  actually needs it. A queue layer (`shared/queue/`) is included since the email flows depend
  on it — see "Mailer & queue drivers" above.

## Known limitations

- **Single-session refresh.** `tokenVersion` is one counter per user, not per device/session.
  Logging out, or a password reset, revokes every refresh token for that user — there's no way
  to revoke one device's session while leaving others logged in. Add a per-session token table
  if you need that.
- **Soft-deleted emails hold the unique index.** Deleting a user sets `deletedAt` rather than
  removing the row, but the email uniqueness constraint is on the raw column in both drivers.
  A soft-deleted account's email can't be reused by a new signup. If you need that, either hard
  delete on account removal or move to a partial/filtered unique index (Postgres: `@@unique`
  with a `WHERE deleted_at IS NULL` condition; Mongo: a partial index with
  `{ deletedAt: null }`).
