function setupConsoleControl(options) {

    const {
        getBroadcast,
        setBroadcast,
        loadArchive,
        generateDream
    } = options;

    process.stdin.setEncoding("utf8");

    process.stdin.on("data", (input) => {
        const command = input.trim();

        if (!command) return;

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

        if (command === "/dream") {
            generateDream(getBroadcast());
            console.log("Dream command accepted. AU-B001 continues transmitting.");
            return;
        }

        if (command === "/help") {
            console.log("AU-B001 COMMANDS");
            console.log("/clear   reset broadcast");
            console.log("/status  show current state");
            console.log("/recent  show last 5 mesograms");
            console.log("/help    show commands");
            console.log("/dream   force one dream from archive memory");
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