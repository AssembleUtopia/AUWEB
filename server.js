const express = require("express");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
const PORT = 8080;
const ARCHIVE_FILE = "encounters.json";

function loadArchive() {
    if (!fs.existsSync(ARCHIVE_FILE)) return [];
    return JSON.parse(fs.readFileSync(ARCHIVE_FILE, "utf8"));
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
    message: "SIGNAL PERSISTS"
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
});