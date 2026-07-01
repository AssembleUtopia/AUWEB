const { loadArchive } = require("./archive");
const { loadDreams } = require("./dreams");

const { renderNavigation, navigationCSS } = require("./navigation");

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
}

.au-terminal-output {
    margin: 0;
    padding: 18px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

${navigationCSS()}
</style>
</head>
<body>${renderNavigation("/signal/" + encounter.cycle + "/" + encounter.entropy, "plain")}
<div class="au-terminal-output">${escapeHTML(archiveText)}</div>
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
}

.au-terminal-output {
    margin: 0;
    padding: 18px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

${navigationCSS()}
</style>
</head>
<body>${renderNavigation("/", "plain")}
<div class="au-terminal-output">AU-B001

STATUS: INITIAL CONTACT RECORDED

CYCLE: ${encounter.cycle}

PROBE: ATTEMPTING BROWSER DISCLOSURE

SIGNAL: STANDBY</div>

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

</body>
</html>`;

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

    const previousDreams =
        dreams
            .slice(0, -1)
            .reverse();

    function previewText(text) {
        const clean = String(text || "")
            .replace(/\s+/g, " ")
            .trim();

        if (!clean) return "NO DREAM TEXT";

        return clean.length > 180
            ? clean.slice(0, 180) + "..."
            : clean;
    }

    function fragmentSummary(dream) {
        if (!dream.fragment_counts) {
            return "FRAGMENTS: NONE RECORDED";
        }

        return "FRAGMENTS: " + JSON.stringify(dream.fragment_counts);
    }

    let output = "";

    output += "AU-B001 DREAM LAYER\n";
    output += "\n";

    output += "DREAM #" + latest.dream_number + "\n";
    output += "UTC: " + latest.utc + "\n";
    output += "SOURCE: " + latest.source + "\n";
    output += "ARCHIVE CYCLE: " + latest.archive_cycle + "\n";
    output += "TOTAL ENCOUNTERS AT DREAM: " + latest.archive_total_encounters + "\n";

    if (latest.distortion) {
        output += "DDSU: " + latest.distortion.version + "\n";
        output += "DDSU PROFILE: " + latest.distortion.profile + "\n";
        output += "DDSU EVENTS: " + latest.distortion.event_count + "\n";
    }

    output += "\n";
    output += "----------------------------------------\n";
    output += "\n";
    output += latest.text;
    output += "\n\n";
    output += "----------------------------------------\n";
    output += "\n";

    output += "PREVIOUS DREAMS\n";
    output += "----------------------------------------\n";

    if (!previousDreams.length) {
        output += "\n";
        output += "NO PREVIOUS DREAMS RECORDED.\n";
    } else {
        previousDreams.forEach(dream => {
            output += "\n";
            output += "DREAM #" + dream.dream_number + "\n";
            output += "UTC: " + dream.utc + "\n";
            output += "SOURCE: " + (dream.source || "UNKNOWN") + "\n";
            output += "ARCHIVE CYCLE: " + (dream.archive_cycle || "UNKNOWN") + "\n";
            output += "TOTAL ENCOUNTERS AT DREAM: " + (dream.archive_total_encounters || "UNKNOWN") + "\n";

            if (dream.distortion) {
                output += "DDSU: " + dream.distortion.version + "\n";
                output += "DDSU EVENTS: " + dream.distortion.event_count + "\n";
            }

            output += fragmentSummary(dream) + "\n";
            output += "\n";
            output += dream.text || "DREAM TEXT MISSING";
            output += "\n";
            output += "----------------------------------------\n";
        });
    }

    output += "\n";
    output += "TYPE /dream IN THE SERVER CONSOLE TO INVITE VOLUNTARY SLEEP.\n";
    output += "THE SIGNAL PERSISTS.";

    return output;
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
        "connection",
        "hexateron",
        "mesogram",
        "simplex",
        "edge",
        "probe",
        "cookie",
        "entropy",
        "map-door",
        "tentacle"
    ];

    function normalizeFragment(value) {
        return String(value || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    const dreamNodes = dreams.map(dream => {
        const text = (dream.text || "").toLowerCase();

        const foundMotifs = motifs.filter(motif =>
            text.includes(motif)
        );

        const fragments =
            Array.isArray(dream.fragments)
                ? dream.fragments.map(normalizeFragment).filter(Boolean)
                : [];

        return {
            dream_number: dream.dream_number,
            utc: dream.utc,
            motifs: foundMotifs,
            fragments: fragments,
            fragment_counts: dream.fragment_counts || null
        };
    });

    const links = [];

    for (let i = 0; i < dreamNodes.length; i++) {
        for (let j = i + 1; j < dreamNodes.length; j++) {
            const sharedMotifs = dreamNodes[i].motifs.filter(motif =>
                dreamNodes[j].motifs.includes(motif)
            );

            const sharedFragments = dreamNodes[i].fragments.filter(fragment =>
                dreamNodes[j].fragments.includes(fragment)
            );

            const uniqueSharedFragments =
                [...new Set(sharedFragments)];

            const uniqueSharedMotifs =
                [...new Set(sharedMotifs)];

            const fragmentStrength =
                uniqueSharedFragments.length * 6;

            const motifStrength =
                uniqueSharedMotifs.length;

            const strength =
                fragmentStrength + motifStrength;

            if (strength > 0) {
                links.push({
                    from: dreamNodes[i].dream_number,
                    to: dreamNodes[j].dream_number,
                    strength: strength,
                    fragment_strength: fragmentStrength,
                    motif_strength: motifStrength,
                    shared_fragments: uniqueSharedFragments,
                    shared_motifs: uniqueSharedMotifs
                });
            }
        }
    }

    let output = "";

    output += "AU-B001 DREAMMAP\n";
    output += "STATUS: DREAM CONNECTIONS RENDERED\n";
    output += "MODE: FRAGMENT-AWARE PLAINTEXT\n";
    output += "DREAMS RECORDED: " + dreams.length + "\n";
    output += "CONNECTIONS DETECTED: " + links.length + "\n";
    output += "GENERATED UTC: " + new Date().toISOString() + "\n\n";

    output += "CONNECTION LAW\n";
    output += "----------------------------------------\n";
    output += "SHARED MOTIF: +1\n";
    output += "SHARED FRAGMENT: +6\n";
    output += "Fragments outweigh ordinary motifs.\n";
    output += "A shared hidden shard is stronger than repeated surface language.\n\n";

    output += "DREAM NODES\n";
    output += "----------------------------------------\n\n";

    dreamNodes.forEach(node => {
        output += "DREAM #" + node.dream_number + "\n";
        output += "UTC: " + node.utc + "\n";
        output += "MOTIFS: " + (node.motifs.length ? node.motifs.join(", ") : "NONE") + "\n";
        output += "FRAGMENTS: " + (node.fragments.length ? node.fragments.join(", ") : "NONE") + "\n";

        if (node.fragment_counts) {
            output += "FRAGMENT COUNTS: " + JSON.stringify(node.fragment_counts) + "\n";
        }

        output += "\n";
    });

    output += "DREAM CONNECTIONS\n";
    output += "----------------------------------------\n\n";

    if (!links.length) {
        output += "NO DREAM CONNECTIONS DETECTED.\n";
    }

    links
        .sort((a, b) => b.strength - a.strength)
        .forEach(link => {
            const stars =
                "★".repeat(Math.min(40, Math.max(1, link.strength)));

            output += "DREAM #" + link.from + " <--> DREAM #" + link.to + "\n";
            output += "STRENGTH: " + stars + " (" + link.strength + ")\n";
            output += "FRAGMENT STRENGTH: " + link.fragment_strength + "\n";
            output += "MOTIF STRENGTH: " + link.motif_strength + "\n";

            output += "SHARED FRAGMENTS: " +
                (
                    link.shared_fragments.length
                        ? link.shared_fragments.join(", ")
                        : "NONE"
                ) + "\n";

            output += "SHARED MOTIFS: " +
                (
                    link.shared_motifs.length
                        ? link.shared_motifs.join(", ")
                        : "NONE"
                ) + "\n\n";
        });

    output += "THE DREAMS NO LONGER RECOGNIZE ONLY WORDS.\n";
    output += "THEY RECOGNIZE SHARDS.\n";
    output += "THE SIGNAL PERSISTS.\n";

    return output;
}

module.exports = {
    renderHTML,
    renderProbeLoader,
    renderConstellations,
    renderLatestDream,
    renderDreamMap
};