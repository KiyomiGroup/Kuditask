# KudiTask

Nigeria-first micro-task marketplace — Tasker / Client / Admin, built from
the Stitch UI designs in `design-reference/`.

## Status (as of the last build session)

Full schema, business logic, and UI for all three roles are implemented:
tasker registration/auth, available tasks, 10-minute reservation, proof
upload, admin verification (approve/reject/flag-fraud), wallet, withdrawal
request/processing, client request submission, and the full admin console
(dashboard, taskers, tasks incl. create-task economics panel, verification,
withdrawals, clients, transactions, tier management, announcements, reports,
settings).

**This has never been run end-to-end.** The sandbox this was built in cannot
reach `binaries.prisma.sh` (`x-deny-reason: host_not_allowed` from its own
egress proxy — confirmed directly with curl, re-confirmed multiple times
across sessions, not a project or dependency problem), so `prisma generate`
has never succeeded here and the app has never actually booted. Everything
below is what's needed for the *first* real run to happen on a machine with
normal internet access.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **PostgreSQL via Prisma** — transactional guarantees for reservations,
  wallet ledger, and withdrawal reservation/release
- **Supabase** — Postgres hosting + private file storage for proof screenshots
- **Custom auth** — bcrypt + signed JWT session cookie, two roles (TASKER,
  ADMIN); admin accounts are only ever created via the seed script, never
  through public signup

## Setup (first real run)

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL (a Supabase connection string works), SESSION_SECRET
# (openssl rand -base64 32), and the Supabase storage keys if you want proof
# uploads to work end-to-end

npx prisma validate        # should succeed once network access is normal
npx prisma generate
npx prisma migrate dev --name init   # no migrations exist yet — this creates the first one
npm run db:seed
npm run dev                # http://localhost:3000
```

Then: `npx tsc --noEmit` should report **0 errors** once the client is
generated — every error seen in this sandbox (consistently 78, unchanged
across many sessions) traced to the missing generated types, not to a code
bug. If you see errors after a real `prisma generate`, those are new and
worth reporting back.

## Test accounts (seeded by `prisma/seed.ts`)

- **Tasker (QA account):** `tasker@test.local` / `TestPassword123!`
- **Admin:** set via `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` in `.env`
  (defaults to `admin@test.local` / `AdminPassword123!` in `.env.example`)
- Five additional fictional taskers covering every account status
  (active/suspended/under-review/tier-locked), two clients, three tasks in
  different states, a full submission set (pending/approved/rejected/fraud),
  one real wallet transaction, and one REQUESTED withdrawal — all clearly
  fictional Nigerian names, none of it real financial data.

## Database

`prisma/schema.prisma` models every entity across all phases: User,
TaskerProfile, SocialAccount, Client, ClientRequest, Task,
TaskAssignedTier/TaskAssignedTasker (task targeting), TaskReservation,
TaskSubmission, ProofReview, FraudViolation, Wallet, WalletTransaction,
Withdrawal, Tier, Announcement/AnnouncementRecipient, Notification,
AuditLog, plus `LoginDay` for the "10 active login days" withdrawal
condition.

All money is **integer kobo**, never floats.

**No `prisma/migrations/` folder exists yet** — `prisma migrate dev` has
never run successfully (same network block). The first real run needs to
create it with `--name init` as shown above; don't hand-write migration SQL.

## Business rules implemented as code (not just documented)

- `lib/tier.ts` — locked reward formula, verified against every spec example
  (Tier 100 = ₦510). Tier progression thresholds are deliberately left
  `null` — never invented.
- `lib/reservation.ts` — server-authoritative 10-minute slot holds
  (`RESERVATION_MINUTES`, the one source of truth) inside a `Serializable`
  transaction.
- `lib/withdrawal.ts` — eligibility requires balance + 500 verified tasks +
  10 active login days, all three recomputed server-side on every request.
  `reservedForWithdrawalKobo` holds requested amounts out of spendable
  balance from REQUESTED through PAID/FAILED — see the comment on `Wallet`
  in the schema for the full mechanics.
- `lib/wallet.ts` — `creditTaskReward` and the `WalletTransaction` unique
  constraints (`referenceSubmissionId`, `referenceWithdrawalId`) are what
  actually make double-crediting/double-paying impossible, not just an
  application-level check.
- `lib/economics.ts` — blocks publishing any task where
  `clientPrice < taskerReward × requiredCompletions`, enforced in
  `lib/task-admin.ts` on both create and edit.
- `lib/tasks.ts` — task claimability (status + tier + assignment scope:
  ALL_ELIGIBLE/SPECIFIC_TIERS/SPECIFIC_TASKERS/SPECIFIC_PLATFORM) is decided
  in exactly one place, used by both the available-tasks list and the
  start-task endpoint so they can never disagree.
- `lib/rbac.ts` + `middleware.ts` — every admin route calls `requireAdmin`,
  every tasker route calls `requireTasker`/`requireOwnerOrAdmin` (audited —
  zero gaps found); middleware is a coarse redirect only.

## Design system

`tailwind.config.ts` is transcribed directly from
`design-reference/kuditask_engine/DESIGN.md`. `design-reference/stitch-screens/`
holds all 66 original Stitch screens as the porting reference — the built
pages follow their structure and the same design tokens, not a literal
markup port screen-by-screen.

## Explicitly pending / known gaps

- **Never run end-to-end** — see Status above. This is the main gap.
- Paystack API integration — withdrawals are admin-recorded manually
  (a payment reference field), no real Paystack calls are made
- Supabase Storage needs real credentials to test proof upload/screenshot
  preview — the code path exists but is unverified against a live bucket
- Mobile layouts for tasker/admin pages exist via the shared layout
  components but have never been visually checked in a browser
- Task creation's tier/tasker-specific assignment targeting (beyond
  ALL_ELIGIBLE and SPECIFIC_PLATFORM) isn't wired into the Create Task form
  yet — the backend supports it, the form doesn't expose tier/tasker pickers
- "Today's Platform Revenue" on the admin dashboard is a documented
  implementation assumption (see `lib/reports.ts`), not a finalized
  accounting definition — flagged in the UI itself with an asterisk

## Automated tests

```bash
npx tsx scripts/test-foundation.ts           # pure business-logic assertions
npx tsx scripts/test-concurrency-simulation.ts  # algorithm-level race/duplicate-guard simulation
```

Both pass (29 + 21 assertions). Neither touches a database — see the
comments at the top of `test-concurrency-simulation.ts` for exactly what
that does and doesn't prove. Real integration tests against Postgres have
never been run, for the same reason as everything else here.
