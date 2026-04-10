const path = require("path");
const { spawn } = require("child_process");

const YT_DLP_PATH = "yt-dlp";
const YT_URL = "https://www.youtube.com/watch?v=";

// 🔹 METADATA
function getMetadata(videoId) {
    return new Promise((resolve, reject) => {
        const process = spawn("bash", [
            "-c",
            `${YT_DLP_PATH} --dump-json --skip-download --no-playlist https://www.youtube.com/watch?v=${videoId}`
        ]);

        let data = "";

        process.stdout.on("data", (chunk) => {
            data += chunk.toString();
        });

        process.stderr.on("data", (err) => {
            console.error("yt-dlp error:", err.toString());
        });

        process.on("close", (code) => {
            if (code !== 0) {
                return reject("yt-dlp metadata failed");
            }

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
                console.error("JSON parse error:", data);
                reject("Invalid JSON from yt-dlp");
            }
        });
    });
}


// 🔹 AUDIO STREAM (NO URL EXPIRY)
function getAudioStream(videoId) {
    return new Promise((resolve, reject) => {
        const process = spawn("bash", [
            "-c",
            `${YT_DLP_PATH} -f bestaudio --no-playlist -o - https://www.youtube.com/watch?v=${videoId}`
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