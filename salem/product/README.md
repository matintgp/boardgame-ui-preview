# Salem product voice — Next.js/React/TypeScript

This is a **production-facing frontend component scaffold**. It is NOT connected to the existing backend and does NOT deploy alongside the static HTML demo automatically.

Install into your existing Next.js TS app:

```bash
npm install livekit-client @livekit/components-react @livekit/components-styles
```

Use `SalemLiveKitVoice` with the user's PRIVATE, server-filtered `SalemVoiceAccess` projection from an authenticated realtime subscription. The component subscribes to authorized room audio with `RoomAudioRenderer` and requests `/api/salem/voice-token` only when the server says the user is permitted to speak. The **backend must re-check** all permissions; do not trust `isWitch`, `phaseVersion`, identity, or current speaker submitted by a client.

## Required server endpoint

`POST /api/salem/voice-token` — accepts `{matchId, channel, expectedPhaseVersion}` with an authenticated session cookie. Verify membership, active match, team, phase, per-turn speaker and exact phaseVersion in a transaction. Deny other players with 403. Return `{server_url, participant_token, expires_at}`. Do **not** expose the API secret in Next.js public variables.

- Dawn witch vote: allow only living witches -> room `witch-night-<matchId>-<phaseVersion>`, microphone publish permission.
- Day turn: issue only to authenticated current turn owner -> room `day-speaker-<matchId>-<turnNumber>`. Other authenticated players receive `day-listen` tokens to the **same** day room, with `canPublish=false` enforced by LiveKit grants; only the active speaker receives `day-speaker` with microphone publishing. All participants can hear the current speaker. Spectators must never receive witch room grants.
- Grant short TTL, least privileges, room-only, no arbitrary room join. Revoke/kick participants on phase transition to prevent stale subscriptions. Server calculates timer using DB clock. Vote targets and secret team memberships stay server side.
- Client cannot verify or guarantee anti-cheat. Audit every vote, speaker transition and grant issuance. Rate limit and protect replayed vote commands.
- Ensure users opt in to mic capture; handle device permissions, reconnects, network loss, mobile audio unlock, and room disconnect on unmount.

## Demo behavior

Static `/salem/` uses local simulated bots and visual voice eligibility labels. **No real voice traffic** occurs until an authorized backend and LiveKit are connected. Never use a shared public LiveKit token or embed a signing secret in static JS.

**Reminder:** The UI component is a production integration scaffold, not a running call in the current HTML simulator. Add microphone test, echo cancellation constraints, user-facing connection quality indicators, and server-side revocation before shipping.
