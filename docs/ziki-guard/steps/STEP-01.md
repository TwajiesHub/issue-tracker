# Step 1: Setup and the reproduction

Goal: Ziki running on the owner's laptop against **our own** Neon database with demo data, "before" screenshots saved,
and the unchanged app deployed on Vercel as the reproduction. **No app code changes in this step**, except the Vercel cron
schedule (see 6).

## 1. Branch and kit
- `git checkout -b feat/ziki-guard` from `main`.
- The owner has copied `CLAUDE.md` (repo root) and `docs/ziki-guard/` into the repo. Add `screenshots/` to `.gitignore`.
  Commit them together: `docs: Ziki Guard kit`.
- Push the branch (`git push -u origin feat/ziki-guard`) so Codex can read the kit.

## 2. Safety check before installing anything
Report each item as clean, or list what you found:
- `package.json` scripts: only the expected ones (`dev`, `build`, `start`, `lint`, `typecheck`, `check`, `test*`, `db:*`,
  `postinstall: prisma generate`, `e2e*`). No `node <file>` prefixes.
- No unexpected root files (no `api.js`, no unknown `*.js`/`*.mjs` at the root besides config files Ziki already has).
- No config file with a run of 200+ whitespace characters (`postcss.config.mjs`, `next.config.ts`, `eslint.config.mjs`,
  `vitest.config.ts`, `playwright.config.ts`).
- `git log -5 --format='%h %an <%ae> %cd %s'` on `main`: note authors and dates.
Stop and tell the owner if anything looks wrong.

## 3. Toolchain
- Node **22.x** (`node -v`). If it isn't 22, tell the owner to install Node 22 LTS from nodejs.org first.
- pnpm 10.14 via Corepack: `corepack enable` then `corepack prepare pnpm@10.14.0 --activate`.

## 4. Environment (`.env`, never committed)
- `copy .env.example .env` (PowerShell: `Copy-Item .env.example .env`).
- The **owner** pastes the Neon values themselves (don't print them back in chat):
  - `DATABASE_URL` = Neon **pooled** connection string.
  - `DIRECT_URL` = Neon **direct** connection string (the same string without `-pooler` in the host).
- Fill in, generating random values with
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`:
  - `AUTH_SECRET` = a random value.
  - `CRON_SECRET` = a random value.
  - `AUTH_URL` and `NEXTAUTH_URL` = `http://localhost:3001/api/auth` (already the default).
  - `AUTH_PASSWORD_LOGIN=true`.
  - `SUPER_ADMIN_EMAIL=` (empty). Demo accounts are enough.

## 5. Install, migrate, seed, run
- `pnpm install`
- `pnpm exec prisma migrate deploy` (a fresh database: deploy, not `migrate dev`).
- `pnpm db:seed` (the database is empty and ours, so seeding is allowed here; never against anything else).
- `pnpm test`: record the **baseline** (pass and fail counts, and the names of any failures). Pre-existing failures are not
  ours to fix; list them so later steps can tell new failures apart.
- `pnpm dev`, open http://localhost:3001, sign in as `alice@zendor.dev` / `12345678`.

## 6. "Before" screenshots (for the rationale doc)
Use Playwright (already a dev dependency) or the browser. Save to `screenshots/before/` (not committed), signed in as Alice:
- Dashboard, Issues (Inbox view), Issues (Open), one issue detail page, Security tab ("Coming soon"), Settings → Agents,
  Settings → Preferences (email notifications), Escalations, the bell open.
- Each in **dark and light**, at **1440×900** and **390×844**.

## 7. Deploy the reproduction on Vercel
- `vercel.json`: Vercel's free (Hobby) plan refuses crons that run more often than daily. Change both schedules from
  `* * * * *` to `0 3 * * *` and commit: `chore(deploy): daily crons for Vercel Hobby (demo deployment only)`. Push.
- Tag this commit `reproduction-v0` and push the tag, so the "before" state can always be redeployed.
- Then tell the owner, as numbered steps, how to import the repo in Vercel: Add New → Project → import
  `TwajiesHub/issue-tracker`. In Settings → Git, set the **production branch to `feat/ziki-guard`**. Use Node 22.x.
  Environment variables:
  `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `CRON_SECRET` (the same values as `.env`),
  `AUTH_URL` and `NEXTAUTH_URL` = `https://<project>.vercel.app/api/auth` (after the first deploy shows the URL; then redeploy),
  `AUTH_PASSWORD_LOGIN=true`.
  The build already runs `prisma migrate deploy`; nothing else to set.
- Check the deployed site: sign in as Alice, open the Dashboard, Issues and an issue page.

## Report (in chat, under 20 lines)
1. The safety check, item by item.
2. Node and pnpm versions; migrate and seed results; the `pnpm test` baseline (counts and names of pre-existing failures).
3. Local app: works or not; anything odd.
4. The screenshots saved (a list).
5. The Vercel URL and whether sign-in works there. The commit hashes and the `reproduction-v0` tag.
