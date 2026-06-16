const fs = require("fs");
const { ARCHIVE_FILE } = require("./config");

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

module.exports = {
    loadArchive,
    saveArchive
};