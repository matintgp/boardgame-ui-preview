# Salem V4 — Implementation & release checkpoint

## Verified live demo — implemented on main

- Shared consistent dropdown system across BoardGame and Salem.
- Town Hall character draft: 15 characters, two offers for 4–7 players, selected card retained and alternative burned; role abilities include passive and triggered behavior.
- Initial cinematic night: sleep, Witch-only reveal, timed Black Cat votes including self-target, abstention, tie resolution and random fallback.
- Dawn sunrise, opt-in rooster recording, day speaker identification, timed turns, skip-turn/draw-two rule and animated draw.
- Premium HUD: current player and upcoming turns, public event history, night/day lighting, speaker glow, Black Cat indicators, role-card effect highlights.
- Contextual card inspector and rules guide, five-stage interactive tutorial, sound/motion/contrast/compact controls.
- Cinematic events and match-end results with safe post-game history.
- Focus management and responsive mobile safe areas, reduced-motion behavior.

## Automated verification

- Engine and extended Experience suite: https://github.com/matintgp/boardgame-ui-preview/actions/runs/39158502411 — **PASS**
- Browser snapshots and checks (1440px/390px/320px): https://github.com/matintgp/boardgame-ui-preview/actions/runs/39158471031 — **PASS**
- TypeScript integration checks: https://github.com/matintgp/boardgame-ui-preview/actions/runs/39153177094 — **PASS**
- Preview URL: https://boardgame-ui-preview.vercel.app/salem/

## Product frontend structure already in repository

`salem/product/components/SalemProductRoom.tsx`, `SalemLiveKitVoice.tsx`, `SalemVoiceDiagnostics.tsx`, `SalemPlayerReport.tsx`, `hooks/useSalemMatch.ts`, `match-protocol.ts`, `voice-contract.ts`. These provide a typed React/Next.js integration layer and secure-interface boundaries; the static deployed demo remains the interactive single-browser HTML simulator.

## Not yet a live multiplayer product

Actual voice transfer, server-authoritative timers, role secrecy, match rejoin from live backend state, tournament ranking, persistent profiles, spectators, moderation workflows, remote replay and server-side audit logging **depend on backend routes, WebSocket protocol, LiveKit instance, credentials and actual authenticated users**. No claim of secure, working live multiplayer without those deployments and tests. The existing full backend is out of scope for this UI repository until connected.

## Release caveats

Automated tests cover representative gameplay/visual paths, not all possible multi-card interactions, browsers or devices. A manual visual inspection and backend integration QA are still required before production launch. Never ship the simulator's client-side secret state as the authority.
