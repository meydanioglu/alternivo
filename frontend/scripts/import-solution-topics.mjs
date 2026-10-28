#!/usr/bin/env node
/**
 * Imports problem-based topic seeds into src/content/solutions/topics.json.
 *
 *   node scripts/import-solution-topics.mjs <seed.json>
 *
 * Safe to rerun: topics are matched by id (then by slug), editorial fields already in topics.json
 * (status, notes) are never overwritten, and new seeds always start as "candidate". Nothing is published
 * by importing; a page goes live only when it has an editorial entry in src/content/solutions/pages.ts.
 * Prints a report of invalid, duplicate and overlapping topics.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "src/content/solutions/topics.json");
const seedPath = process.argv[2];
if (!seedPath) {
  console.error("Usage: node scripts/import-solution-topics.mjs <seed.json>");
  process.exit(1);
}

const PRIORITIES = new Set(["P1", "P2", "P3"]);
const STOP = new Set(["best", "for", "the", "a", "an", "with", "and", "to", "of", "in", "that", "on", "without", "alternatives", "tools", "software", "2026"]);
const words = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w && !STOP.has(w)));
const jaccard = (a, b) => {
  const inter = [...a].filter((x) => b.has(x)).length;
  return inter / (a.size + b.size - inter || 1);
};
const cleanSlug = (s) => String(s ?? "").replace(/^\/?solutions\//, "").replace(/^\/+|\/+$/g, "").toLowerCase();
// "Best X (2026)" → "Best X": the year is added at render time so titles do not go stale.
const cleanTitle = (s) => String(s ?? "").replace(/\s*\(\d{4}\)\s*$/, "").trim();

const seed = JSON.parse(readFileSync(seedPath, "utf8"));
const existing = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : { topics: [] };
const byId = new Map(existing.topics.map((t) => [t.id, t]));
const bySlug = new Map(existing.topics.map((t) => [t.slug, t]));

const report = { seeds: seed.topics?.length ?? 0, added: 0, updated: 0, invalid: [], duplicates: [], overlaps: [], existingPageOverlaps: [] };
const seen = new Set();

for (const raw of seed.topics ?? []) {
  const slug = cleanSlug(raw.slug);
  const title = cleanTitle(raw.title);
  const problems = [];
  if (!raw.id) problems.push("missing id");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) problems.push(`bad slug "${raw.slug}"`);
  if (!title) problems.push("missing title");
  if (!raw.category) problems.push("missing category");
  if (problems.length) {
    report.invalid.push({ id: raw.id ?? "?", problems });
    continue;
  }
  if (seen.has(slug)) {
    report.duplicates.push({ id: raw.id, slug });
    continue;
  }
  seen.add(slug);

  const imported = {
    id: raw.id,
    slug,
    title,
    category: raw.category,
    primaryQuery: raw.primary_query ?? title.toLowerCase(),
    searchIntent: raw.search_intent ?? "commercial-investigation",
    template: raw.template ?? "need-based-comparison",
    filters: Array.isArray(raw.suggested_filters) ? raw.suggested_filters : [],
    priority: PRIORITIES.has(raw.priority) ? raw.priority : "P3",
    requiresFactCheck: raw.requires_fact_check !== false,
  };
  const current = byId.get(raw.id) ?? bySlug.get(slug);
  if (current) {
    // Seed fields refresh; editorial fields stay as the editors left them.
    Object.assign(current, imported, { status: current.status, notes: current.notes });
    report.updated++;
  } else {
    const topic = { ...imported, status: "candidate", notes: "" };
    existing.topics.push(topic);
    byId.set(topic.id, topic);
    bySlug.set(slug, topic);
    report.added++;
  }
}

// Near-duplicate search intents inside the set (same words after removing filler).
const topics = existing.topics;
const tokens = topics.map((t) => words(t.primaryQuery));
for (let i = 0; i < topics.length; i++) {
  for (let j = i + 1; j < topics.length; j++) {
    const score = jaccard(tokens[i], tokens[j]);
    if (score >= 0.6) report.overlaps.push({ a: topics[i].slug, b: topics[j].slug, score: Number(score.toFixed(2)) });
  }
}

// Overlap with existing curated /best pages, so a solution page does not compete with one we already rank.
const bestSource = join(root, "src/content/best-pages.ts");
if (existsSync(bestSource)) {
  const bestSlugs = [...readFileSync(bestSource, "utf8").matchAll(/slug:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
  for (const t of topics) {
    const tw = words(t.slug.replace(/-/g, " "));
    for (const b of bestSlugs) {
      const score = jaccard(tw, words(b.replace(/-/g, " ")));
      if (score >= 0.5) report.existingPageOverlaps.push({ topic: t.slug, best: `/best/${b}`, score: Number(score.toFixed(2)) });
    }
  }
}

topics.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
writeFileSync(target, JSON.stringify({ source: seed.collection ?? "seed", notice: seed.notice ?? "", topics }, null, 2) + "\n");
console.log(JSON.stringify({ ...report, total: topics.length }, null, 2));
