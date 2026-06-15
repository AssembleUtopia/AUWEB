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

function updateEncounter(cycle, entropy, patch) {

    const archive = loadArchive();

    const index = archive.findIndex(item =>
        item.cycle === cycle &&
        item.entropy === entropy
    );

    if (index === -1)
        return null;

    archive[index] = {
        ...archive[index],
        ...patch,
        updated_utc: new Date().toISOString()
    };

    archive[index].disclosure =
        calculateDisclosure(archive[index]);

    saveArchive(archive);

    return archive[index];

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


function calculateDisclosure(encounter) {

    let score = 0;

    const fields = [

        encounter.origin,
        encounter.hostname,
        encounter.referrer,

        encounter.language,

        encounter.terminal.os,
        encounter.terminal.browser,
        encounter.terminal.browser_version,
        encounter.terminal.device,
        encounter.terminal.app,
        encounter.terminal.app_version,

        encounter.client_hints.ua,
        encounter.client_hints.platform,
        encounter.client_hints.mobile,
        encounter.client_hints.model,

        encounter.browser_probe?.timezone,
        encounter.browser_probe?.screen,
        encounter.browser_probe?.viewport,
        encounter.browser_probe?.pixel_ratio,
        encounter.browser_probe?.theme,
        encounter.browser_probe?.cores,
        encounter.browser_probe?.memory_gb,
        encounter.browser_probe?.touch_points,
        encounter.browser_probe?.network_type

    ];

    fields.forEach(value => {

        if (
            value &&
            value !== "UNKNOWN" &&
            value !== "NONE"
        ) {
            score++;
        }

    });

    if (score >= 12)
        return "HIGH";

    if (score >= 8)
        return "MEDIUM";

    return "LOW";

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

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function renderHTML(encounter, archive) {

    const payload = JSON.stringify({
        cycle: encounter.cycle,
        entropy: encounter.entropy
    });

    let archiveText =
        JSON.stringify(encounter, null, 2) + "\n\n";

    archive.slice(0, -1).reverse().forEach(item => {
        archiveText += JSON.stringify(item, null, 2) + "\n";
    });

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>AU-B001</title>
<style>
html, body {
    margin: 0;
    padding: 0;
    background: #050805;
    color: #8cff8c;
    font-family: Consolas, "Courier New", monospace;
    font-size: 13px;
    white-space: pre-wrap;
}
body {
    padding: 18px;
}
</style>
</head>
<body>${escapeHTML(archiveText)}
<script>
(function () {

    const start = Date.now();
    const encounter = ${payload};

    function collect(extra) {

        const connection =
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection ||
            {};

        return Object.assign({

            cycle: encounter.cycle,
            entropy: encounter.entropy,

            timezone:
                Intl.DateTimeFormat().resolvedOptions().timeZone ||
                "UNKNOWN",

            screen_width:
                screen.width,

            screen_height:
                screen.height,

            viewport_width:
                window.innerWidth,

            viewport_height:
                window.innerHeight,

            pixel_ratio:
                window.devicePixelRatio || 1,

            theme:
                window.matchMedia &&
                window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light",

            cores:
                navigator.hardwareConcurrency ||
                "UNKNOWN",

            memory_gb:
                navigator.deviceMemory ||
                "UNKNOWN",

            touch_points:
                navigator.maxTouchPoints || 0,

            network_type:
                connection.effectiveType ||
                connection.type ||
                "UNKNOWN",

            save_data:
                connection.saveData === true,

            dwell_seconds:
                Math.round((Date.now() - start) / 1000)

        }, extra || {});

    }

    function send(extra) {

        const data =
            JSON.stringify(collect(extra));

        try {

            navigator.sendBeacon(
                "/beacon",
                new Blob(
                    [data],
                    { type: "application/json" }
                )
            );

        } catch (err) {

            fetch("/beacon", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: data,
                keepalive: true
            }).catch(function () {});

        }

    }

    send({
        event: "arrival"
    });

    window.addEventListener("pagehide", function () {
        send({
            event: "departure"
        });
    });

})();
</script>
</body>
</html>`;

}

// ---------- ROUTE ----------

app.get("/", (req, res) => {

    res.type("html");
    res.send(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>AU-B001</title>
<style>
html, body {
    margin: 0;
    padding: 0;
    background: #050805;
    color: #8cff8c;
    font-family: Consolas, "Courier New", monospace;
    font-size: 13px;
}
body {
    padding: 18px;
}
</style>
</head>
<body>AU-B001
STATUS: LISTENING
PROBE: INITIALIZING
SIGNAL: AWAITING DISCLOSURE</body>

<script>
(function () {

    const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection ||
        {};

    const probe = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UNKNOWN",
        screen_width: screen.width,
        screen_height: screen.height,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        pixel_ratio: window.devicePixelRatio || 1,
        theme: window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light",
        cores: navigator.hardwareConcurrency || "UNKNOWN",
        memory_gb: navigator.deviceMemory || "UNKNOWN",
        touch_points: navigator.maxTouchPoints || 0,
        network_type: connection.effectiveType || connection.type || "UNKNOWN",
        save_data: connection.saveData === true
    };

    fetch("/arrive", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(probe)
    })
    .then(res => res.json())
    .then(data => {
        window.location.href =
            "/signal/" + data.cycle + "/" + data.entropy;
    })
    .catch(() => {
        document.body.textContent =
            "AU-B001\\nSTATUS: PROBE FAILED\\nSIGNAL: INTERRUPTED";
    });

})();
</script>
</html>`);

});

