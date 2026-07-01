// dream-distortion.js
// AU-B001 DDSU
// Dream Distortion Signal Unit
//
// The dream model produces the clean dream body.
// DDSU damages the dream after birth.

const fs = require("fs");
const path = require("path");

const { getDDSUConfig } = require("./ddsu-control");

function chance(probability) {
    return Math.random() < probability;
}

function pick(array) {
    if (!array || !array.length) return null;
    return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function shortClean(value) {
    return String(value || "")
        .replace(/[^a-fA-F0-9]/g, "")
        .toUpperCase();
}

function weightedPick(items, getWeight) {
    const available = items.filter(item => {
        const weight = getWeight(item);
        return Number.isFinite(weight) && weight > 0;
    });

    if (!available.length) return null;

    const total = available.reduce((sum, item) => {
        return sum + getWeight(item);
    }, 0);

    let cursor = Math.random() * total;

    for (const item of available) {
        cursor -= getWeight(item);

        if (cursor <= 0) {
            return item;
        }
    }

    return available[available.length - 1];
}

function readPublicFragments() {
    const filePath = path.join(__dirname, "dream-fragments.txt");

    if (!fs.existsSync(filePath)) return [];

    return fs
        .readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"));
}

function makeArchiveShrapnel(memory, config) {
    const layer = config.layers.archiveShrapnel;
    const fragments = [];

    function collect(value) {
        const cleaned = shortClean(value);

        if (cleaned.length >= layer.minLength) {
            fragments.push(cleaned);
        }
    }

    (memory.glitch_fragments || []).forEach(fragment => {
        collect(fragment.tag);
        collect(fragment.fragment);
    });

    (memory.memory_artifacts || []).forEach(item => {
        collect(item.entropy_fragment);
        collect(item.terminal_fragment);
    });

    if (!fragments.length) {
        fragments.push(
            Math.random()
                .toString(16)
                .slice(2, 10)
                .toUpperCase()
        );
    }

    const base = pick(fragments);
    const maxLength = Math.min(layer.maxLength, base.length);
    const minLength = Math.min(layer.minLength, maxLength);
    const length = randomInt(minLength, maxLength);
    const start = randomInt(0, Math.max(0, base.length - length));
    const shard = base.slice(start, start + length);

    // Sacred rule:
    // archive shrapnel always starts with }
    // and always ends with casual special symbol.
    return "}" + shard + pick(layer.endings);
}

function makePublicFragmentScar(config) {
    const layer = config.layers.publicFragmentScar;
    const fragments = readPublicFragments();

    const line =
        fragments.length
            ? pick(fragments)
            : "THE SIGNAL REMEMBERED A DAMAGED FRAGMENT";

    return hddEraseLine(line, config);
}

function hddEraseLine(line, config) {
    const layer = config.layers.publicFragmentScar;
    const chars = Array.from(String(line || ""));

    if (!chars.length) return line;

    const candidateIndexes = chars
        .map((char, index) => {
            if (/[A-Za-zА-Яа-яІіЇїЄє0-9]/.test(char)) {
                return index;
            }

            return -1;
        })
        .filter(index => index >= 0);

    if (!candidateIndexes.length) return line;

    const scarMax = Math.max(
        layer.eraseMin,
        Math.floor(chars.length / layer.eraseMaxDivisor)
    );

    const scarCount = randomInt(layer.eraseMin, scarMax);

    for (let i = 0; i < scarCount; i++) {
        const start = pick(candidateIndexes);
        const runLength = randomInt(layer.runMin, layer.runMax);

        for (let j = 0; j < runLength; j++) {
            const index = start + j;

            if (
                index < chars.length &&
                /[A-Za-zА-Яа-яІіЇїЄє0-9]/.test(chars[index])
            ) {
                chars[index] = pick(layer.blocks);
            }
        }
    }

    return chars.join("");
}

function makeGlyphRot(config) {
    const layer = config.layers.cursedGlyphRot;
    const count = randomInt(layer.clusterMin, layer.clusterMax);
    let output = "";

    for (let i = 0; i < count; i++) {
        output += pick(layer.symbols);

        if (chance(layer.doubleChance)) {
            output += pick(layer.symbols);
        }
    }

    return output;
}

function readSecretBlocks() {
    const filePath = path.join(__dirname, "dream-secret.txt");

    if (!fs.existsSync(filePath)) {
        return {
            commands: [],
            insults: [],
            assassins: [],
            shadow: [],
            forest: []
        };
    }

    const raw = fs.readFileSync(filePath, "utf8");

    const blocks = raw
        .split(/\r?\n\s*\r?\n+/)
        .map(block => block.trim())
        .filter(Boolean)
        .map(block =>
            block
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean)
        );

    return {
        commands: blocks[0] || [],
        insults: blocks[1] || [],
        assassins: blocks[2] || [],
        shadow: blocks[3] || [],
        forest: blocks[4] || []
    };
}

