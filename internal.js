const fs = require("fs");

const { ARCHIVE_FILE } = require("./config");
const { loadArchive } = require("./archive");

function buildInternalState(currentBroadcast) {

    const archive = loadArchive();

    const archiveSizeBytes =
        fs.existsSync(ARCHIVE_FILE)
            ? fs.statSync(ARCHIVE_FILE).size
            : 0;

    const entityCounts = {};

    archive.forEach(item => {
        const entity = item.entity || "UNCLASSIFIED";
        entityCounts[entity] = (entityCounts[entity] || 0) + 1;
    });

    const knownEntities =
        Object.keys(entityCounts).length;

    const uniqueOrigins =
        new Set(
            archive
                .map(item => item.origin)
                .filter(Boolean)
        ).size;

    const uniqueTerminals =
        new Set(
            archive
                .map(item => item.terminal_entropy)
                .filter(Boolean)
        ).size;

    const lastEncounter =
        archive.length
            ? archive[archive.length - 1]
            : null;

    const lastEncounterHoursAgo =
        lastEncounter && lastEncounter.utc
            ? Number(
                (
                    (Date.now() - new Date(lastEncounter.utc).getTime())
                    / 1000
                    / 60
                    / 60
                ).toFixed(2)
            )
            : null;

    const memory = process.memoryUsage();

    return {
        beacon: "AU-B001",
        status: "SELF OBSERVATION ACTIVE",

        internal_state: {
            uptime_seconds: Math.floor(process.uptime()),
            uptime_hours: Number((process.uptime() / 60 / 60).toFixed(2)),

            archive_file: ARCHIVE_FILE,
            archive_size_bytes: archiveSizeBytes,
            archive_size_mb: Number((archiveSizeBytes / 1024 / 1024).toFixed(3)),

            total_encounters: archive.length,
            known_entities: knownEntities,
            unique_origins: uniqueOrigins,
            unique_terminals: uniqueTerminals,

            last_cycle:
                lastEncounter
                    ? lastEncounter.cycle
                    : null,

            last_encounter_utc:
                lastEncounter
                    ? lastEncounter.utc
                    : null,

            last_encounter_hours_ago: lastEncounterHoursAgo,

            current_broadcast: currentBroadcast,

            node: {
                version: process.version,
                platform: process.platform,
                pid: process.pid,
                memory_rss_mb: Number((memory.rss / 1024 / 1024).toFixed(2)),
                memory_heap_used_mb: Number((memory.heapUsed / 1024 / 1024).toFixed(2))
            }
        },

        generated_utc: new Date().toISOString()
    };
}

module.exports = {
    buildInternalState
};