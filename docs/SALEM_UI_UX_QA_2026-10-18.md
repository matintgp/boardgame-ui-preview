# Salem — programming and UI/UX audit (2026-10-18)

## Scope
Reviewed the static Salem frontend engine, opening Dawn, 60-second turns, custom dropdown integration, responsive UI, role picker, artwork, audio and server-token-based LiveKit React handoff. Verified latest deployment status on Vercel and ran both browser automation and gameplay tests.

## Automated verification — PASS
- Core smoke/regression: **25 / 25** passing. Run: https://github.com/matintgp/boardgame-ui-preview/actions/runs/39114190898
- Real Chromium browser at **1440×900**, **390×844** and **320×740**: pass at Lobby, Town Hall selection, Sleep, Witch Vote, Sunrise, Day — **18 screenshots**.
- Browser checks found **no uncaught JavaScript page errors, zero broken images, no unexpected horizontal scrolling or Dawn overlay viewport overrun** in tested flows.
- Screenshots and detailed stage-by-stage reports: https://github.com/matintgp/boardgame-ui-preview/actions/runs/39114190854/artifacts/12131348790
- React/LiveKit TypeScript check: https://github.com/matintgp/boardgame-ui-preview/actions/runs/39111633984

## Issues found and fixed
1. Owner elimination incorrectly reassigned Black Cat automatically. It is now discarded, and is removed if only two players remain, matching Blue card rules.
2. Night/Conspiracy interruptions left stale active-turn timers. Black-card events now suspend timers; a new 60-second deadline starts on return to the next normal turn.
3. Night report was vulnerable to a timer running while the modal was open. There is now an explicit `night-report` state with no ticking turn countdown until acknowledgment.
4. Saved matches restored during a Night report could become stuck without the report. The report is reconstructed on Resume.
5. Opening-night dialog lacked full keyboard focus handling and meaningful screen-reader modal semantics. Tab navigation, focused controls and post-phase focus restoration were added.
6. Mobile dialogs could have difficult scroll containment and unsafe edge spacing; viewport-safe padding, scroll locking, focus outlines and tighter mobile Dawn layouts were added.
7. The first QA regression check assumed every public character had the same accusation threshold. The test fixture now explicitly neutralizes random Town Hall role modifiers instead of intermittently failing.
8. Deferred modal focus callbacks fired after test browser teardown. Focus is applied synchronously, fixing asynchronous errors.
9. The browser was tested through the full Dawn -> first turn sequence with working portrait images and no mobile horizontal clipping.

## Product limitations / remaining risks
- **Real-time multiplayer, server-authoritative anti-cheat and actual audio calls are NOT live in this HTML demo.** LiveKit React TypeScript integration exists under `salem/product`, but a legitimate backend room-token endpoint, authorization, event subscription, role filtering and voice quality tests must still be connected.
- Current timer, ballots, role secrets and simulated bots run inside one browser: local developer tools can inspect them, so it is **not anti-cheat-secure**.
- User-defined 30-second Witch ballot, 60-second Day turns and vote tie policy are custom online rules, not verbatim physical-boardgame rules.
- The later-game Night/Card/Conspiracy engine still contains some deliberately simplified card interactions, as recorded in `salem/SECURITY_AND_RULES.md`.
- Browser checks are coverage of representative screens and viewports, not formal WCAG certification nor exhaustive compatibility across all devices and operating systems.
- LiveKit typecheck confirms TS structure; multi-user voice verification requires real separate authenticated clients and the backend environment.

## Next recommended pre-production gates
- Backend match authority and private per-player projections, idempotent commands and race/replay tests.
- Real multiplayer LiveKit calls across Chrome, Firefox, Safari and mobile networks with publish permissions + backend token revocation.
- Manual audit of UI with screen readers (TalkBack, VoiceOver) and independent keyboard navigation.
- Add production monitoring and a server-side anti-cheat test suite before launch.
