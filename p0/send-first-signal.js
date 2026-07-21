require("dotenv").config({ quiet: true });

const {
    getConfig,
    createUUIDv7,
    createSignedRequest
} = require("./bridge");

const { verifyConstitution } = require("./constitution");

async function main() {
    const constitution = verifyConstitution();
    const { baseUrl } = getConfig();

    const observation = {
        observation_id: createUUIDv7(),
        source: "operator_signal",
        external_id: "P1-FIRST-SIGNAL",
        event_type: "operator_signal",
        text_excerpt:
            "P1 confirms that the prospective field is open. Observe without performing.",
        received_at: new Date().toISOString(),
        metadata: {
            constitution_version: constitution.version,
            constitution_hash: constitution.hash,
            origin: "AU-B001",
            mode: "witness"
        }
    };

    const { rawBody, headers } = createSignedRequest(observation);

    headers["X-P0-Constitution-Version"] = constitution.version;
    headers["X-P0-Constitution-Hash"] = constitution.hash;

    console.log("Transmitting P1-FIRST-SIGNAL...");
    console.log(`Observation ID: ${observation.observation_id}`);

    const response = await fetch(
        `${baseUrl}/ingestObservation`,
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
            `P0 rejected the observation: ${responseText}`
        );
    }

    let responseData;

    try {
        responseData = JSON.parse(responseText);
    } catch {
        responseData = responseText;
    }

    console.log("P1-FIRST-SIGNAL accepted.");
    console.log(responseData);
}

main().catch((error) => {
    console.error("FIRST SIGNAL FAILED:");
    console.error(error.message);
    process.exitCode = 1;
});