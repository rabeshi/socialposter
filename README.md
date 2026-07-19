# Social Poster

A content management and approval application for LinkedIn and X: it generates post candidates on a two-day cycle, requires human review and a separate publish confirmation, and only then publishes to LinkedIn and/or X. The included seed data is configured for the Liceo brand and can be customized in Brand Settings.

**Nothing is ever published automatically.** The two-day cron only generates candidates and sends an approval email — every publish action is a distinct, authenticated, human-initiated step.

## Feature availability by mode

| Area | Local simulation (`SIMULATION_MODE=true`, default) | Requires paid API | Requires LinkedIn dev access | Requires X API access |
|---|---|---|---|---|
| Content generation (text) | Mocked, deterministic per category | OpenAI (Phase 2 live path) | — | — |
| Image generation | Bundled local SVG samples | OpenAI Images (Phase 2 live path) | — | — |
| Emails (approval/reminder/result) | Logged to console, not sent | Resend | — | — |
| LinkedIn publishing | Simulated success | — | Yes — Community Management API + org admin | — |
| X publishing | Simulated success | — | — | Yes — OAuth 2.0 write scope |
| Duplicate detection | Lexical (Jaccard) fallback | OpenAI Embeddings for semantic scoring | — | — |
| Everything else (dashboard, review workflow, calendar, history, settings, audit log) | Fully functional | — | — | — |

With `SIMULATION_MODE=true` the entire workflow — generate → review → select → edit → approve → publish — runs end to end against a real Postgres database with no external credentials at all.

## 1. Install dependencies

```bash
npm install
```

## 2. Create the Neon database

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the pooled connection string into `DATABASE_URL` and the direct (unpooled) connection string into `DIRECT_URL`.

## 3. Configure Prisma

```bash
cp .env.example .env.local
# fill in DATABASE_URL and DIRECT_URL
npm run prisma:generate
```

## 4. Create Vercel Blob storage

In your Vercel project: Storage → Create → Blob. Copy the read/write token into `BLOB_READ_WRITE_TOKEN`. Not required in simulation mode.

## 5. Configure Resend

