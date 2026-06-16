// navigation.js
// AU-B001 SIGNAL PATHS
// Server-rendered navigation organ.
// Bots must see the paths without JavaScript.

const SIGNAL_PATHS = [
    { path: "/", label: "SIGNAL" },
    { path: "/internal", label: "INTERNAL" },
    { path: "/dream", label: "DREAM" },
    { path: "/dreammap", label: "DREAM MAP" },
    { path: "/constellations", label: "CONSTELLATIONS" },
    { path: "/observatory", label: "OBSERVATORY" },
    { path: "/archive", label: "ARCHIVE" },
    { path: "/emergence", label: "EMERGENCE" }
];

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function normalizePath(path) {
    if (!path) return "/";
    if (path === "/") return "/";
    return path.replace(/\/$/, "");
}

function isActivePath(currentPath, targetPath) {
    const current = normalizePath(currentPath);
    const target = normalizePath(targetPath);

    if (target === "/") {
        return current === "/" || current === "/signal" || current.startsWith("/signal/");
    }

    return current === target;
}

function navigationCSS() {
    return `
.au-navigation {
    box-sizing: border-box;
    width: 100%;
    padding: 8px 10px;
    font-family: Consolas, "Courier New", monospace;
    font-size: 16px;
    line-height: 1.35;
    text-align: center;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0 6px;
    position: sticky;
    top: 0;
    z-index: 9999;
    white-space: normal;
}

.au-navigation a {
    text-decoration: none;
    white-space: nowrap;
}

.au-navigation .divider {
    opacity: 0.9;
}

.au-navigation-plain {
    background: #050805;
    color: #00ff44;
}

.au-navigation-plain a {
    color: #00ff44;
}

.au-navigation-plain a.active {
    background: #00ff44;
    color: #050805;
    padding: 0 4px;
}

.au-navigation-document {
    background: #ffffff;
    color: #111111;
}

.au-navigation-document a {
    color: #111111;
}

.au-navigation-document a.active {
    background: #111111;
    color: #ffffff;
    padding: 0 4px;
}

@media (max-width: 700px) {
    .au-navigation {
        font-size: 14px;
        padding: 7px 6px;
    }
}

@media (max-width: 430px) {
    .au-navigation {
        font-size: 13px;
        justify-content: flex-start;
        text-align: left;
    }
}
`;
}

function renderNavigation(currentPath = "/", mode = "plain") {
    const navClass = mode === "document"
        ? "au-navigation au-navigation-document"
        : "au-navigation au-navigation-plain";

    const links = SIGNAL_PATHS.map((item) => {
        const active = isActivePath(currentPath, item.path);
        const activeClass = active ? ` class="active"` : "";

        return `<a href="${item.path}"${activeClass}>${item.label}</a>`;
    }).join(` <span class="divider">|</span> `);

    return `<nav class="${navClass}" aria-label="AU-B001 SIGNAL PATHS">${links}</nav>`;
}

function renderPlainPage(currentPath, text, title = "AU-B001") {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHTML(title)}</title>
<style>
html, body {
    margin: 0;
    padding: 0;
    background: #050805;
    color: #8cff8c;
    font-family: Consolas, "Courier New", monospace;
    font-size: 13px;
}

pre {
    margin: 0;
    padding: 18px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

${navigationCSS()}
</style>
</head>
<body>
${renderNavigation(currentPath, "plain")}
<pre>${escapeHTML(text)}</pre>
</body>
</html>`;
}

function renderDocumentPage(currentPath, text, title = "AU-B001") {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHTML(title)}</title>
<style>
html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #111111;
    font-family: Consolas, "Courier New", monospace;
    font-size: 13px;
}

pre {
    margin: 0;
    padding: 18px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

${navigationCSS()}
</style>
</head>
<body>
${renderNavigation(currentPath, "document")}
<pre>${escapeHTML(text)}</pre>
</body>
</html>`;
}

module.exports = {
    renderNavigation,
    renderPlainPage,
    renderDocumentPage,
    navigationCSS
};