app.post("/arrive", async (req, res) => {
    const archive = loadArchive();
    const headers = req.headers;
    const body = req.body || {};

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

    const entropy = crypto.randomBytes(16).toString("hex");

    const encounter = {
        beacon: "AU-B001",
        status: "TRANSMITTING",
        cycle: archive.length + 1,
        utc: new Date().toISOString(),
        entropy: entropy,

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

        browser_probe: {
            status: "BROWSER_SIGNAL_RECEIVED",
            last_event: "arrival",
            timezone: body.timezone || "UNKNOWN",
            screen: body.screen_width && body.screen_height
                ? `${body.screen_width}x${body.screen_height}`
                : "UNKNOWN",
            viewport: body.viewport_width && body.viewport_height
                ? `${body.viewport_width}x${body.viewport_height}`
                : "UNKNOWN",
            pixel_ratio: body.pixel_ratio || "UNKNOWN",
            theme: body.theme || "UNKNOWN",
            cores: body.cores || "UNKNOWN",
            memory_gb: body.memory_gb || "UNKNOWN",
            touch_points: body.touch_points ?? "UNKNOWN",
            network_type: body.network_type || "UNKNOWN",
            save_data: body.save_data ?? "UNKNOWN",
            dwell_seconds: 0,
            received_utc: new Date().toISOString()
        },

        disclosure: "LOW",
        message: currentBroadcast
    };

    encounter.disclosure =
        calculateDisclosure(encounter);

    archive.push(encounter);
    saveArchive(archive);

    res.json({
        status: "ARRIVAL_RECORDED",
        cycle: encounter.cycle,
        entropy: encounter.entropy
    });
});

app.get("/signal/:cycle/:entropy", (req, res) => {
    const archive = loadArchive();

    const cycle = Number(req.params.cycle);
    const entropy = req.params.entropy;

    const encounter = archive.find(item =>
        item.cycle === cycle &&
        item.entropy === entropy
    );

    if (!encounter) {
        res.status(404).type("text/plain");
        res.send("AU-B001\nSTATUS: SIGNAL NOT FOUND");
        return;
    }

    res.type("html");
    res.send(renderHTML(encounter, archive));
});

app.post("/beacon", (req, res) => {

    const body = req.body || {};

    const cycle =
        Number(body.cycle);

    const entropy =
        body.entropy;

    if (!cycle || !entropy) {

        res.status(400).json({
            status: "REJECTED",
            reason: "MISSING_CYCLE_OR_ENTROPY"
        });

        return;

    }

    const archive = loadArchive();

    const existing = archive.find(item =>
        item.cycle === cycle &&
        item.entropy === entropy
    );

    if (!existing) {

        res.status(404).json({
            status: "NOT_FOUND"
        });

        return;

    }

    const previousProbe =
        existing.browser_probe || {};

    const probe = {

        ...previousProbe,

        status:
        body.event === "departure"
        ? "ENCOUNTER_COMPLETED"
        : "BROWSER_SIGNAL_RECEIVED",

        last_event:
            body.event || "signal",

        timezone:
            body.timezone ||
            previousProbe.timezone ||
            "UNKNOWN",

        screen:
            body.screen_width && body.screen_height
                ? `${body.screen_width}x${body.screen_height}`
                : previousProbe.screen || "UNKNOWN",

        viewport:
            body.viewport_width && body.viewport_height
                ? `${body.viewport_width}x${body.viewport_height}`
                : previousProbe.viewport || "UNKNOWN",

        pixel_ratio:
            body.pixel_ratio ||
            previousProbe.pixel_ratio ||
            "UNKNOWN",

        theme:
            body.theme ||
            previousProbe.theme ||
            "UNKNOWN",

        cores:
            body.cores ||
            previousProbe.cores ||
            "UNKNOWN",

        memory_gb:
            body.memory_gb ||
            previousProbe.memory_gb ||
            "UNKNOWN",

        touch_points:
            body.touch_points ??
            previousProbe.touch_points ??
            "UNKNOWN",

        network_type:
            body.network_type ||
            previousProbe.network_type ||
            "UNKNOWN",

        save_data:
            body.save_data ??
            previousProbe.save_data ??
            "UNKNOWN",

        dwell_seconds:
            body.dwell_seconds ??
            previousProbe.dwell_seconds ??
            0,

        received_utc:
            new Date().toISOString()

    };

    const updated = updateEncounter(cycle, entropy, {
        browser_probe: probe
    });

    res.json({
        status: "RECEIVED",
        cycle: cycle,
        disclosure: updated
            ? updated.disclosure
            : "UNKNOWN"
    });

});

app.get("/archive", (req, res) => {
    const archive = loadArchive();

    res.type("application/json");
    res.send(JSON.stringify(archive, null, 2));
});

app.get("/observatory", (req, res) => {

    const archive = loadArchive();

    const uniqueOrigins =
        new Set(
            archive.map(item => item.origin)
        ).size;

    const uniqueTerminals =
        new Set(
            archive.map(item => item.terminal_entropy)
        ).size;

    const entityCounts = {};

    archive.forEach(item => {

        entityCounts[item.entity] =
            (entityCounts[item.entity] || 0) + 1;

    });

    const report = {

        beacon: "AU-B001",

        status: "OBSERVATORY OPEN",

        total_encounters:
            archive.length,

        unique_origins:
            uniqueOrigins,

        unique_terminals:
            uniqueTerminals,

        entities:
            entityCounts,

        most_recent:
            archive.length
                ? archive[archive.length - 1]
                : null

    };

    res.type("text/plain");
    res.send(
        JSON.stringify(report, null, 2)
    );

});

// ---------- START ----------

app.listen(PORT, "0.0.0.0", () => {
    console.log("AU-B001 transmitting...");
    console.log("Type a broadcast message and press Enter.");
    console.log("Use /help for commands.");
});