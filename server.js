const express = require("express");
const crypto = require("crypto");
const fs = require("fs");

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
const {
    normalizeIP,
    hashTerminal,
    safeHeader,
    reverseDNS,
    parseTerminal
} = require("./terminal");
const {
    renderHTML,
    renderProbeLoader,
    renderConstellations,
    renderLatestDream,
    renderDreamMap
} = require("./render");
const {
    buildInternalState
} = require("./internal");
const {
    generateDream
} = require("./dream-engine");
const { updateEncounter } = require("./encounters");
const { setupConsoleControl } = require("./console-control");
const { registerRoutes } = require("./routes");

let currentBroadcast = "SIGNAL PERSISTS";

app.use(express.json({ limit: "64kb" }));

setupConsoleControl({
    getBroadcast: () => currentBroadcast,
    setBroadcast: (value) => {
        currentBroadcast = value;
    },
    loadArchive,
    generateDream
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
        message: getBroadcast()
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

registerRoutes(app, {
    loadArchive,
    saveArchive,
    normalizeIP,
    reverseDNS,
    parseTerminal,
    buildInternalState,
    renderConstellations,
    renderLatestDream,
    renderDreamMap,
    classifyEntity,
    calculateDisclosure,
    classifyPresence,
    safeHeader,
    hashTerminal,
    classifySource,
    classifyDetection,
    renderProbeLoader,
    renderHTML,
    getBroadcast: () => currentBroadcast
});

// ---------- START ----------

app.listen(PORT, "0.0.0.0", () => {
    console.log("AU-B001 transmitting...");
    console.log("Type a broadcast message and press Enter.");
    console.log("Use /help for commands.");
});