function elongateLetters(line, config) {
    const settings = config.layers.secretPossession.insults;

    return String(line || "")
        .split(" ")
        .map(word => {
            if (!/[A-ZА-ЯІЇЄa-zа-яіїє]/.test(word)) return word;
            if (!chance(settings.elongationChance)) return word;

            const chars = Array.from(word);

            const letterIndexes = chars
                .map((char, index) => {
                    return /[A-ZА-ЯІЇЄa-zа-яіїє]/.test(char)
                        ? index
                        : -1;
                })
                .filter(index => index >= 0);

            if (!letterIndexes.length) return word;

            const index = pick(letterIndexes);
            const repeats = randomInt(
                settings.minRepeats,
                settings.maxRepeats
            );

            chars[index] = chars[index].repeat(repeats);

            return chars.join("");
        })
        .join(" ");
}

function unstableCase(line, config) {
    const settings = config.layers.secretPossession.forest;
    let upper = chance(0.5);

    return Array.from(String(line || ""))
        .map(char => {
            if (!/[A-Za-zА-Яа-яІіЇїЄє]/.test(char)) return char;

            if (chance(settings.caseFlipChance)) {
                upper = !upper;
            }

            return upper
                ? char.toUpperCase()
                : char.toLowerCase();
        })
        .join("");
}

function maybeWoundSecretLine(line, memory, config) {
    const layer = config.layers.secretPossession;

    if (!layer.allowInternalShrapnel) return line;
    if (!chance(layer.internalShrapnelChance)) return line;

    const text = String(line || "");

    if (text.length < 4) return text;

    const position = randomInt(1, text.length - 1);
    const shard = makeArchiveShrapnel(memory, config);

    return text.slice(0, position) + shard + text.slice(position);
}

function quoteLine(line, memory, config) {
    const wounded = maybeWoundSecretLine(line, memory, config);

    return "\"" + String(wounded || "").trim() + "\"";
}

function makeSecretPossession(memory, config) {
    const blocks = readSecretBlocks();
    const weights = config.layers.secretPossession.blockWeights;

    const channels = [];

    if (blocks.commands.length) {
        channels.push("commands");
    }

    if (blocks.insults.length) {
        channels.push("insults");
    }

    if (blocks.assassins.length) {
        channels.push("assassins");
    }

    if (blocks.shadow.length) {
        channels.push("shadow");
    }

    if (blocks.forest.length) {
        channels.push("forest");
    }

    if (!channels.length) {
        return quoteLine("DDSU online", memory, config);
    }

    const channel = weightedPick(
        channels,
        name => weights[name] || 0
    );

    if (channel === "commands") {
        // DDSU/protocol block remains untouched,
        // except rare allowed shrapnel wound from quoteLine().
        return quoteLine(pick(blocks.commands), memory, config);
    }

    if (channel === "insults") {
        return quoteLine(
            elongateLetters(pick(blocks.insults), config),
            memory,
            config
        );
    }

    if (channel === "assassins") {
        return quoteLine(pick(blocks.assassins), memory, config);
    }

    if (channel === "shadow") {
        return quoteLine(pick(blocks.shadow), memory, config);
    }

    if (channel === "forest") {
        return quoteLine(
            unstableCase(pick(blocks.forest), config),
            memory,
            config
        );
    }

    return quoteLine("CLEAR.", memory, config);
}

function randomInsertionPosition(text, preferBoundary = false) {
    if (!text.length) return 0;

    if (!preferBoundary) {
        return randomInt(0, text.length);
    }

    const boundaries = [];

    for (let i = 0; i < text.length; i++) {
        if (/\s|[.,;:!?]/.test(text[i])) {
            boundaries.push(i + 1);
        }
    }

    if (!boundaries.length) {
        return randomInt(0, text.length);
    }

    return pick(boundaries);
}

function insertAt(text, index, insertion) {
    return text.slice(0, index) + insertion + text.slice(index);
}

function enabledLayerEntries(config) {
    const layers = config.layers || {};

    return Object.entries(layers)
        .filter(([, layer]) => layer && layer.enabled && layer.weight > 0);
}

function chooseLayer(config) {
    const entries = enabledLayerEntries(config);

    return weightedPick(
        entries,
        ([, layer]) => layer.weight
    );
}

