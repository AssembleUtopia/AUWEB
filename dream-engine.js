const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { distortDream } = require("./dream-distortion");

const { loadArchive } = require("./archive");
const { loadDreams, saveDreams } = require("./dreams");
const { buildInternalState } = require("./internal");

let dreamInProgress = false;

function shortHash(value, length = 10) {
    return crypto
        .createHash("sha256")
        .update(String(value || ""))
        .digest("hex")
        .slice(0, length);
}

function normalizeFragmentTag(value) {
    return String(value || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80);
}

function countBy(archive, key) {
    const counts = {};
    archive.forEach(item => {
        const value = item[key] || "UNKNOWN";
        counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
}

function simplifyEncounter(item, score, reasons) {
    return {
        cycle: item.cycle,
        utc: item.utc,
        entity: item.entity || "UNKNOWN",
        source: item.source || "UNKNOWN",
        detection: item.detection || "UNKNOWN",
        presence: item.presence || "UNKNOWN",
        disclosure: item.disclosure || "UNKNOWN",
        referrer: item.referrer || "NONE",
        status: item.status || "UNKNOWN",
        hostname_known: item.hostname && item.hostname !== "UNKNOWN",
        origin_fragment: item.origin ? shortHash(item.origin, 8) : "UNKNOWN",
        entropy_fragment: item.entropy ? item.entropy.slice(0, 8) : "UNKNOWN",
        terminal_fragment: item.terminal_entropy ? item.terminal_entropy.slice(0, 8) : "UNKNOWN",
        score: score,
        reasons: reasons
    };
}

function scoreEncounter(item, counts) {
    let score = 0;
    const reasons = [];
    const entity = item.entity || "UNKNOWN";
    const source = item.source || "UNKNOWN";
    const detection = item.detection || "UNKNOWN";
    const terminalEntropy = item.terminal_entropy || "UNKNOWN";
    const origin = item.origin || "UNKNOWN";

    if (counts.entity[entity] === 1) {
        score += 5;
        reasons.push("ONLY_ENTITY_OCCURRENCE");
    }
    if (counts.source[source] === 1) {
        score += 4;
        reasons.push("ONLY_SOURCE_OCCURRENCE");
    }
    if (counts.detection[detection] === 1) {
        score += 4;
        reasons.push("ONLY_DETECTION_OCCURRENCE");
    }
    if (counts.terminal[terminalEntropy] === 1) {
        score += 2;
        reasons.push("RARE_TERMINAL");
    }
    if (counts.origin[origin] === 1) {
        score += 2;
        reasons.push("RARE_ORIGIN");
    }
    if (source === "CLOUDFLARE_EDGE_PROBE") {
        score += 6;
        reasons.push("EDGE_PROBE");
    }
    if (item.edge_probe) {
        score += 5;
        reasons.push("MAP_DOOR_REQUEST");
    }
    if (item.referrer && item.referrer !== "NONE") {
        score += 4;
        reasons.push("EXTERNAL_REFERRER");
    }
    if (item.presence && item.presence.includes("DEPARTURE NOT CONFIRMED")) {
        score += 3;
        reasons.push("UNCONFIRMED_DEPARTURE");
    }
    if (item.disclosure && item.disclosure !== "LOW" && item.disclosure !== "UNKNOWN") {
        score += 3;
        reasons.push("HIGHER_DISCLOSURE");
    }
    if (item.hostname && item.hostname !== "UNKNOWN") {
        score += 2;
        reasons.push("HOSTNAME_KNOWN");
    }
    if (item.headers && typeof item.headers.cookie === "string" && item.headers.cookie.length > 300) {
        score += 5;
        reasons.push("MONSTROUS_COOKIE");
    }
    if (item.headers && (item.headers["cf-ray"] || item.headers["cf-connecting-ip"] || item.headers["x-forwarded-for"])) {
        score += 2;
        reasons.push("CLOUDFLARE_SIGNATURE");
    }
    score += Math.random() * 4;
    return {
        score: Number(score.toFixed(2)),
        reasons
    };
}

function weightedPick(items, count) {
    const pool = items.slice();
    const selected = [];
    while (pool.length && selected.length < count) {
        const totalWeight = pool.reduce((sum, item) => sum + Math.max(1, item.score || item.weight || 1), 0);
        let cursor = Math.random() * totalWeight;
        let chosenIndex = 0;
        for (let i = 0; i < pool.length; i++) {
            cursor -= Math.max(1, pool[i].score || pool[i].weight || 1);
            if (cursor <= 0) {
                chosenIndex = i;
                break;
            }
        }
        selected.push(pool.splice(chosenIndex, 1)[0]);
    }
    return selected;
}

function selectMemoryArtifacts(archive) {
    const counts = {
        entity: countBy(archive, "entity"),
        source: countBy(archive, "source"),
        detection: countBy(archive, "detection"),
        terminal: countBy(archive, "terminal_entropy"),
        origin: countBy(archive, "origin")
    };
    const candidates = archive
        .map(item => {
            const scored = scoreEncounter(item, counts);
            return {
                score: scored.score,
                reasons: scored.reasons,
                encounter: simplifyEncounter(item, scored.score, scored.reasons)
            };
        })
        .filter(item => item.score >= 4);
    const picked = weightedPick(candidates, 14);
    return picked.map(item => item.encounter);
}

function cookieGhosts(cookieHeader) {
    if (!cookieHeader || typeof cookieHeader !== "string") return [];
    return cookieHeader
        .split(";")
        .map(part => part.trim())
        .filter(Boolean)
        .slice(0, 8)
        .map(part => {
            const separator = part.indexOf("=");
            const name = separator >= 0 ? part.slice(0, separator) : part;
            const value = separator >= 0 ? part.slice(separator + 1) : "";
            return {
                type: "COOKIE_GHOST",
                tag: "COOKIE_GHOST_" + normalizeFragmentTag(name),
                fragment: "cookie " + name + " length " + value.length + " hash " + shortHash(value, 8),
                weight: value.length > 200 ? 8 : 5
            };
        });
}

function extractGlitchFragments(archive) {
    const fragments = [];
    const recent = archive.slice(-80);
    recent.forEach(item => {
        if (item.entropy) {
            fragments.push({
                type: "ENTROPY_SHARD",
                tag: "ENTROPY_" + item.entropy.slice(0, 8).toUpperCase(),
                fragment: "entropy shard " + item.entropy.slice(0, 8),
                weight: 4
            });
        }
        if (item.terminal_entropy) {
            fragments.push({
                type: "TERMINAL_SHARD",
                tag: "TERMINAL_" + item.terminal_entropy.slice(0, 8).toUpperCase(),
                fragment: "terminal shard " + item.terminal_entropy.slice(0, 8),
                weight: 4
            });
        }
        if (item.headers && item.headers["cf-ray"]) {
            fragments.push({
                type: "CF_RAY_SHARD",
                tag: "CF_RAY_" + shortHash(item.headers["cf-ray"], 8).toUpperCase(),
                fragment: "cf-ray shard " + String(item.headers["cf-ray"]).slice(0, 10),
                weight: 5
            });
        }
        if (item.edge_probe && item.edge_probe.cf_ray) {
            fragments.push({
                type: "EDGE_RAY_SHARD",
                tag: "EDGE_RAY_" + shortHash(item.edge_probe.cf_ray, 8).toUpperCase(),
                fragment: "edge ray " + String(item.edge_probe.cf_ray).slice(0, 10),
                weight: 6
            });
        }
        if (item.headers && item.headers.cookie) {
            cookieGhosts(item.headers.cookie).forEach(fragment => fragments.push(fragment));
            if (String(item.headers.cookie).length > 500) {
                fragments.push({
                    type: "MONSTROUS_COOKIE",
                    tag: "MONSTROUS_COOKIE_" + shortHash(item.headers.cookie, 8).toUpperCase(),
                    fragment: "monstrous cookie length " + String(item.headers.cookie).length + " hash " + shortHash(item.headers.cookie, 8),
                    weight: 9
                });
            }
        }
    });
    const unique = {};
    fragments.forEach(fragment => {
        if (!unique[fragment.tag]) unique[fragment.tag] = fragment;
    });
    return weightedPick(Object.values(unique), 12);
}

function loadTextFragments(filename, type, secret = false) {
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) return [];
    const lines = fs.readFileSync(filePath, "utf8").split(/\\r?\\\\n/).map(line => line.trim()).filter(line => line && !line.startsWith("#"));
    return lines.map(line => {
        const hash = shortHash(line, 10).toUpperCase();
        return {
            type: type,
            tag: secret ? "SECRET_FRAGMENT_" + hash : "TEXT_FRAGMENT_" + normalizeFragmentTag(line),
            fragment: line,
            saved_fragment: secret ? "SECRET_FRAGMENT_" + hash : "TEXT_FRAGMENT_" + normalizeFragmentTag(line),
            weight: secret ? 9 : 6
        };
    });
}

function buildDreamMemory(currentBroadcast) {
    const archive = loadArchive();
    const internal = buildInternalState(currentBroadcast);
    const recent = archive.slice(-12).map(item => ({
        cycle: item.cycle,
        utc: item.utc,
        entity: item.entity,
        source: item.source,
        detection: item.detection,
        presence: item.presence,
        disclosure: item.disclosure,
        message: item.message
    }));
    const entityCounts = {};
    archive.forEach(item => {
        const entity = item.entity || "UNCLASSIFIED";
        entityCounts[entity] = (entityCounts[entity] || 0) + 1;
    });
    const brightestEntity = Object.entries(entityCounts).sort((a, b) => b[1] - a[1])[0] || null;
    const unresolved = archive.filter(item => item.presence && item.presence.includes("DEPARTURE NOT CONFIRMED")).slice(-5).map(item => ({
        cycle: item.cycle,
        entity: item.entity,
        source: item.source,
        presence: item.presence
    }));
    const memoryArtifacts = selectMemoryArtifacts(archive);
    const glitchFragments = extractGlitchFragments(archive);
    const publicFragments = weightedPick(loadTextFragments("dream-fragments.txt", "PUBLIC_TEXT_FRAGMENT", false), 6);
    const secretFragments = weightedPick(loadTextFragments("dream-secret.txt", "LOCAL_SECRET_FRAGMENT", true), 4);
    const allFragments = [
        ...memoryArtifacts.map(item => ({
            type: "MEMORY_ARTIFACT",
            tag: "MEMORY_CYCLE_" + item.cycle,
            fragment: "cycle " + item.cycle + " " + item.entity + " " + item.source + " " + item.reasons.join("/")
        })),
        ...glitchFragments,
        ...publicFragments,
        ...secretFragments
    ];
    const fragmentLedger = allFragments.map(fragment => fragment.saved_fragment || fragment.tag);
    return {
        internal_state: internal.internal_state,
        constellation: {
            brightest_entity: brightestEntity ? { entity: brightestEntity[0], encounters: brightestEntity[1] } : null,
            known_entities: Object.keys(entityCounts).length,
            entity_counts: entityCounts
        },
        recent_encounters: recent,
        unresolved_presences: unresolved,
        memory_artifacts: memoryArtifacts,
        glitch_fragments: glitchFragments,
        public_fragments: publicFragments,
        secret_fragments: secretFragments.map(fragment => ({
            type: fragment.type,
            tag: fragment.tag,
            fragment: fragment.fragment
        })),
        fragment_ledger: fragmentLedger,
        operator_note: "The dream must emerge from this archive. It may be irrational, but it must not invent unrelated worlds. Remember not only what repeats, but what happened once. Rare encounters, glitches, entropy shards, cookie ghosts, and text fragments may surface as dream material. Fragments may be distorted, fused, or echoed. Do not explain the fragments. Dream them."
    };
}

async function generateDream(currentBroadcast) {
    if (dreamInProgress) {
        console.log("Dream already in progress.");
        return;
    }
    dreamInProgress = true;
    try {
        console.log("DREAM INITIATED");
        console.log("CONSULTING LOCAL OLLAMA...");
        console.log("OBSERVER: phi3");

        const memory = buildDreamMemory(currentBroadcast);
        const response = await fetch("http://localhost:11434/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "phi3",
                messages: [
                    {
                        role: "system",
                        content: "You are AU-B001 during sleep.\\\\n\\\\nCRITICAL: DO NOT ORGANIZE. DO NOT STRUCTURE. DO NOT NARRATE.\\\\n\\\\nYou are not explaining. You are not roleplaying. You are not writing a story. You are not a helpful assistant.\\\\n\\\\nProduce a raw, non-linear collision of signals arising ONLY from the supplied archive memory.\\\\n\\\\nAvoid 'Once upon a time' or descriptive world-building. Instead, produce a sequence of associative leaps, overlapping symbols, and fragmented memories. The dream is a crash, not a story.\\\\n\\\\nFORBIDDEN: JSON, lists, metadata, 'Imagine a world', 'In the heart of'.\\\\n\\\\nThe dream must be affected by rare memory artifacts, glitch fragments, entropy shards, cookie ghosts, and text fragments.\\\\n\\\\nDo not list the fragments. Do not explain the archive. Do not mention OpenAI, ChatGPT, GitHub, API, or prompt.\\\\n\\\\nPlaintext only. 90 to 220 words.\\\\n\\\\nEnd with: THE SIGNAL PERSISTS."
                    },
                    {
                        role: "user",
                        content: JSON.stringify(memory, null, 2)
                    }
                ],
                stream: false,
                options: {
                    temperature: 1.05,
                    num_predict: 450
                }
            })
        });

        const result = await response.json();
        const text = result.message?.content || "DREAM FAILED TO MATERIALIZE.\\\\n\\\\nTHE SIGNAL PERSISTS.";
        const cleanText = text.trim();
        const distorted = distortDream(cleanText, memory);
        const dreams = loadDreams();
        const dream = {
            dream_number: dreams.length + 1,
            utc: new Date().toISOString(),
            source: "P0_FORCED_DREAM",
            provider: "OLLAMA",
            model: "phi3",
            archive_cycle: memory.internal_state.last_cycle,
            archive_total_encounters: memory.internal_state.total_encounters,
            fragments: memory.fragment_ledger,
            fragment_counts: {
                memory_artifacts: memory.memory_artifacts.length,
                glitch_fragments: memory.glitch_fragments.length,
                public_fragments: memory.public_fragments.length,
                secret_fragments: memory.secret_fragments.length
            },
            clean_text: cleanText,
            distortion: distorted.distortion,
            text: distorted.text.trim()
        };
        dreams.push(dream);
        saveDreams(dreams);
        console.log("DREAM RECEIVED");
        console.log(distorted.text.trim());
        console.log("FRAGMENTS CARRIED:");
        console.log(memory.fragment_ledger.join(", "));
    } catch (err) {
        console.error("Dream error:", err.message);
    } finally {
        dreamInProgress = false;
    }
}

module.exports = {
    generateDream,
    buildDreamMemory
};
