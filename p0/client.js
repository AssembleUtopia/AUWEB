const {
    getConfig,
    createSignedRequest
} = require("./bridge");

const { verifyConstitution } = require("./constitution");

async function callP0(functionName, body) {
    const constitution = verifyConstitution();
    const { baseUrl } = getConfig();
    const { rawBody, headers } = createSignedRequest(body);

    headers["X-P0-Constitution-Version"] = constitution.version;
    headers["X-P0-Constitution-Hash"] = constitution.hash;

    const response = await fetch(
        `${baseUrl}/${functionName}`,
        {
            method: "POST",
            headers,
            body: rawBody,
            signal: AbortSignal.timeout(15000)
        }
    );

    const responseText = await response.text();

    let responseData;

    try {
        responseData = JSON.parse(responseText);
    } catch {
        responseData = responseText;
    }

    if (!response.ok) {
        const error = new Error(
            `P0 ${functionName} failed with HTTP ${response.status}`
        );

        error.status = response.status;
        error.response = responseData;

        throw error;
    }

    return responseData;
}

function ingestObservation(observation) {
    return callP0("ingestObservation", observation);
}

function retrieveProposals({
    since = "1970-01-01T00:00:00.000Z",
    limit = 10
} = {}) {
    return callP0("retrieveProposals", {
        since,
        limit
    });
}

function acknowledgeProposals(proposalIds) {
    if (!Array.isArray(proposalIds) || proposalIds.length === 0) {
        throw new Error(
            "acknowledgeProposals requires at least one proposal ID"
        );
    }

    return callP0("acknowledgeProposals", {
        proposal_ids: proposalIds,
        acknowledged_at: new Date().toISOString()
    });
}

function updateProposal(update) {
    return callP0("updateProposal", update);
}

function updateOperationalState(update) {
    return callP0("updateOperationalState", update);
}

module.exports = {
    callP0,
    ingestObservation,
    retrieveProposals,
    acknowledgeProposals,
    updateProposal,
    updateOperationalState
};