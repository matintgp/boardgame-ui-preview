# BoardGame — Unified UI Preview

Live static preview: https://boardgame-ui-preview.vercel.app/

This repository includes the existing homepage, local Chess/Mafia prototypes, the **Salem enhanced simulator**, and an **isolated Next.js + TypeScript product frontend** under `salem/product`.

## Routes
- `/` — unified BoardGame demo home
- `/#game/chess/lobby` — Chess demo
- `/#game/mafia/lobby` — Mafia demo
- `/salem/` — Salem offline simulator (Town Hall draft, cinematic Dawn, Witch ballots, one-minute turns, role cards, rulebook, replay and responsive layouts)
- `/#game/rokugan` — Rokugan introductory page

## Salem simulator: what's interactive now
- Opening character selection (two offers for up to seven players)
- Night/sleep atmosphere, Black Cat vote and sunrise audio; custom house-rule timers
- Card play, reveal, turns, role ability subset, rules handbook and local bots
- Searchable public cards / Town Hall characters, accessibility settings, match-end replay
- Local save, mobile and keyboard flows
- Sound opt-in, reduced-motion support and self-hosted assets

**Important:** `/salem/` runs in one browser. Role secrets in local memory and localStorage are inspectable; it is NOT real anti-cheat multiplayer. Audio badges simulate voice status; no real network voice is enabled there.

## Product frontend (separate, backend-ready)
- `salem/product`: typed Next.js App Router, React screens for Town Hall / sleep / private Witch voting / sunrise / day, responsive CSS and local artwork build
- Authenticated server snapshots/WebSocket reconnection, spectator-safe public projections, server event versions and command envelope
- LiveKit room playback, microphone consent, quality diagnostics, role/turn-specific grants
- Unit tests for private data boundaries and voice permissions

Run inside `salem/product`:
```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

To connect to the real backend, set `NEXT_PUBLIC_SALEM_WS_URL` and `NEXT_PUBLIC_SALEM_API_BASE`; implement the authenticated server API, including `/api/salem/voice-token` with strict server-side authorizations. **Those endpoints are not connected here.** Do not put LiveKit signing secrets into `NEXT_PUBLIC_*` variables.

## QA & deployment

GitHub Actions runs gameplay tests, multi-viewport Chromium screenshots, and React/TypeScript build and contract tests. Vercel deploys the static preview from `main`. The Next.js subproject is not the active Vercel production root; deploying it requires separate configuration and the existing backend.

See `docs/SALEM_UI_UX_QA_2026-10-18.md`, `salem/OPENING_DAWN_PRODUCT_HANDOFF.md`, and `salem/SECURITY_AND_RULES.md`.
