require("dotenv").config({ quiet: true });

const {
    getConfig,
    createSignedRequest
} = require("./bridge");

const { verifyConstitution } = require("./constitution");

const {
    hasEvent,
    appendEvent
} = require("./canonical-audit");

const PROPOSAL_ID =
    "3135c4e3-6fec-4ab5-a6fd-5dc840fcc9c2";

async function main() {
    const constitution = verifyConstitution();
    const { baseUrl } = getConfig();

    if (!hasEvent("proposal_received", PROPOSAL_ID)) {
        throw new Error(
            "Refusing acknowledgement: proposal is not in AU-B001 canonical audit"
        );
    }

    const requestBody = {
        proposal_ids: [PROPOSAL_ID],
        acknowledged_at: new Date().toISOString()
    };

    const { rawBody, headers } = createSignedRequest(requestBody);

    headers["X-P0-Constitution-Version"] = constitution.version;
    headers["X-P0-Constitution-Hash"] = constitution.hash;

    console.log("Acknowledging canonical receipt...");

    const response = await fetch(
        `${baseUrl}/acknowledgeProposals`,
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
            `Acknowledgement failed: ${responseText}`
        );
    }

    let responseData;

    try {
        responseData = JSON.parse(responseText);
    } catch {
        responseData = responseText;
    }

    if (!hasEvent("proposal_acknowledged", PROPOSAL_ID)) {
        appendEvent({
            eventType: "proposal_acknowledged",
            actor: "au_b001",
            entityId: PROPOSAL_ID,
            payload: {
                acknowledged_at: requestBody.acknowledged_at,
                response: responseData
            }
        });
    }

    console.log("Proposal acknowledged.");
    console.log(responseData);
}

main().catch((error) => {
    console.error("ACKNOWLEDGEMENT FAILED:");
    console.error(error.message);
    process.exitCode = 1;
});