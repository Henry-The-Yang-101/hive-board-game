# Hive Private Lobby

Web-based two-player Hive implementation (base insects only) with private invite links.

## Features

- Private lobbies with unguessable links
- Two-player cap (host + guest)
- Base Hive insects: queen bee, soldier ant, spider, beetle, grasshopper
- Server-authoritative game state and rule validation
- Light/dark theme toggle
- Clean SVG icons (no emoji)

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Rules Implemented

- Queen must be placed by each player's fourth turn
- Pieces can only be placed adjacent to own hive and not touching opponent pieces (after opening)
- One-hive rule on movement
- Movement constraints per insect:
  - Queen: one step slide
  - Beetle: one step, can climb stacks
  - Grasshopper: straight-line jump over contiguous pieces
  - Spider: exactly three-step crawl
  - Soldier ant: perimeter crawl with any distance
- Win/draw detection when queen is surrounded

## Test

```bash
npm run test
```
