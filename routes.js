const express = require("express");

function registerRoutes(app, deps) {

    const {
        loadArchive,
        buildInternalState,
        renderConstellations,
        renderLatestDream,
        renderDreamMap
    } = deps;

    app.get("/archive", (req, res) => {

        const archive = loadArchive();

        res.type("application/json");
        res.send(
            JSON.stringify(
                archive,
                null,
                2
            )
        );

    });

    app.get("/internal", (req, res) => {

        const report = buildInternalState(deps.getBroadcast());

        res.type("text/plain");
        res.send(JSON.stringify(report, null, 2));

    });

    app.get("/constellations", (req, res) => {

        res.type("text/plain");
        res.send(renderConstellations());

    });

    app.get("/dream", (req, res) => {

        res.type("text/plain");
        res.send(renderLatestDream());

    });

    app.get("/dreammap", (req, res) => {

        res.type("text/plain");
        res.send(renderDreamMap());

    });

    app.get("/observatory", (req, res) => {

        const archive = loadArchive();

        const uniqueOrigins =
            new Set(
                archive.map(item => item.origin)
            ).size;

        const uniqueTerminals =
            new Set(
                archive.map(item => item.terminal_entropy)
            ).size;

        const entityCounts = {};

        archive.forEach(item => {

            entityCounts[item.entity] =
                (entityCounts[item.entity] || 0) + 1;

        });

        const report = {
            beacon: "AU-B001",
            status: "OBSERVATORY OPEN",
            total_encounters: archive.length,
            unique_origins: uniqueOrigins,
            unique_terminals: uniqueTerminals,
            entities: entityCounts,
            most_recent:
                archive.length
                    ? archive[archive.length - 1]
                    : null
        };

        res.type("text/plain");
        res.send(JSON.stringify(report, null, 2));

    });

}

module.exports = {
    registerRoutes
};