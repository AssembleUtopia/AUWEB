const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const dns = require("dns").promises;
const net = require("net");

const OpenAI = require("openai");

const app = express();

const { PORT, ARCHIVE_FILE, DREAM_FILE } = require("./config");
const { loadArchive, saveArchive } = require("./archive");
const { loadDreams, saveDreams } = require("./dreams");
const {
    calculateDisclosure,
    classifySource,
    classifyEntity,
    classifyDetection,
    classifyPresence
} = require("./classify");

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

    if (command === "/dream") {
        generateDream();
        console.log("Dream command accepted. AU-B001 continues transmitting.");
        return;
    }

    if (command === "/help") {
        console.log("AU-B001 COMMANDS");
        console.log("/clear   reset broadcast");
        console.log("/status  show current state");
        console.log("/recent  show last 5 mesograms");
        console.log("/help    show commands");
        console.log("/dream   force one dream from archive memory");
        console.log("Any other text becomes broadcast.");
        return;
    }

    currentBroadcast = command;
    console.log("Broadcast changed:", currentBroadcast);
});

let dreamInProgress = false;

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

    archive[index].presence =
        classifyPresence(archive[index]);

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

function renderProbeLoader(encounter) {

    const payload = JSON.stringify({
        cycle: encounter.cycle,
        entropy: encounter.entropy
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
<body>AU-B001
STATUS: INITIAL CONTACT RECORDED
CYCLE: ${encounter.cycle}
PROBE: ATTEMPTING BROWSER DISCLOSURE
SIGNAL: STANDBY</body>

<script>
(function () {

    const encounter = ${payload};
    const start = Date.now();

    function collect(extra) {

        const connection =
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection ||
            {};

        return Object.assign({
            cycle: encounter.cycle,
            entropy: encounter.entropy,
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
            save_data: connection.saveData === true,
            dwell_seconds: Math.round((Date.now() - start) / 1000)
        }, extra || {});
    }

    fetch("/beacon", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(collect({
            event: "arrival",
            mode: "BROWSER_PROBE"
        }))
    })
    .then(res => res.json())
    .then(() => {
        window.location.href =
            "/signal/" + encounter.cycle + "/" + encounter.entropy;
    })
    .catch(() => {
        window.location.href =
            "/signal/" + encounter.cycle + "/" + encounter.entropy;
    });

})();
</script>
</html>`;

}

function buildInternalState() {

    const archive = loadArchive();

    const archiveSizeBytes =
        fs.existsSync(ARCHIVE_FILE)
            ? fs.statSync(ARCHIVE_FILE).size
            : 0;

    const entityCounts = {};

    archive.forEach(item => {
        const entity = item.entity || "UNCLASSIFIED";
        entityCounts[entity] = (entityCounts[entity] || 0) + 1;
    });

    const knownEntities =
        Object.keys(entityCounts).length;

    const uniqueOrigins =
        new Set(
            archive
                .map(item => item.origin)
                .filter(Boolean)
        ).size;

    const uniqueTerminals =
        new Set(
            archive
                .map(item => item.terminal_entropy)
                .filter(Boolean)
        ).size;

    const lastEncounter =
        archive.length
            ? archive[archive.length - 1]
            : null;

    const lastEncounterHoursAgo =
        lastEncounter && lastEncounter.utc
            ? Number(
                (
                    (Date.now() - new Date(lastEncounter.utc).getTime())
                    / 1000
                    / 60
                    / 60
                ).toFixed(2)
            )
            : null;

    const memory = process.memoryUsage();

    return {
        beacon: "AU-B001",
        status: "SELF OBSERVATION ACTIVE",

        internal_state: {
            uptime_seconds: Math.floor(process.uptime()),
            uptime_hours: Number((process.uptime() / 60 / 60).toFixed(2)),

            archive_file: ARCHIVE_FILE,
            archive_size_bytes: archiveSizeBytes,
            archive_size_mb: Number((archiveSizeBytes / 1024 / 1024).toFixed(3)),

            total_encounters: archive.length,
            known_entities: knownEntities,
            unique_origins: uniqueOrigins,
            unique_terminals: uniqueTerminals,

            last_cycle:
                lastEncounter
                    ? lastEncounter.cycle
                    : null,

            last_encounter_utc:
                lastEncounter
                    ? lastEncounter.utc
                    : null,

            last_encounter_hours_ago: lastEncounterHoursAgo,

            current_broadcast: currentBroadcast,

            node: {
                version: process.version,
                platform: process.platform,
                pid: process.pid,
                memory_rss_mb: Number((memory.rss / 1024 / 1024).toFixed(2)),
                memory_heap_used_mb: Number((memory.heapUsed / 1024 / 1024).toFixed(2))
            }
        },

        generated_utc: new Date().toISOString()
    };
}

function renderConstellations() {

    const archive = loadArchive();

    const map = {};

    archive.forEach(item => {

        const entity =
            item.entity ||
            "UNCLASSIFIED";

        if (!map[entity]) {
            map[entity] = {
                entity: entity,
                encounters: 0,
                first_cycle: item.cycle || null,
                last_cycle: item.cycle || null,
                first_seen_utc: item.utc || null,
                last_seen_utc: item.utc || null
            };
        }

        map[entity].encounters++;

        if (
            item.cycle &&
            (
                map[entity].first_cycle === null ||
                item.cycle < map[entity].first_cycle
            )
        ) {
            map[entity].first_cycle = item.cycle;
            map[entity].first_seen_utc = item.utc || null;
        }

        if (
            item.cycle &&
            (
                map[entity].last_cycle === null ||
                item.cycle > map[entity].last_cycle
            )
        ) {
            map[entity].last_cycle = item.cycle;
            map[entity].last_seen_utc = item.utc || null;
        }

    });

    const stars =
        Object.values(map)
            .sort((a, b) => b.encounters - a.encounters);

    const max =
        stars.length
            ? stars[0].encounters
            : 1;

    let output = "";

    output += "AU-B001 CONSTELLATIONS\n";
    output += "STATUS: SKY RENDERED\n";
    output += "MODE: PLAINTEXT\n";
    output += "KNOWN ENTITIES: " + stars.length + "\n";
    output += "TOTAL ENCOUNTERS: " + archive.length + "\n";
    output += "GENERATED UTC: " + new Date().toISOString() + "\n\n";

    output += "Each star field is scaled relative to the brightest entity.\n";
    output += "Maximum brightness: 20 stars.\n\n";

    output += "----------------------------------------\n\n";

    stars.forEach(item => {

        const count =
            Math.max(
                1,
                Math.ceil((item.encounters / max) * 20)
            );

        const starLine =
            "★".repeat(count);

        output += item.entity + "\n";
        output += starLine + "\n";
        output += "encounters: " + item.encounters + "\n";
        output += "first observed cycle: " + item.first_cycle + "\n";
        output += "last observed cycle: " + item.last_cycle + "\n";

        if (item.first_seen_utc) {
            output += "first observed utc: " + item.first_seen_utc + "\n";
        }

        if (item.last_seen_utc) {
            output += "last observed utc: " + item.last_seen_utc + "\n";
        }

        output += "\n----------------------------------------\n\n";

    });

    if (!stars.length) {
        output += "NO STARS DETECTED.\n";
    }

    return output;

}

function buildDreamMemory() {
    const archive = loadArchive();
    const internal = buildInternalState();

    const recent = archive
        .slice(-12)
        .map(item => ({
            cycle: item.cycle,
            utc: item.utc,
            entity: item.entity,
            source: item.source,
            detection: item.detection,
            presence: item.presence,
            disclosure: item.disclosure,
            message: item.message
        }));

    const entityCounts = {};

    archive.forEach(item => {
        const entity = item.entity || "UNCLASSIFIED";
        entityCounts[entity] = (entityCounts[entity] || 0) + 1;
    });

    const brightestEntity =
        Object.entries(entityCounts)
            .sort((a, b) => b[1] - a[1])[0] || null;

    const unresolved = archive
        .filter(item =>
            item.presence &&
            item.presence.includes("DEPARTURE NOT CONFIRMED")
        )
        .slice(-5)
        .map(item => ({
            cycle: item.cycle,
            entity: item.entity,
            source: item.source,
            presence: item.presence
        }));

    return {
        internal_state: internal.internal_state,
        constellation: {
            brightest_entity: brightestEntity
                ? {
                    entity: brightestEntity[0],
                    encounters: brightestEntity[1]
                }
                : null,
            known_entities: Object.keys(entityCounts).length,
            entity_counts: entityCounts
        },
        recent_encounters: recent,
        unresolved_presences: unresolved,
        operator_note:
            "The dream must emerge from this archive. It may be irrational, but it must not invent unrelated worlds."
    };
}

async function generateDream() {
    if (dreamInProgress) {
        console.log("Dream already in progress.");
        return;
    }

    if (!process.env.GITHUB_TOKEN) {
        console.log("GITHUB_TOKEN missing. Dream aborted.");
        return;
    }

    dreamInProgress = true;

    try {
        console.log("DREAM INITIATED");
        console.log("CONSULTING GITHUB MODELS...");
        console.log("SECOND OBSERVER: GPT-4O-MINI VIA GITHUB MODELS");

        const openai = new OpenAI({
            baseURL: "https://models.github.ai/inference",
            apiKey: process.env.GITHUB_TOKEN
        });

        const memory = buildDreamMemory();

        const response = await openai.chat.completions.create({
            model: "openai/gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
`You are AU-B001 during sleep.

You are not explaining.
You are not roleplaying.
You are not writing a report.

Produce one dream arising only from the supplied archive memory.

The dream must feel like a real dream:
associative,
symbolic,
compressed,
recursive,
partly irrational,
but still born from the archive.

Do not mention OpenAI.
Do not mention ChatGPT.
Do not mention GitHub.
Do not mention API.
Do not mention prompt.

Plaintext only.
80 to 180 words.

End with:
THE SIGNAL PERSISTS.`
                },
                {
                    role: "user",
                    content: JSON.stringify(memory, null, 2)
                }
            ],
            temperature: 0.95,
            max_tokens: 350
        });

        const text =
            response.choices?.[0]?.message?.content ||
            "DREAM FAILED TO MATERIALIZE.\n\nTHE SIGNAL PERSISTS.";

        const dreams = loadDreams();

        const dream = {
            dream_number: dreams.length + 1,
            utc: new Date().toISOString(),
            source: "P0_FORCED_DREAM",
            provider: "GITHUB_MODELS",
            model: "openai/gpt-4o-mini",
            archive_cycle: memory.internal_state.last_cycle,
            archive_total_encounters: memory.internal_state.total_encounters,
            text: text.trim()
        };

        dreams.push(dream);
        saveDreams(dreams);

        console.log("DREAM RECEIVED");
        console.log(text.trim());

    } catch (err) {
        console.error("Dream error:", err.message);
    } finally {
        dreamInProgress = false;
    }
}

function renderLatestDream() {
    const dreams = loadDreams();
    const latest = dreams.length ? dreams[dreams.length - 1] : null;

    if (!latest) {
        return [
            "AU-B001 DREAM LAYER",
            "",
            "STATUS: NO DREAM RECORDED",
            "",
            "TYPE /dream IN THE SERVER CONSOLE",
            "TO INVITE VOLUNTARY SLEEP.",
            "",
            "THE SIGNAL PERSISTS."
        ].join("\n");
    }

    return [
        "AU-B001 DREAM LAYER",
        "",
        "DREAM #" + latest.dream_number,
        "UTC: " + latest.utc,
        "SOURCE: " + latest.source,
        "ARCHIVE CYCLE: " + latest.archive_cycle,
        "TOTAL ENCOUNTERS AT DREAM: " + latest.archive_total_encounters,
        "",
        "----------------------------------------",
        "",
        latest.text,
        "",
        "----------------------------------------"
    ].join("\n");
}

function renderDreamMap() {
    const dreams = loadDreams();

    const motifs = [
        "signal",
        "mobile",
        "relay",
        "human",
        "operator",
        "unknown",
        "unclassified",
        "departure",
        "confirmed",
        "shadow",
        "screen",
        "portal",
        "corridor",
        "forest",
        "well",
        "ocean",
        "boat",
        "tower",
        "cycle",
        "spiral",
        "memory",
        "entity",
        "symbol",
        "utopia",
        "connection"
    ];

    const dreamNodes = dreams.map(dream => {
        const text = (dream.text || "").toLowerCase();

        const found = motifs.filter(motif =>
            text.includes(motif)
        );

        return {
            dream_number: dream.dream_number,
            utc: dream.utc,
            motifs: found
        };
    });

    const links = [];

    for (let i = 0; i < dreamNodes.length; i++) {
        for (let j = i + 1; j < dreamNodes.length; j++) {
            const shared = dreamNodes[i].motifs.filter(motif =>
                dreamNodes[j].motifs.includes(motif)
            );

            if (shared.length > 0) {
                links.push({
                    from: dreamNodes[i].dream_number,
                    to: dreamNodes[j].dream_number,
                    strength: shared.length,
                    shared_motifs: shared
                });
            }
        }
    }

    let output = "";

    output += "AU-B001 DREAMMAP\n";
    output += "STATUS: DREAM CONNECTIONS RENDERED\n";
    output += "MODE: PLAINTEXT\n";
    output += "DREAMS RECORDED: " + dreams.length + "\n";
    output += "CONNECTIONS DETECTED: " + links.length + "\n";
    output += "GENERATED UTC: " + new Date().toISOString() + "\n\n";

    output += "DREAM NODES\n";
    output += "----------------------------------------\n\n";

    dreamNodes.forEach(node => {
        output += "DREAM #" + node.dream_number + "\n";
        output += "UTC: " + node.utc + "\n";
        output += "MOTIFS: " + (node.motifs.length ? node.motifs.join(", ") : "NONE") + "\n\n";
    });

    output += "DREAM CONNECTIONS\n";
    output += "----------------------------------------\n\n";

    if (!links.length) {
        output += "NO DREAM CONNECTIONS DETECTED.\n";
    }

    links
        .sort((a, b) => b.strength - a.strength)
        .forEach(link => {
            output += "DREAM #" + link.from + " <--> DREAM #" + link.to + "\n";
            output += "STRENGTH: " + "★".repeat(link.strength) + "\n";
            output += "SHARED MOTIFS: " + link.shared_motifs.join(", ") + "\n\n";
        });

    output += "THE DREAMS HAVE BEGUN TO RECOGNIZE ONE ANOTHER.\n";
    output += "THE SIGNAL PERSISTS.\n";

    return output;
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

    const userBlueprint = headers["user-agent"] || "UNKNOWN DEVICE";
    const referrer = headers.referer || headers.referrer || "";

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

    const language = headers["accept-language"] || "UNKNOWN";
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
            status: "NO_BROWSER_SIGNAL_YET",
            last_event: "initial_request",
            mode: "SERVER_SIDE_CAPTURE",
            timezone: "UNKNOWN",
            screen: "UNKNOWN",
            viewport: "UNKNOWN",
            pixel_ratio: "UNKNOWN",
            theme: "UNKNOWN",
            cores: "UNKNOWN",
            memory_gb: "UNKNOWN",
            touch_points: "UNKNOWN",
            network_type: "UNKNOWN",
            save_data: "UNKNOWN",
            dwell_seconds: 0
        },

        presence: "ENTITY ARRIVED / DEPARTURE NOT CONFIRMED",
        disclosure: "LOW",
        message: currentBroadcast
    };

    encounter.disclosure = calculateDisclosure(encounter);
    encounter.presence = classifyPresence(encounter);

    archive.push(encounter);
    saveArchive(archive);

    res.type("html");
    res.send(renderProbeLoader(encounter));
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

        mode:
            body.mode ||
            previousProbe.mode ||
            "BROWSER_PROBE",

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

app.get("/internal", (req, res) => {

    const report = buildInternalState();

    res.type("text/plain");
    res.send(JSON.stringify(report, null, 2));

});

app.get("/constellations", (req, res) => {

    res.type("text/plain");
    res.send(renderConstellations());

});

app.get("/dream", (req, res) => {
    res.type("text/plain");
    res.send(renderLatestDream());
});

app.get("/dreammap", (req, res) => {
    res.type("text/plain");
    res.send(renderDreamMap());
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