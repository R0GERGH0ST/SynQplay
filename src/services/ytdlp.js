const path = require('path');
const fs = require('fs');
const os = require('os');
const YTDlpWrap = require('yt-dlp-wrap').default;
const { ExtractionError } = require('../utils/errors');

// ───────────── Binary path resolution ─────────────

function getYtDlpPath() {
  const isWindows = process.platform === 'win32';
  const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';

  // Check local bin/ directory first
  const localPath = path.join(__dirname, '..', '..', 'bin', binaryName);
  if (fs.existsSync(localPath)) return localPath;

  // Fall back to system PATH
  return binaryName;
}

const ytDlpPath = getYtDlpPath();
const ytDlpWrap = new YTDlpWrap(ytDlpPath);

// ───────────── Cookie handling ─────────────
// On server deployments (Render, Railway etc.) set the COOKIES_BASE64 env var
// with the base64-encoded contents of a Netscape cookies.txt file.
// This lets yt-dlp authenticate as a real user and bypass bot detection.

let cookiesFilePath = null;

function setupCookies() {
  // Option 1: base64-encoded cookies in env var (recommended for hosting)
  const cookiesB64 = process.env.COOKIES_BASE64;
  if (cookiesB64) {
    try {
      const tmpDir = os.tmpdir();
      cookiesFilePath = path.join(tmpDir, 'yt-cookies.txt');
      const decoded = Buffer.from(cookiesB64, 'base64').toString('utf-8');
      fs.writeFileSync(cookiesFilePath, decoded, 'utf-8');
      console.log(`✓ Cookies written to ${cookiesFilePath}`);
      return;
    } catch (err) {
      console.error('✗ Failed to decode COOKIES_BASE64:', err.message);
    }
  }

  // Option 2: direct file path
  const cookiesPath = process.env.COOKIES_PATH;
  if (cookiesPath && fs.existsSync(cookiesPath)) {
    cookiesFilePath = cookiesPath;
    console.log(`✓ Using cookies file at ${cookiesFilePath}`);
    return;
  }

  // Option 3: default location in project root
  const defaultPath = path.join(__dirname, '..', '..', 'cookies.txt');
  if (fs.existsSync(defaultPath)) {
    cookiesFilePath = defaultPath;
    console.log(`✓ Using cookies file at ${cookiesFilePath}`);
    return;
  }

  console.log('ℹ No cookies configured. Set COOKIES_BASE64 env var for server deployments.');
}

// Run on module load
setupCookies();

// ───────────── Health check ─────────────

async function healthCheck() {
  try {
    const version = await ytDlpWrap.execPromise(['--version']);
    return {
      ok: true,
      version: version.trim(),
      path: ytDlpPath,
      cookiesConfigured: !!cookiesFilePath,
    };
  } catch (error) {
    return { ok: false, error: error.message, path: ytDlpPath };
  }
}

// ───────────── Player client strategies ─────────────
// YouTube blocks different clients at different times.
// We try multiple strategies in order until one succeeds.

const CLIENT_STRATEGIES = [
  'android_vr',
  'tv',
  'default,-android_sdkless',
  'web_creator',
  'mediaconnect',
];

/**
 * Extract video info and all available formats from a YouTube URL.
 * Tries multiple player clients as fallback. Uses cookies if configured.
 */
async function extractFormats(url) {
  const baseArgs = [
    url,
    '--dump-json',
    '--no-download',
    '--no-warnings',
    '--no-check-certificates',
  ];

  // Add cookies if available
  if (cookiesFilePath) {
    baseArgs.push('--cookies', cookiesFilePath);
  }

  let lastError = null;

  for (const client of CLIENT_STRATEGIES) {
    try {
      const args = [
        ...baseArgs,
        '--extractor-args', `youtube:player_client=${client}`,
      ];

      const stdout = await ytDlpWrap.execPromise(args);
      const info = JSON.parse(stdout);
      return parseVideoInfo(info);
    } catch (error) {
      lastError = error;
      const msg = error.message || error.stderr || '';

      // If it's a bot/sign-in error, try next client
      if (msg.includes('Sign in') || msg.includes('bot') || msg.includes('403')) {
        continue;
      }
      // For non-auth errors, don't bother trying other clients
      break;
    }
  }

  // All strategies failed — throw a helpful error
  const msg = lastError?.message || lastError?.stderr || 'Unknown extraction error';

  if (msg.includes('Sign in') || msg.includes('bot') || msg.includes('403')) {
    throw new ExtractionError(
      'YouTube is blocking this server\'s IP. ' +
      (cookiesFilePath
        ? 'Cookies are configured but may be expired. Re-export and update COOKIES_BASE64.'
        : 'Set the COOKIES_BASE64 environment variable with base64-encoded cookies.txt from a browser. ' +
          'See /api/health for setup instructions.')
    );
  }
  if (msg.includes('Video unavailable') || msg.includes('Private video')) {
    throw new ExtractionError('Video is unavailable or private.');
  }
  if (msg.includes('not a valid URL') || msg.includes('Unsupported URL')) {
    throw new ExtractionError('Unsupported or invalid YouTube URL.');
  }

  throw new ExtractionError(`Extraction failed: ${msg}`);
}

// ───────────── Response formatting ─────────────

function parseVideoInfo(info) {
  const formats = (info.formats || []).map((f) => formatEntry(f));

  const videoAudio = formats.filter((f) => f.mediaType === 'video+audio');
  const videoOnly = formats.filter((f) => f.mediaType === 'video');
  const audioOnly = formats.filter((f) => f.mediaType === 'audio');

  return {
    title: info.title || info.fulltitle || 'Unknown',
    duration: info.duration || 0,
    thumbnail: pickBestThumbnail(info),
    counts: {
      total: formats.length,
      videoAudio: videoAudio.length,
      videoOnly: videoOnly.length,
      audioOnly: audioOnly.length,
    },
    videoAudio,
    videoOnly,
    audioOnly,
  };
}

function formatEntry(f) {
  const hasVideo = f.vcodec && f.vcodec !== 'none';
  const hasAudio = f.acodec && f.acodec !== 'none';

  let mediaType;
  if (hasVideo && hasAudio) mediaType = 'video+audio';
  else if (hasVideo) mediaType = 'video';
  else mediaType = 'audio';

  let resolution;
  if (f.height) {
    resolution = `${f.height}p`;
  } else if (f.format_note) {
    resolution = f.format_note;
  } else {
    resolution = 'unknown';
  }

  return {
    formatId: String(f.format_id || ''),
    extension: f.ext || 'unknown',
    mediaType,
    resolution,
    fps: f.fps || null,
    fileSize: f.filesize || f.filesize_approx || null,
    protocol: f.protocol || 'https',
    vcodec: f.vcodec || 'none',
    acodec: f.acodec || 'none',
    audioBitrate: f.abr || null,
    videoBitrate: f.vbr || null,
    formatNote: f.format_note || null,
    directUrl: f.url || null,
  };
}

function pickBestThumbnail(info) {
  if (info.thumbnails && info.thumbnails.length > 0) {
    const best = info.thumbnails[info.thumbnails.length - 1];
    if (best && best.url) return best.url;
  }
  return info.thumbnail || null;
}

module.exports = { extractFormats, healthCheck };
