// Marker-bounded HTML region utilities. No external dependencies.
// Regions are delimited by a single wrapper element carrying a data-cms-* attribute.
// We locate the wrapper's opening tag by attribute, then depth-match its closing tag
// (accounting for nested elements of the same tag name) to find the inner slice.

const VOID_TAGS = new Set([
  "area","base","br","col","embed","hr","img","input","link","meta",
  "param","source","track","wbr",
]);

// Find the opening tag matching `selectorAttr` (e.g. 'data-cms-region="challenge"').
// Returns { tag, openStart, innerStart } or null.
function findOpen(html, selectorAttr, from = 0) {
  const attrIdx = html.indexOf(selectorAttr, from);
  if (attrIdx === -1) return null;
  // Walk back to the '<' that begins this tag.
  const openStart = html.lastIndexOf("<", attrIdx);
  if (openStart === -1) return null;
  const tagMatch = /^<([a-zA-Z0-9]+)/.exec(html.slice(openStart, attrIdx + selectorAttr.length + 200));
  if (!tagMatch) return null;
  const tag = tagMatch[1].toLowerCase();
  const innerStart = html.indexOf(">", attrIdx) + 1;
  if (innerStart === 0) return null;
  return { tag, openStart, innerStart, attrIdx };
}

// Given the tag and the position just after the opening tag, find the matching close.
// Returns { innerEnd, closeEnd } where innerEnd is index of matching "</tag>".
function matchClose(html, tag, innerStart) {
  if (VOID_TAGS.has(tag)) return { innerEnd: innerStart, closeEnd: innerStart };
  const openRe = new RegExp("<" + tag + "(?=[\\s/>])", "gi");
  const closeRe = new RegExp("</" + tag + "\\s*>", "gi");
  let depth = 1;
  let pos = innerStart;
  while (depth > 0) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    const o = openRe.exec(html);
    const c = closeRe.exec(html);
    if (!c) return null;
    if (o && o.index < c.index) {
      depth += 1;
      pos = o.index + o[0].length;
    } else {
      depth -= 1;
      if (depth === 0) return { innerEnd: c.index, closeEnd: c.index + c[0].length };
      pos = c.index + c[0].length;
    }
  }
  return null;
}

// Return { innerStart, innerEnd, inner } for a region, or null if not found.
export function getRegion(html, selectorAttr) {
  const open = findOpen(html, selectorAttr);
  if (!open) return null;
  const close = matchClose(html, open.tag, open.innerStart);
  if (!close) return null;
  return {
    innerStart: open.innerStart,
    innerEnd: close.innerEnd,
    inner: html.slice(open.innerStart, close.innerEnd),
  };
}

// Replace a region's inner HTML. Returns the new html (unchanged if region not found).
export function replaceRegion(html, selectorAttr, newInner) {
  const r = getRegion(html, selectorAttr);
  if (!r) return html;
  return html.slice(0, r.innerStart) + newInner + html.slice(r.innerEnd);
}

// Replace the text content of a data-cms-field element (single text node expected).
export function replaceField(html, field, newText) {
  return replaceRegion(html, `data-cms-field="${field}"`, escapeHtml(newText));
}

// Replace <title> and <meta name="description">.
export function replaceHead(html, { title, description }) {
  if (title != null) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  }
  if (description != null) {
    html = html.replace(
      /(<meta name="description" content=")[\s\S]*?(")/,
      `$1${escapeAttr(description)}$2`
    );
  }
  return html;
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
