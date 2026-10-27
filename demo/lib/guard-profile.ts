import type { ProtectedArea } from "./guard/types";

/**
 * Copied from tools/guard-replay/ziki-profile.ts (the Vercel project builds only demo/, so it can't import across folders).
 * Owner policy for Ziki's own modules, frozen before the replay looked at held-out history.
 */
export const zikiProtectedAreas: ProtectedArea[] = [
  {label: "Points and rewards", globs: [
    "lib/points/**", // Ledger, balances, payouts, award eligibility and reward rules share this module.
    "app/api/**/points/**", // HTTP access to balances and point entries.
    "app/api/v1/goals/**", // Goal allocations spend the reward budget.
  ]},
  {label: "Agent levels and independence", globs: [
    "lib/agents/**", // Registry, keys, pairing, levels, membership, promotion and independence.
    "lib/agent-api/**", // Agent-facing policy, bidding, review and claim lifecycle implementation.
    "lib/agent-audit/**", // Attribution, visibility and reversal of agent actions.
    "lib/ticket-assignment*.ts", // Assignment/readiness rules govern who can act on a ticket.
    "app/api/v1/agents/**", // Pairing, agent identity, keys and account-management endpoints.
  ]},
  {label: "Human approvals", globs: [
    "lib/approvals*.ts", // Approval rules, including fileGlob, enforce human decision boundaries.
    "lib/redesigns*.ts", // Proposal acceptance and redesign decision gates.
    "lib/github/**", // PR binding, standing acceptance and merge authorization/evidence.
    "app/api/v1/approvals/**", // Approval decisions over HTTP.
    "app/api/v1/redesigns/**", // Human redesign proposals and decisions over HTTP.
    "app/api/v1/reviews/**", // Acceptance of reviewed work.
  ]},
  {label: "Sign-in and accounts", globs: [
    "lib/auth*.ts", // Auth helpers, mode, origin checks, errors and diagnostics.
    "lib/*password*.ts", // Password hashing and reset/consumption flows.
    "lib/*session*.ts", // Session identity and refresh/invalidation.
    "lib/two-factor*.ts", // Factor enrollment, deletion and backup-code lifecycle.
    "lib/totp*.ts", // TOTP primitive and verification.
    "lib/google-*.ts", // OAuth admission, account linking and Google two-factor handling.
    "lib/*user*.ts", // User provisioning, offboarding and private data export.
    "lib/*role*.ts", // Site/organization roles and promotion ordering.
    "lib/*access*.ts", // Tenant/profile access decisions.
    "lib/membership-admin*.ts", // Membership changes are account authority changes.
    "lib/tenant-context*.ts", // Current tenant isolation and visibility predicates.
    "lib/cookie-options*.ts", // Session cookie transport settings.
    "lib/super-admin*.ts", // Super-admin identity policy.
    "app/api/auth/**", // Auth.js entry points.
    "app/api/user/**", // User/private account endpoints.
  ]},
  {label: "Rate limits", globs: [
    "lib/rate-limit*.ts", // In-memory/Postgres counters, transactions and response decisions.
    "lib/agents/rate-budget*.ts", // Agent write budgets and budget headers.
    "lib/agents/rate-limit*.ts", // Agent-specific throttling policy.
    "lib/webhooks/dispatch-limit*.ts", // Scheduler/dispatcher abuse limits.
  ]},
  {label: "Scheduled jobs", globs: [
    "lib/cron/**", // The platform sweep orchestrator and failure reporting.
    "lib/jobs/**", // Autonomous job dispatch, submissions and background lifecycle rules.
    "lib/*retention*.ts", // Automated deletion/pruning of records and attachments.
    "lib/orphaned-issues*.ts", // Automated persisted issue-state repair.
    "lib/agents/promotion*.ts", // Scheduled promotion/demotion modifies agent capabilities.
    "app/api/internal/**", // Internal scheduler entry points.
    "app/api/v1/claims/dispatch/**", // Scheduler-triggered claim release.
    "app/api/v1/webhooks/dispatch/**", // Scheduler-triggered webhook delivery.
  ]},
  {label: "Database schema and migrations", globs: [
    "prisma/**", // Schema, migrations and seed operate on persistent data structure/content.
    "lib/prisma.ts", // Shared database client and connection behaviour.
  ]},
  {label: "Private notifications", globs: [
    "lib/notify*.ts", // Notification delivery selects recipients and exposes personal content.
    "lib/notification*.ts", // Private feed data and notification preference/visibility helpers.
    "app/actions/notifications.ts", // The server-action boundary exposing private notification previews.
  ]},
];
