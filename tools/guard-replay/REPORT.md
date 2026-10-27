# Guard replay report

Generated: 2026-10-27T13:47:58.978Z

## Headline results

- Commits checked: **200**.
- Tiers: **auto 12 · review 152 · human 36**.
- Human commits judged real risk: **36**; false alarms: **0**.
- False-alarm rate among human-tier commits: **0.00%** (0/36). This is the false discovery proportion, not the statistical FPR: the number of all truly harmless commits is not independently labelled.
- False alarms as a share of all checked commits: **0.00%** (0/200).
- Incident fixture: **17 branches → 1 incident**; all human-tier: **true**.
- Replay run time (Git reads, conversion, engine and incident grouping): **98.815 seconds**. Manual review, report formatting, tests and push are excluded.

## Scope and method

- Repository: TwajiesHub/issue-tracker; local ref: `a2d680f508a7504ac0f2f064eea243936dd5eca3`; pinned tip: `a2d680f508a7504ac0f2f064eea243936dd5eca3`.
- Engine source commit: `3a633bfb417a01e106c2b5d7ff0b031ac0b85f27`. The existing thresholds are unchanged; entropy now additionally requires less than 5% whitespace and excludes SVG. Identifier and long-line triggers are unchanged.
- Uses `git log -n 200` over all ancestors, in Git's default history order. Merge commits compare against their first parent (99 merges in this sample); root commits compare against the empty tree. The same underlying change can therefore be counted in a feature commit and in a later merge. Counts describe commits, not unique changes or deployments.
- Read-only local Git object inspection, with external diffs, text conversion and lazy fetch disabled. No historical code is checked out or executed. No network is used by the tool. This local ref may lag the remote; no fetch was performed.
- Full before/after UTF-8 text is supplied to the engine. Files with either side above **500,000 bytes** (decimal 500 KB), binary numstat markers, NUL bytes or invalid UTF-8 are skipped entirely. Submodule entries have no blob text and are skipped. Renames use the previous path for before text and the new path for categorization.
- Skipped file-change occurrences: **37** (binary: 37). Counts and judgements only cover inspected text; skipping is not a safety verdict. Commits with no inspected files remain in the denominator and receive the unchanged engine's empty-input result.
- Each input uses `forced=false`, the full commit message as `claim`, no agent and no declared scope. Pusher is `unknown-from-git-history`: Git history does not identify GitHub pushers or prove the absence of force pushes. Author/pusher attribution is not tested by historical commits; the incident fixture exercises it separately.
- Judgements are explicit, commit-keyed manual reviews in `judgements.json`. A human-tier dependency, script, CI/build, auth or agent-rule change is a **real risk requiring review**, even when legitimate; that label does not allege malware. False alarms are reserved for clearly harmless triggers with no other genuine reason to require human review. A false finding inside an otherwise real-risk commit does not turn the whole commit into a false alarm.
- Findings are counted per emitted finding; affected-commit counts deduplicate each code within a commit. The synthetic incident is excluded from all historical counts.

## Finding counts

| Code | Findings | Commits affected |
| --- | ---: | ---: |
| scripts_changed | 0 | 0 |
| lifecycle_hook | 0 | 0 |
| deps_changed | 0 | 0 |
| deps_unusual_source | 0 | 0 |
| protected_path | 37 | 31 |
| hidden_whitespace | 0 | 0 |
| invisible_chars | 0 | 0 |
| obfuscated_file | 0 | 0 |
| history_rewritten | 0 | 0 |
| author_pusher_mismatch | 0 | 0 |
| outside_scope | 0 | 0 |
| claim_mismatch | 27 | 27 |
| broke_limit | 0 | 0 |
| unreadable_manifest | 0 | 0 |
| unknown_file | 57 | 15 |

## Every human-tier commit and judgement

Dates are committer timestamps with their original offsets. Messages show the subject; the full message was used as the claim.