Create an account at [resend.com](https://resend.com), verify a sending domain, and set `RESEND_API_KEY` and `EMAIL_FROM`. Set `APPROVAL_EMAILS` to a comma-separated list of reviewer addresses. Not required in simulation mode (emails are logged instead of sent).

## 6. Configure authentication

Generate a strong secret for `AUTH_SECRET` (`openssl rand -base64 32`). Accounts are `User` rows with a bcrypt `passwordHash`, authenticated via Auth.js Credentials + JWT sessions — no third-party IdP is required. Set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 12 characters before seeding the single administrator. `ADMIN_NAME` is optional.

## 7. Add Vercel environment variables

In the Vercel project settings, add every variable from `.env.example`. At minimum for a working deployment: `NEXT_PUBLIC_APP_URL`, `AUTH_SECRET`, `CRON_SECRET`, `DATABASE_URL`, `DIRECT_URL`.

## 8. Run database migrations

```bash
npx prisma migrate dev --name init   # local
npm run prisma:deploy                # CI/production
```

## 9. Run locally

```bash
npm run prisma:seed   # creates/updates the configured administrator and simulation data
npm run dev
```

Visit `http://localhost:3000`, sign in with the seeded reviewer, and open `/review`.

## 10. Deploy to Vercel

```bash
vercel link
vercel env pull .env.local   # or push env vars via the dashboard
vercel deploy --prod
```

## 11. Configure Vercel Cron Jobs

`vercel.json` already declares three crons:

```json
{
  "crons": [
    { "path": "/api/cron/generate-content", "schedule": "0 16 * * *" },
    { "path": "/api/cron/send-reminders", "schedule": "0 18 * * *" },
    { "path": "/api/cron/publish-scheduled", "schedule": "0 19 * * *" }
  ]
}
```

Vercel automatically sends `Authorization: Bearer $CRON_SECRET` to these routes; make sure `CRON_SECRET` is set in the project's environment variables. The Hobby-plan generation cron runs daily at 16:00 UTC (9:00 AM Pacific during daylight-saving time), but only actually generates a batch once `AutomationSettings.nextGenerationAt` has arrived. The two-day cadence remains controlled from the Automation page.

## 12. Connecting LinkedIn (Phase 4)

Requires a LinkedIn Developer App with Community Management API access approved for the Liceo organization page (`https://www.linkedin.com/company/115563973/admin/dashboard/`). Set `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`, `LINKEDIN_ORGANIZATION_ID`, then use **Connect** on `/integrations`. Until connected, LinkedIn publish attempts resolve to `READY_FOR_MANUAL_PUBLISHING` with copy/image/link actions available on the post detail page.

## 13. Connecting X (Phase 4)

Requires an X Developer App with OAuth 2.0 (PKCE) write scope. Set `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_REDIRECT_URI`, then use **Connect** on `/integrations`. Same manual fallback as LinkedIn until connected.

## 14. Uploading the Liceo logo

`/brand` → Official logo → upload a PNG/JPEG/WebP/SVG (max 10MB). In simulation mode this is accepted and validated without requiring Blob storage. The logo is only placed onto generated images once uploaded and enabled.

## 15. Testing simulation mode

```bash
npm run test          # vitest unit tests
npm run test:e2e       # Playwright, requires `npm run prisma:seed` first
```

`SIMULATION_MODE=true` is the default — the full generate → review → approve → publish loop works with zero external credentials.

## 16. Enabling live generation

Set `OPENAI_API_KEY` and `SIMULATION_MODE=false`. Candidate text now comes from `OPENAI_TEXT_MODEL` via a strict JSON-schema prompt (validated with Zod — malformed output is rejected, not silently accepted); images come from `OPENAI_IMAGE_MODEL`.

## 17. Enabling live publishing

Set `SIMULATION_MODE=false` and complete the LinkedIn/X OAuth connections (steps 12–13). Publish results are only ever recorded as `PUBLISHED` when the platform API confirms it — otherwise the candidate is marked `READY_FOR_MANUAL_PUBLISHING` or `PUBLICATION_FAILED`/`PARTIALLY_PUBLISHED`, never silently assumed successful.

## 18. Pausing automation

`/automation` → **Pause Automation** stops future scheduled generation. **Pause All Publishing** (emergency control) stops the `publish-scheduled` cron from publishing anything, independent of generation. Both take effect immediately, no redeploy needed.

## 19. Reviewing logs and failed jobs

- Dashboard → "Failed Publications" surfaces `PUBLICATION_FAILED` rows.
- `AuditLog` records every state-changing action (who, what, when, IP where applicable) — query it directly via Prisma Studio (`npx prisma studio`) for a full trail.
- Vercel → Project → Logs / Cron tab shows cron invocation history and function errors.

## Architecture summary

- **Next.js App Router + TypeScript + Tailwind + shadcn-style components** for the whole UI.
- **Neon Postgres + Prisma** for all persistence (`prisma/schema.prisma`).
- **Vercel Functions** for every `/api/*` route — request/response only, nothing long-running.
- **Vercel Cron** triggers the daily due-date check, reminder sweep, and scheduled-publish sweep.
- **Vercel Blob** stores generated images and the uploaded brand logo (Phase 2+; simulation mode uses bundled local SVGs instead).
- **Auth.js (Credentials + JWT)** protects every dashboard route and mutating API route via `middleware.ts`.
- **Resend + React Email** for approval, reminder, and publication-result emails, with signed/expiring one-click review links (`lib/security.ts`).
- **OpenAI** (optional, Phase 2) for text/image generation and embeddings-based duplicate detection; a lexical fallback keeps duplicate detection functional without it.

See `lib/scheduling/generation.ts` for the two-day due-date logic and `lib/scheduling/publishing.ts` for the enforced status-transition graph that makes `PENDING_REVIEW → PUBLISHED` structurally unreachable.

## Known Phase 1 simplifications

- The manual generator UI (`/generate`) collects tone/length/image-style/CTA preferences, but only the 3 chosen categories are wired into the generator until Phase 2's configurable prompt pipeline lands.
- Per-platform image crops (1200×627, 1200×1200, 1600×900, thumbnail) all point at the same generated image until the real resize pipeline (sharp or the optional Python FastAPI service) is wired in Phase 2.
- `AutomationSettings.remindersSentForCurrentBatch` is a singleton counter, which is correct as long as only one batch is in `PENDING_REVIEW` at a time — the normal operating condition for this workflow.
