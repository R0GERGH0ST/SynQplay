const express = require('express');
const router = express.Router();
const { validateUrl } = require('../middleware/validateUrl');
const { extractFormats, healthCheck } = require('../services/ytdlp');

/**
 * POST /api/extract
 * Body: { "url": "https://www.youtube.com/watch?v=..." }
 *
 * Returns video info with all available formats and direct stream URLs.
 */
router.post('/extract', validateUrl, async (req, res, next) => {
  try {
    const result = await extractFormats(req.youtubeUrl);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/extract?url=https://www.youtube.com/watch?v=...
 *
 * Same as POST but via query parameter.
 */
router.get('/extract', validateUrl, async (req, res, next) => {
  try {
    const result = await extractFormats(req.youtubeUrl);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/health
 *
 * Health check — verifies yt-dlp binary is available.
 */
router.get('/health', async (req, res) => {
  const status = await healthCheck();
  res.status(status.ok ? 200 : 503).json(status);
});

module.exports = router;
