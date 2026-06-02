# RubixCube

Minimal browser Rubik's Cube renderer/simulator built with TypeScript and Three.js, served by Vite.

https://raw.githubusercontent.com/TropicSnowJPR/RubixCube/refs/heads/master/Preview.png

Prerequisites
- Node (16+ recommended) and npm

Quick start (PowerShell)
```powershell
npm install
npm run build:atlas   # builds assets/atlas.png from assets/textures/*
npm run vite          # start dev server (port 5173 by default)
```

Build / Preview
```powershell
npm run build
npm run preview
```

Notes
- Runtime entrypoint: `index.html` loads `src/App.ts` as a module.
- Default cube size is configured in `src/App.ts` at the bottom of the file (e.g. `new App(4)`). Change that number to test other NxN sizes.
- Atlas image: `assets/atlas.png`. It's produced by `scripts/buildAtlas.js` from the files in `assets/textures/`.
- `src/App.ts` currently hardcodes `AtlasRows` / `AtlasCols` (default 2x3). Ensure those match the atlas grid produced by `buildAtlas`.
- The `build:atlas` npm script currently runs `tsx scripts/buildAtlas.ts`, but the repo has `scripts/buildAtlas.js`. Update the script entry or rename the file before running.
- If `tsx` is not available, install it as a dev dependency (`npm i -D tsx`) or compile the script with `tsc` and run with `node`.

License
- MIT (see `package.json`)
