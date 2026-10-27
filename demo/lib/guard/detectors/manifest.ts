import { sha256 } from "../chain";
import { isLockfile, isManifest } from "../categorize";
import type { FileChange, Finding } from "../types";
const sections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies", "bundledDependencies", "bundleDependencies"];
const lifecycle = new Set(["preinstall", "install", "postinstall", "prepare", "prepublish", "prepack"]);
type Manifest = Record<string, unknown>;
const object = (value: unknown): Manifest => value && typeof value === "object" && !Array.isArray(value) ? value as Manifest : {};
function parse(text: string | null | undefined): Manifest {
  if (text == null) return {};
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid manifest");
  return value as Manifest;
}
export function inspectManifest(file: FileChange): { findings: Finding[]; scriptsChanged: boolean; depsChanged: boolean; addedDependencies: boolean } {
  const findings: Finding[] = [];
  let scriptsChanged = false, depsChanged = false, addedDependencies = false;
  const emit = (code: Finding["code"], title: string, before?: string, after?: string, excerpt?: string) => findings.push({ code, tier: "human", file: file.path, title, evidence: { before, after, excerpt } });
  if (isLockfile(file.path) && (file.before !== file.after || file.status !== "modified")) {
    depsChanged = true;
    emit("deps_changed", "A dependency lockfile changed.", sha256(file.before ?? ""), sha256(file.after ?? ""), file.path);
  }
  if (isManifest(file.path)) {
    try {
      if ((file.status !== "removed" && file.after == null) || (file.status === "removed" && file.before == null)) throw new Error("Unavailable manifest text");
      const before = parse(file.before), after = parse(file.after);
      const oldScripts = object(before.scripts), newScripts = object(after.scripts);
      for (const name of [...new Set([...Object.keys(oldScripts), ...Object.keys(newScripts)])].sort()) {
        if (oldScripts[name] === newScripts[name]) continue;
        scriptsChanged = true;
        emit("scripts_changed", `The ${name} script command changed.`, JSON.stringify(oldScripts[name]), JSON.stringify(newScripts[name]), name);
        if (lifecycle.has(name) && name in newScripts) emit("lifecycle_hook", `A command now runs during ${name}.`, JSON.stringify(oldScripts[name]), JSON.stringify(newScripts[name]), name);
      }
      for (const section of sections) {
        const oldDeps = object(before[section]), newDeps = object(after[section]);
        // Bundled dependency lists are compared as indexed records as well.
        const oldValues = Array.isArray(before[section]) ? Object.fromEntries((before[section] as unknown[]).map(v => [String(v), true])) : oldDeps;
        const newValues = Array.isArray(after[section]) ? Object.fromEntries((after[section] as unknown[]).map(v => [String(v), true])) : newDeps;
        for (const name of [...new Set([...Object.keys(oldValues), ...Object.keys(newValues)])].sort()) {
          if (oldValues[name] === newValues[name]) continue;
          depsChanged = true;
          if (!(name in oldValues) && name in newValues) addedDependencies = true;
          emit("deps_changed", `The ${name} dependency in ${section} changed.`, JSON.stringify(oldValues[name]), JSON.stringify(newValues[name]), `${section}:${name}`);
          if (typeof newValues[name] === "string" && /^(?:git(?:\+[^:]+)?:|https?:|ssh:|github:|gitlab:|bitbucket:|file:|link:|[^/\s]+\/[^/\s]+(?:#.*)?$)/i.test(newValues[name] as string)) {
            emit("deps_unusual_source", `The ${name} dependency uses an unusual source.`, undefined, String(newValues[name]));
          }
        }
      }
    } catch {
      emit("unreadable_manifest", "The package manifest could not be read.");
    }
  }
  return { findings, scriptsChanged, depsChanged, addedDependencies };
}
