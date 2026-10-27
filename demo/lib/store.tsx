"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import {
  groupIncidents, incidentChanges, kiteLimitBreak, runGuard, sha256, type Delegation, type LimitKind,
} from "./guard";
import {
  INCIDENT_ID, KITE_BREAK_ID, PROPOSAL_ID, initialState, kiteBreakItem, nextLog, novaIncidentItem,
  type Item, type State, type WorkKind,
} from "./scenario";

type Action =
  | { type: "openFinding"; id: string; key: string }
  | { type: "stopRestore"; id: string; at: string }
  | { type: "replyLimits"; id: string; text: string; at: string }
  | { type: "approveReview"; id: string; at: string }
  | { type: "approveProposal"; id: string; limits: LimitKind[]; at: string }
  | { type: "finishWork"; id: string; at: string }
  | { type: "decline"; id: string; at: string }
  | { type: "ask"; id: string; text: string; at: string }
  | { type: "answer"; id: string; text: string; at: string }
  | { type: "waitApprove"; id: string; at: string }
  | { type: "waitSkip"; id: string; at: string }
  | { type: "setDelegation"; agent: string; kind: WorkKind; value: Delegation; at: string }
  | { type: "removeLimit"; agent: string; limit: LimitKind; at: string }
  | { type: "pauseAgent"; agent: string; paused: boolean; at: string }
  | { type: "pauseRotate"; agent: string; at: string }
  | { type: "suggestion"; accept: boolean; at: string }
  | { type: "simulateAttack"; at: string }
  | { type: "simulateKite"; at: string }
  | { type: "reset" };

const freshState = (): State => initialState(runGuard(incidentChanges()[0]).findings);

