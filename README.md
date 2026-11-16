# starfall-salvage

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Vikkry88/starfall-salvage/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Vikkry88/starfall-salvage/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Starfall Salvage** — pilot the last salvage skiff through a drifting debris field. Haul each wave's salvage quota, chain pickups into combos, dodge tumbling asteroids, and keep the scavenger drones off your crates. Clear a wave, pick one of three upgrades, and fly the next — eight waves to clear the sector.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests: `game/` is plain static files.

## Controls

- **WASD / arrows** — thrust
- **Mouse** — aim
- **Click / Space** — fire the harpoon
- **P** — pause · **M** — sound on/off
- **1 / 2 / 3** or click — pick an upgrade card
- **R / Enter** — fly again after the run ends

## How it is built

- `game/src/main.js` — bootstrap, game loop and state machine (title, playing, upgrade, game over, victory)
- `game/src/entities.js` — the world: ship, harpoon bolts, salvage crates, asteroids, drones, particles
- `game/src/waves.js` — the wave director and the upgrade offers
- `game/src/render.js` — canvas painting: nebula, starfield, ships, rocks, effects
- `game/src/hud.js` — HUD and menus
- `game/src/audio.js` — synthesized Web Audio effects and music (no audio files)
- `game/src/config.js` — every tuning number in one place
- `game/src/random.js` — seeded RNG for deterministic screenshot staging
- `game/src/input.js` — keyboard and mouse state
- `game/src/shots.js` — `?shot=` staging for the screenshots
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`

## Screenshots

`shots.json` lists the four shots and the `?shot=` query that stages each one; the screenshots in `screenshots/` are real renders of this code in a desktop browser.

---

<sub>Entered on [make.fun](https://make.fun/?ref=uchihaa-shizuii&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
