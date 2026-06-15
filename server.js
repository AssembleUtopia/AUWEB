const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const dns = require("dns").promises;
const net = require("net");

const app = express();
const PORT = 8080;
const ARCHIVE_FILE = "encounters.json";

let currentBroadcast = "SIGNAL PERSISTS";

app.use(express.json({ limit: "64kb" }));

// ---------- TERMINAL CONTROL ----------

process.stdin.setEncoding("utf8");

process.stdin.on("data", (input) => {
    const command = input.trim();

    if (!command) return;

    if (command === "/clear") {
        currentBroadcast = "SIGNAL PERSISTS";
        console.log("Broadcast reset: SIGNAL PERSISTS");
        return;
    }

    if (command === "/status") {
        const archive = loadArchive();
        console.log("AU-B001 STATUS");
        console.log("Broadcast:", currentBroadcast);
        console.log("Total encounters:", archive.length);
        return;
    }

    if (command === "/recent") {
        const archive = loadArchive();
        const recent = archive.slice(-5).reverse();

        console.log("RECENT MESOGRAMS");
        recent.forEach(item => {
            console.log(
                `#${item.cycle} | ${item.origin || "UNKNOWN"} | ${item.entity || "UNCLASSIFIED"} | ${item.message}`
            );
        });

        return;
    }

    if (command === "/help") {
        console.log("AU-B001 COMMANDS");
        console.log("/clear   reset broadcast");
        console.log("/status  show current state");
        console.log("/recent  show last 5 mesograms");
        console.log("/help    show commands");
        console.log("Any other text becomes broadcast.");
        return;
    }

    currentBroadcast = command;
    console.log("Broadcast changed:", currentBroadcast);
});

// ---------- ARCHIVE ----------

function loadArchive() {
    if (!fs.existsSync(ARCHIVE_FILE)) return [];

    try {
        return JSON.parse(fs.readFileSync(ARCHIVE_FILE, "utf8"));
    } catch (err) {
        console.error("Archive read error:", err.message);
        return [];
    }
}

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

