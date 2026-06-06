const { ValidationError } = require('../utils/errors');

// Accepted YouTube URL patterns
const YOUTUBE_PATTERNS = [
  /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?.*v=[\w-]+/,
  /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/,
  /^(https?:\/\/)?youtu\.be\/[\w-]+/,
  /^(https?:\/\/)?music\.youtube\.com\/watch\?.*v=[\w-]+/,
  /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]+/,
  /^(https?:\/\/)?(www\.)?youtube\.com\/v\/[\w-]+/,
];

function isValidYouTubeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return YOUTUBE_PATTERNS.some((pattern) => pattern.test(url.trim()));
}

function extractVideoId(url) {
  if (!url) return null;
  url = url.trim();

  // youtube.com/watch?v=ID
  let match = url.match(/[?&]v=([\w-]+)/);
  if (match) return match[1];

  // youtu.be/ID
  match = url.match(/youtu\.be\/([\w-]+)/);
  if (match) return match[1];

  // youtube.com/shorts/ID
  match = url.match(/youtube\.com\/shorts\/([\w-]+)/);
  if (match) return match[1];

  // youtube.com/embed/ID or /v/ID
  match = url.match(/youtube\.com\/(?:embed|v)\/([\w-]+)/);
  if (match) return match[1];

  return null;
}

function validateUrl(req, res, next) {
  const url = req.body?.url || req.query?.url;

  if (!url) {
    return next(new ValidationError('Missing required parameter: url'));
  }

  if (!isValidYouTubeUrl(url)) {
    return next(
      new ValidationError(
        'Invalid YouTube URL. Accepted formats: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/'
      )
    );
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return next(new ValidationError('Could not extract video ID from URL'));
  }

  // Attach cleaned data to request
  req.youtubeUrl = url.trim();
  req.videoId = videoId;

  next();
}

module.exports = { validateUrl, isValidYouTubeUrl, extractVideoId };
