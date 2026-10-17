# Salem Demo V2 — Frontend handoff

**Scope:** UI/gameplay reference for existing Next.js + React + TypeScript app, not a new backend and not a specification for changing the existing API without review.

## Suggested component tree

```
SalemPage
├─ SalemLobby
│  ├─ LobbySettings / PlayerSeatList / ReadyState
│  └─ SalemTutorial
└─ SalemMatch
   ├─ MatchHeader / PhaseBadge / PublicLog
   ├─ SalemTable
   │  ├─ PlayerSeat[] (public-only projection)
   │  ├─ TurnIndicator / AccusationCounter
   │  └─ TryalBack[] / RevealedTryal[]
   ├─ PrivateHand / PrivateTryal / RoleReveal
   ├─ TurnActionBar (DrawTwo / PlayCard / EndTurn)
   ├─ AccusationResolution / ConspiracyReveal / NightActions
   └─ GameOverDialog
```

## Core state machine

- `turn`: actor chooses `DRAW_TWO` **or** `PLAY_CARD` (one or more) then `END_TURN`.
- `conspiracy`: forced public event; player tryals rotate on server; updates private roles and emits public results only.
- `night`: hidden action choices for witches and constable; optionally confession; resolution to dawn.
- `finished`: town/witch victory.

A player seat must never show another player's secret Tryal unless revealed. Do not send a browser the complete `GameState` structure used in this demo!

## Suggested TypeScript definitions

```ts
type Phase = 'turn' | 'conspiracy' | 'night' | 'finished';
type CardId = 'acc1' | 'acc2' | 'acc3' | 'alibi' | 'asylum' | 'scapegoat' | 'curse';
type TryalKind = 'witch' | 'constable' | 'innocent';

type PublicTryal = { id: string; revealed: boolean; kind?: TryalKind };
type PublicPlayer = { id: string; name: string; character: string; alive: boolean; accusation: number; effects: string[]; tryals: PublicTryal[] };
type PrivatePlayerView = { hand: CardId[]; tryals: { id: string; kind: TryalKind; revealed: boolean }[]; team: 'town' | 'witch'; mayActAtNight: boolean };
type GameSnapshot = { gameId: string; version: number; phase: Phase; turn: number; currentActorId: string | null; players: PublicPlayer[]; me: PrivatePlayerView; deckCount: number; discardCount: number; publicEvents: string[] };
type GameIntent =
  | { type: 'DRAW_TWO' }
  | { type: 'PLAY_CARD'; cardId: CardId; targetId: string }
  | { type: 'END_TURN' }
  | { type: 'REVEAL_TRYAL'; targetId: string; tryalId: string }
  | { type: 'NIGHT_ATTACK'; targetId: string }
  | { type: 'NIGHT_PROTECT'; targetId: string }
  | { type: 'CONFESS'; tryalId: string };
```

## Backend integration

The main project already has a backend. Match the UI to its actual endpoints and events. Do not implement duplicate auth, websocket, user, or game logic. The authoritative server must validate:

- whose turn it is, card ownership, legal targets and draw/play action constraints;
- hidden tryal distribution, Witch affiliation and Conspiracy swaps;
- threshold-7 reveal eligibility and elimination;
- hidden Night actions, protection/confession, victory;
- timing, reconnect, idempotency and event ordering.

React should render server projections and send **intents**, not compute secret outcomes. Add optimistic UI only for reversible non-secret actions, with rollback on rejection.

## Tests before going live

- 4/6/8/10 seats mobile + desktop, focus and keyboard interaction;
- malicious card/target/turn requests rejected on server;
- no hidden Tryal in public payloads, HTML or spectator streams;
- reconnect during Conspiracy/Night, racing votes/reveals, repeated event IDs;
- forced night when deck empties, all game-over states, draw vs play validity.

## Original art

All PNG files from the original Salem V1 ZIP are retained in `assets/`. Generated art is visually inspired by 1692 Salem; it is not the original commercial card deck.
