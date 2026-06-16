const express = require("express");
const crypto = require("crypto");

function registerRoutes(app, deps) {

    const {
        loadArchive,
        saveArchive,

        buildInternalState,

        renderHTML,
        renderProbeLoader,
        renderConstellations,
        renderLatestDream,
        renderDreamMap,

        normalizeIP,
        reverseDNS,
        safeHeader,
        parseTerminal,
        hashTerminal,

        classifySource,
        classifyEntity,
        classifyDetection,
        calculateDisclosure,
        classifyPresence,

        getBroadcast
    } = deps;

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
            message: getBroadcast()
        };

        encounter.disclosure = calculateDisclosure(encounter);
        encounter.presence = classifyPresence(encounter);

        archive.push(encounter);
        saveArchive(archive);

        res.type("html");
        res.send(renderProbeLoader(encounter));

    });

    app.get("/archive", (req, res) => {

        const archive = loadArchive();

        res.type("application/json");
        res.send(
            JSON.stringify(
                archive,
                null,
                2
            )
        );

    });

    app.get("/internal", (req, res) => {

        const report = buildInternalState(deps.getBroadcast());

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
            total_encounters: archive.length,
            unique_origins: uniqueOrigins,
            unique_terminals: uniqueTerminals,
            entities: entityCounts,
            most_recent:
                archive.length
                    ? archive[archive.length - 1]
                    : null
        };

        res.type("text/plain");
        res.send(JSON.stringify(report, null, 2));

    });

    app.get("/signal/:cycle/:entropy", (req, res) => {

        const archive = loadArchive();

        const cycle =
            Number(req.params.cycle);

        const entropy =
            req.params.entropy;

        const encounter = archive.find(item =>
            item.cycle === cycle &&
            item.entropy === entropy
        );

        if (!encounter) {

            res.status(404)
                .type("text/plain");

            res.send(
                "AU-B001\nSTATUS: SIGNAL NOT FOUND"
            );

            return;

        }

        res.type("html");
        res.send(
            renderHTML(
                encounter,
                archive
            )
        );

    });

}

module.exports = {
    registerRoutes
};