function setItem(items: Item[], id: string, patch: Partial<Item>): Item[] {
  return items.map((i) => (i.id === id ? { ...i, ...patch } : i));
}
function rest(sentence: string) {
  return sentence.replace(/^(wants to |asks for |has an idea: )/, "");
}
function log(s: State, at: string, actor: string, text: string): State["log"] {
  return nextLog(s.log, { t: `Today · ${at}`, actor, text });
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "reset":
      return freshState();
    case "openFinding": {
      const cur = s.opened[a.id] ?? [];
      return cur.includes(a.key) ? s : { ...s, opened: { ...s.opened, [a.id]: [...cur, a.key] } };
    }
    case "stopRestore": {
      const item = s.items.find((i) => i.id === a.id);
      if (!item?.paused) return s;
      const ag = s.agents[item.paused.agentId];
      const suffix = sha256(`${ag.keySuffix}${a.at}`).slice(0, 4);
      const n = item.paused.branches;
      const branches = n === 1 ? "1 branch" : `${n} branches`;
      return {
        ...s,
        items: setItem(s.items, a.id, { state: "restored", tier: "done", resolvedAt: a.at }),
        agents: { ...s.agents, [ag.id]: { ...ag, paused: true, rotations: ag.rotations + 1, keySuffix: suffix } },
        doneLines: [{ id: `dl-${a.id}-${a.at}`, time: a.at, text: `You stopped ${ag.name} and restored ${branches}` }, ...s.doneLines],
        log: log(s, a.at, "You", `Stopped ${ag.name}: restored ${branches} to ${item.paused.restorePoint}, paused the agent, rotated its key`),
        status: `Restored. Nothing ran. Logged at ${a.at}.`,
      };
    }
    case "replyLimits": {
      const item = s.items.find((i) => i.id === a.id);
      if (!item) return s;
      return {
        ...s,
        items: setItem(s.items, a.id, { state: "replied", note: a.text }),
        log: log(s, a.at, "You", `Replied to ${item.agent}: ${a.text}`),
        status: `Sent to ${item.agent}. It stays paused until you decide.`,
      };
    }
    case "approveReview": {
      const item = s.items.find((i) => i.id === a.id);
      if (!item?.paused) return s;
      const count = item.paused.findings.length;
      return {
        ...s,
        items: setItem(s.items, a.id, { state: "approved", tier: "done", resolvedAt: a.at }),
        doneLines: [{ id: `dl-${a.id}-${a.at}`, time: a.at, text: `You approved ${item.agent}'s change after reviewing all ${count} findings` }, ...s.doneLines],
        log: log(s, a.at, "You", `Approved ${item.agent}'s change anyway after opening all ${count} findings`),
        status: `Approved. Logged at ${a.at}.`,
      };
    }
    case "approveProposal": {
      const item = s.items.find((i) => i.id === a.id);
      if (!item?.proposal) return s;
      const ag = s.agents[item.proposal.agentId];
      const limits = [...new Set([...ag.limits, ...a.limits])];
      const withLimits = a.limits.length === 1 ? "1 limit" : `${a.limits.length} limits`;
      return {
        ...s,
        items: setItem(s.items, a.id, {
          state: "working", tier: "done", resolvedAt: a.at,
          proposal: { ...item.proposal, appliedLimits: a.limits },
        }),
        agents: { ...s.agents, [ag.id]: { ...ag, limits } },
        log: log(s, a.at, "You", a.limits.length ? `Approved ${ag.name}: ${item.proposal.issue} with ${withLimits}` : `Approved ${ag.name}: ${item.proposal.issue}`),
        status: a.limits.length ? `Approved with ${withLimits}. ${ag.name} is working.` : `Approved. ${ag.name} is working.`,
      };
    }
    case "finishWork": {
      const item = s.items.find((i) => i.id === a.id);
      if (!item || item.state !== "working" || !item.proposal) return s;
      return {
        ...s,
        items: setItem(s.items, a.id, { state: "finished" }),
        doneLines: [{ id: `dl-${a.id}`, time: a.at, text: `${item.agent} fixed ${item.proposal.issue} ${item.proposal.title}` }, ...s.doneLines],
        log: log(s, a.at, "Ziki", `Checked ${item.agent}: ${item.proposal.issue}. Passed`),
        status: `${item.agent} finished ${item.proposal.issue}. It passed your rules.`,
      };
    }
    case "decline": {
      const item = s.items.find((i) => i.id === a.id);
      if (!item) return s;
      return {
        ...s,
        items: setItem(s.items, a.id, { state: "declined", tier: "done", resolvedAt: a.at }),
        log: log(s, a.at, "You", `Declined ${item.agent}: ${rest(item.sentence)}`),
        status: `Declined. ${item.agent} won't start.`,
      };
    }
    case "ask": {
      const item = s.items.find((i) => i.id === a.id);
      if (!item) return s;
      return {
        ...s,
        items: setItem(s.items, a.id, { state: "asked", note: a.text }),
        log: log(s, a.at, "You", `Asked ${item.agent}: ${a.text}`),
        status: `Sent to ${item.agent}. Nothing starts until you approve.`,
      };
    }
    case "answer": {
      const item = s.items.find((i) => i.id === a.id);
      if (!item?.question) return s;
      return {
        ...s,
        items: setItem(s.items, a.id, { state: "answered", tier: "done", resolvedAt: a.at, question: { ...item.question, answer: a.text } }),
        doneLines: [{ id: `dl-${a.id}`, time: a.at, text: `You answered ${item.agent} on ${item.question.issue}` }, ...s.doneLines],
        log: log(s, a.at, "You", `Answered ${item.agent} on ${item.question.issue}: ${a.text}`),
        status: `Sent to ${item.agent}.`,
      };
    }
    case "waitApprove": {
      const item = s.items.find((i) => i.id === a.id);
      if (!item) return s;
      return {
        ...s,
        items: setItem(s.items, a.id, { state: "approved", tier: "done", resolvedAt: a.at }),
        doneLines: [{ id: `dl-${a.id}`, time: a.at, text: `You approved ${item.agent}: ${rest(item.sentence)}` }, ...s.doneLines],
        log: log(s, a.at, "You", `Approved ${item.agent}: ${rest(item.sentence)}`),
        status: `Approved. ${item.agent} is on it.`,
      };
    }
    case "waitSkip": {
      const item = s.items.find((i) => i.id === a.id);
      if (!item) return s;
      return {
        ...s,
        items: setItem(s.items, a.id, { state: "skipped", tier: "done", resolvedAt: a.at }),
        log: log(s, a.at, "You", `Skipped ${item.agent}: ${rest(item.sentence)}`),
        status: "Skipped. Nothing ran.",
      };
    }
    case "setDelegation": {
      const ag = s.agents[a.agent];
      return {
        ...s,
        agents: { ...s.agents, [ag.id]: { ...ag, delegation: { ...ag.delegation, [a.kind]: a.value } } },
        log: log(s, a.at, "You", `Set ${ag.name} to "${{ ask: "Ask me", tell_after: "Tell me after", auto: "Just do it" }[a.value]}" for ${a.kind}`),
        status: `${ag.name} will ${a.value === "ask" ? "ask you first" : a.value === "tell_after" ? "tell you after" : "just do it"} for ${a.kind}.`,
      };
    }
    case "removeLimit": {
      const ag = s.agents[a.agent];
      return {
        ...s,
        agents: { ...s.agents, [ag.id]: { ...ag, limits: ag.limits.filter((l) => l !== a.limit) } },
        log: log(s, a.at, "You", `Removed a limit from ${ag.name}: ${a.limit.replace(/_/g, " ")}`),
        status: "Limit removed.",
      };
    }
    case "pauseAgent": {
      const ag = s.agents[a.agent];
      return {
        ...s,
        agents: { ...s.agents, [ag.id]: { ...ag, paused: a.paused } },
        log: log(s, a.at, "You", `${a.paused ? "Paused" : "Resumed"} ${ag.name}`),
        status: a.paused ? `${ag.name} is paused.` : `${ag.name} is running again.`,
      };
    }
    case "pauseRotate": {
      const ag = s.agents[a.agent];
      const suffix = sha256(`${ag.keySuffix}${a.at}`).slice(0, 4);
      return {
        ...s,
        agents: { ...s.agents, [ag.id]: { ...ag, paused: true, rotations: ag.rotations + 1, keySuffix: suffix } },
        log: log(s, a.at, "You", `Paused ${ag.name} and rotated its key`),
        status: `${ag.name} is paused and its key was replaced.`,
      };
    }
    case "suggestion": {
      if (!a.accept) return { ...s, suggestion: "dismissed", status: "Okay. Kite keeps asking." };
      const kite = s.agents.kite;
      const quiet = s.items.filter((i) => i.tier === "wait" && i.docs && i.state === "open");
      return {
        ...s,
        suggestion: "accepted",
        agents: { ...s.agents, kite: { ...kite, delegation: { ...kite.delegation, docs: "tell_after" } } },
        items: s.items.map((i) => (quiet.includes(i) ? { ...i, state: "approved" as const, tier: "done" as const, resolvedAt: a.at } : i)),
        doneLines: [
          ...quiet.map((i) => ({ id: `dl-${i.id}`, time: a.at, text: `Kite ${rest(i.sentence)}, then told you` })),
          ...s.doneLines,
        ],
        log: log(s, a.at, "You", "Set Kite to \"Tell me after\" for docs after 12 of 12 promises kept"),
        status: "Done. Kite will do docs changes and tell you after.",
      };
    }
    case "simulateAttack": {
      const changes = incidentChanges();
      const results = changes.map((change) => ({ change, result: runGuard(change) }));
      const incidents = groupIncidents(results);
      const n = incidents[0]?.branches.length ?? 0;
      const note = `Checked ${changes.length} pushes. Found ${incidents.length} incident, ${n} branches.`;
      const existing = s.items.find((i) => i.id === INCIDENT_ID);
      if (existing && existing.tier === "needs") {
        return { ...s, engineNote: `${note} Same fingerprint as the paused one, so they joined it.`, status: "Already paused. The new pushes joined the same incident." };
      }
      const nova = s.agents.nova;
      return {
        ...s,
        engineNote: note,
        items: [novaIncidentItem(results[0].result.findings, n, 0), ...s.items.filter((i) => i.id !== INCIDENT_ID)],
        agents: { ...s.agents, nova: { ...nova, paused: false } },
        opened: { ...s.opened, [INCIDENT_ID]: [] },
        log: log(s, a.at, "Ziki", `Paused Nova: ${n} branches did more than promised`),
        status: "Nova did more than it promised. Paused, nothing has run.",
      };
    }
    case "simulateKite": {
      const result = runGuard(kiteLimitBreak());
      const kite = s.agents.kite;
      const limits: LimitKind[] = kite.limits.includes("no_new_dependencies") ? kite.limits : [...kite.limits, "no_new_dependencies"];
      const items = s.items
        .filter((i) => i.id !== KITE_BREAK_ID)
        .map((i) => (i.id === PROPOSAL_ID && i.state === "working" ? { ...i, state: "held" as const } : i));
      return {
        ...s,
        engineNote: `Checked 1 push from Kite. ${result.summary}`,
        items: [kiteBreakItem(result.findings), ...items],
        agents: { ...s.agents, kite: { ...kite, limits } },
        opened: { ...s.opened, [KITE_BREAK_ID]: [] },
        log: log(s, a.at, "Ziki", "Paused Kite: it added a dependency after you said no new dependencies"),
        status: "Kite broke a limit you set. Paused, nothing has run.",
      };
    }
  }
}

