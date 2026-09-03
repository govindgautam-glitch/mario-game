/**
 * Studio i Mario Game — Backend Server & Serverless Handler
 * Serves static game assets and provides secure MongoDB-backed Global Leaderboard REST API.
 * Compatible with local Node.js server (npm start) and Vercel Serverless Functions.
 */

// Configure DNS resolvers for reliable SRV resolution across environments
const dns = require('dns');
try {
    dns.setDefaultResultOrder('ipv4first');
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cached MongoDB Connection for Serverless & Long-lived Environments
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) {
        return cachedDb;
    }

    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        console.warn('⚠️ No MONGODB_URI found in environment variables.');
        return null;
    }

    try {
        cachedDb = await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Connected to MongoDB successfully.');
        return cachedDb;
    } catch (err) {
        console.warn('⚠️ MongoDB connection failed:', err.message);
        return null;
    }
}

// Auto-connect middleware for API routes
app.use('/api', async (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        await connectToDatabase();
    }
    next();
});

// Mongoose Schema & Model for Unique-Name Leaderboard
const scoreSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Player name is required'],
        trim: true,
        minlength: [1, 'Name must have at least 1 character'],
        maxlength: [12, 'Name cannot exceed 12 characters']
    },
    nameLower: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        unique: true
    },
    score: {
        type: Number,
        required: [true, 'Score is required'],
        min: [0, 'Score cannot be negative']
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for high-speed descending ranking
scoreSchema.index({ score: -1, updatedAt: 1 });

const Score = mongoose.models.Score || mongoose.model('Score', scoreSchema);

// REST API Endpoints

/**
 * GET /api/health
 * Health check & DB status
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        env: process.env.NODE_ENV || 'development'
    });
});

/**
 * POST /api/scores
 * Submit a high score with unique-player-highest-score enforcement
 */
app.post('/api/scores', async (req, res) => {
    try {
        const { name, score } = req.body;
        const cleanName = typeof name === 'string' ? name.trim() : '';
        const numScore = Number(score);
        const nameLower = cleanName.toLowerCase();

        // Server-side input validation
        if (!cleanName || cleanName.length < 1 || cleanName.length > 12) {
            return res.status(400).json({
                success: false,
                error: 'Player name must be between 1 and 12 characters.'
            });
        }

        if (isNaN(numScore) || numScore < 0) {
            return res.status(400).json({
                success: false,
                error: 'Score must be a valid non-negative number.'
            });
        }

        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                offline: true,
                error: 'Database is currently offline. Score saved locally.'
            });
        }

        const validScore = Math.round(numScore);

        // Case-insensitive lookup by normalized name
        const existing = await Score.findOne({ nameLower });

        if (!existing) {
            // Case 1: Brand new player name -> Insert new document
            const newEntry = await Score.create({
                name: cleanName,
                nameLower: nameLower,
                score: validScore,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            return res.status(201).json({
                success: true,
                updated: false,
                entry: {
                    name: newEntry.name,
                    score: newEntry.score,
                    createdAt: newEntry.createdAt
                }
            });
        } else {
            // Case 2: Existing player name found -> Only update if new score is higher
            if (validScore > existing.score) {
                existing.score = validScore;
                existing.name = cleanName; // Preserve newest display casing
                existing.updatedAt = new Date();
                await existing.save();

                return res.json({
                    success: true,
                    updated: true,
                    entry: {
                        name: existing.name,
                        score: existing.score,
                        updatedAt: existing.updatedAt
                    }
                });
            } else {
                // Score is lower or equal -> Keep existing high score as-is
                return res.json({
                    success: true,
                    updated: false,
                    message: 'Existing high score retained.',
                    entry: {
                        name: existing.name,
                        score: existing.score,
                        updatedAt: existing.updatedAt
                    }
                });
            }
        }
    } catch (err) {
        console.error('Error saving score:', err.message);
        res.status(500).json({
            success: false,
            error: 'Failed to save score.'
        });
    }
});

/**
 * GET /api/leaderboard
 * Retrieve top N unique scores
 */
app.get('/api/leaderboard', async (req, res) => {
    try {
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

        if (mongoose.connection.readyState !== 1) {
            return res.json({
                success: false,
                offline: true,
                scores: []
            });
        }

        const scores = await Score.find()
            .sort({ score: -1, updatedAt: 1 })
            .limit(limit)
            .select('name score -_id')
            .lean();

        res.json({
            success: true,
            scores
        });
    } catch (err) {
        console.error('Error fetching leaderboard:', err.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboard.'
        });
    }
});

// Serve Static Game Files when running as standalone Node server
app.use(express.static(path.join(__dirname)));

// Fallback to index.html for direct navigation in standalone mode
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Standalone execution entrypoint
if (require.main === module) {
    connectToDatabase();
    app.listen(PORT, () => {
        console.log(`🎮 Studio i Mario Game Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
