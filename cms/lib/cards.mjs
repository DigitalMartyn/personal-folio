// Card generation for the works listing (and, later, home featured + "more to explore").
// Templates are captured Framer card markup with __TOKEN__ placeholders; we clone them
// per project so the exact look/breakpoint variants are preserved, only content changes.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { projectHref } from "./paths.mjs";
import { escapeHtml, escapeAttr } from "./dom.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TPL_DIR = path.join(__dirname, "templates");

const LISTING_CARD = fs.readFileSync(path.join(TPL_DIR, "listing-card.html"), "utf8");
const LISTING_LOADMORE = fs.readFileSync(path.join(TPL_DIR, "listing-loadmore.html"), "utf8");
const LISTING_PREFIX = "<!--$--><!--$-->";

const PLACEHOLDER_COVER = "/assets/placeholder-cover.svg";

function liveSorted(projects) {
  return projects
    .filter((p) => p.status === "live")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function fillCard(template, project) {
  // A card links to its detail page only when that page exists (hasDetail).
  // Projects that are live but not yet built get a placeholder cover and a
  // non-navigable card (so we never link to a 404), with the title always
  // shown so they're still identifiable.
  const linkable = !!project.hasDetail;
  const cover = project.cover || PLACEHOLDER_COVER;

  let html = template
    .split("__TITLE__").join(escapeHtml(project.title || ""))
    .split("__ALT__").join(escapeAttr(project.coverAlt || project.title || ""))
    .split("__COVER__").join(escapeAttr(cover));

  if (linkable) {
    html = html.split("__HREF__").join(escapeAttr(projectHref(project.slug)));
  } else {
    html = html
      .replace('href="__HREF__"', 'data-placeholder="true"')
      .replace(
        'data-framer-name="Title" style="opacity:0"',
        'data-framer-name="Title" style="opacity:1"'
      );
  }
  return html;
}

// Inner HTML for the listing grid container ([data-cms-cards="listing"]).
export function renderListing(projects) {
  const cards = liveSorted(projects).map((p) => fillCard(LISTING_CARD, p)).join("");
  return LISTING_PREFIX + cards + LISTING_LOADMORE;
}
