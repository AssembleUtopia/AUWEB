function calculateDisclosure(encounter) {

    let score = 0;

    const fields = [
        encounter.origin,
        encounter.hostname,
        encounter.referrer,

        encounter.language,

        encounter.terminal?.os,
        encounter.terminal?.browser,
        encounter.terminal?.browser_version,
        encounter.terminal?.device,
        encounter.terminal?.app,
        encounter.terminal?.app_version,

        encounter.client_hints?.ua,
        encounter.client_hints?.platform,
        encounter.client_hints?.mobile,
        encounter.client_hints?.model,

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

    if (score >= 12) return "HIGH";
    if (score >= 8) return "MEDIUM";

    return "LOW";
}

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

function classifyPresence(encounter) {

    const probe = encounter.browser_probe || {};
    const entity = encounter.entity || "UNKNOWN_ENTITY";

    if (probe.status === "ENCOUNTER_COMPLETED") {
        return "ENTITY DEPARTED / ENCOUNTER COMPLETED";
    }

    if (probe.status === "BROWSER_SIGNAL_RECEIVED") {
        return "ENTITY ARRIVED / DEPARTURE NOT CONFIRMED";
    }

    if (probe.status === "NO_BROWSER_SIGNAL_YET") {

        if (entity === "MOBILE_RELAY") {
            return "MOBILE RELAY ARRIVED / DEPARTURE NOT CONFIRMED";
        }

        return "ENTITY ARRIVED / BROWSER SIGNAL ABSENT";
    }

    return "ENTITY ARRIVED / DEPARTURE NOT CONFIRMED";
}

module.exports = {
    calculateDisclosure,
    classifySource,
    classifyEntity,
    classifyDetection,
    classifyPresence
};