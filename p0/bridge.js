const crypto = require("crypto");

function getConfig() {
    const baseUrl = process.env.P0_BASE_URL;
    const secret = process.env.P0_WEBHOOK_SECRET;

    if (!baseUrl) {
        throw new Error("P0_BASE_URL is missing");
    }

    if (!secret) {
        throw new Error("P0_WEBHOOK_SECRET is missing");
    }

    return {
        baseUrl: baseUrl.replace(/\/+$/, ""),
        secret
    };
}

function createUUIDv7() {
    const bytes = crypto.randomBytes(16);
    const timestamp = BigInt(Date.now());

    bytes[0] = Number((timestamp >> 40n) & 0xffn);
    bytes[1] = Number((timestamp >> 32n) & 0xffn);
    bytes[2] = Number((timestamp >> 24n) & 0xffn);
    bytes[3] = Number((timestamp >> 16n) & 0xffn);
    bytes[4] = Number((timestamp >> 8n) & 0xffn);
    bytes[5] = Number(timestamp & 0xffn);

    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = bytes.toString("hex");

    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20)
    ].join("-");
}

function createSignedRequest(body) {
    const { secret } = getConfig();
    const rawBody = JSON.stringify(body);
    const timestamp = Date.now().toString();
    const eventId = createUUIDv7();

    const signature = crypto
        .createHmac("sha256", secret)
        .update(rawBody, "utf8")
        .digest("hex");

    return {
        rawBody,
        headers: {
            "Content-Type": "application/json",
            "X-P0-Signature": signature,
            "X-P0-Timestamp": timestamp,
            "X-P0-Event-Id": eventId
        }
    };
}

function inspectConfiguration() {
    const { baseUrl, secret } = getConfig();

    return {
        baseUrl,
        secretLoaded: secret.length > 0
    };
}

module.exports = {
    getConfig,
    createUUIDv7,
    createSignedRequest,
    inspectConfiguration
};