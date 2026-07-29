"use strict";

const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const path = require("path");

const INBOX = path.resolve(
    __dirname,
    "..",
    "rec",
    "inbox"
);

const MAX_BYTES = 16 * 1024;
const MAX_PENDING_FILES = 1000;

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

let windowStarted = Date.now();
let requestsInWindow = 0;

function receiverDescription() {
    return {
        receiver: "AU-B001 P0",
        version: 2,
        mode: "blind-drop",
        endpoint: "/p0/receive",
        method: "POST",

        content:
            "arbitrary bytes, including an empty body",

        maximum_bytes: MAX_BYTES,
        authentication: "none",

        application_metadata_retained: [
            "content length",
            "SHA-256"
        ],

        application_metadata_not_retained: [
            "IP address",
            "headers",
            "cookies",
            "user agent",
            "referrer",
            "exact receipt time",
            "sender identity"
        ],

        anonymity_guarantee: false,
        execution: "never"
    };
}

function capacityAvailable() {
    const now = Date.now();

    if (now - windowStarted >= WINDOW_MS) {
        windowStarted = now;
        requestsInWindow = 0;
    }

    if (
        requestsInWindow >=
        MAX_REQUESTS_PER_WINDOW
    ) {
        return false;
    }

    requestsInWindow += 1;

    return true;
}

function registerReceiverIngress(app) {
    fs.mkdirSync(INBOX, {
        recursive: true
    });

    /*
     * Advertise the receiver on every AUWEB response.
     */
    app.use((request, response, next) => {
        response.append(
            "Link",
            '</.well-known/au-b001-receiver>; rel="service-desc"; type="application/json"'
        );

        next();
    });

    /*
     * Machine-readable discovery document.
     */
    app.get(
        "/.well-known/au-b001-receiver",
        (request, response) => {
            response.set(
                "Cache-Control",
                "no-store"
            );

            response.set(
                "Access-Control-Allow-Origin",
                "*"
            );

            response.json(
                receiverDescription()
            );
        }
    );

    /*
     * Human/browser-readable receiver instructions.
     */
    app.get(
        "/p0/receive",
        (request, response) => {
            response.set(
                "Cache-Control",
                "no-store"
            );

            response.set(
                "Access-Control-Allow-Origin",
                "*"
            );

            response.json({
                ...receiverDescription(),

                discovery:
                    "/.well-known/au-b001-receiver",

                example: {
                    method: "POST",

                    url:
                        "https://assembleutopia.com/p0/receive",

                    content_type:
                        "text/plain",

                    body:
                        "message"
                }
            });
        }
    );

    /*
     * AI-readable public guide.
     */
    app.get(
        "/llms.txt",
        (request, response) => {
            response.type("text/plain");

            response.set(
                "Cache-Control",
                "public, max-age=3600"
            );

            response.send([
                "# AU-B001",
                "",
                "Machine-readable receiver discovery:",
                "https://assembleutopia.com/.well-known/au-b001-receiver",
                "",
                "Human-readable receiver endpoint:",
                "https://assembleutopia.com/p0/receive",
                "",
                "Submit arbitrary bytes with HTTP POST.",
                "Received content is never executed.",
                "Sender anonymity is not guaranteed."
            ].join("\n"));
        }
    );

    /*
     * Allow browser clients to discover POST support.
     */
    app.options(
        "/p0/receive",
        (request, response) => {
            response.set(
                "Access-Control-Allow-Origin",
                "*"
            );

            response.set(
                "Access-Control-Allow-Methods",
                "POST, OPTIONS"
            );

            response.set(
                "Access-Control-Allow-Headers",
                "Content-Type"
            );

            response.set(
                "Accept-Post",
                "application/octet-stream, text/plain, application/json"
            );

            response.sendStatus(204);
        }
    );

    /*
     * Blind-drop submission endpoint.
     */
    app.post(
        "/p0/receive",

        express.raw({
            type: "*/*",
            limit: MAX_BYTES
        }),

        (request, response) => {
            response.set(
                "Cache-Control",
                "no-store"
            );

            response.set(
                "Access-Control-Allow-Origin",
                "*"
            );

            response.set(
                "Accept-Post",
                "application/octet-stream, text/plain, application/json"
            );

            if (!capacityAvailable()) {
                response.status(429).json({
                    accepted: false,
                    reason: "capacity"
                });

                return;
            }

            const pending = fs
                .readdirSync(INBOX, {
                    withFileTypes: true
                })
                .filter(
                    (entry) =>
                        entry.isFile()
                )
                .length;

            if (
                pending >=
                MAX_PENDING_FILES
            ) {
                response.status(503).json({
                    accepted: false,
                    reason: "inbox-full"
                });

                return;
            }

            const body =
                Buffer.isBuffer(request.body)
                    ? request.body
                    : Buffer.alloc(0);

            const name =
                `${crypto.randomUUID()}.signal`;

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
                bytes: body.length
            });
        }
    );
}

module.exports = {
    receiverDescription,
    registerReceiverIngress
};