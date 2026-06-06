import express from 'express';
import cors from 'cors';
import { Innertube, Platform } from 'youtubei.js';

// ─── Provide JS interpreter for URL deciphering ───
Platform.shim.eval = async (data) => {
  return new Function(data.output)();
};

const app = express();
const PORT = process.env.PORT || 3000;

// Prevent stray errors from crashing the process
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT]', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED]', err?.message || err);
});

app.use(cors());
app.use(express.json());

// ─── Initialize Innertube (MWEB client returns signature_cipher on all formats) ───
let yt = null;

async function getYT() {
  if (!yt) {
    yt = await Innertube.create({ client_type: 'MWEB' });
  }
  return yt;
}

// ─── Helpers ───

const YT_URL_REGEX = /(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/|v\/)|youtu\.be\/|music\.youtube\.com\/watch\?.*v=)([\w-]{11})/;

function extractVideoId(url) {
  const match = url.match(YT_URL_REGEX);
  return match ? match[1] : null;
}

/**
 * Decipher a format's URL using the player directly.
 * Format.decipher() is bugged in v17 for MWEB, but player.decipher() works.
 */
async function getDirectUrl(format, player) {
  try {
    // player.decipher(url, signatureCipher, cipher, signatureCipherUrl) — 4 args
    const result = await player.decipher(
      format.url,
      format.signature_cipher,
      format.cipher
    );
    if (result) {
      const urlStr = result.href || result.toString();
      if (urlStr && urlStr.startsWith('http')) return urlStr;
    }
  } catch { /* skip */ }

  // Fallback: try format's own decipher
  try {
    const result = await format.decipher(player);
    if (result) {
      const urlStr = result.href || result.toString();
      if (urlStr && urlStr.startsWith('http')) return urlStr;
    }
  } catch { /* skip */ }

  return null;
}

async function parseFormat(format, player) {
  try {
    const url = await getDirectUrl(format, player);
    if (!url) return null;

    const hasVideo = !!format.width;
    const hasAudio = !!format.audio_channels || !!format.audio_quality;

    let mediaType;
    if (hasVideo && hasAudio) mediaType = 'video+audio';
    else if (hasVideo) mediaType = 'video';
    else mediaType = 'audio';

    let resolution;
    if (format.quality_label) {
      resolution = format.quality_label;
    } else if (format.height) {
      resolution = `${format.height}p`;
    } else if (format.audio_quality) {
      resolution = format.audio_quality.replace('AUDIO_QUALITY_', '').toLowerCase();
    } else {
      resolution = 'unknown';
    }

    const mimeType = format.mime_type?.split(';')[0] || 'unknown';

    return {
      formatId: String(format.itag || ''),
      extension: mimeType.split('/')[1] || 'unknown',
      mimeType,
      mediaType,
      resolution,
      fps: format.fps || null,
      fileSize: format.content_length ? Number(format.content_length) : null,
      vcodec: hasVideo ? (format.video_codec || format.codecs || 'unknown') : 'none',
      acodec: hasAudio ? (format.audio_codec || format.codecs || 'unknown') : 'none',
      audioBitrate: hasAudio && !hasVideo ? Math.round((format.average_bitrate || format.bitrate || 0) / 1000) : null,
      videoBitrate: hasVideo ? Math.round((format.average_bitrate || format.bitrate || 0) / 1000) : null,
      qualityLabel: format.quality_label || format.audio_quality?.replace('AUDIO_QUALITY_', '').toLowerCase() || null,
      directUrl: url,
    };
  } catch {
    return null;
  }
}

// ─── Shared extraction logic ───

async function handleExtract(url) {
  const videoId = extractVideoId(url);
  if (!videoId) throw { status: 400, message: 'Invalid YouTube URL' };

  const youtube = await getYT();
  const info = await youtube.getBasicInfo(videoId);
  console.log("My Youtube Info", info)
  const player = youtube.session.player;

  const allFormats = [];

  for (const f of info.streaming_data?.formats || []) {
    const entry = await parseFormat(f, player);
    if (entry) { entry.mediaType = 'video+audio'; allFormats.push(entry); }
  }

  for (const f of info.streaming_data?.adaptive_formats || []) {
    const entry = await parseFormat(f, player);
    if (entry) allFormats.push(entry);
  }

  const videoAudio = allFormats.filter(f => f.mediaType === 'video+audio');
  const videoOnly = allFormats.filter(f => f.mediaType === 'video');
  const audioOnly = allFormats.filter(f => f.mediaType === 'audio');

  const thumbnails = info.basic_info?.thumbnail || [];
  const thumbnail = thumbnails.length > 0
    ? thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url
    : null;

  return {
    title: info.basic_info?.title || 'Unknown',
    duration: info.basic_info?.duration || 0,
    thumbnail,
    channel: info.basic_info?.author || null,
    counts: {
      total: allFormats.length,
      videoAudio: videoAudio.length,
      videoOnly: videoOnly.length,
      audioOnly: audioOnly.length,
    },
    videoAudio,
    videoOnly,
    audioOnly,
  };
}

// ─── Routes ───

app.post('/api/extract', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'Missing "url" in request body' });
    const result = await handleExtract(url);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    console.error('[EXTRACT ERROR]', err.message);
    return res.status(status).json({ success: false, error: err.message || 'Extraction failed' });
  }
});

app.get('/api/extract', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ success: false, error: 'Missing "url" query parameter' });
    const result = await handleExtract(url);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    console.error('[EXTRACT ERROR]', err.message);
    return res.status(status).json({ success: false, error: err.message || 'Extraction failed' });
  }
});

app.get('/api/health', async (req, res) => {
  try { await getYT(); res.json({ ok: true }); }
  catch (err) { res.status(503).json({ ok: false, error: err.message }); }
});

app.get('/', (req, res) => {
  res.json({
    name: 'yt-url-extract',
    usage: 'POST /api/extract with body { "url": "https://youtube.com/watch?v=..." }',
  });
});

app.listen(PORT, async () => {
  console.log(`\n🚀 YT-URL-EXTRACT running on http://localhost:${PORT}`);
  console.log(`   POST /api/extract — body: { "url": "..." }\n`);
  try { await getYT(); console.log('✓ Innertube ready (MWEB client)\n'); }
  catch (err) { console.error('✗ Init failed:', err.message); }
});
