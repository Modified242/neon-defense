# ⚡ Neon Defense - Tower Defense Game

A high-octane 2D Canvas Tower Defense game built with striking cyber neon visuals, deep tactical combat, Tech Lab meta-progression, 5 challenging sectors with epic boss encounters, and procedural audio.

Playable in any modern web browser or as a native desktop application via **Electron**.

![Status](https://img.shields.io/badge/Status-Ready-brightgreen)
![Node](https://img.shields.io/badge/Node.js-%3E%3D20.19.0%20%7C%7C%20%3E%3D22.12.0-blue)
![Vite](https://img.shields.io/badge/Bundler-Vite%208-646CFF)
![Electron](https://img.shields.io/badge/Desktop-Electron%2044-47848F)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🌟 Key Features

- **🎮 Cyber Neon Visuals**: Glassmorphism HUD, canvas glow shaders, laser beam effects, particle explosions, and dynamic damage indicators.
- **🗺️ 5 Unique Sectors (Levels)**: Progress through 5 escalating sectors with custom grid paths, enemy waves, and a final **World Boss** encounter in Sector 5.
- **🔬 Tech Lab Meta-Progression**: Clear sectors and earn 1–3 stars to gain **Data Cores**. Spend Data Cores in the Tech Lab to permanently unlock advanced tower schematics.
- **🏗️ 8 Distinct Tower Types**:
  - **Pulse Blaster** (50¢): Rapid kinetic projectile defense.
  - **Railgun Sniper** (120¢): Long-range, heavy single-target kinetic railgun.
  - **Plasma Repeater** (150¢): Rapid-fire energy repeater battery.
  - **Cryo Emitter** (120¢ / 15 Cores): Freezes and slows incoming cyber waves.
  - **Photon Mortar** (180¢ / 25 Cores): High-explosive area-of-effect splash mortar.
  - **Ion Beam** (180¢ / 35 Cores): Continuous directed energy beam with 100% accuracy.
  - **Overclock Node** (200¢ / 50 Cores): Support buffer boosting fire rates of nearby towers.
  - **Credit Fabricator** (150¢ / 40 Cores): Generates dividend credits after every wave.
- **🎯 Tactical Targeting Modes**: Set towers to target **First** (closest to core), **Strong** (highest HP), **Weak** (lowest HP), or **Close** (nearest to tower).
- **⏩ Speed & Pause Controls**: Switch between **1x**, **2x**, and **3x** simulation speeds or pause the battle at any moment.
- **♾️ Endless Mode**: Put your late-game builds to the test against infinite scaling waves after victory.
- **🔊 Procedural Web Audio Engine**: Zero-asset procedural sound effects generated on-the-fly via Web Audio API oscillators, noise filters, dynamic compression, and limiter.
- **💾 Automatic State Persistence**: Game progress, unlocked sectors, star records, endless wave records, and tech tree purchases automatically save to `localStorage`.
- **🖥️ Standalone Desktop App**: Preconfigured Electron desktop shell with GPU crash resilience and native window packaging.

---

## 🚀 Prerequisites

> [!IMPORTANT]
> **Vite 8 requires Node.js `^20.19.0` or `>= 22.12.0`.**
> Older versions (such as Node 16 or early Node 18) are not supported by Vite 8 and will throw engine incompatibility errors.

- **[Node.js](https://nodejs.org/)**: `^20.19.0` or `>= 22.12.0` (check with `node -v`)
- **npm**: `v9+` or `v10+` (comes bundled with Node.js)

---

## 💻 Installation & Running

### 1. Clone & Install

```bash
git clone https://github.com/Modified242/neon-defense.git
cd neon-defense
npm install
```

### 2. Choose How to Run

You can run Neon Defense either as a **Desktop App (Electron)** or in your **Web Browser**:

#### Option A: Run as Desktop App (Electron) — *Recommended*

```bash
npm start
```

> **Note:** The desktop app runs from compiled production assets in `dist/`. The `npm start` script is preconfigured with a `prestart` hook that automatically executes `vite build` prior to starting Electron, guaranteeing `dist/index.html` is up-to-date.
>
> If you wish to build and start manually:
> ```bash
> npm run build
> npx electron .
> ```

#### Option B: Run in Web Browser (Development Mode)

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5173
```

#### Option C: Preview Production Web Build

```bash
npm run build
npm run preview
```

Open the preview URL printed in your terminal (usually `http://localhost:4173`).

---

## 📦 Packaging Desktop App (macOS)

To bundle Neon Defense into a native macOS desktop application (`.app` / DMG):

```bash
npm run pack:mac
```

The compiled binaries will be output to the `release/` directory.

---

## 📜 NPM Scripts Reference

| Command | Description |
| :--- | :--- |
| `npm start` | Builds the frontend bundle (`vite build`) and launches the Electron desktop app |
| `npm run dev` | Launches the Vite local development server with hot module reloading (`localhost:5173`) |
| `npm run build` | Builds the optimized production web assets into `dist/` |
| `npm run preview` | Locally serves and previews the built production assets from `dist/` |
| `npm run pack:mac` | Builds production assets and packages a standalone macOS desktop installer via `electron-builder` |

---

## 🕹️ Controls & Hotkeys

| Action | Control / Key |
| :--- | :--- |
| **Start Wave** | Click **Start Wave** or press `Space` / `Enter` (during build phase) |
| **Quick-Select Tower** | Press `1` through `8` to select tower type from the menu |
| **Cancel / Deselect** | Press `Escape` to cancel placement or close tower inspection |
| **Inspect / Upgrade Tower** | Click any placed tower to open stats, upgrade level, or sell |
| **Adjust Targeting** | Select a tower and choose **First**, **Strong**, **Weak**, or **Close** |
| **Game Speed** | Click `1x`, `2x`, or `3x` buttons |
| **Pause Game** | Click `⏸` button |
| **Toggle Fullscreen** | Click `⛶ Fullscreen` button |

---

## 🏗️ Tower Schematics

| Tower | Cost | Unlocked By | Description |
| :--- | :---: | :---: | :--- |
| **Pulse Blaster** | 50¢ | Default | Standard single-target kinetic blaster. Reliable baseline defense. |
| **Railgun Sniper** | 120¢ | Default | Extreme range, high kinetic alpha strike. Ideal for tank/boss elimination. |
| **Plasma Repeater** | 150¢ | Default | Rapid-fire plasma battery. Shreds high-speed swarmers. |
| **Cryo Emitter** | 120¢ | 15 Cores | Area-of-effect cryogenic beam. Significantly slows enemy movement speed. |
| **Photon Mortar** | 180¢ | 25 Cores | Heavy lobbed ordnance with large splash damage radius. |
| **Ion Beam** | 180¢ | 35 Cores | Sustained continuous laser beam that continuously damages targets without missing. |
| **Overclock Node** | 200¢ | 50 Cores | Support tower aura that boosts the fire rate of all neighboring towers by 30%+. |
| **Credit Fabricator** | 150¢ | 40 Cores | Economic investment node providing bonus credits upon clearing every wave. |

---

## 📂 Project Architecture

```
tower-defense/
├── electron.js        # Electron main process entry point & window management
├── index.html         # Application shell and UI layout
├── main.js            # Frontend orchestration, event bindings, and UI controller
├── style.css          # Cyber neon styling, glassmorphism UI, and responsiveness
├── vite.config.js     # Vite configuration (relative path resolution for Electron)
├── package.json       # Dependencies, build configs, and npm scripts
├── game/
│   ├── config.js      # Tower balance, level layouts, wave definitions, and upgrade formulas
│   ├── engine.js      # Core game loop, spatial math, projectile simulation, and collision
│   ├── render.js      # Canvas 2D render pipeline, particle systems, and neon visual effects
│   ├── audio.js       # Procedural Web Audio API sound synthesis and limiter
│   └── save.js        # Persistent save/load manager via localStorage
```

---

## 🔧 Troubleshooting

### 1. `ERR_FILE_NOT_FOUND` when starting Electron
If you previously ran `electron .` or an older `npm start` without compiling, Electron cannot locate `dist/index.html`.
- **Fix**: Run `npm run build` once, or use `npm start` (which automatically triggers `npm run build` beforehand).

### 2. Node.js Engine Warnings or Syntax Errors
If you see errors related to modern syntax or Vite version incompatibilities:
- **Fix**: Check your Node.js version with `node -v`. Upgrade to Node.js `v20.19+` or `v22.12+`.

### 3. Audio Does Not Play Immediately
Modern web browsers and Chromium restrict Web Audio until the user interacts with the page.
- **Fix**: Click anywhere on the screen or click **Start Wave** to initialize audio playback.

### 4. GPU Crashes or DXGI Driver Hangs
Electron is configured with `app.disableHardwareAcceleration()` to prevent hardware hangs and ensure stability across diverse GPU architectures.

---

## 📄 License

MIT License © 2026 Modified242
