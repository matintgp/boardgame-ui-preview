# Salem V3 — Rules, UI handoff & anti-cheat boundary

This is an **interactive frontend-only/offline simulator**, not a production multiplayer authority.

## Rules reference

- Standard 4–10 player Tryal distribution uses the original rulebook counts (4: 18/1/1, 5: 23/1/1, 6: 27/2/1, 7: 32/2/1, 8: 29/2/1, 9: 33/2/1, 10: 27/2/1; Not a Witch / Witch / Constable).
- First Black Cat holder starts (in this UX demo, the local human holds Black Cat for predictable onboarding).
- On a normal turn, **either draw two cards and finish your turn, or play one or more cards**.
- Black Conspiracy and Night cards interrupt drawing and resolve immediately; any remaining draw from the chosen draw action is completed afterward.
- Red accusation cards stay until the target has **7 or more accusation points**. The player responsible for crossing the threshold chooses one concealed Tryal of the target; the red pile is discarded and no excess accusation is carried over.
- Conspiracy reveals a concealed Tryal of the player holding Black Cat (chosen by whoever drew Conspiracy), then rotates one concealed Tryal from each surviving player. A player who **ever held** Witch remains allied with Witches.
- Night: Witches choose a victim, Constable can protect someone else (not themselves), and optional Confess reveals one of your own Tryals for protection.
- Blue effects remain until removed/moved/elimination; Stocks causes missed turns; Asylum persists through a blocked night kill.
- With two players left, blue cards/effects leave play.
- Villagers win when every Witch Tryal is revealed; Witches win when all living players are/ever were Witches.

References:
- https://www.ultraboardgames.com/salem/game-rules.php
- https://www.rulespal.com/salem-1692/rulebook
- https://boardgamegeek.com/boardgame/175549/salem-1692

## Implemented in this preview

Core turn and drawing choice, 7-accusation reveal and acting-player selection, return from black-card interrupts, Night/Conspiracy, Town vs Witch victory, Stocks, Piety, Alibi (up to 3 accusation values), Curse removes Blue, Scapegoat moves the target's visible cards to a second other player, Asylum, protection, Confess, bot turns, privacy-safe facedown rendering, persistence and reduced-motion animations.

### Deliberate non-standard/demo features

- Town Hall character abilities are **not** implemented.
- The playable deck is a **subset/rebalanced teaching deck** of basic card types, not a one-to-one reproduction of all 59 official card effects/copies.
- Some complex timing interactions and rare tie conditions are simplified.
- Bot decisions and the local test-role selector exist only in the demo.
- Opponent Tryal cards are stored in the client to run bots. This makes them inspectable via developer tools or localStorage. Hiding them from the DOM is **not cryptographic protection**.
- The introductory private role modal is visible by design; use a privacy curtain on shared screens.

## Minimum server-authoritative contract for the existing backend

The production implementation must **never send other players' unrevealed Tryal cards, decks, or RNG seeds** to clients.

Server owns:
1. Cryptographically secure deck shuffle and Tryal assignment; immutable random draw log.
2. Turn ownership and phase state machine with monotonic `stateVersion`.
3. Card ownership, current card IDs, hand sizes, target legality, effects and no-self rules.
4. Accusation count, revealed Tryal choice authority, event order and public red-card discards.
5. Witch-allegiance history, Conspiracy rotation and private information delivery.
6. Secret Night choices, Constable restrictions, confession deadline and results.
7. Winner calculation and protected rejoin/resume.
8. Idempotent action receipts, deduplication and audit logs.

Command envelope (illustrative types, **not** a deployed API):

```ts
type SalemCommand =
  | {kind:'DRAW_TWO'}
  | {kind:'PLAY_CARD'; cardInstanceId:string; targetPlayerId:string; destinationPlayerId?:string}
  | {kind:'END_TURN'}
  | {kind:'CHOOSE_TRYAL'; targetPlayerId:string; tryalIndex:number}
  | {kind:'NIGHT_TARGET'; targetPlayerId:string}
  | {kind:'CONSTABLE_PROTECT'; targetPlayerId:string}
  | {kind:'CONFESS'; ownTryalIndex:number};
type CommandRequest = {
  matchId: string;
  commandId: string;  // unique, dedupe retries
  expectedStateVersion: number;
  action: SalemCommand;
};
type CommandResponse =
  | {ok:true; stateVersion:number; publicEvents:PublicSalemEvent[]}
  | {ok:false; code:'STALE_STATE'|'OUT_OF_TURN'|'INVALID_TARGET'|'INVALID_CARD'|'FORBIDDEN_ROLE'|'EXPIRED_WINDOW'; stateVersion:number};
```

Authentication establishes `playerId` on the server; the client must **never** supply a trusted actor ID, role, or allegiance. Reject replayed/out-of-order actions. Validate every action against an authoritative snapshot in a transaction. Broadcast public projections to room subscribers and private projections **only** to their authenticated players. Spectators receive only permitted public events, with secrecy controls during Night. Never embed all match secrets in `_next/` data, hydrated props, Redux devtools, SSR HTML, browser localStorage, logs, or public websocket messages.

Front-end only: show pending state and disabled buttons, submit typed commands, reconcile server acknowledgments/state versions; do not award wins client-side.

## Test status

Automated smoke tests live in `scripts/salem-smoke.cjs` and run in `.github/workflows/salem-qa.yml`. Use the GitHub Actions result to verify passing tests. Syntax check and test suite cover player counts, secrecy of DOM projections, blocked out-of-turn actions, seven-accusation selection, interrupted draws and asset integrity. Full multiplayer security requires integration, concurrency and adversarial tests against the actual backend; **not completed here**.
