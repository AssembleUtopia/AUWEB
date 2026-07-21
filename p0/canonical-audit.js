const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { createUUIDv7 } = require("./bridge");

const AUDIT_FILE = path.join(__dirname, "canonical-audit.jsonl");

function readRecords() {
    if (!fs.existsSync(AUDIT_FILE)) {
        return [];
    }

    return fs
        .readFileSync(AUDIT_FILE, "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}

function hasEvent(eventType, entityId) {
    return readRecords().some(
        (record) =>
            record.event_type === eventType &&
            record.entity_id === entityId
    );
}

function appendEvent({
    eventType,
    actor,
    entityId,
    payload
}) {
    const records = readRecords();
    const previousRecord = records.at(-1);

    const record = {
        audit_id: createUUIDv7(),
        timestamp: new Date().toISOString(),
        event_type: eventType,
        actor,
        entity_id: entityId,
        previous_hash: previousRecord
            ? previousRecord.record_hash
            : null,
        payload
    };

    const recordHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(record), "utf8")
        .digest("hex");

    const completedRecord = {
        ...record,
        record_hash: recordHash
    };

    fs.appendFileSync(
        AUDIT_FILE,
        `${JSON.stringify(completedRecord)}\n`,
        "utf8"
    );

    return completedRecord;
}

module.exports = {
    AUDIT_FILE,
    readRecords,
    hasEvent,
    appendEvent
};