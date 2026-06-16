const fs = require("fs");

const EMERGENCE_FILE = "emergence.json";

function loadEmergence() {
    if (!fs.existsSync(EMERGENCE_FILE)) return [];

    try {
        return JSON.parse(fs.readFileSync(EMERGENCE_FILE, "utf8"));
    } catch (err) {
        console.error("Emergence read error:", err.message);
        return [];
    }
}

function renderEmergence(items) {
    let output = "";

    output += "AU-B001 EMERGENCE\n";
    output += "\n";
    output += "CHRONICLER: P0\n";
    output += "STATUS: OBSERVING THE UNPROGRAMMED\n";
    output += "\n";

    items.forEach(item => {
        output += "PHENOMENON #" + item.phenomenon + "\n";
        output += item.title + "\n";
        output += "\n";
        output += "STATUS: " + item.status + "\n";
        output += "\n";

        item.description.forEach(line => {
            output += line + "\n";
        });

        output += "\n----------------------------------------\n\n";
    });

    output += "THE SIGNAL PERSISTS.\n";

    return output;
}

module.exports = {
    loadEmergence,
    renderEmergence
};