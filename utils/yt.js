const path = require("path");
const { spawn } = require("child_process");

const YT_DLP_PATH = path.join(__dirname, "../bin/yt-dlp");
const YT_URL = "https://www.youtube.com/watch?v=";

if (!require("fs").existsSync(YT_DLP_PATH)) {
  throw new Error("yt-dlp not found");
}

// 🔹 METADATA
function getMetadata(videoId) {
    return new Promise((resolve, reject) => {
        const process = spawn(YT_DLP_PATH, [
            "-f",
            "bestaudio",
            "--no-playlist",
            "-o",
            "-",
            `${YT_URL}${videoId}`,
        ]);

        let data = "";

        process.stdout.on("data", (chunk) => {
            data += chunk.toString();
        });

        process.stderr.on("data", (err) => {
            console.error("yt-dlp error:", err.toString());
        });

        process.on("close", (code) => {
            if (code !== 0) return reject("yt-dlp failed");

            try {
                const json = JSON.parse(data);

                resolve({
                    id: videoId,
                    title: json.title,
                    duration: json.duration,
                    thumbnail: json.thumbnail,
                    uploader: json.uploader,
                });
            } catch (err) {
                reject(err);
            }
        });
    });
}


// 🔹 AUDIO STREAM (NO URL EXPIRY)
function getAudioStream(videoId) {
    return new Promise((resolve, reject) => {
        const process = spawn(YT_DLP_PATH, [
            "-f",
            "bestaudio",
            "--no-playlist",
            "-o",
            "-",
            `${YT_URL}${videoId}`,
        ]);

        // Timeout protection (Render safe)
        const timeout = setTimeout(() => {
            process.kill("SIGKILL");
            reject("Stream timeout");
        }, 20000);

        process.stderr.on("data", (err) => {
            console.error("yt-dlp stderr:", err.toString());
        });

        process.on("error", (err) => {
            clearTimeout(timeout);
            reject(err);
        });

        process.stdout.on("data", () => {
            clearTimeout(timeout);
        });

        resolve(process.stdout);
    });
}

module.exports = {
    getMetadata,
    getAudioStream,
};