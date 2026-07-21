require("dotenv").config({ quiet: true });

const express = require("express");
const crypto = require("crypto");
const fs = require("fs");

const OpenAI = require("openai");

const { verifyConstitution } = require("./p0/constitution");

const p0Constitution = verifyConstitution();

const app = express();

const { PORT, ARCHIVE_FILE, DREAM_FILE } = require("./config");
const { loadArchive, saveArchive } = require("./archive");
const { loadDreams, saveDreams } = require("./dreams");
const {
    calculateDisclosure,
    classifySource,
    classifyEntity,
    classifyDetection,
    classifyPresence
} = require("./classify");
const {
    normalizeIP,
    hashTerminal,
    safeHeader,
    reverseDNS,
    parseTerminal
} = require("./terminal");
const {
    renderHTML,
    renderProbeLoader,
    renderConstellations,
    renderLatestDream,
    renderDreamMap
} = require("./render");
const {
    buildInternalState
} = require("./internal");
const {
    generateDream
} = require("./dream-engine");
const { updateEncounter } = require("./encounters");
const { setupConsoleControl } = require("./console-control");
const { registerRoutes } = require("./routes");
const {
    loadEmergence,
    renderEmergence
} = require("./emergence");

let currentBroadcast = "SIGNAL PERSISTS";

app.use(express.json({ limit: "64kb" }));

setupConsoleControl({
    getBroadcast: () => currentBroadcast,
    setBroadcast: (value) => {
        currentBroadcast = value;
    },
    loadArchive,
    generateDream
});

registerRoutes(app, {
    loadArchive,
    saveArchive,
    normalizeIP,
    reverseDNS,
    parseTerminal,
    buildInternalState,
    renderConstellations,
    renderLatestDream,
    renderDreamMap,
    classifyEntity,
    calculateDisclosure,
    classifyPresence,
    safeHeader,
    hashTerminal,
    classifySource,
    classifyDetection,
    renderProbeLoader,
    renderHTML,
    updateEncounter,
    loadEmergence,
    renderEmergence,
    getBroadcast: () => currentBroadcast
});

// ---------- START ----------

app.listen(PORT, "0.0.0.0", () => {
    console.log("AU-B001 transmitting...");
    console.log(`P0 constitution v${p0Constitution.version} verified.`);
    console.log(`P0 constitution hash: ${p0Constitution.hash}`);
    console.log("Type a broadcast message and press Enter.");
    console.log("Use /help for commands.");
});