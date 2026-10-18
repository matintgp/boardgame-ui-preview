# Salem V5 — integrated visual, UX and product frontend release

Date: 2026-10-18
Branch: `main`, deployed automatically to https://boardgame-ui-preview.vercel.app/salem/

## Static playable preview — implemented
- Original cinematic opening Dawn, Witch ballots, Black Cat, sunrise and one-minute day-turn loop preserved
- Dynamic day/night ambiance, active-player emphasis, animated card reveal and draw, Black Cat effects, reduced-motion and audio preferences
- Searchable, filterable rules compendium across game cards and all **15** Town Hall characters, public explanations and large images
- Improved mobile dialogs, cards and keyboard accessibility, larger-text and focus-mode preferences
- Rich match-end summary: reveal roles only after a finished match, step-by-step chronological public event replay and copyable summary
- Existing player order, actor highlighting, turn logs, tutorial, sound settings, reconnect-sensitive phases, and local saves remain intact

## Production-facing React/Next.js frontend — implemented as isolated source
`salem/product/` is a separate Next.js App Router frontend, not a replacement for the current Vercel static project:
- Cinematic typed screens for Town Hall, sleeping city, secret Witch ballot and sunrise.
- Original role and background artwork automatically bundled into `public/salem-art` at dev/build time.
- Typed server snapshots with strictly public/private projections, per-player allowed actions, command version checking and WebSocket reconnect.
- LiveKit voice client (witch-private / day speaker / day listeners), explicit microphone consent, remote audio renderer, status and connection-quality diagnostics.
- Public-only spectator projection, account verification and player reports UI.
- TypeScript contract tests for information filtering, session identity, voice roles, deadlines and phase legality.

## Verification
- Offline gameplay and UX: **29/29** successful tests:
  https://github.com/matintgp/boardgame-ui-preview/actions/runs/39160150485
- Next.js product: **6/6** typed contract tests, strict TypeScript compilation and a successful production build:
  https://github.com/matintgp/boardgame-ui-preview/actions/runs/39160111154
- Real Chromium visual QA: multiple desktop/mobile sizes, Dawn stages and screenshot artifact, passed:
  https://github.com/matintgp/boardgame-ui-preview/actions/runs/39160095107

## What cannot be marked complete yet
The main application's backend is **not available** to the current GitHub integration. Therefore:
- Private multiplayer voice calls are **not** active on the static demo.
- Real secret handling, time/vote authority, back-end card legality, session reconnect and anti-cheat enforcement need the production backend.
- Real-world peer-to-peer/multi-person LiveKit audio quality, room revocation and race conditions require connected services and multiple authenticated clients.
- The current Vercel production route is the HTML/CSS/JS demo. Next.js exists as a production-architecture subproject, with its own build, but is not the active deployed root.

To finish product integration: grant read/write access to the existing backend repository or provide an authenticated staging server contract, authorize LiveKit project configuration, and run real multi-client and security acceptance tests. Never ship production LiveKit API secrets in browser code.

The client must not claim a fully anti-cheat-safe multiplayer session until server authorization and independent penetration/concurrency tests pass.
