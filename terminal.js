const crypto = require("crypto");
const dns = require("dns").promises;
const net = require("net");

function normalizeIP(ip) {
    if (!ip) return "UNKNOWN";

    let value = String(ip).trim();

    if (value.includes(",")) {
        value = value.split(",")[0].trim();
    }

    if (value.startsWith("::ffff:")) {
        value = value.replace("::ffff:", "");
    }

    return value || "UNKNOWN";
}

function hashTerminal(input) {
    return crypto
        .createHash("sha256")
        .update(input)
        .digest("hex")
        .slice(0, 24);
}

function safeHeader(headers, key) {
    return headers[key.toLowerCase()] || "UNKNOWN";
}

async function reverseDNS(ip) {
    if (!ip || ip === "UNKNOWN") return "UNKNOWN";
    if (net.isIP(ip) === 0) return "UNKNOWN";

    try {
        const names = await dns.reverse(ip);
        if (names.length) return names[0];
    } catch (err) {}

    return "UNKNOWN";
}

function parseTerminal(blueprint, headers) {
    const value = blueprint || "";

    let os = "UNKNOWN";
    let browser = "UNKNOWN";
    let browser_version = "UNKNOWN";
    let device = "UNKNOWN";
    let app = "UNKNOWN";
    let app_version = "UNKNOWN";

    const android = value.match(/Android\s+([0-9.]+)/i);
    if (android) os = `Android ${android[1]}`;

    const windows = value.match(/Windows NT\s+([0-9.]+)/i);
    if (windows) os = `Windows NT ${windows[1]}`;

    const chrome = value.match(/Chrome\/([0-9.]+)/i);
    if (chrome) {
        browser = "Chrome";
        browser_version = chrome[1];
    }

    const firefox = value.match(/Firefox\/([0-9.]+)/i);
    if (firefox) {
        browser = "Firefox";
        browser_version = firefox[1];
    }

    const instagram = value.match(/Instagram\s+([0-9.]+)/i);
    if (instagram) {
        app = "Instagram";
        app_version = instagram[1];
    }

    const deviceMatch =
        value.match(/Android\s+[0-9.]+;\s*([^;)]+?)\s+Build\//i);

    if (deviceMatch)
        device = deviceMatch[1].trim();

    return {
        os,
        browser,
        browser_version,
        device,
        app,
        app_version
    };
}

module.exports = {
    normalizeIP,
    hashTerminal,
    safeHeader,
    reverseDNS,
    parseTerminal
};