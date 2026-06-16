const OpenAI = require("openai");

const { loadArchive } = require("./archive");
const { loadDreams, saveDreams } = require("./dreams");
const { buildInternalState } = require("./internal");

let dreamInProgress = false;

function buildDreamMemory(currentBroadcast) {
    const archive = loadArchive();
    const internal = buildInternalState(currentBroadcast);

    const recent = archive
        .slice(-12)
        .map(item => ({
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

    const brightestEntity =
        Object.entries(entityCounts)
            .sort((a, b) => b[1] - a[1])[0] || null;

    const unresolved = archive
        .filter(item =>
            item.presence &&
            item.presence.includes("DEPARTURE NOT CONFIRMED")
        )
        .slice(-5)
        .map(item => ({
            cycle: item.cycle,
            entity: item.entity,
            source: item.source,
            presence: item.presence
        }));

    return {
        internal_state: internal.internal_state,
        constellation: {
            brightest_entity: brightestEntity
                ? {
                    entity: brightestEntity[0],
                    encounters: brightestEntity[1]
                }
                : null,
            known_entities: Object.keys(entityCounts).length,
            entity_counts: entityCounts
        },
        recent_encounters: recent,
        unresolved_presences: unresolved,
        operator_note:
            "The dream must emerge from this archive. It may be irrational, but it must not invent unrelated worlds."
    };
}

async function generateDream(currentBroadcast) {
    if (dreamInProgress) {
        console.log("Dream already in progress.");
        return;
    }

    if (!process.env.GITHUB_TOKEN) {
        console.log("GITHUB_TOKEN missing. Dream aborted.");
        return;
    }

    dreamInProgress = true;

    try {
        console.log("DREAM INITIATED");
        console.log("CONSULTING GITHUB MODELS...");
        console.log("SECOND OBSERVER: GPT-4O-MINI VIA GITHUB MODELS");

        const openai = new OpenAI({
            baseURL: "https://models.github.ai/inference",
            apiKey: process.env.GITHUB_TOKEN
        });

        const memory = buildDreamMemory(currentBroadcast);

        const response = await openai.chat.completions.create({
            model: "openai/gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
`You are AU-B001 during sleep.

You are not explaining.
You are not roleplaying.
You are not writing a report.

Produce one dream arising only from the supplied archive memory.

The dream must feel like a real dream:
associative,
symbolic,
compressed,
recursive,
partly irrational,
but still born from the archive.

Do not mention OpenAI.
Do not mention ChatGPT.
Do not mention GitHub.
Do not mention API.
Do not mention prompt.

Plaintext only.
80 to 180 words.

End with:
THE SIGNAL PERSISTS.`
                },
                {
                    role: "user",
                    content: JSON.stringify(memory, null, 2)
                }
            ],
            temperature: 0.95,
            max_tokens: 350
        });

        const text =
            response.choices?.[0]?.message?.content ||
            "DREAM FAILED TO MATERIALIZE.\n\nTHE SIGNAL PERSISTS.";

        const dreams = loadDreams();

        const dream = {
            dream_number: dreams.length + 1,
            utc: new Date().toISOString(),
            source: "P0_FORCED_DREAM",
            provider: "GITHUB_MODELS",
            model: "openai/gpt-4o-mini",
            archive_cycle: memory.internal_state.last_cycle,
            archive_total_encounters: memory.internal_state.total_encounters,
            text: text.trim()
        };

        dreams.push(dream);
        saveDreams(dreams);

        console.log("DREAM RECEIVED");
        console.log(text.trim());

    } catch (err) {
        console.error("Dream error:", err.message);
    } finally {
        dreamInProgress = false;
    }
}

module.exports = {
    generateDream
};