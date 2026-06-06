const path = require('path');
const fs = require('fs');
const YTDlpWrap = require('yt-dlp-wrap').default;
const { ExtractionError } = require('../utils/errors');

// Resolve yt-dlp binary path
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

/**
 * Check if yt-dlp binary is available and working
 */
async function healthCheck() {
  try {
    const version = await ytDlpWrap.execPromise(['--version']);
    return { ok: true, version: version.trim(), path: ytDlpPath };
  } catch (error) {
    return { ok: false, error: error.message, path: ytDlpPath };
  }
}

/**
 * Extract video info and all available formats from a YouTube URL.
 * Uses the ANDROID_VR client to avoid bot detection on server deployments.
 */
async function extractFormats(url) {
  try {
    const args = [
      url,
      '--dump-json',
      '--no-download',
      '--no-warnings',
      '--no-check-certificates',
      '--extractor-args', 'youtube:player_client=android_vr',
    ];

    const stdout = await ytDlpWrap.execPromise(args);
    const info = JSON.parse(stdout);

    return parseVideoInfo(info);
  } catch (error) {
    const msg = error.message || error.stderr || 'Unknown extraction error';

    if (msg.includes('Sign in') || msg.includes('bot')) {
      throw new ExtractionError(
        'YouTube is requesting sign-in verification. The server IP may be blocked. Try again later or configure cookies.'
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
}

/**
 * Parse yt-dlp JSON output into the desired response format.
 */
function parseVideoInfo(info) {
  const formats = (info.formats || []).map((f) => formatEntry(f));

  // Categorize formats
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

/**
 * Transform a single yt-dlp format object into our API format.
 */
function formatEntry(f) {
  const hasVideo = f.vcodec && f.vcodec !== 'none';
  const hasAudio = f.acodec && f.acodec !== 'none';

  let mediaType;
  if (hasVideo && hasAudio) mediaType = 'video+audio';
  else if (hasVideo) mediaType = 'video';
  else mediaType = 'audio';

  // Build resolution string
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

/**
 * Pick the best available thumbnail URL.
 */
function pickBestThumbnail(info) {
  // Prefer maxresdefault
  if (info.thumbnails && info.thumbnails.length > 0) {
    // yt-dlp sorts thumbnails by quality, last is best
    const best = info.thumbnails[info.thumbnails.length - 1];
    if (best && best.url) return best.url;
  }
  return info.thumbnail || null;
}

module.exports = { extractFormats, healthCheck };
