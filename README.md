[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/maxwin96/best-stealth-game-20261121-1759-entry/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/maxwin96/best-stealth-game-20261121-1759-entry/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# The Velvet Fox — a museum stealth game

A top-down 2D stealth game that runs offline in a desktop browser from
static files. You are the Velvet Fox, a thief slipping through a museum
at night: steal the **Star Sapphire**, dodge three patrolling guards and
their yellow vision cones, hide behind pedestals, plants and statues,
then reach the green **EXIT** unseen.

## The heist

- **Guards patrol** fixed routes (Brutus, Mabel and Otto) and pause at
  corners to look around — learn their rhythm, then move.
- **Vision cones** are translucent yellow and turn red when a guard is
  alarmed. Step inside one with a clear line of sight and suspicion
  climbs; fill it and the guard gives chase with a `!`.
- **Cover breaks sight.** Walls, pedestals, plants, statues and
  benches block both movement and line of sight — duck behind them
  and suspicion drains away.
- **Alarm meter (0–100%).** Chases and being grabbed raise it; it
  cools slowly while you stay unseen. At 100% you are **Busted!**
- **Sneak (Shift)** to move slowly and quietly — suspicion fills far
  slower while sneaking. Sprinting in the open fills it faster.
- **Pebbles.** Click or press Space to toss a pebble; the clatter
  pulls the nearest guard over to investigate, opening a route.
- **Loot.** The Star Sapphire (500 pts) unlocks the exit; rubies,
  emeralds, pearls and coins are optional points. A clean run with no
  full spotting earns a +300 clean bonus plus a time bonus.

## How to play

| Key | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Shift | Sneak (slow, quiet, hard to spot) |
| Click / Space | Toss a pebble toward the mouse |
| Enter | Start |
| R | Restart |
| M | Mute sound |

Sounds are synthesized with WebAudio — no audio files are shipped.

## Run it locally

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

Deterministic screenshot modes (the autopilot plays the real rules
forward a fixed number of ticks, so the same seed renders the same
frame):

- `?shot=start&seed=1` — title screen over the live museum
- `?shot=play&seed=1` — mid-heist, fox near the sapphire
- `?shot=end&seed=1` — the clean getaway

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to the output directory and writes `dossier.json`
with `buildDossier` from `vendor/makefun-game.ts`.

## Layout

- `main.ts` — entrypoint: copies the game and writes the dossier
- `serve.ts` — tiny static server for local play
- `vendor/makefun-game.ts` — make.fun dossier library (kit copy, unchanged)
- `game/index.html` — the page
- `game/src/config.js` — tuning and the museum level layout
- `game/src/random.js` — seeded random generator
- `game/src/input.js` — keyboard and mouse input
- `game/src/audio.js` — synthesized WebAudio sounds
- `game/src/world.js` — guard AI, vision, suspicion, alarm, loot, exit
- `game/src/render.js` — canvas drawing, HUD, title/win/caught screens
- `game/src/shots.js` — deterministic screenshot autopilot
- `game/src/main.js` — game loop and screen state machine
- `screenshots/` — real renders of the game's own code

## License

MIT — see [LICENSE](LICENSE).
