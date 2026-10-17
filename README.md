# BoardGame UI Preview — Unified V14

Standalone **frontend-only interactive preview** of the BoardGame platform.

## Available routes

- `/` — BoardGame homepage, demo account, rooms, leaderboard, and game directory
- `/#game/chess/lobby` and `/#game/chess/play` — Chess local demo
- `/#game/mafia/lobby` and `/#game/mafia/play` — Mafia V13 demo (roles, roundtable, day/night, voice/matchmaking UI)
- `/salem/` — Salem 1692 V2 local game with artwork, role cards, turns and simulated opponents
- `/#game/rokugan` — Rokugan introduction (not yet playable)

This repo is NOT the production Next.js frontend; it is the visual/design reference for a later integration. No live backend, actual multiplayer, or WebRTC is connected.

Source for Salem’s generated artwork has been converted to high-quality WebP to speed up mobile loads. All Mafia V13 assets and chess pieces are included.

Vercel deploys from `main` automatically. Updates to these HTML/CSS/JS files publish without an extra ZIP.
