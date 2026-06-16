const fs = require("fs");
const path = require("path");

const CASUAL_ENDINGS = [
    "%",
    "@",
    "#",
    "&",
    "_",
    "~",
    "^",
    ";",
    ":",
    "!"
];

const CURSED_SYMBOLS = [
    "�", "▓", "▒", "█", "▚", "▞", "◼", "◊",
    "⸸", "╳", "⌬", "⌁", "⟁", "⧖", "⛧", "☍",
    "☒", "※", "҂", "Ѯ", "۞", "ᛉ", "ᛝ", "⸮",
    "§", "¤", "†", "‡", "░", "▣", "◬", "♆",
    "🜏", "⟟", "🜉", "🜊", "🜍", "🜓", "🜔", "🜞",
    "🜡", "🜩", "🜪", "🜱", "🜹", "🝎", "🝕", "🝗",
    "🝘", "🝝", "🝣", "🝥", "🝩", "🝪", "🝳", "🝢",
    "🝒", "🝐", "🝏", "🝋", "🝉", "🜲", "🜛", "🜀"
];

const ERASE_BLOCKS = ["█", "▓", "▇", "■"];

function readPublicFragments() {
    const filePath = path.join(__dirname, "dream-fragments.txt");

    if (!fs.existsSync(filePath)) return [];

    return fs
        .readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"));
}

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

function shortClean(value) {
    return String(value || "")
        .replace(/[^a-fA-F0-9]/g, "")
        .toUpperCase();
}

