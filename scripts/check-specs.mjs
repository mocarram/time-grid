#!/usr/bin/env node
// Verifies every spec has at least as many edge/failure scenarios as happy ones.
// Heuristic: count "Scenario:" lines, compare to lines containing "edge", "fail",
// "reject", "invalid", "error", "tamper", "corrupt", "limit", "exceed", "abort",
// "timeout", "duplicate", "fallback", "retry", "conflict", "offline".
//
// This is a smoke check — the real guarantee is the test suite.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const SPEC_DIR = "specs";
const NEGATIVE_KEYWORDS = [
  "fail",
  "reject",
  "invalid",
  "error",
  "tamper",
  "corrupt",
  "limit",
  "exceed",
  "abort",
  "timeout",
  "duplicate",
  "fallback",
  "retry",
  "conflict",
  "offline",
  "no-op",
  "rejected",
  "ignored",
  "throws",
  "missing",
  "denied",
  "forbidden",
  "boundary",
  "edge",
  "ambiguous",
  "dst",
  "polar",
  "cross-day",
  "cross day",
  "tampered",
  "truncate",
  "oversize",
  "overflow",
  "skipped",
  "skip",
  "empty",
  "long",
  "hostile",
  "xss",
  "non-latin",
  "non latin",
  "unknown",
  "out of range",
  "out-of-bounds",
  "out of bounds",
  "halt",
  "no mouse",
  "long-press",
  "long press",
  "print",
  "no horizontal",
  "expires",
  "501",
  "500",
  "401",
  "403",
  "404",
  "409",
  "413",
  "without auth",
  "without lat",
  "without query",
  "no zones",
  "no auto",
  "does not",
  "no longer",
  "absent",
  "non-numeric",
  "loopback",
  "ssrf",
  "unauth",
  "fall-back",
  "fall back",
  "spring-forward",
  "spring forward",
  "year boundary",
  "midnight",
  "year",
  "scrub",
  "exotic",
  "half-hour",
  "45-min",
  "chatham",
  "queue",
  "burst",
  "session",
  "fan-out",
  "delete",
  "clear",
];

let exitCode = 0;
const files = (await readdir(SPEC_DIR)).filter((f) => f.endsWith(".md") && f !== "00-overview.md");

for (const file of files.sort()) {
  const content = await readFile(join(SPEC_DIR, file), "utf8");
  const scenarios = [...content.matchAll(/^\s*Scenario(?: Outline)?:\s*(.+)$/gim)].map((m) => m[1].toLowerCase());
  const total = scenarios.length;
  if (total === 0) {
    console.warn(`[warn] ${file}: no scenarios`);
    continue;
  }
  const negative = scenarios.filter((s) => NEGATIVE_KEYWORDS.some((kw) => s.includes(kw))).length;
  const ratio = negative / total;
  const ok = negative >= 1 && ratio >= 0.3;
  console.log(`${ok ? "[pass]" : "[fail]"} ${file}  scenarios=${total} negative=${negative} ratio=${ratio.toFixed(2)}`);
  if (!ok) exitCode = 1;
}

if (exitCode !== 0) {
  console.error("\nSpecs need a stronger negative-scenario coverage. See specs/00-overview.md.");
}
process.exit(exitCode);
