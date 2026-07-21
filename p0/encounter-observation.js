const { createUUIDv7 } = require("./bridge");
const { verifyConstitution } = require("./constitution");

function cleanText(value, fallback = "UNKNOWN") {
    if (typeof value !== "string") {
        return fallback;
    }

    const cleaned = value
        .replace(/\s+/g, " ")
        .trim();

    return cleaned || fallback;
}

function buildEncounterObservation(encounter) {
    if (!encounter || !encounter.cycle || !encounter.entropy) {
        throw new Error("Invalid AU-B001 encounter");
    }

    const constitution = verifyConstitution();
    const probe = encounter.browser_probe || {};

    const eventType =
        probe.last_event === "departure"
            ? "encounter_departure"
            : "encounter_arrival";

    const entity = cleanText(encounter.entity, "UNCLASSIFIED");
    const detection = cleanText(encounter.detection);
    const source = cleanText(encounter.source, "DIRECT");
    const presence = cleanText(encounter.presence);
    const message = cleanText(encounter.message, "SIGNAL PERSISTS");

    const summary = [
        `Encounter #${encounter.cycle}.`,
        `Entity: ${entity}.`,
        `Detection: ${detection}.`,
        `Source: ${source}.`,
        `Presence: ${presence}.`,
        `Returning: ${Boolean(encounter.returning_entity)}.`,
        `Beacon message: ${message}.`
    ].join(" ");

    return {
        observation_id: createUUIDv7(),
        source: "au_b001_encounter",
        external_id:
            `AU-ENCOUNTER-${encounter.cycle}-` +
            `${encounter.entropy.slice(0, 8)}-${eventType}`,
        event_type: eventType,
        text_excerpt: summary.slice(0, 280),
        received_at: new Date().toISOString(),
        metadata: {
            constitution_version: constitution.version,
            constitution_hash: constitution.hash,
            origin_system: "AU-B001",
            cycle: encounter.cycle,
            encounter_utc: encounter.utc || null,
            entity,
            detection,
            source,
            presence,
            disclosure: encounter.disclosure || "UNKNOWN",
            returning_entity: Boolean(encounter.returning_entity),
            previous_terminal_encounters:
                Number(encounter.previous_terminal_encounters || 0),
            last_event: probe.last_event || "initial_request",
            dwell_seconds: Number(probe.dwell_seconds || 0),
            mode: "witness",
            privacy_filter: "raw_origin_headers_blueprint_excluded"
        }
    };
}

module.exports = {
    buildEncounterObservation
};