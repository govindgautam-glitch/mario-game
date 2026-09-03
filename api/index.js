/**
 * Vercel Serverless Function Entrypoint
 * Bridges incoming HTTP /api requests to the Express application.
 */

const app = require('../server');

module.exports = app;
