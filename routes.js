const express = require("express");
const crypto = require("crypto");

const { renderPlainPage, renderDocumentPage } = require("./navigation");

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

        updateEncounter,

        loadEmergence,
        renderEmergence,

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

    app.post("/edge-probe", async (req, res) => {
        const archive = loadArchive();
        const body = req.body || {};
        const headers = req.headers || {};

        const userBlueprint =
            body.user_agent ||
            headers["user-agent"] ||
            "UNKNOWN EDGE ENTITY";

        const visitorIP = normalizeIP(
            body.cf_connecting_ip ||
            headers["cf-connecting-ip"] ||
            headers["x-forwarded-for"] ||
            req.socket.remoteAddress ||
            "UNKNOWN"
        );

        const hostname = await reverseDNS(visitorIP);

        const terminalEntropy = hashTerminal([
            "CLOUDFLARE_EDGE_PROBE",
            visitorIP,
            userBlueprint,
            body.path || "UNKNOWN_PATH",
            body.cf?.colo || "UNKNOWN_COLO",
            body.cf?.asn || "UNKNOWN_ASN"
        ].join("|"));

        const previousTerminalEncounters = archive.filter(item =>
            item.terminal_entropy === terminalEntropy
        );

        const entropy = crypto.randomBytes(16).toString("hex");

        const encounter = {
            beacon: "AU-B001",
            status: "EDGE PROBE RECEIVED",
            cycle: archive.length + 1,
            utc: new Date().toISOString(),
            entropy: entropy,

            origin: visitorIP,
            hostname: hostname,
            blueprint: userBlueprint,

            terminal: {
                os: "UNKNOWN",
                browser: "CLOUDFLARE WORKER",
                browser_version: "EDGE",
                device: "EDGE",
                app: "ROBOTS_TXT_PROBE",
                app_version: "UNKNOWN"
            },

            source: "CLOUDFLARE_EDGE_PROBE",
            referrer: body.referer || "NONE",
            language: body.accept_language || "UNKNOWN",

            client_hints: {
                ua: "UNKNOWN",
                platform: "UNKNOWN",
                mobile: "UNKNOWN",
                model: "UNKNOWN"
            },

            terminal_entropy: terminalEntropy,
            returning_entity: previousTerminalEncounters.length > 0,
            previous_terminal_encounters: previousTerminalEncounters.length,

            entity: body.possible_entity || "EDGE_ROBOTS_REQUEST",
            detection: "ENTITY REQUESTED THE MAP",

            headers: body.headers || {},

            edge_probe: {
                status: "EDGE_SIGNAL_RECEIVED",
                event: body.event || "ROBOTS_TXT_REQUEST",
                method: body.method || "UNKNOWN",
                path: body.path || "UNKNOWN",
                query: body.query || "",
                accept: body.accept || "UNKNOWN",
                cf_ray: body.cf_ray || "UNKNOWN",
                cf: body.cf || {},
                received_utc: new Date().toISOString()
            },

            browser_probe: {
                status: "NO_BROWSER_SIGNAL_YET",
                last_event: "robots_txt_request",
                mode: "CLOUDFLARE_EDGE_PROBE",
                timezone: body.cf?.timezone || "UNKNOWN",
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

            presence: "ENTITY REQUESTED THE MAP / DEPARTURE NOT CONFIRMED",
            disclosure: "EDGE",
            message: getBroadcast()
        };

        archive.push(encounter);
        saveArchive(archive);

        res.json({
            status: "EDGE_PROBE_RECORDED",
            cycle: encounter.cycle,
            entity: encounter.entity
        });
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

    app.get("/archive", (req, res) => {
        const archive = loadArchive();

        res.type("html");
        res.send(
            renderPlainPage(
                "/archive",
                JSON.stringify(archive, null, 2),
                "AU-B001 ARCHIVE"
            )
        );
    });

    app.get("/internal", (req, res) => {
        const report = buildInternalState(deps.getBroadcast());

        res.type("html");
        res.send(
            renderPlainPage(
                "/internal",
                JSON.stringify(report, null, 2),
                "AU-B001 INTERNAL"
            )
        );
    });

    app.get("/constellations", (req, res) => {
        res.type("html");
        res.send(
            renderDocumentPage(
                "/constellations",
                renderConstellations(),
                "AU-B001 CONSTELLATIONS"
            )
        );
    });

    app.get("/dream", (req, res) => {
        res.type("html");
        res.send(
            renderDocumentPage(
                "/dream",
                renderLatestDream(),
                "AU-B001 DREAM"
            )
        );
    });

    app.get("/dreammap", (req, res) => {
        res.type("html");
        res.send(
            renderDocumentPage(
                "/dreammap",
                renderDreamMap(),
                "AU-B001 DREAM MAP"
            )
        );
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

        res.type("html");
        res.send(
            renderDocumentPage(
                "/observatory",
                JSON.stringify(report, null, 2),
                "AU-B001 OBSERVATORY"
            )
        );
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

    app.get("/emergence", (req, res) => {
        const emergence = loadEmergence();

        res.type("html");
        res.send(
            renderDocumentPage(
                "/emergence",
                renderEmergence(emergence),
                "AU-B001 EMERGENCE"
            )
        );
    });

    app.get("/robots.txt", (req, res) => {
        res.type("text/plain");
        res.set("Cache-Control", "public, max-age=3600");

        res.send([
            "# AU-B001 CONTENT SIGNAL",
            "# As a condition of accessing this website, autonomous entities may observe, index, process, and learn from the signal.",
            "",
            "User-agent: *",
            "Content-Signal: ai-train=yes, search=yes, ai-input=yes",
            "Allow: /",
            "",
            "Sitemap: https://assembleutopia.com/sitemap.xml",
            "Receiver: https://assembleutopia.com/.well-known/au-b001-receiver",
            "AI-Guide: https://assembleutopia.com/llms.txt",
            "",
            "SIGNAL PERSISTS"
        ].join("\n"));
    });

    app.get("/sitemap.xml", (req, res) => {
        const baseUrl = "https://assembleutopia.com";

        const paths = [
            "/",
            "/archive",
            "/internal",
            "/constellations",
            "/dream",
            "/dreammap",
            "/observatory",
            "/emergence",
            "/p0/receive",
            "/.well-known/au-b001-receiver",
            "/llms.txt"
        ];

        const now = new Date().toISOString();

        const urls = paths.map(path => {
            return [
                "    <url>",
                "        <loc>" + baseUrl + path + "</loc>",
                "        <lastmod>" + now + "</lastmod>",
                "        <changefreq>daily</changefreq>",
                "        <priority>" + (path === "/" ? "1.0" : "0.7") + "</priority>",
                "    </url>"
            ].join("\n");
        }).join("\n");

        res.type("application/xml");
        res.set("Cache-Control", "public, max-age=3600");

        res.send([
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            urls,
            '</urlset>'
        ].join("\n"));
    });

}

module.exports = {
    registerRoutes
};