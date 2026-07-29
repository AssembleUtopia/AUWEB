"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { sha256 } = require("./local-receiver");

test("receiver SHA-256 is deterministic", () => {
    assert.equal(
        sha256(Buffer.from("AU-B001")),
        "6ce31d79b50cf75c547893359961b118783adaf9c1b46cc524b8156a39c812db"
    );
});