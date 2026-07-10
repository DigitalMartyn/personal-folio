# Works CMS

A tiny, dependency-free CMS for the case-study pages. Content lives in
`data/works.json`; a **bake** step writes it into the static HTML that ships.
No build tools, no `node_modules` — just Node.

## Run it

```bash
node cms/server.mjs
```

- Admin UI:  http://localhost:5174/cms/
- Site preview (with live rendering): http://localhost:5174/

## Everyday workflow

1. Open the admin (`/cms/`). Edit titles, subtitles, status (live/draft),
   order (drag rows), covers, and the Industry/Client/Year/Experience +
   SEO + page body sections (via **Edit**).
2. **Save** — writes `data/works.json`.
3. **Bake to site** — writes the content into the real `works/*/index.html`,
   `works/index.html` (listing) and `index.html` (home featured links).
4. Verify with a plain static server, then commit + push:
   ```bash
   npx serve . -l 5173      # confirms the BAKED static output, no CMS involved
   git add -A && git commit -m "content: …" && git push
   ```

## Editing a page body in place

Open a project with `?cms=edit`, e.g.
http://localhost:5174/works/equinor/?cms=edit — the body sections become
editable; click **Save** in the bottom bar, then **Bake** in the admin.
(In-place editing normalises the section markup and shows content revealed,
i.e. it drops that section's scroll-fade — expected.)

## How it fits together

- `data/works.json` — single source of truth.
- `cms/server.mjs` — local server (:5174): site + admin + JSON API. Injects the
  dev renderer on the fly, so committed HTML never depends on it.
- `cms/bake.mjs` (`node cms/bake.mjs`) — writes JSON → static HTML. The only
  thing that edits pages. Draft projects are excluded from the site.
- `cms/lib/` — `dom.mjs` (marker-bounded region read/write), `cards.mjs`
  (listing card generator + templates), `paths.mjs`.
- `assets/cms-render.mjs` — DEV-ONLY live renderer + in-place editor.
- Pages carry `data-cms-region` / `data-cms-field` / `data-cms-cards` markers
  that the bake and renderer target. Don't remove them.

## Notes

- Production stays 100% static: the renderer is never committed; baked pages
  have the content inline.
- `cch-digitaltwin` still needs its real Industry/Year (currently placeholder
  from Equinor) — set them in the admin.
- Adding a brand-new project scaffolds a draft metadata row only; its page
  body must be created separately.
