# RubixCube

Minimal browser Rubik's Cube renderer/simulator built with TypeScript and Three.js, served by Vite.

![Example Image](https://raw.githubusercontent.com/TropicSnowJPR/RubixCube/refs/heads/master/Preview.png)

Prerequisites
- Node (16+ recommended) and npm

Quick start (PowerShell)
```powershell
npm install
npm run vite          # start dev server (http://localhost:5173)
```

Build / Preview
```powershell
npm run build
npm run preview
```

Notes
- Runtime entrypoint: `index.html` loads `src/app/App.ts` as a module.
- Default cube size is set in `src/app/App.ts` via `private Size = 3;` (the app is instantiated as `new App()`).
- Face textures are loaded directly from `public/textures/*.png` in `src/app/Cube/Cube.ts`.
- Optional backend API lives in `src/backend/main.py` (FastAPI entrypoint `src.backend.main:app` in `pyproject.toml`) and uses SQLite at `public/db/rubix.db`.

License
- MIT (see `package.json`)
