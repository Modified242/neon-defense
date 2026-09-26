# ⚡ Neon Defense - Tower Defense Game

A modern, action-packed HTML5 2D Canvas Tower Defense game with striking cyber neon visuals, strategic tower placement, multiple sector levels, and custom upgrade mechanics.

![Neon Defense](https://img.shields.io/badge/Status-Ready-brightgreen)
![Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF)
![JavaScript](https://img.shields.io/badge/Language-JavaScript%20(ES6+)-F7DF1E)

---

## 🌟 Key Features

- **🎮 Cyber Neon Aesthetic**: Glassmorphism UI, glowing canvas particles, smooth laser animations, and dynamic visual hit effects.
- **🗺️ Multiple Sectors (Levels)**: Choose from different grid sectors with custom paths and enemy progression.
- **🏗️ 6 Unique Tower Types**:
  - **Pulse Blaster** (50¢): Balanced single-target damage.
  - **Railgun Sniper** (100¢): High-range, high-damage single shot.
  - **Plasma Repeater** (150¢): Rapid-fire laser battery.
  - **Cryo Emitter** (120¢): Slows down incoming cyber enemies.
  - **Photon Mortar** (200¢): Powerful area-of-effect blast damage.
  - **Credit Fabricator** (150¢): Passive income generator per wave.
- **⬆️ Tower Upgrades & Economy**: Select placed towers to view stats, upgrade range/damage/speed, or sell for credits.
- **👾 Wave Spawning System**: Incremental enemy scaling, health bars, speed dynamics, and victory/defeat screens.
- **🖥️ Fullscreen Support**: Toggle crisp fullscreen view on high-DPI displays.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- `npm` or `yarn`

### Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Modified242/neon-defense.git
   cd neon-defense
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

4. **Build for Production:**
   ```bash
   npm run build
   ```
   The production files will be output to the `dist/` directory.

---

## 🕹️ How to Play

1. **Select Sector**: Pick a level sector from the main screen.
2. **Build Towers**: Select a tower type from the right panel and place it on available grid tiles.
3. **Start Wave**: Click **Start Wave** to release the incoming enemy wave.
4. **Manage & Upgrade**: Click any placed tower to inspect stats, upgrade power, or sell it.
5. **Defend Grid**: Prevent enemy shapes from reaching the core system!

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES Modules), HTML5 Canvas 2D API
- **Styling**: Modern CSS3 (Glassmorphism, CSS Grid, Custom Properties, Google Fonts 'Outfit')
- **Bundler**: [Vite](https://vitejs.dev/)

---

## 📄 License

MIT License © 2026
