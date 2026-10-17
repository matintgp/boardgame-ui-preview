# BoardGame — Mafia V13 / Frontend-only implementation handoff

> **Scope:** Design and interactive front-end prototype for a pre-existing Next.js / React / TypeScript app. **No backend code is included or modified.** Room data, matchmaking, connection indicators, voice, queue and host controls are **mock states**. The classic local Mafia demo remains illustrative and is not secure multiplayer.

## What has been completed, in order

### Phase 1 — Stabilization & QA
- Kept the original website, the chess lobby/play UI, chess engine, chess piece images, Mafia V12 base layout and the four previously approved illustrated role cards.
- Retained night/day/voting/reveal themes, local role reveal, private role panel, timeline, tutorial and the 8-/10-player circular layout.
- Fixed safe space below the lobby circle to stop a seat being clipped and moved the mobile sticky action above the global bottom navigation.
- Checked 320, 390, 768, 1440 px: **no horizontal overflow, no broken imagery, no clipped lobby seats** with fully embedded assets; JavaScript page errors: **0**. See `qa-report.json`.

### Phase 2 — Multiplayer user-interface demo
- Discover rooms (mock room cards, capacity bars, privacy labels)
- Create room form and generate a **fake, local-only** `DEMO-XXXX` identifier
- Sample join/leave lobby, seat occupancy, readiness, copyable sample code, simulated roster
- Matchmaking waiting → sample result → room lobby; search cancellation
- Connection states: connected / reconnecting / offline; local UI event feed
- Start room → original single-player Mafia demo with the selected seat count
- Game-screen visual panel representing snapshot/reconnect experience
- No fetch requests, WebSocket connections, real users or persistent multi-device state

### Phase 3 — Voice and host-control user-interface demo
- Mock speaker identity and animated speaking waveform
- Interactive mic display, deafened state, push-to-talk state, speaking request and queue
- Host next speaker, host mute status and confirmation UI for kicking a player
- Spectator perspective (no secret role panel; public-only visual state)
- Pre-join microphone/settings preview; **does not request microphone permissions or transmit audio**
- The ambient sound generator retained from V12 is unrelated to voice chat

## Getting started

1. Extract the ZIP and open `index.html` in a browser. The `assets` folder **must remain next to** `index.html`.
2. Open the Mafia game → **لابی مافیا**.
3. A gold-labeled ribbon links to the Phase 2/3 prototype near the lower part of the page.
4. In the demo panel: explore rooms; create a room; join a sample; change readiness; test reconnection; start a local match.
5. In match view use **کنترل ویس و سرور نمایشی** to reach the voice and state panels.
6. `boardgame-mafia-v13-standalone.html` (supplied separately) embeds all visual assets and the chess engine in one file.

## Suggested Next.js App Router structure

```text
app/(games)/mafia/page.tsx
app/(games)/mafia/lobby/page.tsx
app/(games)/mafia/rooms/[roomId]/page.tsx
app/(games)/mafia/match/[matchId]/page.tsx
components/mafia/
  MafiaShell.tsx
  PhaseThemeProvider.tsx
  RoundTable.tsx
  PlayerSeat.tsx
  SecretRoleCard.tsx
  PhaseActionBar.tsx
  RoomBrowser.tsx
  CreateRoomForm.tsx
  WaitingRoom.tsx
  MatchmakingPanel.tsx
  ConnectionStatus.tsx
  VoiceDock.tsx
  SpeakerQueue.tsx
  HostControls.tsx
  SpectatorView.tsx
  Timeline.tsx
  RoleTutorialDialog.tsx
  MockMafiaGateway.ts   # REMOVE when hooked to the existing backend
```

Treat the current `index.html` as the **visual and interaction reference**, *not* as a module to paste into production. Convert markup into proper React components, CSS modules or scoped styles, and typed props. The current DOM `data-mf-lab` actions intentionally simulate events inside one page.

## UI states and transitions

