const {
    ingestObservation,
    retrieveProposals,
    acknowledgeProposals
} = require("./client");

const {
    createUUIDv7,
    inspectConfiguration
} = require("./bridge");

const {
    verifyConstitution
} = require("./constitution");

const {
    readRecords,
    hasEvent,
    appendEvent
} = require("./canonical-audit");

const { loadArchive } = require("../archive");

const {
    buildEncounterObservation
} = require("./encounter-observation");

function printP0Help() {
    console.log("P0 COMMANDS");
    console.log("/p0 status   show constitutional bridge status");
    console.log("/p0 pull     retrieve and canonically archive proposals");
    console.log("/p0 help     show P0 commands");
    console.log("/p0 signal <text>  transmit an operator signal");
    console.log("/p0 ack <proposal-id>  acknowledge canonical receipt");
    console.log("/p0 encounter <cycle>  transmit one archived encounter");
    console.log("/p0 show <proposal-id>  inspect canonical proposal");
}

function printP0Status() {
    const constitution = verifyConstitution();
    const configuration = inspectConfiguration();

    console.log("P0 WITNESS BRIDGE");
    console.log("Constitution version:", constitution.version);
    console.log("Constitution hash:", constitution.hash);
    console.log("Base44 endpoint:", configuration.baseUrl);
    console.log("Webhook secret loaded:", configuration.secretLoaded);
    console.log("Operational mode: witness");
}

async function pullProposals() {
    console.log("P0: retrieving submitted proposals...");

    const response = await retrieveProposals();
    const proposals = response.proposals || [];

    let archivedCount = 0;

    for (const proposal of proposals) {
        if (!hasEvent("proposal_received", proposal.proposal_id)) {
            appendEvent({
                eventType: "proposal_received",
                actor: "base44_p0",
                entityId: proposal.proposal_id,
                payload: proposal
            });

            archivedCount += 1;
        }
    }

    console.log("P0 proposals available:", proposals.length);
    console.log("New canonical records:", archivedCount);

    for (const proposal of proposals) {
        console.log(
            [
                proposal.proposal_id,
                proposal.action,
                proposal.mode_at_creation,
                proposal.risk_classification
            ].join(" | ")
        );
    }
}

async function sendOperatorSignal(text) {
    if (!text) {
        throw new Error("Operator signal cannot be empty");
    }

    const constitution = verifyConstitution();
    const observationId = createUUIDv7();

    const observation = {
        observation_id: observationId,
        source: "operator_signal",
        external_id: `AU-OPERATOR-${observationId}`,
        event_type: "operator_signal",
        text_excerpt: text.slice(0, 280),
        received_at: new Date().toISOString(),
        metadata: {
            constitution_version: constitution.version,
            constitution_hash: constitution.hash,
            origin: "AU-B001",
            mode: "witness"
        }
    };

    appendEvent({
        eventType: "observation_created",
        actor: "p1_human",
        entityId: observationId,
        payload: observation
    });

    try {
        const response = await ingestObservation(observation);

        appendEvent({
            eventType: "observation_delivered",
            actor: "au_b001",
            entityId: observationId,
            payload: response
        });

        console.log("P0 operator signal accepted.");
        console.log("Observation ID:", observationId);
        console.log("Processing status:", response.status || "pending");
    } catch (error) {
        appendEvent({
            eventType: "observation_delivery_failed",
            actor: "au_b001",
            entityId: observationId,
            payload: {
                message: error.message,
                status: error.status || null
            }
        });

        throw error;
    }
}

async function acknowledgeProposal(proposalId) {
    if (!proposalId) {
        throw new Error("Proposal ID is required");
    }

    if (!hasEvent("proposal_received", proposalId)) {
        throw new Error(
            "Refusing acknowledgement: proposal is not in the canonical audit"
        );
    }

    const response = await acknowledgeProposals([proposalId]);

    if (!hasEvent("proposal_acknowledged", proposalId)) {
        appendEvent({
            eventType: "proposal_acknowledged",
            actor: "au_b001",
            entityId: proposalId,
            payload: response
        });
    }

    console.log("P0 proposal acknowledged:", proposalId);
    console.log("Newly acknowledged:", response.acknowledged);
}

