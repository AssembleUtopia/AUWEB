const express = require("express");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
const PORT = 8080;
const ARCHIVE_FILE = "encounters.json";

let currentBroadcast = "SIGNAL PERSISTS";

// Terminal broadcast control
process.stdin.setEncoding("utf8");

process.stdin.on("data", (input) => {
    const message = input.trim();

    if (!message) return;

    if (message === "/clear") {
        currentBroadcast = "SIGNAL PERSISTS";
        console.log("Broadcast reset: SIGNAL PERSISTS");
        return;
    }

    currentBroadcast = message;
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

app.get("/", (req, res) => {
    const archive = loadArchive();

    const visitorIP =
        req.headers["cf-connecting-ip"] ||
        req.socket.remoteAddress ||
        "UNKNOWN";

    const userBlueprint =
        req.headers["user-agent"] ||
        "UNKNOWN DEVICE";

    const encounter = {
        beacon: "AU-B001",
        status: "TRANSMITTING",
        cycle: archive.length + 1,
        utc: new Date().toISOString(),
        entropy: crypto.randomBytes(16).toString("hex"),
        origin: visitorIP,
        blueprint: userBlueprint,
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
    console.log("Use /clear to return to SIGNAL PERSISTS.");
});