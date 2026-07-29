"use strict";

// PUBLIC TRANSPORT FOR THE P0 LOCAL RECEIVER
// POST bytes -> rec/inbox file
// The separate local-receiver process performs hashing and archival.

const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const path = require("path");

const INBOX = path.resolve(__dirname, "..", "rec", "inbox");
const MAX_BYTES = 16 * 1024;
const MAX_PENDING_FILES = 1000;

function registerReceiverIngress(app) {
    fs.mkdirSync(INBOX, { recursive: true });

    app.get(
        "/.well-known/au-b001-receiver",
        (request, response) => {
            response.json({
                receiver: "AU-B001 P0",
                version: 1,
                endpoint: "/p0/receive",
                method: "POST",
                content: "arbitrary bytes, including an empty body",
                maximum_bytes: MAX_BYTES,
                authentication: "none",
                execution: "never"
            });
        }
    );

    app.post(
        "/p0/receive",
        express.raw({
            type: "*/*",
            limit: MAX_BYTES
        }),
        (request, response) => {
            const pending = fs
                .readdirSync(INBOX, { withFileTypes: true })
                .filter((entry) => entry.isFile())
                .length;

            if (pending >= MAX_PENDING_FILES) {
                response.status(503).json({
                    accepted: false,
                    reason: "inbox-full"
                });
                return;
            }

            const body = Buffer.isBuffer(request.body)
                ? request.body
                : Buffer.alloc(0);

            const id = crypto.randomUUID();
            const name = `${Date.now()}_${id}.signal`;

            fs.writeFileSync(
                path.join(INBOX, name),
                body,
                {
                    flag: "wx",
                    mode: 0o600
                }
            );

            response.status(202).json({
                accepted: true,
                id,
                bytes: body.length
            });
        }
    );
}

module.exports = {
    registerReceiverIngress
};