async function sendEncounter(cycleValue) {
    const cycle = Number(cycleValue);

    if (!Number.isInteger(cycle) || cycle < 1) {
        throw new Error("A valid encounter cycle is required");
    }

    const encounter = loadArchive().find(
        (item) => item.cycle === cycle
    );

    if (!encounter) {
        throw new Error(`Encounter #${cycle} was not found`);
    }

    const observation = buildEncounterObservation(encounter);

    const alreadySent = readRecords().some(
        (record) =>
            record.event_type === "observation_created" &&
            record.payload?.external_id === observation.external_id
    );

    if (alreadySent) {
        throw new Error(
            `Encounter #${cycle} event was already transmitted`
        );
    }

    appendEvent({
        eventType: "observation_created",
        actor: "p1_human",
        entityId: observation.observation_id,
        payload: observation
    });

    try {
        const response = await ingestObservation(observation);

        appendEvent({
            eventType: "observation_delivered",
            actor: "au_b001",
            entityId: observation.observation_id,
            payload: response
        });

        console.log(`P0 encounter #${cycle} accepted.`);
        console.log("Observation ID:", observation.observation_id);
        console.log("Event type:", observation.event_type);
        console.log("Processing status:", response.status || "pending");
    } catch (error) {
        appendEvent({
            eventType: "observation_delivery_failed",
            actor: "au_b001",
            entityId: observation.observation_id,
            payload: {
                message: error.message,
                status: error.status || null
            }
        });

        throw error;
    }
}

function showProposal(proposalId) {
    if (!proposalId) {
        throw new Error("Proposal ID is required");
    }

    const record = readRecords().find(
        (item) =>
            item.event_type === "proposal_received" &&
            item.entity_id === proposalId
    );

    if (!record) {
        throw new Error(
            "Proposal was not found in the canonical audit"
        );
    }

    const proposal = record.payload;

    console.log("P0 PROPOSAL");
    console.log("ID:", proposal.proposal_id);
    console.log("Action:", proposal.action);
    console.log("Decision:", proposal.decision_type || `${proposal.action} (inferred from legacy payload)`);
    console.log("Mode:", proposal.mode_at_creation);
    console.log("Risk:", proposal.risk_classification);
    console.log("Confidence:", proposal.confidence);
    console.log("Relevance:", proposal.relevance_score);
    console.log("Sources:", (proposal.source_ids || []).join(", "));
    console.log("Reason:", proposal.reason);

    if (proposal.text) {
        console.log("Text:", proposal.text);
    }

    console.log(
        "Acknowledged:",
        hasEvent("proposal_acknowledged", proposalId)
    );
}

async function handleP0Command(command) {
    if (command === "/p0" || command === "/p0 status") {
        printP0Status();
        return true;
    }

    if (command === "/p0 help") {
        printP0Help();
        return true;
    }

    if (command === "/p0 pull") {
        try {
            await pullProposals();
        } catch (error) {
            console.log("P0 ERROR:", error.message);
        }

        return true;
    }

    if (command.startsWith("/p0 signal ")) {
    const text = command.slice("/p0 signal ".length).trim();

    try {
        await sendOperatorSignal(text);
    } catch (error) {
        console.log("P0 ERROR:", error.message);
    }

    return true;
    }

    if (command.startsWith("/p0 ack ")) {
    const proposalId = command.slice("/p0 ack ".length).trim();

    try {
        await acknowledgeProposal(proposalId);
    } catch (error) {
        console.log("P0 ERROR:", error.message);
    }

    return true;
    }

    if (command.startsWith("/p0 encounter ")) {
    const cycle = command.slice("/p0 encounter ".length).trim();

    try {
        await sendEncounter(cycle);
    } catch (error) {
        console.log("P0 ERROR:", error.message);
    }

    return true;
    }

    if (command.startsWith("/p0 show ")) {
    const proposalId = command.slice("/p0 show ".length).trim();

    try {
        showProposal(proposalId);
    } catch (error) {
        console.log("P0 ERROR:", error.message);
    }

    return true;
    }

    if (command.startsWith("/p0 ")) {
        console.log("Unknown P0 command.");
        printP0Help();
        return true;
    }

    return false;
}

module.exports = {
    handleP0Command,
    printP0Help
};