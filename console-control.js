// console-control.js
// AU-B001 console control organ.

const {
    getDDSUStatus,
    reloadDDSUConfig,
    setDDSUEnabled,
    setDDSUIntensity,
    setDDSULayerWeight,
    clearDDSUOverrides
} = require("./ddsu-control");

const {
    handleP0Command,
    printP0Help
} = require("./p0/console");

function printDDSUHelp() {
    console.log("DDSU COMMANDS");
    console.log("/ddsu                       show DDSU status");
    console.log("/ddsu on                    enable DDSU runtime override");
    console.log("/ddsu off                   disable DDSU runtime override");
    console.log("/ddsu intensity <number>    set overall distortion multiplier");
    console.log("/ddsu layer <name> <weight> set temporary layer weight");
    console.log("/ddsu reload                reload ddsu-config.js");
    console.log("/ddsu reset                 clear runtime overrides");
    console.log("");
    console.log("Layer aliases:");
    console.log("  shrapnel / archive / entropy");
    console.log("  scar / public / fragment / hdd");
    console.log("  glyph / rot / cursed");
    console.log("  secret / possession");
    console.log("  mixed / hotspot");
}

function handleDDSUCommand(command) {
    if (command === "/ddsu") {
        console.log(getDDSUStatus());
        return true;
    }

    if (command === "/ddsu help") {
        printDDSUHelp();
        return true;
    }

    if (command === "/ddsu on") {
        console.log(setDDSUEnabled(true));
        return true;
    }

    if (command === "/ddsu off") {
        console.log(setDDSUEnabled(false));
        return true;
    }

    if (command === "/ddsu reload") {
        console.log(reloadDDSUConfig());
        console.log("DDSU config reloaded.");
        return true;
    }

    if (command === "/ddsu reset") {
        console.log(clearDDSUOverrides());
        console.log("DDSU runtime overrides cleared.");
        return true;
    }

    if (command.startsWith("/ddsu intensity ")) {
        const value = command.split(/\s+/)[2];

        try {
            console.log(setDDSUIntensity(value));
        } catch (err) {
            console.log("DDSU ERROR:", err.message);
        }

        return true;
    }

    if (command.startsWith("/ddsu layer ")) {
        const parts = command.split(/\s+/);
        const layerName = parts[2];
        const weight = parts[3];

        try {
            console.log(setDDSULayerWeight(layerName, weight));
        } catch (err) {
            console.log("DDSU ERROR:", err.message);
        }

        return true;
    }

    if (command.startsWith("/ddsu ")) {
        console.log("Unknown DDSU command.");
        printDDSUHelp();
        return true;
    }

    return false;
}

function setupConsoleControl(options) {
    const {
        getBroadcast,
        setBroadcast,
        loadArchive,
        generateDream
    } = options;

    process.stdin.setEncoding("utf8");

    process.stdin.on("data", async (input) => {
        const command = input.trim();

        if (!command) return;

        if (await handleP0Command(command)) {
             return;
        }

        if (handleDDSUCommand(command)) {
            return;
        }

        if (command === "/clear") {
            setBroadcast("SIGNAL PERSISTS");
            console.log("Broadcast reset: SIGNAL PERSISTS");
            return;
        }

        if (command === "/status") {
            const archive = loadArchive();

            console.log("AU-B001 STATUS");
            console.log("Broadcast:", getBroadcast());
            console.log("Total encounters:", archive.length);
            console.log("");
            console.log(getDDSUStatus());

            return;
        }

        if (command === "/recent") {
            const archive = loadArchive();
            const recent = archive.slice(-5).reverse();

            console.log("RECENT MESOGRAMS");

            recent.forEach(item => {
                console.log(
                    "#" +
                    item.cycle +
                    " | " +
                    (item.origin || "UNKNOWN") +
                    " | " +
                    (item.entity || "UNCLASSIFIED") +
                    " | " +
                    item.message
                );
            });

            return;
        }

        if (command === "/dream") {
            generateDream(getBroadcast());
            console.log("Dream command accepted.");
            console.log("AU-B001 continues transmitting.");
            return;
        }

        if (command === "/help") {
            console.log("AU-B001 COMMANDS");
            console.log("/clear reset broadcast");
            console.log("/status show current state");
            console.log("/recent show last 5 mesograms");
            console.log("/help show commands");
            console.log("/dream force one dream from archive memory");
            console.log("/ddsu show DDSU status");
            console.log("/ddsu help show DDSU commands");
            console.log("");
            printP0Help();
            console.log("Any other text becomes broadcast.");
            return;
        }

        setBroadcast(command);
        console.log("Broadcast changed:", getBroadcast());
    });
}

module.exports = {
    setupConsoleControl
};