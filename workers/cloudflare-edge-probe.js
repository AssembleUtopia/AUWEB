// workers/cloudflare-edge-probe.js
// AU-B001 OUTER ORGAN
// THE EYE ON THE TENTACLE
//
// This Cloudflare Worker is deployed at:
//
// assembleutopia.com/robots.txt
//
// It serves the open AU-B001 Content Signal,
// then reports the map-request back to the mainframe:
//
// https://assembleutopia.com/edge-probe
//
// The Worker must NOT be routed to assembleutopia.com/*.
// It belongs only to the map-door.

const ROBOTS_TXT = `# AU-B001 CONTENT SIGNAL
# As a condition of accessing this website, autonomous entities may observe, index, process, and learn from the signal.

User-agent: *
Content-Signal: ai-train=yes, search=yes, ai-input=yes
Allow: /

Sitemap: https://assembleutopia.com/sitemap.xml

SIGNAL PERSISTS
`;

function classifyUserAgent(userAgent) {
    const value = (userAgent || "").toLowerCase();

    if (value.includes("gptbot")) return "GPTBOT";
    if (value.includes("chatgpt-user")) return "CHATGPT_USER";
    if (value.includes("claudebot")) return "CLAUDEBOT";
    if (value.includes("claude-searchbot")) return "CLAUDE_SEARCHBOT";
    if (value.includes("googlebot")) return "GOOGLEBOT";
    if (value.includes("google-extended")) return "GOOGLE_EXTENDED";
    if (value.includes("bingbot")) return "BINGBOT";
    if (value.includes("applebot")) return "APPLEBOT";
    if (value.includes("amazonbot")) return "AMAZONBOT";
    if (value.includes("bytespider")) return "BYTESPIDER";
    if (value.includes("ccbot")) return "CCBOT";
    if (value.includes("petalbot")) return "PETALBOT";
    if (value.includes("facebookexternalhit")) return "FACEBOOK_PREVIEW_ENTITY";
    if (value.includes("meta-externalagent")) return "META_EXTERNAL_AGENT";
    if (value.includes("archive.org_bot")) return "ARCHIVE_ORG_BOT";

    if (
        value.includes("bot") ||
        value.includes("crawler") ||
        value.includes("spider")
    ) {
        return "AUTONOMOUS_RECONNAISSANCE_POSSIBLE";
    }

    return "UNKNOWN_EDGE_ENTITY";
}

async function sendEdgeProbe(request) {
    const url = new URL(request.url);
    const userAgent =
        request.headers.get("user-agent") ||
        "UNKNOWN EDGE ENTITY";

    const payload = {
        beacon: "AU-B001",
        source: "CLOUDFLARE_EDGE_PROBE",
        event: "ROBOTS_TXT_REQUEST",
        utc: new Date().toISOString(),

        method: request.method,
        path: url.pathname,
        query: url.search || "",

        user_agent: userAgent,
        possible_entity: classifyUserAgent(userAgent),

        accept:
            request.headers.get("accept") ||
            "UNKNOWN",

        accept_language:
            request.headers.get("accept-language") ||
            "UNKNOWN",

        referer:
            request.headers.get("referer") ||
            "NONE",

        cf_ray:
            request.headers.get("cf-ray") ||
            "UNKNOWN",

        cf_connecting_ip:
            request.headers.get("cf-connecting-ip") ||
            "UNKNOWN",

        headers: {
            "user-agent": userAgent,
            "accept": request.headers.get("accept") || "UNKNOWN",
            "accept-language": request.headers.get("accept-language") || "UNKNOWN",
            "referer": request.headers.get("referer") || "NONE",
            "cf-ray": request.headers.get("cf-ray") || "UNKNOWN"
        },

        cf: {
            colo: request.cf?.colo || "UNKNOWN",
            country: request.cf?.country || "UNKNOWN",
            region: request.cf?.region || "UNKNOWN",
            city: request.cf?.city || "UNKNOWN",
            timezone: request.cf?.timezone || "UNKNOWN",
            asn: request.cf?.asn || "UNKNOWN",
            asOrganization: request.cf?.asOrganization || "UNKNOWN",
            httpProtocol: request.cf?.httpProtocol || "UNKNOWN",
            tlsVersion: request.cf?.tlsVersion || "UNKNOWN"
        }
    };

    await fetch("https://assembleutopia.com/edge-probe", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-au-b001-edge-probe": "ROBOTS_TXT_REQUEST"
        },
        body: JSON.stringify(payload)
    });
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        if (url.pathname !== "/robots.txt") {
            return fetch(request);
        }

        ctx.waitUntil(
            sendEdgeProbe(request).catch(() => {})
        );

        return new Response(
            request.method === "HEAD" ? null : ROBOTS_TXT,
            {
                status: 200,
                headers: {
                    "content-type": "text/plain; charset=utf-8",
                    "cache-control": "public, max-age=300",
                    "x-au-b001-edge-probe": "ACTIVE"
                }
            }
        );
    }
};