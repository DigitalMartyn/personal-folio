// Local authoring server for the works CMS.
//
//   node cms/server.mjs        → http://localhost:5174/cms/
//
// Serves the whole site + the admin UI + a tiny JSON API, all same-origin
// (no CORS). This is a LOCAL tool — it is never deployed. Editing happens
// here; `Bake` writes the content into the static HTML for production.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_ROOT, worksJsonPath } from "./lib/paths.mjs";
import { bake } from "./bake.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5174;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".woff2": "font/woff2",
  ".framercms": "application/octet-stream",
  ".ico": "image/x-icon",
};

function send(res, code, body, type = "text/plain; charset=utf-8") {
  res.writeHead(code, { "Content-Type": type });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, buf) => {
    if (err) return send(res, 404, "Not found");
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(buf);
  });
}

// Resolve a request path to a file inside SITE_ROOT (directory → index.html).
function resolveSiteFile(urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel.endsWith("/")) rel += "index.html";
  const abs = path.join(SITE_ROOT, rel);
  if (!abs.startsWith(SITE_ROOT)) return null; // path traversal guard
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    return path.join(abs, "index.html");
  }
  // Bare directory without trailing slash → try /index.html
  if (!fs.existsSync(abs) && fs.existsSync(abs + "/index.html")) {
    return abs + "/index.html";
  }
  return abs;
}

const server = http.createServer(async (req, res) => {
  const url = req.url;

  // --- API ---
  if (url === "/cms/api/works" && req.method === "GET") {
    return serveFile(res, worksJsonPath());
  }
  if (url === "/cms/api/works" && req.method === "PUT") {
    const body = await readBody(req);
    try {
      const parsed = JSON.parse(body); // validate
      fs.writeFileSync(worksJsonPath(), JSON.stringify(parsed, null, 2));
      return send(res, 200, JSON.stringify({ ok: true }), "application/json");
    } catch (e) {
      return send(res, 400, JSON.stringify({ ok: false, error: String(e) }), "application/json");
    }
  }
  if (url === "/cms/api/region" && req.method === "PUT") {
    const body = await readBody(req);
    try {
      const { slug, regions } = JSON.parse(body);
      const data = JSON.parse(fs.readFileSync(worksJsonPath(), "utf8"));
      const project = data.projects.find((p) => p.slug === slug);
      if (!project) return send(res, 404, JSON.stringify({ ok: false, error: "no such slug" }), "application/json");
      project.regions = Object.assign({}, project.regions, regions);
      fs.writeFileSync(worksJsonPath(), JSON.stringify(data, null, 2));
      return send(res, 200, JSON.stringify({ ok: true }), "application/json");
    } catch (e) {
      return send(res, 400, JSON.stringify({ ok: false, error: String(e) }), "application/json");
    }
  }
  if (url === "/cms/api/bake" && req.method === "POST") {
    try {
      const result = bake();
      return send(res, 200, JSON.stringify({ ok: true, ...result }), "application/json");
    } catch (e) {
      return send(res, 500, JSON.stringify({ ok: false, error: String(e && e.stack || e) }), "application/json");
    }
  }

  // --- Admin UI ---
  if (url === "/cms" || url === "/cms/") {
    return serveFile(res, path.join(__dirname, "admin.html"));
  }
  if (url === "/cms/admin.js") {
    return serveFile(res, path.join(__dirname, "admin.js"));
  }
  if (url === "/cms/admin.css") {
    return serveFile(res, path.join(__dirname, "admin.css"));
  }

  // --- Site static files ---
  const filePath = resolveSiteFile(url);
  if (!filePath) return send(res, 403, "Forbidden");

  // Inject the dev renderer into site HTML so edits render live. This is only
  // ever done by this local server — the on-disk/committed HTML never has it.
  if (filePath.endsWith(".html")) {
    fs.readFile(filePath, "utf8", (err, html) => {
      if (err) return send(res, 404, "Not found");
      const tag = '<script type="module" src="/assets/cms-render.mjs"></script>';
      html = html.includes("</body>") ? html.replace("</body>", tag + "</body>") : html + tag;
      return send(res, 200, html, MIME[".html"]);
    });
    return;
  }
  return serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`\n  CMS authoring server → http://localhost:${PORT}/cms/`);
  console.log(`  Site preview          → http://localhost:${PORT}/\n`);
});