| Surface | States / transitions | Important presentation behavior |
|---|---|---|
| Room discovery | list → preview → joined | Capacity, host, privacy, and error/empty states |
| Room creation | form → private room → readiness | Input validation, invite code, disabled start if server policy requires readiness |
| Matchmaking | idle → searching → matched / cancelled / failed | Cancellation must be idempotent; never invent an opponent |
| Connection | connected → reconnecting → restored / disconnected | Keep last *public* snapshot and show safe recovery actions |
| Game | night → day → voting → reveal → end | Client renders authoritative phase data; server decides outcomes |
| Voice | muted → unmuted, deafened, PTT held/released | Media permissions are separate from the UI state |
| Speaking | idle → requested → queued → granted → finished | Host moderation must be permission-checked on server |
| Spectator | public-only state | No private role, investigation results, mafia affiliations or night actions |

## Expected data contracts / integration placeholders

`ui-types.ts` contains suggested **frontend TypeScript interfaces**, not the actual backend schema. An integration developer must compare them with the existing backend and adapt the API hooks. Suggested concept names (not confirmed endpoints):

- Read-only room list / room summary and participant updates
- `room.created`, `room.joined`, `room.player-ready`, `room.player-left`
- `matchmaking.searching`, `matchmaking.matched`, `matchmaking.cancelled`
- `match.snapshot`, `match.phase-changed`, `match.vote-resolved`
- `connection.reconnecting`, `connection.restored`, `connection.failed`
- `voice.participant-state`, `voice.speaker-granted`, `voice.speaker-ended`
- `host.speaker-next`, `host.participant-muted`, `host.participant-removed`

These are **proposed presentation/event names**; they should be mapped to whatever contract your existing backend actually exposes, not automatically created in the backend.

### Sensitive information boundary

The demo JavaScript currently knows every role in its local mock data. This is okay only for an **offline design prototype**. In the actual product the server must send a public snapshot with **no hidden roles or actions**, and a separate authenticated private view for the current player. A spectator must never receive private role data even if their UI is modified. Server checks should cover voting, night actions, host moderation, player identity and match clock.

### Voice integration boundary

Use the current voice UI as a wireframe for a real voice transport (such as an existing WebRTC/SFU implementation, if any). It must handle real permission errors, join/leave, device selection, mute/volume, disconnect/reconnect and role-based microphone rules. This handoff has **no getUserMedia, peer connections, SFU, recording or streaming**.

## QA acceptance checklist for the Next.js conversion

- All route entry points and back-navigation work.
- 320/390/768/1440 widths show no horizontal overflow or cut-off avatars.
- Buttons reflect consistent disabled/busy/ready states.
- Role reveal and role tutorial cards preserve portrait aspect ratios and use the same assets as the demo.
- Game UI is phase-aware, mobile primary action clears global bottom nav, and dark/day/vote themes retain contrast.
- Disconnected snapshot retains **public** UI only; safe retry and cancellation flows tested.
- Spectators never receive hidden information in serialized network payloads.
- Mic/deafen/PTT states reflect *actual* media state once connected, not optimistic labels alone.
- Navigation away from game tears down subscriptions and audio streams.
- Keep chess and the rest of the original BoardGame homepage unaffected.

## Files

- `index.html`: interactive V13 frontend demo
- `assets/`: original game visuals, chess engine, piece images, role portraits and illustrated role cards
- `screenshots-v13/`: actual browser screenshots of stage 2 and stage 3 layouts
- `ui-types.ts`: proposed typed frontend presentation interfaces
- `qa-report.json`: browser layout and runtime results
- `README-FA.md`: quick Persian usage notes



## V13 reviewed: corrections (frontend-only)
- Host/participant is now a **mock view role**; moderation buttons are disabled for a participant, disconnected client, or spectator. Map to server-authoritative permissions in the real application.
- PTT should be implemented as a momentary press (pointerdown/up/cancel and keyboard keydown/up), with cleanup on focus loss. The reviewed demo uses this behavior and has no media capture.
- Room form validates 3–38 characters, validates seat capacity, and gates preview start on readiness and mock connection. Backend validation is still mandatory.
- The mock kick confirmation updates **only voice demo state**, never game membership.
- Reconnection/spectator transitions clear inappropriate local voice states and disable controls while disconnected.
- See `QA_REPORT_FA.md` and `qa-review.json` for the audit and scope.