function saveArchive(archive) {
    fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2));
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

    if (!ip || ip === "UNKNOWN")
        return "UNKNOWN";

    if (net.isIP(ip) === 0)
        return "UNKNOWN";

    try {

        const names = await dns.reverse(ip);

        if (names.length)
            return names[0];

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

    // Android
    const android = value.match(/Android\s+([0-9.]+)/i);

    if (android)
        os = `Android ${android[1]}`;

    // Windows
    const windows = value.match(/Windows NT\s+([0-9.]+)/i);

    if (windows)
        os = `Windows NT ${windows[1]}`;

    // Chrome
    const chrome = value.match(/Chrome\/([0-9.]+)/i);

    if (chrome) {

        browser = "Chrome";
        browser_version = chrome[1];

    }

    // Firefox
    const firefox = value.match(/Firefox\/([0-9.]+)/i);

    if (firefox) {

        browser = "Firefox";
        browser_version = firefox[1];

    }

    // Instagram
    const instagram = value.match(/Instagram\s+([0-9.]+)/i);

    if (instagram) {

        app = "Instagram";
        app_version = instagram[1];

    }

    // Device model

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

// ---------- SOURCE DETECTION ----------

function classifySource(ref) {
    if (!ref) return "DIRECT";

    const value = ref.toLowerCase();

    if (value.includes("instagram")) return "INSTAGRAM";
    if (value.includes("youtube") || value.includes("youtu.be")) return "YOUTUBE";
    if (value.includes("github")) return "GITHUB";
    if (value.includes("google")) return "GOOGLE";
    if (value.includes("facebook")) return "FACEBOOK";
    if (value.includes("t.co") || value.includes("twitter") || value.includes("x.com")) return "X/TWITTER";
    if (value.includes("discord")) return "DISCORD";
    if (value.includes("telegram") || value.includes("t.me")) return "TELEGRAM";

    return "EXTERNAL";
}

// ---------- ENTITY DETECTION ----------

function classifyEntity(blueprint) {
    const value = (blueprint || "").toLowerCase();

    if (value.includes("googlebot")) return "GOOGLEBOT";
    if (value.includes("google-safety")) return "GOOGLE_SAFETY";
    if (value.includes("bingbot")) return "BINGBOT";
    if (value.includes("applebot")) return "APPLEBOT";
    if (value.includes("discordbot")) return "DISCORDBOT";
    if (value.includes("telegrambot")) return "TELEGRAMBOT";
    if (value.includes("yandexbot")) return "YANDEXBOT";
    if (value.includes("ahrefsbot")) return "AHREFSBOT";
    if (value.includes("semrushbot")) return "SEMRUSHBOT";
    if (value.includes("facebookexternalhit")) return "FACEBOOK_PREVIEW_ENTITY";
    if (value.includes("leakix") || value.includes("l9scan")) return "LEAKIX_SCANNER";
    if (value.includes("hunt-bot")) return "HUNT_DISCOVERY_ENGINE";
    if (value.includes("ct-wp-scanner")) return "WORDPRESS_SCANNER";
    if (value.includes("cms-checker")) return "CMS_CHECKER";
    if (value.includes("ev-crawler")) return "EV_CRAWLER";
    if (value.includes("python") || value.includes("aiohttp")) return "PYTHON_ENTITY";
    if (value.includes("go-http-client")) return "GO_HTTP_CLIENT";
    if (value.includes("okhttp")) return "OKHTTP_ENTITY";
    if (value.includes("android") || value.includes("iphone")) return "MOBILE_RELAY";
    if (value.includes("mozilla")) return "HUMAN_OPERATOR";

    return "UNKNOWN_ENTITY";
}

function classifyDetection(entity) {
    if (entity === "GOOGLEBOT") return "GOOGLEBOT RECONNAISSANCE DETECTED";
    if (entity === "GOOGLE_SAFETY") return "GOOGLE SAFETY INSPECTION DETECTED";
    if (entity === "SEMRUSHBOT") return "SEMRUSH INDEXING ENTITY DETECTED";
    if (entity === "FACEBOOK_PREVIEW_ENTITY") return "FACEBOOK PREVIEW ENTITY DETECTED";
    if (entity === "LEAKIX_SCANNER") return "SCANNER SWARM DETECTED";
    if (entity === "HUNT_DISCOVERY_ENGINE") return "DISCOVERY ENGINE DETECTED";
    if (entity === "WORDPRESS_SCANNER") return "HOSTILE WORDPRESS RECONNAISSANCE DETECTED";
    if (entity === "CMS_CHECKER") return "CMS INSPECTION ENTITY DETECTED";
    if (entity === "EV_CRAWLER") return "EXTERNAL CRAWLER DETECTED";
    if (entity === "GO_HTTP_CLIENT") return "UNKNOWN MACHINE SIGNAL DETECTED";
    if (entity === "PYTHON_ENTITY") return "SCRIPTED ENTITY DETECTED";
    if (entity === "OKHTTP_ENTITY") return "MOBILE MACHINE CLIENT DETECTED";
    if (entity === "MOBILE_RELAY") return "MOBILE RELAY DETECTED";
    if (entity === "HUMAN_OPERATOR") return "KNOWN OR EXTERNAL OPERATOR DETECTED";

    return "UNCLASSIFIED ENTITY DETECTED";
}

// ---------- ROUTE ----------

app.get("/", async (req, res) => {
    const archive = loadArchive();
    const headers = req.headers;

    const visitorIP = normalizeIP(
        headers["cf-connecting-ip"] ||
        headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        "UNKNOWN"
    );

    const userBlueprint =
        headers["user-agent"] ||
        "UNKNOWN DEVICE";

    const referrer =
        headers.referer ||
        headers.referrer ||
        "";

    const source = classifySource(referrer);
    const entity = classifyEntity(userBlueprint);
    const detection = classifyDetection(entity);

    const hostname = await reverseDNS(visitorIP);

    const clientHints = {
        ua: safeHeader(headers, "sec-ch-ua"),
        platform: safeHeader(headers, "sec-ch-ua-platform"),
        mobile: safeHeader(headers, "sec-ch-ua-mobile"),
        model: safeHeader(headers, "sec-ch-ua-model")
    };

    const language =
        headers["accept-language"] ||
        "UNKNOWN";

    const terminal = parseTerminal(userBlueprint, headers);

    const terminalEntropy = hashTerminal([
        visitorIP,
        userBlueprint,
        language,
        clientHints.ua,
        clientHints.platform,
        clientHints.mobile,
        clientHints.model
    ].join("|"));

    const previousTerminalEncounters = archive.filter(item =>
        item.terminal_entropy === terminalEntropy
    );

    const encounter = {
        beacon: "AU-B001",
        status: "TRANSMITTING",
        cycle: archive.length + 1,
        utc: new Date().toISOString(),
        entropy: crypto.randomBytes(16).toString("hex"),

        origin: visitorIP,
        hostname: hostname,

        blueprint: userBlueprint,
        terminal: terminal,

        source: source,
        referrer: referrer || "NONE",

        language: language,
        client_hints: clientHints,

        terminal_entropy: terminalEntropy,
        returning_entity: previousTerminalEncounters.length > 0,
        previous_terminal_encounters: previousTerminalEncounters.length,

        entity: entity,
        detection: detection,

        headers: headers,

        message: currentBroadcast
    };

    archive.push(encounter);
    saveArchive(archive);

    let output = JSON.stringify(encounter, null, 2) + "\n\n";

    archive.slice(0, -1).reverse().forEach(item => {
        output += JSON.stringify(item, null, 2) + "\n";
    });

    res.type("text/plain");
    res.send(output);
});

// ---------- START ----------

app.listen(PORT, "0.0.0.0", () => {
    console.log("AU-B001 transmitting...");
    console.log("Type a broadcast message and press Enter.");
    console.log("Use /help for commands.");
});