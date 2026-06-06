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
 * Health check — verifies yt-dlp binary and cookie config.
 */
router.get('/health', async (req, res) => {
  const status = await healthCheck();

  if (!status.cookiesConfigured) {
    status.cookieSetup = {
      message: 'No cookies configured. Required for server/hosting deployments.',
      steps: [
        '1. Install "Get cookies.txt LOCALLY" browser extension',
        '2. Visit youtube.com logged into a BURNER Google account (not your main one)',
        '3. Export cookies as cookies.txt using the extension',
        '4. Base64 encode: [Convert]::ToBase64String([IO.File]::ReadAllBytes("cookies.txt"))  (PowerShell) or  base64 -i cookies.txt  (Linux/macOS)',
        '5. Set COOKIES_BASE64 environment variable in your hosting dashboard (Render → Environment → Add)',
        '6. Redeploy',
      ],
    };
  }

  res.status(status.ok ? 200 : 503).json(status);
});

module.exports = router;