function makeDistortionEvent(memory, config) {
    const chosen = chooseLayer(config);

    if (!chosen) {
        return null;
    }

    const [layerName] = chosen;

    if (layerName === "archiveShrapnel") {
        return {
            channel: "ARCHIVE_SHRAPNEL",
            text: makeArchiveShrapnel(memory, config),
            boundary: false
        };
    }

    if (layerName === "publicFragmentScar") {
        return {
            channel: "PUBLIC_FRAGMENT_SCAR",
            text: " " + makePublicFragmentScar(config) + " ",
            boundary: true
        };
    }

    if (layerName === "cursedGlyphRot") {
        return {
            channel: "CURSED_GLYPH_ROT",
            text: makeGlyphRot(config),
            boundary: false
        };
    }

    if (layerName === "secretPossession") {
        return {
            channel: "SECRET_POSSESSION",
            text: " " + makeSecretPossession(memory, config) + " ",
            boundary: true
        };
    }

    if (layerName === "mixedHotspot") {
        return {
            channel: "MIXED_HOTSPOT",
            text:
                makeArchiveShrapnel(memory, config) +
                " " +
                makePublicFragmentScar(config) +
                " " +
                makeGlyphRot(config) +
                " " +
                makeSecretPossession(memory, config),
            boundary: true
        };
    }

    return null;
}

function calculateEventCount(text, config) {
    const density = config.eventDensity;
    const intensity = Math.max(0, Number(config.intensity || 0));

    if (!config.enabled || intensity <= 0) {
        return 0;
    }

    const base =
        Math.floor(text.length / density.charsPerEvent) +
        randomInt(density.minExtraEvents, density.maxExtraEvents);

    return clamp(
        Math.round(base * intensity),
        density.minEvents,
        density.maxEvents
    );
}

function chooseHotspotCenters(text, config) {
    const hotspots = config.hotspots;

    if (!hotspots.enabled || !text.length) {
        return [];
    }

    const intensity = Math.max(0.1, Number(config.intensity || 1));
    const min = Math.max(0, Math.round(hotspots.min * intensity));
    const max = Math.max(min, Math.round(hotspots.max * intensity));

    const count = randomInt(min, max);
    const centers = [];

    for (let i = 0; i < count; i++) {
        centers.push(randomInt(0, Math.max(0, text.length - 1)));
    }

    return centers;
}

function chooseEventPosition(text, event, config, hotspotCenters) {
    const hotspots = config.hotspots;

    if (
        hotspots.enabled &&
        hotspotCenters.length &&
        chance(hotspots.pullChance)
    ) {
        const center = pick(hotspotCenters);
        const radius = randomInt(
            hotspots.radiusMin,
            hotspots.radiusMax
        );

        return Math.max(
            0,
            Math.min(
                text.length,
                center + randomInt(-radius, radius)
            )
        );
    }

    return randomInsertionPosition(text, event.boundary);
}

function distortDream(cleanText, memory) {
    const config = getDDSUConfig();

    let text = String(cleanText || "");
    const ledger = [];

    const eventCount = calculateEventCount(text, config);
    const hotspotCenters = chooseHotspotCenters(text, config);

    const events = [];

    for (let i = 0; i < eventCount; i++) {
        const event = makeDistortionEvent(memory, config);

        if (!event) continue;

        const position = chooseEventPosition(
            text,
            event,
            config,
            hotspotCenters
        );

        events.push({
            ...event,
            position
        });
    }

    events
        .sort((a, b) => b.position - a.position)
        .forEach(event => {
            let insertion = event.text;

            if (event.channel === "ARCHIVE_SHRAPNEL") {
                insertion = chance(config.layers.archiveShrapnel.trailingSpaceChance)
                    ? insertion + " "
                    : insertion;
            }

            if (event.channel === "CURSED_GLYPH_ROT") {
                insertion = chance(config.layers.cursedGlyphRot.leadingSpaceChance)
                    ? " " + insertion
                    : insertion;
            }

            text = insertAt(text, event.position, insertion);

            ledger.push({
                channel: event.channel,
                position: event.position,
                visible_fragment: String(event.text).slice(0, 120)
            });
        });

    return {
        text,
        distortion: {
            version: "DDSU-3",
            profile: "CONFIGURABLE_CHAOTIC_DISTORTION",
            enabled: config.enabled,
            intensity: config.intensity,
            channels: [
                "ARCHIVE_SHRAPNEL",
                "PUBLIC_FRAGMENT_SCAR",
                "CURSED_GLYPH_ROT",
                "SECRET_POSSESSION",
                "MIXED_HOTSPOT"
            ],
            event_count: events.length,
            hotspot_count: hotspotCenters.length,
            layer_weights: Object.fromEntries(
                Object.entries(config.layers || {}).map(([name, layer]) => {
                    return [name, layer.weight];
                })
            ),
            ledger
        }
    };
}

module.exports = {
    distortDream,
    makeArchiveShrapnel,
    makeGlyphRot,
    makeSecretPossession,
    makePublicFragmentScar
};