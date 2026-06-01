const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const { getAudioStream, getMetadata } = require("./utils/yt");
const cache = require("./cache/cache");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(compression());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
  })
);

// Health check
app.get("/", (req, res) => {
  res.send("YT Audio Streaming Server Running");
});


// 🔹 METADATA
app.get("/meta/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({ error: "Missing videoId" });
    }

    const cached = cache.get(videoId);
    if (cached) return res.json(cached);

    const meta = await getMetadata(videoId);

    cache.set(videoId, meta);

    res.json(meta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Metadata fetch failed" });
  }
});


// 🔹 AUDIO STREAM (FOR TRACK PLAYER)
app.get("/play/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).send("Missing videoId");
    }

    res.setHeader("Content-Type", "audio/mp4");;
    res.setHeader("Transfer-Encoding", "chunked");

    const stream = await getAudioStream(videoId);

    stream.pipe(res);

    stream.on("error", (err) => {
      console.error("Stream error:", err);
      res.end();
    });

    req.on("close", () => {
      stream.destroy();
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Streaming failed");
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});