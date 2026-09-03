# Deployment Guide: Vercel & MongoDB Atlas 🚀

This document outlines the deployment architecture and setup steps for deploying the Studio i Mario Game to **Vercel** with **MongoDB Atlas**.

---

## 1. Architecture Overview

- **Static Frontend Assets:** `index.html`, `css/`, `js/`, audio files, and sprite assets are served directly from **Vercel's Edge CDN** at zero latency with zero cold starts.
- **Backend API:** All requests to `/api/scores`, `/api/leaderboard`, and `/api/health` are routed via `vercel.json` to the Serverless Function at `api/index.js` (bridged to `server.js`).
- **Database Connection Caching:** Database connections via Mongoose are cached across serverless invocations to reuse connections efficiently without exhaustion.
- **CI/CD Pipeline:** Every push to `main` triggers GitHub Actions (`.github/workflows/ci.yml`) for automated linting/syntax checks, and automatically deploys to Vercel production.

---

## 2. Environment Variables Configuration

In your **Vercel Project Dashboard** (`Settings` ➔ `Environment Variables`):

| Variable Name | Environments | Description | Example / Format |
|---|---|---|---|
| `MONGODB_URI` | Production, Preview, Development | MongoDB Atlas connection string with explicit database name | `mongodb+srv://<user>:<password>@cluster0.qohgfec.mongodb.net/studio-i-mario-game?retryWrites=true&w=majority` |

> ⚠️ **Important:**
> - Never commit the real `.env` file to git.
> - Ensure MongoDB Atlas **Network Access (IP Whitelist)** includes `0.0.0.0/0` (Allow Access from Anywhere) so Vercel dynamic serverless IPs can connect.

---

## 3. Deployment Steps for New Team Members

1. **Import Repository to Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard) ➔ **Add New Project**.
   - Select the GitHub repository.
   - Framework Preset: **Other** (Root directory: `./`).
2. **Add Environment Variables:**
   - Add `MONGODB_URI` with the production database connection string.
3. **Deploy:**
   - Click **Deploy**. Vercel will build the project and assign a production URL (e.g. `https://your-project.vercel.app`).

---

## 4. Verification & Health Check

After deployment, verify your live instance:
- Health & DB check: `https://<your-deployment-url>/api/health` ➔ Returns `{"status":"ok","database":"connected"}`.
- Leaderboard API: `https://<your-deployment-url>/api/leaderboard?limit=10`.
- Gameplay: Open the base URL in mobile or desktop and test high-score submission.
