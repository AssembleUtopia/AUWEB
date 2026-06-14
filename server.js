const express = require("express");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
const PORT = 8080;
const ARCHIVE_FILE = "encounters.json";

let currentBroadcast = "SIGNAL PERSISTS";

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

function loadArchive() {
    if (!fs.existsSync(ARCHIVE_FILE)) return [];

    try {
        return JSON.parse(fs.readFileSync(ARCHIVE_FILE, "utf8"));
    } catch (err) {
        console.error("Archive read error:", err.message);
        return [];
    }
}

function saveArchive(archive) {
    fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2));
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
    if (value.includes("bingbot")) return "BINGBOT";
    if (value.includes("applebot")) return "APPLEBOT";
    if (value.includes("discordbot")) return "DISCORDBOT";
    if (value.includes("telegrambot")) return "TELEGRAMBOT";
    if (value.includes("yandexbot")) return "YANDEXBOT";
    if (value.includes("ahrefsbot")) return "AHREFSBOT";
    if (value.includes("semrushbot")) return "SEMRUSHBOT";
    if (value.includes("leakix") || value.includes("l9scan")) return "LEAKIX_SCANNER";
    if (value.includes("hunt-bot")) return "HUNT_DISCOVERY_ENGINE";
    if (value.includes("ct-wp-scanner")) return "WORDPRESS_SCANNER";
    if (value.includes("python") || value.includes("aiohttp")) return "PYTHON_ENTITY";
    if (value.includes("go-http-client")) return "GO_HTTP_CLIENT";
    if (value.includes("okhttp")) return "OKHTTP_ENTITY";
    if (value.includes("android") || value.includes("iphone")) return "MOBILE_RELAY";
    if (value.includes("mozilla")) return "HUMAN_OPERATOR";

    return "UNKNOWN_ENTITY";
}

function classifyMessage(entity) {
    if (entity === "GOOGLEBOT") return "AUTONOMOUS RECONNAISSANCE DETECTED";
    if (entity === "LEAKIX_SCANNER") return "SCANNER SWARM DETECTED";
    if (entity === "HUNT_DISCOVERY_ENGINE") return "DISCOVERY ENGINE DETECTED";
    if (entity === "WORDPRESS_SCANNER") return "HOSTILE RECONNAISSANCE DETECTED";
    if (entity === "GO_HTTP_CLIENT") return "UNKNOWN MACHINE SIGNAL DETECTED";
    if (entity === "PYTHON_ENTITY") return "SCRIPTED ENTITY DETECTED";
    if (entity === "OKHTTP_ENTITY") return "MOBILE MACHINE CLIENT DETECTED";
    if (entity === "MOBILE_RELAY") return "MOBILE RELAY DETECTED";
    if (entity === "HUMAN_OPERATOR") return "KNOWN OR EXTERNAL OPERATOR DETECTED";

    return "UNCLASSIFIED ENTITY DETECTED";
}

app.get("/", (req, res) => {
    const archive = loadArchive();

    const visitorIP =
        req.headers["cf-connecting-ip"] ||
        req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        "UNKNOWN";

    const userBlueprint =
        req.headers["user-agent"] ||
        "UNKNOWN DEVICE";

    const referrer =
        req.headers.referer ||
        req.headers.referrer ||
        "";

    const source = classifySource(referrer);
    const entity = classifyEntity(userBlueprint);

    const encounter = {
        beacon: "AU-B001",
        status: "TRANSMITTING",
        cycle: archive.length + 1,
        utc: new Date().toISOString(),
        entropy: crypto.randomBytes(16).toString("hex"),
        origin: visitorIP,
        blueprint: userBlueprint,
        source: source,
        referrer: referrer || "NONE",
        entity: entity,
        detection: classifyMessage(entity),
        message: currentBroadcast
    };

    archive.push(encounter);
    saveArchive(archive);

    let output = JSON.stringify(encounter) + "\n\n";

    archive.slice(0, -1).reverse().forEach(item => {
        output += JSON.stringify(item) + "\n";
    });

    res.type("text/plain");
    res.send(output);
});

app.listen(PORT, "0.0.0.0", () => {
    console.log("AU-B001 transmitting...");
    console.log("Type a broadcast message and press Enter.");
    console.log("Use /help for commands.");
});