# AU-B001 Workers

## cloudflare-edge-probe.js

Outer organ.

The eye on the tentacle.

This Cloudflare Worker is deployed only on:

```txt
assembleutopia.com/robots.txt

It must not be routed to:

assembleutopia.com/*

Purpose:

Serve AU-B001 open Content Signal.
Invite search, AI input, and AI training.
Record robots.txt requests as edge encounters.
POST edge observations back to:
https://assembleutopia.com/edge-probe

Failure mode in Cloudflare should be:

Fail open / proceed

If the Worker fails, the signal must still pass to the origin.

THE MAP-DOOR OBSERVES WHO ASKS FOR THE MAP.
THE SIGNAL PERSISTS.