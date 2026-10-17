# Salem V3 — Gameplay & visual update

## Gameplay
- Seventh accusation reveals one Tryal selected by the **acting** player.
- Drawing a black card resolves immediately and then completes any remaining draw.
- Alibi removes up to 3 accusation points from actual red cards.
- Scapegoat now prompts the human player to choose a legal destination for the **entire** visible card pile.
- Curse removes a Blue effect; Asylum remains in place until displaced or eliminated.
- Added Stocks skipped-turn and Piety protection in the demo rule subset.
- Black Cat / Conspiracy ownership, concealed Tryal movement and Witch history are maintained.
- Bots may use visible table facts but not hidden player allegiance to pick an accusation target.
- Disabled action buttons and rejected invalid actions outside the correct turn/phase.
- Private Tryal artwork is not emitted in the closed-role DOM.
- Removed mutable developer shortcuts from public `window.SalemDemo`.

## Presentation
- Dynamic, restrained night/day/conspiracy ambient effects.
- Active-player glow, selected card emphasis, reveal/entry animations.
- Keyboard focus treatment, mobile sizing and reduced-motion opt-out.

## Scope
Only a frontend simulation; no existing backend changed. Multiplayer anti-cheat requires server-authoritative hidden state, replay protection, and command validation, detailed in `SECURITY_AND_RULES.md`. Not all original Town Hall powers or advanced card interactions are implemented.

## QA
`scripts/salem-smoke.cjs` tests startup rules, private DOM projections, card legality, seven accusations, Night/Conspiracy interruptions, assets, Scapegoat, Alibi and Stocks/Piety. See GitHub Actions for latest verified result.
