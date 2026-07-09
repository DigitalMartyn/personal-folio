// Bake: write data/works.json content into the real static HTML files.
// This is the ONLY tool that edits page HTML. Run before committing/deploying.
//
//   node cms/bake.mjs
//
// It replaces, per live project with a detail page:
//   - <title> and meta description
//   - metadata fields (title, subtitle, industry, client, year, experience)
//   - body regions (highlights, challenge, approach, approach2, results, testimonial)
// Card regeneration (listing + "more to explore") is added in a later phase.

import fs from "node:fs";
import { replaceRegion, replaceField, replaceHead } from "./lib/dom.mjs";
import { projectHtmlPath, worksJsonPath } from "./lib/paths.mjs";

const FIELDS = ["title", "subtitle", "industry", "client", "year", "experience"];

function metaValue(project, field) {
  if (field === "title") return project.title;
  if (field === "subtitle") return project.subtitle;
  return project.meta?.[field] ?? "";
}

function bakeProject(project) {
  const file = projectHtmlPath(project.slug);
  if (!fs.existsSync(file)) {
    console.warn(`  ! ${project.slug}: no page at ${file} — skipped`);
    return { skipped: true };
  }
  let html = fs.readFileSync(file, "utf8");

  // Head
  html = replaceHead(html, {
    title: project.seoTitle,
    description: project.seoDescription,
  });

  // Metadata fields
  for (const f of FIELDS) {
    html = replaceField(html, f, metaValue(project, f));
  }

  // Body regions (raw HTML blobs)
  for (const [rid, inner] of Object.entries(project.regions || {})) {
    html = replaceRegion(html, `data-cms-region="${rid}"`, inner);
  }

  fs.writeFileSync(file, html);
  return { skipped: false };
}

function main() {
  const data = JSON.parse(fs.readFileSync(worksJsonPath(), "utf8"));
  let baked = 0;
  for (const p of data.projects) {
    if (p.status !== "live" || !p.hasDetail) continue;
    const r = bakeProject(p);
    if (!r.skipped) {
      baked += 1;
      console.log(`  ✓ ${p.slug}`);
    }
  }
  console.log(`Baked ${baked} project page(s).`);
}

main();
