require("dotenv").config({ quiet: true });

const {
    getConfig,
    createSignedRequest
} = require("./bridge");

const {
    hasEvent,
    appendEvent
} = require("./canonical-audit");

const { verifyConstitution } = require("./constitution");

async function main() {
    const constitution = verifyConstitution();
    const { baseUrl } = getConfig();

    const requestBody = {
        since: "1970-01-01T00:00:00.000Z",
        limit: 10
    };

    const { rawBody, headers } = createSignedRequest(requestBody);

    headers["X-P0-Constitution-Version"] = constitution.version;
    headers["X-P0-Constitution-Hash"] = constitution.hash;

    console.log("Retrieving submitted P0 proposals...");

    const response = await fetch(
        `${baseUrl}/retrieveProposals`,
        {
            method: "POST",
            headers,
            body: rawBody,
            signal: AbortSignal.timeout(15000)
        }
    );

    const responseText = await response.text();

    console.log(`P0 response status: ${response.status}`);

    if (!response.ok) {
        throw new Error(
            `Proposal retrieval failed: ${responseText}`
        );
    }

    const responseData = JSON.parse(responseText);

    let archivedCount = 0;

    for (const proposal of responseData.proposals || []) {
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

    console.log(`New canonical records: ${archivedCount}`);

    console.log(
        JSON.stringify(responseData, null, 2)
    );
}

main().catch((error) => {
    console.error("RETRIEVAL FAILED:");
    console.error(error.message);
    process.exitCode = 1;
});