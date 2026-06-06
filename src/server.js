require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { formatErrorResponse } = require('./utils/errors');
const youtubeRoutes = require('./routes/youtube');
const { healthCheck } = require('./services/ytdlp');

const app = express();
const PORT = process.env.PORT || 3000;

// --------------- Middleware ---------------

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('short'));

// Rate limiter
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      type: 'RateLimitError',
      message: 'Too many requests. Please try again later.',
    },
  },
});
app.use('/api', limiter);

// --------------- Routes ---------------

app.use('/api', youtubeRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'yt-url-extract',
    version: '1.0.0',
    endpoints: {
      extract_post: 'POST /api/extract  — body: { "url": "https://youtube.com/watch?v=..." }',
      extract_get: 'GET  /api/extract?url=https://youtube.com/watch?v=...',
      health: 'GET  /api/health',
    },
  });
});

// --------------- Error Handler ---------------

app.use((err, req, res, _next) => {
  const { statusCode, body } = formatErrorResponse(err);

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${err.name}: ${err.message}`);
  }

  res.status(statusCode).json(body);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { type: 'NotFound', message: `Route ${req.method} ${req.path} not found` },
  });
});

// --------------- Start Server ---------------

async function start() {
  // Verify yt-dlp on startup
  const status = await healthCheck();
  if (status.ok) {
    console.log(`✓ yt-dlp ${status.version} found at ${status.path}`);
  } else {
    console.warn(`⚠ yt-dlp not found at ${status.path}. Run "npm run postinstall" or install yt-dlp manually.`);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 YT-URL-EXTRACT API running on http://localhost:${PORT}`);
    console.log(`   POST /api/extract  — body: { "url": "..." }`);
    console.log(`   GET  /api/extract?url=...`);
    console.log(`   GET  /api/health\n`);
  });
}

start();