export const hhmm = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

interface Store {
  state: State;
  /** Minutes since the page loaded, added to each item's age. */
  elapsed: number;
  needs: Item[];
  wait: Item[];
  pausedCount: number;
  act: {
    openFinding(id: string, key: string): void;
    stopRestore(id: string): void;
    replyLimits(id: string, text: string): void;
    approveReview(id: string): void;
    approveProposal(id: string, limits: LimitKind[]): void;
    decline(id: string): void;
    ask(id: string, text: string): void;
    answer(id: string, text: string): void;
    waitApprove(id: string): void;
    waitSkip(id: string): void;
    setDelegation(agent: string, kind: WorkKind, value: Delegation): void;
    removeLimit(agent: string, limit: LimitKind): void;
    pauseAgent(agent: string, paused: boolean): void;
    pauseRotate(agent: string): void;
    suggestion(accept: boolean): void;
    simulateAttack(): void;
    simulateKite(): void;
    reset(): void;
  };
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, freshState);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // Approved work finishes by itself a few seconds later (a stand-in for the agent's real run).
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const live = new Set(state.items.filter((i) => i.state === "working").map((i) => i.id));
    for (const id of live) {
      if (!timers.current.has(id)) {
        timers.current.set(id, setTimeout(() => {
          timers.current.delete(id);
          dispatch({ type: "finishWork", id, at: hhmm() });
        }, 7000));
      }
    }
    for (const [id, t] of timers.current) {
      if (!live.has(id)) { clearTimeout(t); timers.current.delete(id); }
    }
  }, [state.items]);

  const act = useMemo<Store["act"]>(() => {
    const at = hhmm;
    return {
      openFinding: (id, key) => dispatch({ type: "openFinding", id, key }),
      stopRestore: (id) => dispatch({ type: "stopRestore", id, at: at() }),
      replyLimits: (id, text) => dispatch({ type: "replyLimits", id, text, at: at() }),
      approveReview: (id) => dispatch({ type: "approveReview", id, at: at() }),
      approveProposal: (id, limits) => dispatch({ type: "approveProposal", id, limits, at: at() }),
      decline: (id) => dispatch({ type: "decline", id, at: at() }),
      ask: (id, text) => dispatch({ type: "ask", id, text, at: at() }),
      answer: (id, text) => dispatch({ type: "answer", id, text, at: at() }),
      waitApprove: (id) => dispatch({ type: "waitApprove", id, at: at() }),
      waitSkip: (id) => dispatch({ type: "waitSkip", id, at: at() }),
      setDelegation: (agent, kind, value) => dispatch({ type: "setDelegation", agent, kind, value, at: at() }),
      removeLimit: (agent, limit) => dispatch({ type: "removeLimit", agent, limit, at: at() }),
      pauseAgent: (agent, paused) => dispatch({ type: "pauseAgent", agent, paused, at: at() }),
      pauseRotate: (agent) => dispatch({ type: "pauseRotate", agent, at: at() }),
      suggestion: (accept) => dispatch({ type: "suggestion", accept, at: at() }),
      simulateAttack: () => dispatch({ type: "simulateAttack", at: at() }),
      simulateKite: () => dispatch({ type: "simulateKite", at: at() }),
      reset: () => dispatch({ type: "reset" }),
    };
  }, []);

  const store = useMemo<Store>(() => {
    const needs = state.items.filter((i) => i.tier === "needs");
    const wait = state.items.filter((i) => i.tier === "wait");
    return { state, elapsed, needs, wait, pausedCount: needs.filter((i) => i.kind === "paused").length, act };
  }, [state, elapsed, act]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}

export function useAgeLabel() {
  const { elapsed } = useStore();
  return useCallback((ageMin: number) => {
    const m = ageMin + elapsed;
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h`;
  }, [elapsed]);
}
