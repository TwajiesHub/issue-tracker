import { tierRank } from "./classify";
import type { Incident } from "./types";
export function incidentPriority(incident: Pick<Incident, "tier" | "branches"> & {touchesMain?: boolean; ageMinutes: number}): number {
  const touchesMain = incident.touchesMain ?? incident.branches.some(b => b === "main" || b === "refs/heads/main");
  return tierRank[incident.tier] * 1_000_000 + Math.min(incident.branches.length, 999) * 1000 + (touchesMain ? 500 : 0) + Math.min(Math.max(incident.ageMinutes, 0), 499);
}
/** Binary max-heap; insertion order breaks equal-priority ties. */
export class PriorityQueue<T> {
  private heap: {value: T; priority: number; order: number}[] = [];
  private sequence = 0;
  constructor(private readonly priorityOf: (value: T) => number) {}
  get size(): number { return this.heap.length; }
  peek(): T | undefined { return this.heap[0]?.value; }
  private higher(a: number, b: number): boolean {
    const x = this.heap[a], y = this.heap[b];
    return x.priority > y.priority || (x.priority === y.priority && x.order < y.order);
  }
  private swap(a: number, b: number): void { [this.heap[a], this.heap[b]] = [this.heap[b], this.heap[a]]; }
  push(value: T): void {
    const priority = this.priorityOf(value);
    if (!Number.isFinite(priority)) throw new RangeError("Priority must be finite");
    this.heap.push({value, priority, order: this.sequence++});
    let i = this.heap.length - 1;
    while (i > 0) { const parent = (i - 1) >> 1; if (!this.higher(i, parent)) break; this.swap(i, parent); i = parent; }
  }
  pop(): T | undefined {
    if (!this.heap.length) return undefined;
    const result = this.heap[0].value, last = this.heap.pop()!;
    if (this.heap.length) {
      this.heap[0] = last;
      let i = 0;
      while (i * 2 + 1 < this.heap.length) {
        const left = i * 2 + 1, right = left + 1;
        const best = right < this.heap.length && this.higher(right, left) ? right : left;
        if (!this.higher(best, i)) break;
        this.swap(i, best); i = best;
      }
    }
    return result;
  }
  toSortedArray(): T[] {
    const copy = new PriorityQueue(this.priorityOf);
    copy.heap = this.heap.map(node => ({...node})); copy.sequence = this.sequence;
    const values: T[] = [];
    while (copy.size) values.push(copy.pop()!);
    return values;
  }
}
