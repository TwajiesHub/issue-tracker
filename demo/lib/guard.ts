/**
 * The one import for the guard engine, browser side: types and the pure helpers only.
 * The engine itself (runGuard, groupIncidents) needs node:crypto, so it runs on the server:
 * see lib/simulate.ts and app/api/simulate/route.ts.
 */
export type {
  Tier, Category, Delegation, LimitKind, Finding, FindingCode, GuardResult, Incident, ChangeInput,
} from "./guard/types";
export { suggestDelegation, wilsonLowerBound } from "./guard/autonomy";
