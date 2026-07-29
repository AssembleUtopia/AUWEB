"use strict";

// P0 LOCAL RECEIVER
// One pipeline only:
// inbox file -> SHA-256 -> archive copy -> ledger entry -> console notice

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "rec");
const INBOX = path.join(ROOT, "inbox");
const ARCHIVE = path.join(ROOT, "archive");
const LEDGER = path.join(ROOT, "ledger.ndjson");
const INTERVAL_MS = 1000;
const MAX_BYTES = 1024 * 1024;

const seen = new Map();

function sha256(bytes) {
    return crypto.createHash("sha256").update(bytes).digest("hex");
}

function recordFile(name) {
    const source = path.join(INBOX, name);
    const stat = fs.lstatSync(source);

    if (!stat.isFile() || stat.isSymbolicLink()) {
        return;
    }

    const state = `${stat.size}:${stat.mtimeMs}`;
    if (seen.get(name) === state) {
        return;
    }

    seen.set(name, state);

    if (stat.size > MAX_BYTES) {
        console.log(`[REJECTED] ${name} exceeds 1 MiB`);
        return;
    }

    const bytes = fs.readFileSync(source);
    const hash = sha256(bytes);
    const archiveName = `${hash}_${path.basename(name)}`;
    const destination = path.join(ARCHIVE, archiveName);

    if (!fs.existsSync(destination)) {
        fs.writeFileSync(destination, bytes, {
            flag: "wx",
            mode: 0o600
        });
    }

    const entry = {
        utc: new Date().toISOString(),
        name,
        bytes: bytes.length,
        sha256: hash,
        archive: archiveName
    };

    fs.appendFileSync(
        LEDGER,
        `${JSON.stringify(entry)}\n`,
        "utf8"
    );

    console.log(`[RECEIVED] ${name}`);
    console.log(`           SHA-256 ${hash}`);
}

function scan() {
    for (const entry of fs.readdirSync(INBOX, {
        withFileTypes: true
    })) {
        try {
            recordFile(entry.name);
        } catch (error) {
            console.error(
                `[ERROR] ${entry.name}: ${error.message}`
            );
        }
    }
}

function start() {
    fs.mkdirSync(INBOX, { recursive: true });
    fs.mkdirSync(ARCHIVE, { recursive: true });

    console.log("P0 LOCAL RECEIVER");
    console.log(`INBOX:   ${INBOX}`);
    console.log(`ARCHIVE: ${ARCHIVE}`);
    console.log(`LEDGER:  ${LEDGER}`);
    console.log(
        "Files are copied and hashed. Nothing is executed."
    );

    scan();

    return setInterval(scan, INTERVAL_MS);
}

if (require.main === module) {
    start();
}

module.exports = {
    recordFile,
    scan,
    sha256,
    start
};