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
import { projectHtmlPath, worksJsonPath, listingHtmlPath, homeHtmlPath } from "./lib/paths.mjs";
import { renderListing } from "./lib/cards.mjs";

const FIELDS = ["title", "subtitle", "industry", "client", "year", "experience"];

// Rewrite broken flat project links (e.g. href="equinor.html") to the real
// nested path (/works/equinor/). Only touches known project slugs, so nav
// links like about.html are left alone.
function normalizeHrefs(html, slugs) {
  for (const slug of slugs) {
    html = html.split(`href="${slug}.html"`).join(`href="/works/${slug}/"`);
    html = html.split(`href="./${slug}"`).join(`href="/works/${slug}/"`);
  }
  return html;
}

function metaValue(project, field) {
  if (field === "title") return project.title;
  if (field === "subtitle") return project.subtitle;
  return project.meta?.[field] ?? "";
}

function bakeProject(project, slugs) {
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

  // Fix "more to explore" links
  html = normalizeHrefs(html, slugs);

  fs.writeFileSync(file, html);
  return { skipped: false };
}

function bakeListing(data) {
  const file = listingHtmlPath();
  let html = fs.readFileSync(file, "utf8");
  html = replaceRegion(html, 'data-cms-cards="listing"', renderListing(data.projects));
  fs.writeFileSync(file, html);
}

function bakeHome(data, slugs) {
  const file = homeHtmlPath();
  let html = fs.readFileSync(file, "utf8");
  html = normalizeHrefs(html, slugs);
  fs.writeFileSync(file, html);
}

export function bake() {
  const data = JSON.parse(fs.readFileSync(worksJsonPath(), "utf8"));
  const slugs = data.projects.map((p) => p.slug);
  const log = [];
  let baked = 0;
  for (const p of data.projects) {
    if (p.status !== "live" || !p.hasDetail) continue;
    const r = bakeProject(p, slugs);
    if (!r.skipped) {
      baked += 1;
      log.push(`✓ ${p.slug}`);
    }
  }
  bakeListing(data);
  log.push("✓ works listing cards");
  bakeHome(data, slugs);
  log.push("✓ home featured links");
  const summary = `Baked ${baked} project page(s) + listing + home.`;
  log.push(summary);
  return { baked, log };
}

// Auto-run when invoked directly: `node cms/bake.mjs`
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { log } = bake();
  for (const line of log) console.log("  " + line);
}