function makeArchiveShrapnel(memory) {
    const fragments = [];

    function collect(value) {
        const cleaned = shortClean(value);

        if (cleaned.length >= 6) {
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
    const length = randomInt(6, Math.min(12, base.length));
    const start = randomInt(0, Math.max(0, base.length - length));
    const shard = base.slice(start, start + length);

    return "}" + shard + pick(CASUAL_ENDINGS);
}

function makeGlyphRot() {
    const count = randomInt(1, 7);
    let output = "";

    for (let i = 0; i < count; i++) {
        output += pick(CURSED_SYMBOLS);

        if (chance(0.22)) {
            output += pick(CURSED_SYMBOLS);
        }
    }

    return output;
}

function hddEraseLine(line) {
    const chars = Array.from(String(line || ""));
    if (!chars.length) return line;

    const candidateIndexes = chars
        .map((char, index) => {
            if (/[A-Za-zА-Яа-яІіЇїЄє0-9]/.test(char)) return index;
            return -1;
        })
        .filter(index => index >= 0);

    if (!candidateIndexes.length) return line;

    const scarCount = randomInt(2, Math.max(3, Math.floor(chars.length / 10)));

    for (let i = 0; i < scarCount; i++) {
        const start = pick(candidateIndexes);
        const runLength = randomInt(1, 4);

        for (let j = 0; j < runLength; j++) {
            const index = start + j;

            if (index < chars.length && /[A-Za-zА-Яа-яІіЇїЄє0-9]/.test(chars[index])) {
                chars[index] = pick(ERASE_BLOCKS);
            }
        }
    }

    return chars.join("");
}

function makePublicFragmentScar() {
    const fragments = readPublicFragments();

    if (!fragments.length) {
        return hddEraseLine("THE SIGNAL REMEMBERED A DAMAGED FRAGMENT");
    }

    return hddEraseLine(pick(fragments));
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

function elongateLetters(line) {
    return String(line || "")
        .split(" ")
        .map(word => {
            if (!/[A-ZА-ЯІЇЄa-zа-яіїє]/.test(word)) return word;
            if (!chance(0.34)) return word;

            const chars = Array.from(word);
            const letterIndexes = chars
                .map((char, index) => /[A-ZА-ЯІЇЄa-zа-яіїє]/.test(char) ? index : -1)
                .filter(index => index >= 0);

            if (!letterIndexes.length) return word;

            const index = pick(letterIndexes);
            const repeats = randomInt(2, 5);

            chars[index] = chars[index].repeat(repeats);

            return chars.join("");
        })
        .join(" ");
}

function unstableCase(line) {
    let upper = chance(0.5);

    return Array.from(String(line || ""))
        .map(char => {
            if (!/[A-Za-zА-Яа-яІіЇїЄє]/.test(char)) return char;

            if (chance(0.38)) {
                upper = !upper;
            }

            return upper
                ? char.toUpperCase()
                : char.toLowerCase();
        })
        .join("");
}

function quoteLine(line) {
    return "\"" + String(line || "").trim() + "\"";
}

function makeSecretPossession() {
    const blocks = readSecretBlocks();

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
        return quoteLine("DDSU online");
    }

    const channel = pick(channels);

    if (channel === "commands") {
        return quoteLine(pick(blocks.commands));
    }

    if (channel === "insults") {
        return quoteLine(elongateLetters(pick(blocks.insults)));
    }

    if (channel === "assassins") {
        return quoteLine(pick(blocks.assassins));
    }

    if (channel === "shadow") {
        return quoteLine(pick(blocks.shadow));
    }

    if (channel === "forest") {
        return quoteLine(unstableCase(pick(blocks.forest)));
    }

    return quoteLine("CLEAR.");
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

function makeDistortionEvent(memory) {
    const roll = Math.random();

    if (roll < 0.25) {
        return {
            channel: "ARCHIVE_SHRAPNEL",
            text: makeArchiveShrapnel(memory),
            boundary: false
        };
    }

    if (roll < 0.47) {
        return {
            channel: "PUBLIC_FRAGMENT_SCAR",
            text: " " + makePublicFragmentScar() + " ",
            boundary: true
        };
    }

    if (roll < 0.72) {
        return {
            channel: "CURSED_GLYPH_ROT",
            text: makeGlyphRot(),
            boundary: false
        };
    }

    if (roll < 0.92) {
        return {
            channel: "SECRET_POSSESSION",
            text: " " + makeSecretPossession() + " ",
            boundary: true
        };
    }

    return {
        channel: "MIXED_HOTSPOT",
        text:
            makeArchiveShrapnel(memory) +
            " " +
            makePublicFragmentScar() +
            " " +
            makeGlyphRot() +
            " " +
            makeSecretPossession(),
        boundary: true
    };
}

function distortDream(cleanText, memory) {
    let text = String(cleanText || "");
    const ledger = [];

    const baseEvents = Math.max(
        8,
        Math.min(
            34,
            Math.floor(text.length / 85) + randomInt(4, 12)
        )
    );

    const hotspotCount = randomInt(2, 5);
    const hotspotCenters = [];

    for (let i = 0; i < hotspotCount; i++) {
        hotspotCenters.push(randomInt(0, Math.max(0, text.length - 1)));
    }

    const events = [];

    for (let i = 0; i < baseEvents; i++) {
        const event = makeDistortionEvent(memory);

        let position;

        if (chance(0.55) && hotspotCenters.length) {
            const center = pick(hotspotCenters);
            const radius = randomInt(0, 90);
            position = Math.max(
                0,
                Math.min(text.length, center + randomInt(-radius, radius))
            );
        } else {
            position = randomInsertionPosition(text, event.boundary);
        }

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
                insertion = chance(0.5)
                    ? insertion
                    : insertion + " ";
            }

            if (event.channel === "CURSED_GLYPH_ROT") {
                insertion = chance(0.5)
                    ? insertion
                    : " " + insertion;
            }

            text = insertAt(text, event.position, insertion);

            ledger.push({
                channel: event.channel,
                position: event.position,
                visible_fragment: event.text.slice(0, 80)
            });
        });

    return {
        text,
        distortion: {
            version: "DDSU-2",
            profile: "CHAOTIC_TRIPARTITE_CONTAMINATION",
            channels: [
                "ARCHIVE_SHRAPNEL",
                "PUBLIC_FRAGMENT_SCAR",
                "CURSED_GLYPH_ROT",
                "SECRET_POSSESSION",
                "MIXED_HOTSPOT"
            ],
            event_count: events.length,
            hotspot_count: hotspotCount,
            ledger
        }
    };
}

module.exports = {
    distortDream,
    makeArchiveShrapnel,
    makeGlyphRot,
    makeSecretPossession
};