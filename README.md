# Hive Online!

Web-based two-player Hive implementation (base insects only).  

Play the deployed game with a friend at [https://hive-board-game.vercel.app/](https://hive-board-game.vercel.app/)!

## Features

- **Private Lobbies**: Create links to invite friends.
- **Real-time Gameplay**: Powered by PartyKit for low-latency synchronization.
- **Responsive 3D Board**: Immersive Three.js/React Three Fiber board that works on desktop and mobile.
- **Mobile Optimized**: Bottom-sheet controls and adaptive layout for smaller screens.
- **Base Hive Insects**: Queen Bee, Soldier Ant, Spider, Beetle, Grasshopper.
- **Server-Authoritative**: Game state and rule validation handled on the server.

## Run

To run the project locally, you need to start both the Next.js frontend and the PartyKit server:

```bash
# Install dependencies
npm install

# Start the frontend (Next.js)
npm run dev

# Start the backend (PartyKit)
npm run party
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

To deploy the PartyKit server:

```bash
npm run party:deploy
```

## Sessions and Dev Restarts

Lobbies live in server memory (via PartyKit). After a server restart, old browser session data may be invalid; the client will clear it and join the lobby again when possible. If a lobby no longer exists, simply create a new one.

## Rules Implemented

- **Placement**: Queen must be placed by each player's fourth turn. Pieces can only be placed adjacent to own hive and not touching opponent pieces (after opening).
- **One-Hive Rule**: The hive must always remain connected.
- **Movement Constraints**:
  - **Queen**: One step slide.
  - **Beetle**: One step, can climb stacks.
  - **Grasshopper**: Straight-line jump over contiguous pieces.
  - **Spider**: Exactly three-step crawl.
  - **Soldier Ant**: Perimeter crawl with any distance.
- **Win/Draw Detection**: Triggered when a queen is completely surrounded.

