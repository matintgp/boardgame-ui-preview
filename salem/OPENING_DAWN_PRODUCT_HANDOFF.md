# Salem — cinematic Dawn + day speaker (frontend and backend handoff)

## Current status

The live **static preview** at `/salem/` implements the complete **opening Dawn UI simulation**: Town Hall selection, private Tryal reveal, 5-second sleep, 30-second witch-only Black Cat ballot, 5.2-second sunrise and a one-minute first turn for the Black Cat holder. Bot witches independently vote or abstain. After the countdown, the highest vote count wins; tied targets are picked randomly, and no votes means a random alive player. Single Witch uses direct selection, no majority requirement.

**These durations and tie rules are custom online-match house rules**, not stated in the tabletop rulebook. The physical game only specifies placing Black Cat secretly in the opening Dawn and having its holder go first.

- Ambient audio may be enabled explicitly; a public-domain rooster recording accompanies sunrise.
- Day owner gets visible voice eligibility; other players are listeners. **Static preview voice audio is not connected.**
- End Turn with zero cards played forces drawing 2 cards. After at least one card, the player may end early.
- Each turn has a 60-second local demo timer. At expiry, draw 2 if none played, otherwise finish turn. The timer pauses outside the normal Turn phase.
- Motion works with reduced-motion support and adapts to mobile layouts.
- Existing later-game Night and Conspiracy card logic remains separate from **opening Dawn**.

## Opening phase state transitions

```
room_setup -> character_selection -> private_role_reveal -> opening_sleep (5 s)
    -> witch_vote (30 s) -> sunrise (5.2 s) -> normal_turn (60 s)
```

Only living Witches get the team list and secret vote controls. A Witch may pick any live player including themselves, change their choice, or abstain. Everyone else sees only a sleeping-city screen. Votes remain private until resolution. The Black Cat holder becomes the first speaker and active player. The second turn follows clockwise.

## Product-grade implementation requirements

The browser must not own the secret assignment, the ballot, the timer deadline, any token signing secrets or RNG. The existing backend must create and maintain the match state with server timestamps, monotonic phaseVersion, unpredictable draws and secret votes.

Suggested authenticated WebSocket event projections:
- PUBLIC: `phaseChanged { phase, deadlineAt, phaseVersion }`, `turnChanged {playerId, deadlineAt}`, `blackCatAssigned {playerId}`, `cardDrawn {actorId, count}` (never send card IDs to others).
- PRIVATE Witch-only: `witchTeam {playerIds}`, `blackCatVoteReceipt {voteId, choiceOrNull}`.
- PRIVATE actor-only: `handChanged {cards}`, `townHallOffer {characterIds}`, `tryalsAssigned {tryals}`.
- NEVER expose raw complete deck, other players' private Tryals, in-progress votes or hidden RNG seeds to unauthorized clients.

Suggested authenticated commands:
- `POST /matches/:id/town-hall/choose {characterId, expectedPhaseVersion, commandId}`
- `POST /matches/:id/black-cat/vote {targetPlayerId|null, expectedPhaseVersion, commandId}`
- `POST /matches/:id/turn/play-card {...}`
- `POST /matches/:id/turn/draw-two {commandId, expectedPhaseVersion}`
- `POST /matches/:id/turn/end {commandId, expectedPhaseVersion}` (server draws two if played count is zero)
- `POST /api/salem/voice-token {matchId, channel, expectedPhaseVersion}`

All commands get authenticated player identity from the session, never client body. Reject late/replayed votes, illegal phase moves, attempts to change vote after deadline, duplicate card plays and arbitrary speaker switches. Server resolves tied votes via cryptographically secure randomness, in one transaction. Deadline enforcement uses server time and survives browser disconnects.

### LiveKit

The TypeScript production integration files are under `salem/product/`:
- `voice-contract.ts` = room eligibility (witch only at initial Night; active speaker or read-only listener during Day).
- `components/SalemLiveKitVoice.tsx` = LiveKit React room, remote audio rendering, explicit mic consent and track cleanup on phase changes.

Server: issue short-lived room-bound JWTs, grant voice publication only to Witches in `witch-night-<matchId>-<phaseVersion>`, and only to the active day speaker in `day-speaker-<matchId>-<turnNumber>`. Other day players may receive listen-only grants to this same day room (`canPublish=false`). On phase end revoke/kick the previous room participants. No microphone should activate on auto-join. For high quality voice use browser echo cancellation, noise suppression and auto gain control plus network adaptive media. Handle reconnection and missing microphone permissions separately.

## Important limitations of the current deployment

This is still a **single-browser simulation with bots**, not a production multiplayer match. It stores all simulated Tryals locally (inspectable by devtools). It does **not** transmit microphone audio, and neither the server-authoritative protocol nor secured LiveKit grant endpoint have been connected. The React code is integration-ready scaffolding, not a full migration of this standalone HTML app to Next.js yet.

## Attributions

- Public-domain rooster: https://commons.wikimedia.org/wiki/File:Small_rooster_crowing.ogg — author alys, PDSounds; `assets/audio/ATTRIBUTION.md`.
- Tabletop Dawn and first-player rules: https://board-game-rules.com/wp-content/uploads/2025/01/salem-1692_Official-Rules.pdf

## Verification

`scripts/salem-smoke.cjs` (run by GitHub Actions) includes Dawn-to-day transition, Black Cat ballot rules, optional votes, turn skip, secret DOM projections and other gameplay tests. Test success alone is not an anti-cheat security audit.
