// Slug ⇄ path ⇄ href helpers for the site layout.
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SITE_ROOT = path.resolve(__dirname, "..", "..");

export function projectHtmlPath(slug) {
  return path.join(SITE_ROOT, "works", slug, "index.html");
}

export function listingHtmlPath() {
  return path.join(SITE_ROOT, "works", "index.html");
}

export function homeHtmlPath() {
  return path.join(SITE_ROOT, "index.html");
}

export function worksJsonPath() {
  return path.join(SITE_ROOT, "data", "works.json");
}

// Canonical in-site link to a project detail page.
export function projectHref(slug) {
  return `/works/${slug}/`;
}
