# SOLMAR BAY

[![SOLMAR BAY](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry-r21/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry-r21/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game in the spirit of GTA 6, built for the
make.fun gta6-01 bounty. Golden hour slides into neon night over a
sun-soaked bay city. You are a small-time hustler with $120 and a
borrowed sedan; run jobs for Vic Torres, with getaway driver Lena Cruz
riding shotgun, steal cars, outrun the police, and climb from NOBODY to
BAY LEGEND. City, characters, districts, radio and dialogue are all
invented — no Rockstar assets, names, story, art, sound or music.

## How to play

```sh
node serve.ts
# open http://127.0.0.1:8904/
```

## Controls

- **WASD / arrows** — walk and drive (Shift runs, Shift in a car is NOS)
- **Mouse** — aim, click to shoot
- **1–4** — Pistol, SMG, Shotgun, Rifle · **R** — reload
- **E** — get in / out of a car · **Q** — change radio station
- **X** — skip cutscene · **F** — shop at the MART · **H** — rest at the safehouse
- **G** — garage (tuning & storage) · **T** — street race at the pad
- **Y** — taxi fare at the stand · **V** — sell a car to Vic's fence
- **P** — pause menu and job list

## What's inside

- A living bay city with 7 districts, traffic, pedestrians and gulls
- 10 story missions, including the crew job at job 5 with Lena riding along
- Police with a utility brain (RAMMING, ROADBLOCK, PURSUIT, SEARCH) and a helicopter at 3+ stars
- Side hustles: street races, taxi fares, collectible packages, fence sales
- A full day/night cycle, 6 synthesized radio stations, a respect ladder
- Daily challenges that pay the moment you hit the target
- Garage tuning (engine, armor, paint, NOS), a corner-store shop, a safehouse and a pay-n-spray

## Tech notes

- Plain ES modules, no build step, no runtime dependencies
- three.js vendored under `game/vendor/` (official r187 build)
- `game/src/main.js` is the boot hub; every module exports an `init(ctx)`
- `serve.ts` serves the `game/` folder; `tools/shots.mjs` takes the screenshots
- `window.__solmar` exposes the live game state for debugging and checks
