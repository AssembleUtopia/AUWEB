const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const CONSTITUTION_VERSION = "1.0.0";
const EXPECTED_SIZE = 5502;
const EXPECTED_HASH =
    "f3de580c6ca3c4ebc562be492ec31ddfd7a45a5b29307d31d0d14c4ce21a587e";

const CONSTITUTION_FILE = path.join(__dirname, "constitution.md");

function verifyConstitution() {
    const bytes = fs.readFileSync(CONSTITUTION_FILE);
    const actualHash = crypto
        .createHash("sha256")
        .update(bytes)
        .digest("hex");

    if (bytes.length !== EXPECTED_SIZE) {
        throw new Error(
            `P0 CONSTITUTION SIZE MISMATCH: expected ${EXPECTED_SIZE}, received ${bytes.length}`
        );
    }

    if (actualHash !== EXPECTED_HASH) {
        throw new Error(
            `P0 CONSTITUTION HASH MISMATCH: expected ${EXPECTED_HASH}, received ${actualHash}`
        );
    }

    return Object.freeze({
        version: CONSTITUTION_VERSION,
        hash: actualHash,
        size: bytes.length,
        file: CONSTITUTION_FILE
    });
}

module.exports = {
    verifyConstitution,
    CONSTITUTION_VERSION,
    EXPECTED_HASH
};