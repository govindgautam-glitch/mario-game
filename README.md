# Studio i Mario Game 🎮

> **The Venture Platformer Adventure with Real-time MongoDB Global Leaderboard**

A rich, high-performance web platformer inspired by retro classics, showcasing venture ecosystems, power-ups, smooth 5-state pipe transitions, full mobile touch controls, and global high-score ranking.

---

## 🌟 Key Features

- **Retro Platformer Mechanics:** Fluid physics, acceleration, friction, stomp collisions, and flagpole fanfare.
- **5-State Seamless Pipe Transitions:** Full rim clipping, automated entry on contact, and theme crossfading.
- **MongoDB Global Leaderboard:** REST API with case-insensitive unique player names and highest-score persistence.
- **Full Mobile Support:** Virtual D-Pad & action touch buttons, portrait warning overlay, and responsive cards.
- **Dual Runtime Architecture:** Runs as a standard Node.js server locally and as Vercel Serverless Functions in production.

---

## 🚀 Quick Start (Local Development)

1. **Clone & Install:**
   ```bash
   git clone <repository_url>
   cd mario-game
   npm install
   ```

2. **Configure Environment:**
   Copy `.env.example` to `.env` and provide your MongoDB connection string:
   ```env
   PORT=8080
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.qohgfec.mongodb.net/studio-i-mario-game?retryWrites=true&w=majority
   ```

3. **Start Game Server:**
   ```bash
   npm start
   ```
   Open `http://localhost:8080` in your browser.

---

## 🌐 Production Deployment

See [DEPLOYMENT.md](file:///c:/Users/shubham/OneDrive/Desktop/mario%20game/DEPLOYMENT.md) for full instructions on deploying to **Vercel** with MongoDB Atlas.