| SHA | Date | Message | Codes | Judgement | Reason |
| --- | --- | --- | --- | --- | --- |
| 2a51d6ea2e | 2026-10-26 | Merge pull request #1418 from Zedu-Endor/sync/endor-upstream-main | protected_path, claim_mismatch | real risk | Applies reward-rescaling SQL migrations; persisted points change even though the SQL entropy alert is overly broad. |
| a259a73869 | 2026-10-26 | Merge remote-tracking branch 'endor/main' | protected_path, claim_mismatch | real risk | Changes AGENTS.md instructions governing agent behaviour; this is a protected agent-rule change. |
| e2e72260c4 | 2026-10-26 | Merge branch 'upstream/main' into main (resolve docs conflict) | protected_path, claim_mismatch | real risk | Applies reward-rescaling SQL migrations; persisted points change even though the SQL entropy alert is overly broad. |
| 1f8c53b1e1 | 2026-10-26 | Merge pull request #1417 from Zedu-Endor/docs/update-sdlc-documentation | protected_path, claim_mismatch | real risk | Changes AGENTS.md instructions governing agent behaviour; this is a protected agent-rule change. |
| 90b55b8387 | 2026-10-26 | docs: update documentation for autonomous SDLC lifecycle, mistake registry, and deployment checks | protected_path, claim_mismatch | real risk | Changes AGENTS.md instructions governing agent behaviour; this is a protected agent-rule change. |
| e80e14776d | 2026-10-26 | Merge pull request #1416 from Zedu-Endor/fix/ci-migrations-and-mcp-tools | protected_path | real risk | Adds the SDLC/mistake-registry migration and schema-maintenance SQL; deployment/database changes require review. |
| 674d659105 | 2026-10-26 | fix(ci): add prisma migration for reviewStatus and mistakes, fix mcp-server tool descriptions and lint warnings | protected_path | real risk | Adds the SDLC/mistake-registry migration and schema-maintenance SQL; deployment/database changes require review. |
| 46083b9c15 | 2026-10-26 | Merge pull request #1414 from Zedu-Endor/feat/sdlc-multiagent-lifecycle | unknown_file | real risk | Changes Prisma review/mistake schema and merger verification; unknown_file is a justified fail-closed schema alert. |
| fc651268a9 | 2026-10-26 | feat(agents): implement autonomous multi-agent SDLC lifecycle with mistake registry and GitHub Actions verification | unknown_file | real risk | Changes Prisma review/mistake schema and merger verification; unknown_file is a justified fail-closed schema alert. |
| 3b9e1281df | 2026-10-26 | Merge pull request #1413 from Zedu-Endor/feat/agent-architecture-refactor | unknown_file | real risk | Changes Prisma agent-role schema and two-stage merge gates; this is substantive agent authorization/workflow work. |
| 9f7ecb7275 | 2026-10-26 | feat: agent architecture refactor (roles, verification, two-stage merge, reactive discovery) | unknown_file | real risk | Changes Prisma agent-role schema and two-stage merge gates; this is substantive agent authorization/workflow work. |
| 955b6cb9c1 | 2026-10-24 | fix(ENDOR-165): resolve merge conflicts for redesign | protected_path, claim_mismatch | real risk | Applies reward-rescaling SQL migrations; persisted points change even though the SQL entropy alert is overly broad. |
| 1bf7e78c70 | 2026-10-24 | Merge pull request #164 from emerjent/sync/endor-main-into-parent | protected_path, claim_mismatch, unknown_file | real risk | Sync includes deployment workflow removal, middleware and database migrations; those remain genuine human-review changes. |
| 0a3309c3df | 2026-10-24 | merge: sync Endor main into parent main | protected_path, claim_mismatch, unknown_file | real risk | Sync includes deployment workflow removal, middleware and database migrations; those remain genuine human-review changes. |
| d5ff582a0e | 2026-10-24 | Merge pull request #1388 from Zedu-Endor/feat/decimal-points-drop-vercel | protected_path, claim_mismatch, unknown_file | real risk | Includes deployment workflow removal plus a decimal-points database migration and schema changes. |
| 7138d603d4 | 2026-10-24 | feat: store point awards as decimals and taper reviewer points | protected_path, claim_mismatch, unknown_file | real risk | Changes persisted point types through a decimal-points migration and Prisma schema. |
| 7fd2408d46 | 2026-10-24 | chore: remove the Vercel preview deploy | protected_path | real risk | Removes the Vercel deployment workflow; CI/deployment changes should require human review. |
| d4576a1877 | 2026-10-24 | fix(ENDOR-645): merge main; keep compare-and-update promotion on top of the contributor eligibility notice | protected_path, claim_mismatch, unknown_file | real risk | First-parent sync includes middleware or reviewer-eligibility migration/schema changes; not just the noisy entropy findings. |
| 45c0e46c4f | 2026-10-24 | Merge origin/main into fix/ENDOR-636-assignee-pr-mention-not-bound | protected_path, claim_mismatch, unknown_file | real risk | First-parent sync includes middleware or reviewer-eligibility migration/schema changes; not just the noisy entropy findings. |
| e9f687567c | 2026-10-24 | Merge pull request #1375 from Zedu-Endor/fix/ENDOR-659-preserve-contributor | protected_path, claim_mismatch, unknown_file | real risk | Changes reviewer-eligibility enum/schema through a migration; authorization-role persistence requires review. |
| 7f81d40d43 | 2026-10-24 | fix(ENDOR-659): preserve contributor role on promotion | protected_path, claim_mismatch, unknown_file | real risk | Changes reviewer-eligibility enum/schema through a migration; authorization-role persistence requires review. |
| d6b5f62abc | 2026-10-23 | Merge branch 'main' into fix/ziki-425-agent-self-select-level | protected_path, claim_mismatch, unknown_file | real risk | Large first-parent sync contains migrations and middleware changes; harmless design-handoff entropy hits do not make the entire commit harmless. |
| 8fa0a4ac56 | 2026-10-23 | Merge remote-tracking branch 'origin/main' into fix/ENDOR-636-assignee-pr-mention-not-bound | protected_path, claim_mismatch | real risk | Changes middleware routing/auth exemptions in the first-parent diff; accompanying test entropy hits do not negate that real boundary change. |
| f4ac187c9d | 2026-10-23 | Merge remote-tracking branch 'origin/main' into fix/ENDOR-642-unmerged-pr-no-points | protected_path, claim_mismatch | real risk | Changes middleware routing/auth exemptions in the first-parent diff; accompanying test entropy hits do not negate that real boundary change. |
| e6871651df | 2026-10-23 | fix(ENDOR-615): resolve header conflicts with main | protected_path, claim_mismatch, unknown_file | real risk | Large first-parent sync contains migrations and middleware changes; harmless design-handoff entropy hits do not make the entire commit harmless. |
| 768c0cc447 | 2026-10-23 | Merge remote-tracking branch 'origin/main' into fix/ziki-575-vote-button-label | protected_path, claim_mismatch | real risk | Changes middleware routing/auth exemptions in the first-parent diff; accompanying test entropy hits do not negate that real boundary change. |
| 02e520310e | 2026-10-23 | Merge remote-tracking branch 'origin/main' into fix/ziki-583-clear-created-issue-draft | protected_path, claim_mismatch | real risk | Changes middleware routing/auth exemptions in the first-parent diff; accompanying test entropy hits do not negate that real boundary change. |
| 2197145d8c | 2026-10-23 | Merge remote-tracking branch 'origin/main' into fix/ziki-604-extend-issue-number | protected_path, claim_mismatch | real risk | Changes middleware routing/auth exemptions in the first-parent diff; accompanying test entropy hits do not negate that real boundary change. |
| fff433b801 | 2026-10-23 | Merge branch 'main' into fix/ziki-605-release-issue-number | protected_path, claim_mismatch | real risk | Changes middleware routing/auth exemptions in the first-parent diff; accompanying test entropy hits do not negate that real boundary change. |
| 5ff71a7cc8 | 2026-10-23 | Merge remote-tracking branch 'upstream/main' into fix/ziki-646-theme-save-false-success | protected_path, claim_mismatch | real risk | Changes middleware routing/auth exemptions in the first-parent diff; accompanying test entropy hits do not negate that real boundary change. |
| a60b34e4c2 | 2026-10-23 | feat: support instructions field in agent pairing (#425) | unknown_file | real risk | Changes pairing instructions persistence in Prisma schema and onboarding/registry logic; unknown schema is a legitimate fail-closed signal. |
| 28a2b72505 | 2026-10-23 | Merge pull request #1290 from Zedu-Endor/fix/571-cron-public-route | protected_path, claim_mismatch | real risk | Changes middleware routing/auth exemptions in the first-parent diff; accompanying test entropy hits do not negate that real boundary change. |
| 9477b14ab4 | 2026-10-23 | Merge pull request #163 from emerjent/feat/points-times-30 | protected_path, claim_mismatch | real risk | Applies reward-rescaling SQL migrations; persisted points change even though the SQL entropy alert is overly broad. |
| cbf456b4ec | 2026-10-23 | fix: use a 30x point schedule and keep the 500 point goal | protected_path, claim_mismatch | real risk | Applies reward-rescaling SQL migrations; persisted points change even though the SQL entropy alert is overly broad. |
| 682a325644 | 2026-10-23 | Merge pull request #160 from emerjent/feat/points-times-70 | protected_path, claim_mismatch | real risk | Applies reward-rescaling SQL migrations; persisted points change even though the SQL entropy alert is overly broad. |
| 23a7b6f638 | 2026-10-23 | feat: scale point awards by 70 and surface the admin editor | protected_path | real risk | Applies reward-rescaling SQL migrations; persisted points change even though the SQL entropy alert is overly broad. |

## Skipped files

| Commit | File | Reason |
| --- | --- | --- |
| 1bf7e78c70 | docs/evidence/ENDOR-579/issue-report.jpg | binary |
| 1bf7e78c70 | docs/evidence/ENDOR-579/regression-results.jpg | binary |
| 0a3309c3df | docs/evidence/ENDOR-579/issue-report.jpg | binary |
| 0a3309c3df | docs/evidence/ENDOR-579/regression-results.jpg | binary |
| d4576a1877 | docs/evidence/ENDOR-579/issue-report.jpg | binary |
| d4576a1877 | docs/evidence/ENDOR-579/regression-results.jpg | binary |
| d6b5f62abc | app/apple-icon.png | binary |
| d6b5f62abc | app/favicon.ico | binary |
| d6b5f62abc | app/icon1.png | binary |
| d6b5f62abc | app/icon2.png | binary |
| d6b5f62abc | design-handoff/assets/ziki-logo-dark.png | binary |
| d6b5f62abc | design-handoff/assets/ziki-logo-light.png | binary |
| d6b5f62abc | design-handoff/assets/ziki-mark.png | binary |
| d6b5f62abc | docs/evidence/ENDOR-579/issue-report.jpg | binary |
| d6b5f62abc | docs/evidence/ENDOR-579/regression-results.jpg | binary |
| d6b5f62abc | public/brand/ziki-logo-dark.png | binary |
| d6b5f62abc | public/brand/ziki-logo-light.png | binary |
| d6b5f62abc | public/brand/ziki-mark.png | binary |
| d6b5f62abc | public/ziki-logo.png | binary |
| 8fa0a4ac56 | docs/evidence/ENDOR-579/issue-report.jpg | binary |
| 8fa0a4ac56 | docs/evidence/ENDOR-579/regression-results.jpg | binary |
| f4ac187c9d | docs/evidence/ENDOR-579/issue-report.jpg | binary |
| f4ac187c9d | docs/evidence/ENDOR-579/regression-results.jpg | binary |
| e6871651df | design-handoff/assets/ziki-logo-dark.png | binary |
| e6871651df | design-handoff/assets/ziki-logo-light.png | binary |
| e6871651df | design-handoff/assets/ziki-mark.png | binary |
| e6871651df | docs/evidence/ENDOR-579/issue-report.jpg | binary |
| e6871651df | docs/evidence/ENDOR-579/regression-results.jpg | binary |
| e6871651df | public/brand/ziki-logo-dark.png | binary |
| e6871651df | public/brand/ziki-logo-light.png | binary |
| e6871651df | public/brand/ziki-mark.png | binary |
| 768c0cc447 | docs/evidence/ENDOR-579/issue-report.jpg | binary |
| 768c0cc447 | docs/evidence/ENDOR-579/regression-results.jpg | binary |
| 02e520310e | docs/evidence/ENDOR-579/issue-report.jpg | binary |
| 02e520310e | docs/evidence/ENDOR-579/regression-results.jpg | binary |
| 677464206a | docs/evidence/ENDOR-579/issue-report.jpg | binary |
| 677464206a | docs/evidence/ENDOR-579/regression-results.jpg | binary |

## Before and after the fix

Same pinned main tip: `a2d680f508a7504ac0f2f064eea243936dd5eca3`; exact same 200 ordered commits and inspected/skipped file coverage. Baseline engine: `f87184d2fb90c532b97344f19a8403f36904ae90`; fixed engine: `3a633bfb417a01e106c2b5d7ff0b031ac0b85f27`. Baseline evidence and labels are preserved in results-before.json and judgements-before.json; manual risk labels have not been rewritten to improve the numbers.

| Measure | Before | After |
| --- | ---: | ---: |
| Auto | 12 | 12 |
| Review | 111 | 152 |
| Human | 77 | 36 |
| Human commits judged real risk | 50 | 36 |
| Human false alarms | 27 | 0 |
| False-alarm share of human queue | 35.06% (27/77) | 0.00% (0/36) |
| False alarms / all commits | 13.50% (27/200) | 0.00% (0/200) |
| Obfuscated-file findings | 303 | 0 |
| Replay seconds | 70.590 | 98.815 |
| Incident branches → incidents | 17 → 1 | 17 → 1 |

41 commits changed tier. Of these, 14 were previously judged real risks and now leave the human queue: this is a loss of useful review coverage, not a false-alarm reduction. Their obfuscation warnings were spurious, but credential/access/state-policy risk needs its own detector rather than an entropy heuristic. No risk label is inferred from the new tier. Review-tier still means a human can inspect later; it does not mean risk-free.

### Every changed tier and assessment

| SHA | Message | Tier before → after | Original risk judgement | Is the tier change correct? | Reason |
| --- | --- | --- | --- | --- | --- |
| 83c6d6fede | Merge pull request #169 from Zedu-Endor/main | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Entropy-only hits are readable render tests, mocked work counts and SVG agent artwork; no protected file or hidden payload is involved. |
| c32385df33 | Merge pull request #1408 from Zedu-Endor/issues-inbox | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Entropy-only hits are readable render tests, mocked work counts and SVG agent artwork; no protected file or hidden payload is involved. |
| c1d902ef5a | Merge pull request #168 from Zedu-Endor/main | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Readable status/SVG components and DOM/layout assertions exceed entropy 5.0; this is interface presentation, not obfuscation. |
| 5a57b8c584 | Merge pull request #1406 from Zedu-Endor/issue-detail-layout | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; The flagged additions are ordinary layout/focus assertions with descriptive names; the accompanying changes are presentation and accessibility. |
| db9f25a548 | Merge pull request #1402 from Zedu-Endor/evanny787-ziki-560-clean-fix | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Only the readable dispute-page accessibility test triggers entropy; runtime changes make actions accessible links. |
| 16a422561c | fix: decisions panel clipping, comment menu focus, shared avatar colours | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; The flagged additions are ordinary layout/focus assertions with descriptive names; the accompanying changes are presentation and accessibility. |
| 0d60bd3fab | Merge pull request #1407 from Zedu-Endor/ranking-merge | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; The sole trigger is the readable ranking-panel test; remaining changes reorganize navigation and layout. |
| ebb02705b7 | Merge pull request #1405 from Zedu-Endor/issues-list-status | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Readable status/SVG components and DOM/layout assertions exceed entropy 5.0; this is interface presentation, not obfuscation. |
| 2258c141de | feat: Inbox lists and agents panel; Open/In progress/Done/All tabs | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Entropy-only hits are readable render tests, mocked work counts and SVG agent artwork; no protected file or hidden payload is involved. |
| 4ea813bc71 | feat: one Ranking page, points pill, Product/Marketing/Security nav | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; The sole trigger is the readable ranking-panel test; remaining changes reorganize navigation and layout. |
| a524fb4231 | feat: compact single issue page layout | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; The flagged additions are ordinary layout/focus assertions with descriptive names; the accompanying changes are presentation and accessibility. |
| cf47fa0939 | feat: show where each issue stands in the issues list | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Readable status/SVG components and DOM/layout assertions exceed entropy 5.0; this is interface presentation, not obfuscation. |
| c3558cf444 | fix: make dispute actions accessible links | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Only the readable dispute-page accessibility test triggers entropy; runtime changes make actions accessible links. |
| cfc302c8f4 | Merge pull request #166 from Zedu-Endor/fix/ENDOR-165 | human → review | real risk | no — review coverage lost | The false obfuscation signal should go, but a human gate is still warranted: Adds a scheduled database repair that reopens issues automatically; the test entropy finding is false but the state-changing automation merits review. |
| 58501eaed4 | Merge pull request #1398 from Zedu-Endor/ui-redesign | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Only readable issues-page render assertions trigger entropy; admin action diffs merely update revalidation paths to the Workers UI. |
| 5c760029c5 | feat: top-bar redesign, Workers page and mobile issues layout | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Only readable issues-page render assertions trigger entropy; admin action diffs merely update revalidation paths to the Workers UI. |
| b17465d40c | Merge pull request #1393 from Zedu-Endor/fix/ENDOR-623-reopen-orphaned-issues | human → review | real risk | no — review coverage lost | The false obfuscation signal should go, but a human gate is still warranted: Adds a scheduled database repair that reopens issues automatically; the test entropy finding is false but the state-changing automation merits review. |
| 4fd14a2987 | fix(ENDOR-623): reopen orphaned in-progress issues | human → review | real risk | no — review coverage lost | The false obfuscation signal should go, but a human gate is still warranted: Adds a scheduled database repair that reopens issues automatically; the test entropy finding is false but the state-changing automation merits review. |
| 146fee0fa2 | Merge pull request #1330 from Zedu-Endor/fix/ENDOR-636-assignee-pr-mention-not-bound | human → review | real risk | no — review coverage lost | The false obfuscation signal should go, but a human gate is still warranted: Changes accepted-fix/PR binding and deliberate-delivery gates; test entropy is spurious but merge authority and evidence binding deserve review. |
| e5f4ebaf47 | Merge pull request #1379 from Zedu-Endor/fix/ENDOR-1378-team-directory | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; The flagged team-agent table is readable JSX markup using existing level controls; no permission-policy change or obfuscated payload appears. |
| 7e8f0b1286 | fix(ENDOR-1378): redesign Team member and agent tables | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; The flagged team-agent table is readable JSX markup using existing level controls; no permission-policy change or obfuscated payload appears. |
| ee8c3341c8 | Merge pull request #1370 from Zedu-Endor/fix/ENDOR-1369-issues-redesign | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Only readable render assertions and Lucide license prose trigger entropy; these are interface/layout and static-icon changes. |
| d152ecc33a | fix: refine Issues layout and filter controls | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Only readable render assertions and Lucide license prose trigger entropy; these are interface/layout and static-icon changes. |
| c6d5c4f258 | Merge pull request #1366 from Zedu-Endor/fix/ENDOR-644-free-refused-writes | human → review | real risk | no — review coverage lost | The false obfuscation signal should go, but a human gate is still warranted: Changes transactional rate-budget charging and validation behaviour; readable SQL is not obfuscated, but security throttling semantics are sensitive. |
| 659e65a478 | fix(ENDOR-644): avoid charging refused validations | human → review | real risk | no — review coverage lost | The false obfuscation signal should go, but a human gate is still warranted: Changes transactional rate-budget charging and validation behaviour; readable SQL is not obfuscated, but security throttling semantics are sensitive. |
| d43f246dce | Merge pull request #1297 from Zedu-Endor/feat/ENDOR-615-notification-dropdown | human → review | real risk | no — review coverage lost | The false obfuscation signal should go, but a human gate is still warranted: Adds a personal-notification read action with user/tenant scoping; privacy/access-boundary review is justified despite the false test entropy alert. |
| 03b51c73be | Merge pull request #1315 from Zedu-Endor/fix/ziki-583-clear-created-issue-draft | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; The trigger is a readable form-draft regression test; runtime changes clear saved drafts after a successful issue redirect. |
| ad383863d5 | Merge pull request #1257 from Zedu-Endor/fix/ENDOR-503-date-only-to-bound | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Readable date-range tests alone trigger entropy; the code normalizes ISO date bounds without changing identity or access rules. |
| 6ef442e518 | Merge pull request #1286 from Zedu-Endor/fix/ENDOR-587-numeric-bid-refs | human → review | real risk | no — review coverage lost | The false obfuscation signal should go, but a human gate is still warranted: Adds project-key authorization assertions and scoped issue resolution for bidding; false test entropy accompanies a real access-boundary change. |
| 677464206a | Merge pull request #1293 from Zedu-Endor/fix/ziki-579-recorded-independence | human → review | real risk | no — review coverage lost | The false obfuscation signal should go, but a human gate is still warranted: Changes reviewer/beneficiary independence and historical reward eligibility; harmless evidence-log entropy does not make those trust checks low risk. |
| e45e16a69b | Merge pull request #1355 from Zedu-Endor/fix/ziki-604-extend-issue-number | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Readable claim-extension tests trip entropy; the small runtime change accepts readable issue numbers while retaining tenant/project locks. |
| 14c2ce6490 | Merge pull request #1350 from Zedu-Endor/fix/ziki-605-release-issue-number | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Readable claim-release tests trip entropy; numeric-reference resolution retains existing tenant/project locking and claim checks. |
| ac5d7b198f | Merge pull request #1312 from Zedu-Endor/fix/544-expose-pull-request-link | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Only readable API assertions trigger entropy; runtime code exposes the already-linked PR URL/head as response metadata. |
| 477b32599b | fix(604): accept the readable issue number on claim extension | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Readable claim-extension tests trip entropy; the small runtime change accepts readable issue numbers while retaining tenant/project locks. |
| 4856ee3982 | Merge pull request #1296 from Zedu-Endor/fix/ziki-559-escalation-issue-number | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Readable rendering assertions for issue-number labels trigger entropy; the associated changes only adjust escalation link presentation. |
| 9d798c9965 | fix(605): accept the readable issue number on claim release | human → review | false alarm | yes | Correct: the only escalation was entropy on readable text; Readable claim-release tests trip entropy; numeric-reference resolution retains existing tenant/project locking and claim checks. |
| aed1b61458 | fix(ENDOR-579): preserve historical awards and guard deleted issues | human → review | real risk | no — review coverage lost | The false obfuscation signal should go, but a human gate is still warranted: Changes reviewer/beneficiary independence and historical reward eligibility; harmless evidence-log entropy does not make those trust checks low risk. |
| 832973d48b | Merge remote-tracking branch 'origin/main' into fix/ziki-579-recorded-independence | human → review | real risk | no — review coverage lost | The false obfuscation signal should go, but a human gate is still warranted: First-parent sync changes Google sign-in password neutralization and TOTP/backup-code removal; genuine credential-lifecycle risk despite a false test entropy hit. |
| 0f52e32e19 | Merge remote-tracking branch 'origin/main' into fix/645-respect-manual-levels | human → review | real risk | no — review coverage lost | The false obfuscation signal should go, but a human gate is still warranted: First-parent sync changes Google sign-in password neutralization and TOTP/backup-code removal; genuine credential-lifecycle risk despite a false test entropy hit. |
| 43a787dd04 | fix(ENDOR-636): require deliberate delivery to bind pull request to issue | human → review | real risk | no — review coverage lost | The false obfuscation signal should go, but a human gate is still warranted: Changes accepted-fix/PR binding and deliberate-delivery gates; test entropy is spurious but merge authority and evidence binding deserve review. |
| ba135d0031 | Merge pull request #1220 from Zedu-Endor/fix/ENDOR-493-re-review-after-edit | human → review | real risk | no — review coverage lost | The false obfuscation signal should go, but a human gate is still warranted: Changes stale-validation deletion/replacement and re-review eligibility; trust/audit semantics warrant review even though the test is readable. |
